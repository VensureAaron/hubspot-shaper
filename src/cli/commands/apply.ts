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
}

function isDeployableProperty(prop: any): boolean {
  if (!prop?.name) return false;
  if (prop.name.startsWith("hs_")) return false;
  if (prop.calculated) return false;
  if (prop.readOnlyDefinition) return false;
  return true;
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

  if (dryRun) {
    log("Dry run mode enabled");
  }

  log(`Resolving environments...`);

  const sourceEnv = resolveEnv(fromEnv);
  const targetEnv = resolveEnv(toEnv);

  const sourceClient = new HubSpotClient(sourceEnv.token);
  const targetClient = new HubSpotClient(targetEnv.token);

  log(`Running discovery on SOURCE: ${fromEnv}`);
  const sourceData = await runDiscovery(sourceClient);

  log(`Running discovery on TARGET: ${toEnv}`);
  const targetData = await runDiscovery(targetClient);

  log(`Building apply plan...`);
  console.log("");

  const fromObjects = sourceData.objects || {};
  const toObjects = targetData.objects || {};

  const plan: Record<string, any[]> = {};
  let totalCreates = 0;

  for (const [objectKey, fromObj] of Object.entries(fromObjects)) {
    const toObj = toObjects[objectKey] || {};

    const fromProps = (fromObj as any).properties || [];
    const toProps = (toObj as any).properties || [];

    const toPropNames = new Set(toProps.map((p: any) => p.name));

    const propertiesToCreate = fromProps.filter(
      (prop: any) => isDeployableProperty(prop) && !toPropNames.has(prop.name),
    );

    if (propertiesToCreate.length > 0) {
      plan[objectKey] = propertiesToCreate;
      totalCreates += propertiesToCreate.length;
    }
  }

  // ✅ PLAN SUMMARY
  console.log("Apply Plan Summary:");
  console.log("");

  for (const [objectKey, props] of Object.entries(plan)) {
    console.log(`${objectKey}:`);

    const label = props.length === 1 ? "property" : "properties";
    console.log(`  + create: ${props.length} ${label}`);

    const sortedProps = [...props].sort((a, b) => a.name.localeCompare(b.name));

    // ✅ List each property
    for (const prop of sortedProps) {
      console.log(`    - ${prop.name}`);
    }
  }

  console.log("");
  console.log(`Total actions: ${totalCreates}`);
  console.log("");

  if (totalCreates === 0) {
    log("No changes detected. Nothing to apply.");
    return;
  }

  if (dryRun) {
    log("Dry run complete. No changes were applied.");
    return;
  }

  // ✅ CONFIRMATION STEP
  if (!autoApprove) {
    const confirmed = await promptConfirm(
      `Proceed with applying ${totalCreates} changes to ${toEnv}? (y/n): `,
    );

    if (!confirmed) {
      log("Operation cancelled by user.");
      return;
    }
  }

  // ✅ APPLY EXECUTION
  for (const [objectKey, props] of Object.entries(plan)) {
    console.log(`\n[${objectKey}]`);

    for (const prop of props as any[]) {
      console.log(`+ CREATE property: ${prop.name}`);

      try {
        await targetClient.createProperty(objectKey, {
          name: prop.name,
          label: prop.label,
          type: prop.type,
          fieldType: prop.fieldType,
          groupName: prop.groupName,
        });

        log(`Created ${prop.name} in ${objectKey}`);
      } catch (err: any) {
        console.error(`Failed to create ${prop.name}: ${err.message}`);
      }
    }
  }

  console.log("");
  log("Apply complete.");
}
