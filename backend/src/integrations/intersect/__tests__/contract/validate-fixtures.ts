/**
 * Fixture Validation Script
 *
 * Validates all fixtures against their corresponding JSON schemas.
 * Run with: npx ts-node validate-fixtures.ts
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCHEMAS = path.join(ROOT, 'contracts', 'jsonschema');
const FIXTURES = path.join(ROOT, '../../../../test/fixtures/intersect');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);

// Load ALL schemas and add to AJV by $id
for (const f of walk(SCHEMAS).filter(p => p.endsWith('.json'))) {
  try {
    const schema = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (schema.$id) {
      ajv.addSchema(schema, schema.$id);
    }
  } catch (e) {
    console.error(`Failed to load schema ${f}:`, e);
  }
}

function validateAgainst(schemaId: string, data: unknown, filePath: string): boolean {
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    console.error(`❌ Schema not found: ${schemaId}`);
    return false;
  }
  const ok = validate(data);
  if (!ok) {
    console.error(`❌ Validation failed for ${filePath}:`);
    console.error(JSON.stringify(validate.errors, null, 2));
    return false;
  }
  return true;
}

const envelopeSchemaId = 'https://arc.example/schemas/instrument-controller/v0.1/IntersectEventEnvelope.schema.json';
const adamSchemaId = 'https://arc.example/schemas/adam/intersect-event-envelope/v1.json';

let allValid = true;

// Validate every fixture file by inferring schema based on folder naming convention
if (fs.existsSync(FIXTURES)) {
  for (const f of walk(FIXTURES).filter(p => p.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    const rel = path.relative(FIXTURES, f).replace(/\\/g, '/');

    let valid = true;

    if (rel.startsWith('events/')) {
      valid = validateAgainst(envelopeSchemaId, data, f);
    } else if (rel.startsWith('adam_bridge/')) {
      valid = validateAgainst(adamSchemaId, data, f);
    } else if (rel.endsWith('.command.json')) {
      valid = validateAgainst(
        'https://arc.example/schemas/instrument-controller/v0.1/PerformAction.command.json',
        data,
        f
      );
    } else if (rel.endsWith('.request.json')) {
      valid = validateAgainst(
        'https://arc.example/schemas/instrument-controller/v0.1/StartActivity.request.json',
        data,
        f
      );
    } else if (rel.endsWith('.reply.json') && rel.startsWith('get_activity_data/')) {
      valid = validateAgainst(
        'https://arc.example/schemas/instrument-controller/v0.1/GetActivityData.reply.json',
        data,
        f
      );
    }

    if (valid) {
      console.log(`✅ ${rel}`);
    } else {
      allValid = false;
    }
  }
} else {
  console.warn(`⚠️  Fixtures directory not found: ${FIXTURES}`);
}

if (allValid) {
  console.log('\n✅ All fixtures validated successfully');
} else {
  console.log('\n❌ Some fixtures failed validation');
  process.exit(1);
}
