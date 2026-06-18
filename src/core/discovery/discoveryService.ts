import { HubSpotClient } from "../api/hubspotClient"

export async function runDiscovery(client: HubSpotClient) {
  const objectTypes = ["contacts", "companies", "deals"]

  const result: Record<string, any> = {}

  for (const objectType of objectTypes) {
    const properties = await client.getProperties(objectType)

    result[objectType] = {
      properties
    }

    // pipelines only for deals
    if (objectType === "deals") {
      const pipelines = await client.getPipelines(objectType)
      result[objectType].pipelines = pipelines
    }
  }

  const schemas = await client.getSchemas()

  return {
    objects: result,
    customObjectsDetected: schemas.length > 0
  }
}