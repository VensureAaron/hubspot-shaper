import readline from "readline";
import { resolveEnv } from "../../core/environment/envResolver";
import { HubSpotClient } from "../../core/api/hubspotClient";
import { runDiscovery } from "../../core/discovery/discoveryService";
import { log } from "../../core/logging/logger";

interface ApplyOptions {
  fromEnv: string;
  toEnv: string;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}

function isDeployableProperty(prop: any): boolean {
  if (!prop?.name) return false;
  if (prop.name.startsWith("hs_")) return false;
  if (prop.calculated) return false;
  if (prop.readOnlyDefinition) return false;
  return true;
}

function isCompatibleTypeChange(fromProp: any, toProp: any): boolean {
  const fromType = toProp.type;
  const toType = fromProp.type;
  const toFieldType = fromProp.fieldType;

  if (fromType === "string" && toType === "string") {
    return ["text", "textarea", "email", "url"].includes(toFieldType);
  }

  return false;
}

function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

export async function runApply(options: ApplyOptions) {
  const { fromEnv, toEnv } = options;
  const dryRun = options.dryRun === true;
  const autoApprove = options.yes === true;
  const allowBreaking = options.force === true;

  let destructiveChanges = 0;

  if (dryRun) log("Dry run mode enabled");

  log(`Resolving environments...`);

  const sourceEnv = resolveEnv(fromEnv);
  const targetEnv = resolveEnv(toEnv);

  const sourceClient = new HubSpotClient(sourceEnv.token);
  const targetClient = new HubSpotClient(targetEnv.token);

  log(`Running discovery on SOURCE: ${fromEnv}`);
  const sourceData = await runDiscovery(sourceClient);

  log(`Running discovery on TARGET: ${toEnv}`);
  const targetData = await runDiscovery(targetClient);

  log(`Building apply plan...\n`);

  const fromObjects = sourceData.objects || {};
  const toObjects = targetData.objects || {};

  const plan: Record<
    string,
    {
      create: any[];
      update: { name: string; changes: any }[];
      breaking: any[];
    }
  > = {};

  let totalActions = 0;
  let hasBreaking = false;

  for (const [objectKey, fromObj] of Object.entries(fromObjects)) {
    const toObj = toObjects[objectKey] || {};

    const fromProps = (fromObj as any).properties || [];
    const toProps = (toObj as any).properties || [];

    const propertiesToCreate: any[] = [];
    const propertiesToUpdate: any[] = [];
    const propertiesBreaking: any[] = [];

    for (const fromProp of fromProps) {
      if (!isDeployableProperty(fromProp)) continue;

      const matching = toProps.find((p: any) => p.name === fromProp.name);

      // ✅ CREATE
      if (!matching) {
        propertiesToCreate.push(fromProp);
        continue;
      }

      const changes: any = {};

      // ✅ LABEL
      if (fromProp.label !== matching.label) {
        changes.label = fromProp.label;
      }

      // ✅ GROUP
      if (fromProp.groupName !== matching.groupName) {
        changes.groupName = fromProp.groupName;
      }

      // ✅ TYPE
      if (fromProp.type !== matching.type) {
        if (!isCompatibleTypeChange(fromProp, matching)) {
          propertiesBreaking.push({
            name: fromProp.name,
            fromType: `${matching.type}/${matching.fieldType}`,
            toType: `${fromProp.type}/${fromProp.fieldType}`,
          });
          hasBreaking = true;
          continue;
        }

        changes.type = fromProp.type;
      }

      // ✅ FIELD TYPE
      if (fromProp.fieldType !== matching.fieldType) {
        changes.fieldType = fromProp.fieldType;
      }

      // ✅ ENUM DIFF (FULL + CLASSIFICATION)
      if (
        fromProp.type === "enumeration" &&
        Array.isArray(fromProp.options) &&
        Array.isArray(matching.options)
      ) {
        const fromValues: string[] = fromProp.options.map((o: any) => o.value);
        const toValues: string[] = matching.options.map((o: any) => o.value);

        const added = fromValues.filter((v) => !toValues.includes(v));
        const removed = toValues.filter((v) => !fromValues.includes(v));

        const reordered =
          added.length === 0 &&
          removed.length === 0 &&
          fromValues.some((v, i) => v !== toValues[i]);

        if (added.length || removed.length || reordered) {
          if (removed.length > 0) {
            destructiveChanges += removed.length;
          }

          const normalizedFull = fromProp.options.map(
            (opt: any, index: number) => ({
              label: opt.label,
              value: opt.value,
              description: opt.description ?? "",
              hidden: opt.hidden ?? false,
              displayOrder: index,
            }),
          );

          changes.options = {
            full: normalizedFull,
            added,
            removed,
            reordered,
          };
        }
      }

      if (Object.keys(changes).length > 0) {
        propertiesToUpdate.push({
          name: fromProp.name,
          changes,
        });
      }
    }

    if (
      propertiesToCreate.length ||
      propertiesToUpdate.length ||
      propertiesBreaking.length
    ) {
      plan[objectKey] = {
        create: propertiesToCreate,
        update: propertiesToUpdate,
        breaking: propertiesBreaking,
      };

      totalActions += propertiesToCreate.length + propertiesToUpdate.length;
    }
  }

  // ✅ OUTPUT
  console.log("Apply Plan Summary:\n");

  for (const [objectKey, planObj] of Object.entries(plan)) {
    console.log(`${objectKey}:\n`);

    // ✅ CREATE
    if (planObj.create.length > 0) {
      console.log(`  + create: ${planObj.create.length} properties`);
      planObj.create.forEach((p) => console.log(`    - ${p.name}`));
      console.log("");
    }

    // ✅ UPDATE
    if (planObj.update.length > 0) {
      console.log(`  ~ update: ${planObj.update.length} properties`);

      for (const p of planObj.update) {
        const changes = p.changes;

        const parts: string[] = [];

        for (const key of Object.keys(changes)) {
          if (key === "options") {
            const opt = changes.options;
            const sub: string[] = [];

            if (opt.added.length) sub.push(`+${opt.added.length} ✅`);
            if (opt.removed.length) sub.push(`-${opt.removed.length} ⚠️`);
            if (opt.reordered) sub.push("reorder");

            sub.push(opt.removed.length > 0 ? "destructive" : "safe");

            parts.push(`options(${sub.join(", ")})`);
          } else {
            parts.push(key);
          }
        }

        console.log(`    - ${p.name} (${parts.join(", ")})`);

        // ✅ detailed breakdown
        if (changes.options) {
          const opt = changes.options;

          if (opt.added.length) {
            console.log(`      + added:`);
            opt.added.forEach((v: string) => console.log(`        - ${v}`));
          }

          if (opt.removed.length) {
            console.log(`      - removed:`);
            opt.removed.forEach((v: string) => console.log(`        - ${v}`));
          }

          if (opt.reordered) {
            console.log(`      ↕ reordered`);
          }
        }
      }

      console.log("");
    }

    // ✅ BREAKING
    if (planObj.breaking.length > 0) {
      console.log(`  ! breaking: ${planObj.breaking.length} properties`);
      planObj.breaking.forEach((p) =>
        console.log(`    - ${p.name} (${p.fromType} → ${p.toType})`),
      );
      console.log("");
    }
  }

  console.log(`Total actions: ${totalActions}\n`);

  // ✅ WARNINGS
  if (destructiveChanges > 0) {
    console.log("⚠️  WARNING: Destructive changes detected.");
    console.log(
      `${destructiveChanges} option(s) will be removed. This may impact records and workflows.\n`,
    );
  }

  if (destructiveChanges > 0 && !allowBreaking) {
    log("Destructive removals blocked. Re-run with --force to allow.");
    return;
  }

  if (hasBreaking && !allowBreaking) {
    log("Breaking changes detected.");
    return;
  }

  if (totalActions === 0) {
    log("No changes detected.");
    return;
  }

  if (dryRun) {
    log("Dry run complete. No changes were applied.");
    return;
  }

  if (!autoApprove) {
    const confirmed = await promptConfirm(
      destructiveChanges > 0
        ? `Proceed with applying ${totalActions} changes to ${toEnv}? (includes destructive changes) (y/N): `
        : `Proceed with applying ${totalActions} changes to ${toEnv}? (y/N): `,
    );

    if (!confirmed) {
      log("Operation cancelled.");
      return;
    }
  }

  // ✅ APPLY
  for (const [objectKey, planObj] of Object.entries(plan)) {
    console.log(`\n[${objectKey}]`);

    for (const prop of planObj.create) {
      console.log(`+ CREATE property: ${prop.name}`);
      await targetClient.createProperty(objectKey, prop);
    }

    for (const prop of planObj.update) {
      console.log(`~ UPDATE property: ${prop.name}`);

      const payload: any = { ...prop.changes };

      if (prop.changes.options) {
        payload.options = prop.changes.options.full;
      }

      await targetClient.updateProperty(objectKey, prop.name, payload);
    }
  }

  console.log("");
  log("Apply complete.");
}
