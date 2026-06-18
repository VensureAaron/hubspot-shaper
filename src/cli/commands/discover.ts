import fs from "fs"
import path from "path"
import { resolveEnv } from "../../core/environment/envResolver"
import { HubSpotClient } from "../../core/api/hubspotClient"
import { runDiscovery } from "../../core/discovery/discoveryService"
import { log } from "../../core/logging/logger"

export async function runDiscover(envName: string, outFile?: string) {
  log(`Resolving environment: ${envName}`)

  const env = resolveEnv(envName)
  const client = new HubSpotClient(env.token)

  log(`Running discovery on portal ${env.portalId}`)

  const result = await runDiscovery(client)

  log("Discovery complete")
  console.log("")

  const objects = result.objects

  for (const [objectKey, objectData] of Object.entries(objects)) {
    const typedObjectData = objectData as {
      properties?: unknown[]
      pipelines?: unknown[]
    }

    const propertyCount = typedObjectData.properties?.length ?? 0
    const pipelineCount = typedObjectData.pipelines?.length ?? 0

    if (pipelineCount > 0) {
      console.log(`- ${objectKey}: ${propertyCount} properties, ${pipelineCount} pipelines`)
    } else {
      console.log(`- ${objectKey}: ${propertyCount} properties`)
    }
  }

  console.log("")
  console.log(`Custom objects detected: ${result.customObjectsDetected}`)

  if (outFile) {
    const resolvedPath = path.resolve(outFile)
    fs.writeFileSync(resolvedPath, JSON.stringify(result, null, 2), "utf-8")
    console.log("")
    log(`Full discovery output written to ${resolvedPath}`)
  }
}