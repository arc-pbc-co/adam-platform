# Contract-test scaffolding: INTERSECT Instrument Controller + ADAM bridge

This scaffold gives Claude Code (and humans) a tight feedback loop to implement:

1. **Instrument Controller services** that satisfy the INTERSECT capability contract (v0.1)
2. **ADAM ↔ INTERSECT Event Bridge** that validates and normalizes async events

## What's inside
- `contracts/jsonschema/` — JSON Schemas (draft 2020-12) for:
  - INTERSECT Instrument Controller commands/requests/replies/events (v0.1)
  - Simulator event envelope (for transport)
  - ADAM normalized envelope (bridge output)
- `contracts/fixtures/` — Golden fixtures for requests/events/responses and one normalized ADAM event
- `simulator/python/` — Minimal FastAPI simulator that emits async events via SSE
- `tests/node/` — AJV-based schema validation + integration contract tests (hits simulator)

## How to use this in the ADAM repo
- Copy `contracts/jsonschema` under `backend/src/integrations/intersect/contracts/`
- Copy `contracts/fixtures` under `backend/test/fixtures/intersect/`
- Use `tests/node` either as:
  - a standalone contract-test package, or
  - fold it into your monorepo test runner (Jest/Vitest)

## Suggested development loop
1. Run simulator: `uvicorn app.main:app --port 8090`
2. Implement controller/bridge incrementally
3. Run:
   - `npm run validate:fixtures` (fast schema check)
   - `npm test` (end-to-end contract check)

## License
This is scaffold code meant to be adapted into ARC repositories.
