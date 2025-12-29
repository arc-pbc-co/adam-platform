import fetch from "node-fetch";
import EventSource from "eventsource";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(process.cwd(), "../.."); // contract-test-scaffold/
const SCHEMAS = path.join(ROOT, "contracts", "jsonschema");

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
const envelopeSchemaId = "https://arc.example/schemas/instrument-controller/v0.1/IntersectEventEnvelope.schema.json";

let proc;
const BASE = "http://127.0.0.1:8090";

async function waitForHealthz() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/healthz`);
      if (r.ok) return;
    } catch {}
    await new Promise(res => setTimeout(res, 100));
  }
  throw new Error("Simulator did not become healthy");
}

beforeAll(async () => {
  // Start simulator as a subprocess (assumes Python deps installed; for CI use docker instead)
  const simPath = path.join(ROOT, "simulator", "python");
  proc = spawn("uvicorn", ["app.main:app", "--host", "127.0.0.1", "--port", "8090"], { cwd: simPath });
  proc.stderr.on("data", d => process.stderr.write(d));
  proc.stdout.on("data", d => process.stdout.write(d));
  await waitForHealthz();
});

afterAll(async () => {
  if (proc) proc.kill("SIGTERM");
});

test("PerformAction emits InstrumentActionCompletion that matches schema", async () => {
  const events = [];
  const es = new EventSource(`${BASE}/events`);
  es.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    events.push(data);
  };

  const cmd = { actionName: "HOME", actionOptions: [{ key: "speed", value: "fast" }] };
  const r = await fetch(`${BASE}/v0.1/actions/perform`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cmd)
  });
  expect(r.status).toBe(202);

  // Wait for completion event
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const found = events.find(e => e.eventName === "InstrumentActionCompletion");
    if (found) {
      const validate = ajv.getSchema(envelopeSchemaId);
      expect(validate(found)).toBe(true);
      expect(found.eventData.actionName).toBe("HOME");
      expect(found.eventData.actionStatus).toBe("ACTION_SUCCESS");
      es.close();
      return;
    }
    await new Promise(res => setTimeout(res, 50));
  }
  es.close();
  throw new Error("Did not observe InstrumentActionCompletion");
});

test("StartActivity emits status sequence and produces data products", async () => {
  const events = [];
  const es = new EventSource(`${BASE}/events`);
  es.onmessage = (msg) => events.push(JSON.parse(msg.data));

  const req = { activityName: "BUILD", activityOptions: [{ key: "layer_height_mm", value: "0.05" }] };
  const r = await fetch(`${BASE}/v0.1/activities/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req)
  });
  expect(r.ok).toBe(true);
  const body = await r.json();
  expect(body.activityId).toMatch(/^act_\d{4}$/);

  const activityId = body.activityId;

  const want = new Set(["ACTIVITY_PENDING", "ACTIVITY_IN_PROGRESS", "ACTIVITY_COMPLETED"]);
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline && want.size > 0) {
    for (const e of events.filter(e => e.eventName === "InstrumentActivityStatusChange")) {
      if (e.eventData.activityId === activityId) want.delete(e.eventData.activityStatus);
    }
    await new Promise(res => setTimeout(res, 50));
  }
  expect(want.size).toBe(0);

  // Fetch data
  const d = await fetch(`${BASE}/v0.1/activities/${activityId}/data`);
  const data = await d.json();
  expect(Array.isArray(data.products)).toBe(true);
  expect(data.products.length).toBeGreaterThanOrEqual(2);

  es.close();
});
