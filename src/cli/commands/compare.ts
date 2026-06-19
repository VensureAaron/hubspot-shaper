import fs from "fs";
import path from "path";
import { log } from "../../core/logging/logger";

interface CompareOptions {
  fromEnv: string;
  toEnv: string;
  from: string;
  to: string;
}

export async function runCompare(options: CompareOptions) {
  const { fromEnv, toEnv, from, to } = options;

  const baseDir = path.resolve(process.cwd(), "output");

  const fromPath = path.join(baseDir, fromEnv, from, "full.json");
  const toPath = path.join(baseDir, toEnv, to, "full.json");

  if (!fs.existsSync(fromPath)) {
    throw new Error(`FROM snapshot not found: ${fromPath}`);
  }

  if (!fs.existsSync(toPath)) {
    throw new Error(`TO snapshot not found: ${toPath}`);
  }

  log(`Comparing environments`);
  console.log(`SOURCE (truth): ${fromEnv} @ ${from}`);
  console.log(`TARGET (to shape): ${toEnv} @ ${to}`);
  console.log("");

  const fromData = JSON.parse(fs.readFileSync(fromPath, "utf-8"));
  const toData = JSON.parse(fs.readFileSync(toPath, "utf-8"));

  const diff: Record<string, unknown> = {};

  const fromObjects = fromData.objects || {};
  const toObjects = toData.objects || {};

  const allKeys = new Set([
    ...Object.keys(fromObjects),
    ...Object.keys(toObjects),
  ]);

  for (const key of allKeys) {
    const fromObj = fromObjects[key] || {};
    const toObj = toObjects[key] || {};

    const fromProps = new Set(
      (fromObj.properties || []).map((p: any) => p.name),
    );
    const toProps = new Set((toObj.properties || []).map((p: any) => p.name));

    // ✅ Directional intent
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

  console.log(JSON.stringify(diff, null, 2));
}
