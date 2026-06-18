import fs from "fs"
import path from "path"

type PrivateAppAuthConfig = {
  type: "private_app"
  tokenEnvVar: string
}

type ServiceKeyAuthConfig = {
  type: "service_key"
  keyEnvVar: string
}

type AuthConfig = PrivateAppAuthConfig | ServiceKeyAuthConfig

export interface EnvConfig {
  portalId: string
  auth: AuthConfig
}

export interface AppConfig {
  environments: Record<string, EnvConfig>
}

export function loadConfig(): AppConfig {
  const filePath = path.resolve(".hubspot-shaper.json")

  if (!fs.existsSync(filePath)) {
    throw new Error("Missing .hubspot-shaper.json")
  }

  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as AppConfig
}
