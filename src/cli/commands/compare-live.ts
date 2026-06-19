import { resolveEnv } from "../../core/environment/envResolver";
import { HubSpotClient } from "../../core/api/hubspotClient";
import { runDiscovery } from "../../core/discovery/discoveryService";
import { log } from "../../core/logging/logger";

interface CompareLiveOptions {
  fromEnv: string;
  toEnv: string;
}

export async function runCompareLive(options: CompareLiveOptions) {
  const { fromEnv, toEnv } = options;

  log(`Resolving environments...`);

  const sourceEnv = resolveEnv(fromEnv);
  const targetEnv = resolveEnv(toEnv);

  const sourceClient = new HubSpotClient(sourceEnv.token);
  const targetClient = new HubSpotClient(targetEnv.token);

  log(`Running discovery on SOURCE (truth): ${fromEnv}`);
  const sourceData = await runDiscovery(sourceClient);

  log(`Running discovery on TARGET (to shape): ${toEnv}`);
  const targetData = await runDiscovery(targetClient);

  log(`Discovery complete. Building diff...`);
  console.log("");

  const diff: Record<string, unknown> = {};

  const fromObjects = sourceData.objects || {};
  const toObjects = targetData.objects || {};

  const allKeys = new Set([
    ...Object.keys(fromObjects),
    ...Object.keys(toObjects),
  ]);

  for (const key of allKeys) {
    const fromObj = fromObjects[key] || {};
    const toObj = toObjects[key] || {};

    const normalizeProps = (props: any[]) =>
      props
        .map((p) => p.name)
        .filter((name) => {
          // 🚫 Ignore HubSpot system fields
          if (name.startsWith("hs_")) return false;

          return true;
        });

    const fromProps = new Set(normalizeProps(fromObj.properties || []));

    const toProps = new Set(normalizeProps(toObj.properties || []));

    // ✅ Directional: shape target to match source
    const propertiesToCreate = [...fromProps].filter((p) => !toProps.has(p));
    const propertiesToRemove = [...toProps].filter((p) => !fromProps.has(p));

    const pipelinesToCreate =
      (fromObj.pipelines?.length || 0) > (toObj.pipelines?.length || 0);

    const pipelinesToRemove =
      (toObj.pipelines?.length || 0) > (fromObj.pipelines?.length || 0);

    if (
      propertiesToCreate.length > 0 ||
      propertiesToRemove.length > 0 ||
      pipelinesToCreate ||
      pipelinesToRemove
    ) {
      diff[key] = {
        propertiesToCreate,
        propertiesToRemove,
        pipelinesToCreate,
        pipelinesToRemove,
      };
    }
  }

  console.log(`SOURCE (truth): ${fromEnv}`);
  console.log(`TARGET (to shape): ${toEnv}`);
  console.log("");

  console.log(JSON.stringify(diff, null, 2));
}
