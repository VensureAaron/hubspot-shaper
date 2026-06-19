import { resolveEnv } from "../../core/environment/envResolver";
import { HubSpotClient } from "../../core/api/hubspotClient";
import { runDiscovery } from "../../core/discovery/discoveryService";
import { log } from "../../core/logging/logger";

interface ApplyOptions {
  fromEnv: string;
  toEnv: string;
  dryRun?: boolean;
}

function isDeployableProperty(prop: any): boolean {
  if (!prop?.name) return false;
  if (prop.name.startsWith("hs_")) return false;
  if (prop.calculated) return false;
  if (prop.readOnlyDefinition) return false;
  return true;
}

export async function runApply(options: ApplyOptions) {
  const { fromEnv, toEnv } = options;
  const dryRun = options.dryRun === true;

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

  for (const [objectKey, fromObj] of Object.entries(fromObjects)) {
    const toObj = toObjects[objectKey] || {};

    const fromProps = (fromObj as any).properties || [];
    const toProps = (toObj as any).properties || [];

    const toPropNames = new Set(toProps.map((p: any) => p.name));

    const propertiesToCreate = fromProps.filter(
      (prop: any) => isDeployableProperty(prop) && !toPropNames.has(prop.name),
    );

    if (propertiesToCreate.length === 0) {
      continue;
    }

    console.log(`\n[${objectKey}]`);

    for (const prop of propertiesToCreate) {
      console.log(`+ CREATE property: ${prop.name}`);

      if (!dryRun) {
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
  }

  console.log("");
  if (dryRun) {
    log("Dry run complete. No changes were applied.");
  } else {
    log("Apply complete.");
  }
}
