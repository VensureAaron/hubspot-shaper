import fs from "fs";
import path from "path";

export interface OutputOptions {
  env: string;
  entity: string;
  filenameOverride?: string;
  timestamp: string;
}

export function writeDiscoveryOutput(
  data: unknown,
  options: OutputOptions,
): string {
  const { env, entity, filenameOverride, timestamp } = options;

  const baseDir = path.resolve(process.cwd(), "output");

  // ✅ NEW: include timestamp directory
  const runDir = path.join(baseDir, env, timestamp);

  fs.mkdirSync(runDir, { recursive: true });

  const fileName = filenameOverride ?? `${entity}.json`;

  const fullPath = path.join(runDir, fileName);

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf-8");

  return fullPath;
}
