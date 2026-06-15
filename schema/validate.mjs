// Validates every manifests/*.json against manifest.schema.json.
// Run: node schema/validate.mjs   (used by CI in .github/workflows/validate.yml)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv from "ajv";

const here = dirname(fileURLToPath(import.meta.url));
const manifestsDir = resolve(here, "../manifests");
const schema = JSON.parse(readFileSync(resolve(here, "manifest.schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const files = readdirSync(manifestsDir).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error("[validate] no manifests found in", manifestsDir);
  process.exit(1);
}

let failed = 0;
const ids = new Set();
for (const file of files) {
  const data = JSON.parse(readFileSync(resolve(manifestsDir, file), "utf8"));
  if (!validate(data)) {
    failed++;
    console.error(`\n✗ ${file}`);
    for (const err of validate.errors ?? []) {
      console.error(`   ${err.instancePath || "(root)"} ${err.message}`);
    }
    continue;
  }
  if (ids.has(data.id)) {
    failed++;
    console.error(`\n✗ ${file}: duplicate id "${data.id}"`);
    continue;
  }
  ids.add(data.id);
  console.log(`✓ ${file}  (${data.stage}, tier ${data.tier})`);
}

if (failed > 0) {
  console.error(`\n[validate] ${failed} manifest(s) failed.`);
  process.exit(1);
}
console.log(`\n[validate] all ${files.length} manifests valid.`);
