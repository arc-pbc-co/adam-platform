import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(process.cwd(), "../.."); // contract-test-scaffold/
const SCHEMAS = path.join(ROOT, "contracts", "jsonschema");
const FIXTURES = path.join(ROOT, "contracts", "fixtures");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);

// Load ALL schemas and add to AJV by $id
for (const f of walk(SCHEMAS).filter(p => p.endsWith(".json"))) {
  const schema = JSON.parse(fs.readFileSync(f, "utf-8"));
  ajv.addSchema(schema, schema.$id);
}

function validateAgainst(schemaId, data) {
  const validate = ajv.getSchema(schemaId);
  if (!validate) throw new Error(`Schema not found: ${schemaId}`);
  const ok = validate(data);
  if (!ok) {
    const err = JSON.stringify(validate.errors, null, 2);
    throw new Error(`Schema validation failed for ${schemaId}:\n${err}`);
  }
}

const envelopeSchemaId = "https://arc.example/schemas/instrument-controller/v0.1/IntersectEventEnvelope.schema.json";
const adamSchemaId = "https://arc.example/schemas/adam/intersect-event-envelope/v1.json";

// Validate every fixture file by inferring schema based on folder naming convention.
for (const f of walk(FIXTURES).filter(p => p.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(f, "utf-8"));
  const rel = path.relative(FIXTURES, f).replaceAll("\\", "/");

  if (rel.startsWith("events/")) {
    validateAgainst(envelopeSchemaId, data);
  } else if (rel.startsWith("adam_bridge/")) {
    validateAgainst(adamSchemaId, data);
  } else if (rel.endsWith(".command.json")) {
    validateAgainst("https://arc.example/schemas/instrument-controller/v0.1/PerformAction.command.json", data);
  } else if (rel.endsWith(".request.json")) {
    validateAgainst("https://arc.example/schemas/instrument-controller/v0.1/StartActivity.request.json", data);
  } else if (rel.endsWith(".reply.json") && rel.startsWith("get_activity_data/")) {
    validateAgainst("https://arc.example/schemas/instrument-controller/v0.1/GetActivityData.reply.json", data);
  }
}

console.log("✅ All fixtures validated");
