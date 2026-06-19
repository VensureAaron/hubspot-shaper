import { resolveEnv } from "../../core/environment/envResolver";
import { HubSpotClient } from "../../core/api/hubspotClient";
import { runDiscovery } from "../../core/discovery/discoveryService";
import { log } from "../../core/logging/logger";
import { writeDiscoveryOutput } from "@/utils/output";

type ExportMode = "full" | "split" | "both";

interface RunDiscoverOptions {
  exportMode?: ExportMode;
  fileName?: string;
}

export async function runDiscover(
  envName: string,
  options?: RunDiscoverOptions,
) {
  const exportMode = options?.exportMode;
  const fileName = options?.fileName;
  const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  log(`Resolving environment: ${envName}`);

  const env = resolveEnv(envName);
  const client = new HubSpotClient(env.token);

  log(`Running discovery on portal ${env.portalId}`);

  const result = await runDiscovery(client);

  log("Discovery complete");
  console.log("");

  const objects = result.objects;

  for (const [objectKey, objectData] of Object.entries(objects)) {
    const typedObjectData = objectData as {
      properties?: unknown[];
      pipelines?: unknown[];
    };

    const propertyCount = typedObjectData.properties?.length ?? 0;
    const pipelineCount = typedObjectData.pipelines?.length ?? 0;

    if (pipelineCount > 0) {
      console.log(
        `- ${objectKey}: ${propertyCount} properties, ${pipelineCount} pipelines`,
      );
    } else {
      console.log(`- ${objectKey}: ${propertyCount} properties`);
    }
  }

  console.log("");
  console.log(`Custom objects detected: ${result.customObjectsDetected}`);

  // ✅ EXPORT LOGIC (mode-driven)
  if (exportMode) {
    console.log("");

    // ✅ Split per object
    if (exportMode === "split" || exportMode === "both") {
      for (const [objectKey, objectData] of Object.entries(objects)) {
        const outputPath = writeDiscoveryOutput(objectData, {
          env: envName,
          entity: objectKey,
          filenameOverride: fileName ? `${objectKey}-${fileName}` : undefined,
          timestamp: runTimestamp,
        });

        log(`Exported ${objectKey} → ${outputPath}`);
      }
    }

    // ✅ Full export
    if (exportMode === "full" || exportMode === "both") {
      const fullOutputPath = writeDiscoveryOutput(result, {
        env: envName,
        entity: "full",
        filenameOverride: fileName ? `full-${fileName}` : undefined,
        timestamp: runTimestamp,
      });

      log(`Full discovery output written to ${fullOutputPath}`);
    }
  }
}
