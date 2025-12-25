import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { normalizeIntersectEvent, toDlqEnvelope } from "./src/bridge/normalizeIntersectEvent.js";

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

function makeAjv() {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  for (const f of walk(SCHEMAS).filter(p => p.endsWith(".json"))) {
    const schema = JSON.parse(fs.readFileSync(f, "utf-8"));
    ajv.addSchema(schema, schema.$id);
  }
  return ajv;
}

const ajv = makeAjv();
const ADAM_SCHEMA_ID = "https://arc.example/schemas/adam/intersect-event-envelope/v1.json";
const DLQ_SCHEMA_ID = "https://arc.example/schemas/adam/dlq-envelope/v1.json";

const CORRELATION = {
  campaignId: "camp_123",
  experimentRunId: "run_456",
  traceId: "trace_789",
  instrumentControllerId: "controller_sim_01"
};

function readFixture(relPath) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, relPath), "utf-8"));
}

test("Normalize InstrumentActionCompletion -> ADAM envelope (matches golden + schema)", () => {
  const input = readFixture("events/action_completion.success.json");
  const expected = readFixture("adam_bridge/normalized_action_completion.json");

  const out = normalizeIntersectEvent(input, CORRELATION);
  expect(out.ok).toBe(true);

  // Schema validation (hard gate)
  const validate = ajv.getSchema(ADAM_SCHEMA_ID);
  expect(validate(out.value)).toBe(true);

  // Golden equality (tight feedback loop)
  expect(out.value).toEqual(expected);
});

test("Normalize InstrumentActivityStatusChange -> ADAM envelope (matches golden + schema)", () => {
  const input = readFixture("events/activity_status.in_progress.json");
  const expected = readFixture("adam_bridge/normalized_activity_in_progress.json");

  // Use deterministic occurredAt for events without timeBegin/timeEnd
  const out = normalizeIntersectEvent(input, CORRELATION, expected.occurredAt);
  expect(out.ok).toBe(true);

  const validate = ajv.getSchema(ADAM_SCHEMA_ID);
  expect(validate(out.value)).toBe(true);

  expect(out.value).toEqual(expected);
});

test("Normalization maps event types correctly", () => {
  const a = normalizeIntersectEvent(
    readFixture("events/action_completion.failure.json"),
    CORRELATION
  );
  const b = normalizeIntersectEvent(
    readFixture("events/activity_status.pending.json"),
    CORRELATION,
    "2025-01-01T00:00:01Z"
  );

  expect(a.ok).toBe(true);
  expect(b.ok).toBe(true);

  expect(a.value.eventType).toBe("adam.intersect.instrument_action_completion");
  expect(b.value.eventType).toBe("adam.intersect.instrument_activity_status_change");
});

test("Reject invalid envelope and return structured error object", () => {
  const bad = readFixture("invalid/missing_actionStatus.json");

  const out = normalizeIntersectEvent(bad, CORRELATION);

  expect(out.ok).toBe(false);
  expect(out.error).toBeDefined();
  expect(out.error.code).toBe("SCHEMA_VALIDATION_ERROR");
  expect(typeof out.error.message).toBe("string");
  // Helpful details for debugging / dead-lettering
  expect(out.error.details).toBeDefined();
  expect(Array.isArray(out.error.details.missing)).toBe(true);
  expect(out.error.details.missing).toContain("actionStatus");
});


test("Dead-letter non-contract messages: UNKNOWN_EVENT vs SCHEMA_VALIDATION_ERROR", () => {
  const unknown = readFixture("dead_letter/unknown_eventName.json");

  const out = normalizeIntersectEvent(unknown, CORRELATION);

  expect(out.ok).toBe(false);
  expect(out.error).toBeDefined();
  expect(out.error.code).toBe("UNKNOWN_EVENT");
  expect(typeof out.error.message).toBe("string");
  expect(out.error.details).toBeDefined();
  expect(out.error.details.eventName).toBe("TotallyUnknownEvent");

  // Sanity: this is NOT a schema validation error (envelope is structurally valid)
  expect(out.error.code).not.toBe("SCHEMA_VALIDATION_ERROR");
});


test("Standardized DLQ envelope wraps original + error + receivedAt + sourceTopic (schema error)", () => {
  const bad = readFixture("invalid/missing_actionStatus.json");
  const expected = readFixture("dlq/schema_validation_error.kafka.json");

  const failure = normalizeIntersectEvent(bad, CORRELATION);
  expect(failure.ok).toBe(false);

  const source = expected.source; // keep test deterministic
  const dlq = toDlqEnvelope(bad, failure, source, CORRELATION, expected.receivedAt);

  const validate = ajv.getSchema(DLQ_SCHEMA_ID);
  expect(validate(dlq)).toBe(true);
  expect(dlq).toEqual(expected);
});

test("Standardized DLQ envelope wraps UNKNOWN_EVENT consistently (dead-letter)", () => {
  const unknown = readFixture("dead_letter/unknown_eventName.json");
  const expected = readFixture("dlq/unknown_event.kafka.json");

  const failure = normalizeIntersectEvent(unknown, CORRELATION);
  expect(failure.ok).toBe(false);
  expect(failure.error.code).toBe("UNKNOWN_EVENT");

  const source = expected.source;
  const dlq = toDlqEnvelope(unknown, failure, source, CORRELATION, expected.receivedAt);

  const validate = ajv.getSchema(DLQ_SCHEMA_ID);
  expect(validate(dlq)).toBe(true);
  expect(dlq).toEqual(expected);
});
