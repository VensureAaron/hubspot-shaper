import { loadConfig } from "./configLoader"

export interface ResolvedEnv {
  portalId: string
  token: string
}

export function resolveEnv(envName: string): ResolvedEnv {
  const config = loadConfig()
  const env = config.environments[envName]

  if (!env) {
    throw new Error(`Environment "${envName}" not found`)
  }

  let envVarName: string | undefined

  if (env.auth.type === "private_app") {
    envVarName = env.auth.tokenEnvVar
  } else if (env.auth.type === "service_key") {
    envVarName = env.auth.keyEnvVar
  }

  if (!envVarName) {
    throw new Error(`No environment variable mapping found for environment "${envName}"`)
  }

  const token = process.env[envVarName]

  if (!token) {
    throw new Error(`Missing environment variable: ${envVarName}`)
  }

  return {
    portalId: env.portalId,
    token
  }
}