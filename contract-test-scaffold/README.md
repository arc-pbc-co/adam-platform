# Contract-test scaffolding: INTERSECT Instrument Controller + ADAM bridge

This scaffold gives Claude Code (and humans) a tight feedback loop to implement:

1. **Instrument Controller services** that satisfy the INTERSECT capability contract (v0.1)
2. **ADAM ↔ INTERSECT Event Bridge** that validates and normalizes async events
3. **Dead-Letter Queue (DLQ) handling** for failed event processing

## What's inside

### Contracts (`contracts/`)

#### JSON Schemas (`contracts/jsonschema/`)
- **instrument-controller/v0.1/** — INTERSECT Instrument Controller capability contract
  - Commands: `PerformAction`, `StartActivity`, `CancelActivity`
  - Events: `InstrumentActionCompletion`, `InstrumentActivityStatusChange`
  - Envelope schema for SSE transport
- **adam/** — ADAM platform schemas
  - `intersect-event-envelope.v1.json` — Normalized event envelope for ADAM event bus
  - `dlq-envelope.v1.json` — Dead-letter queue envelope for failed events
- **common.json** — Shared definitions (KeyValString, etc.)

#### Fixtures (`contracts/fixtures/`)
- **events/** — INTERSECT event examples (success, failure, status changes)
- **requests/** — Command request examples
- **responses/** — Expected response formats
- **adam_bridge/** — Golden fixtures for normalized ADAM events
- **invalid/** — Intentionally invalid fixtures for error testing
- **dead_letter/** — Unknown/unsupported event examples
- **dlq/** — Expected DLQ envelope outputs

### Simulator (`simulator/python/`)
Minimal FastAPI simulator that:
- Implements INTERSECT Instrument Controller v0.1 capability contract
- Emits async events via Server-Sent Events (SSE)
- Simulates BUILD, SINTER, DEPOWDER, INSPECT activities

### Tests (`tests/node/`)

#### Fixture Validation
```bash
npm run validate:fixtures
```
Validates all fixtures against their corresponding JSON schemas.

#### Bridge Normalization Tests
```bash
npm run test:bridge
```
Tests the ADAM ↔ INTERSECT event bridge:
- `normalizeIntersectEvent()` — Transforms INTERSECT events to ADAM envelopes
- `toDlqEnvelope()` — Wraps failed normalizations in DLQ envelopes
- Golden fixture comparison for deterministic testing
- Error classification: `SCHEMA_VALIDATION_ERROR` vs `UNKNOWN_EVENT`

#### Simulator Contract Tests
```bash
npm run test:simulator
```
End-to-end tests against the running simulator:
- Validates SSE event emissions match schema
- Tests action completion flow
- Tests activity status sequence (PENDING → IN_PROGRESS → COMPLETED)

#### All Tests
```bash
npm test
```
Runs both bridge and simulator tests.

## Bridge Normalization Module

The `tests/node/src/bridge/normalizeIntersectEvent.js` module provides:

### `normalizeIntersectEvent(envelope, correlation, occurredAtOverride?)`
Transforms INTERSECT events to ADAM-normalized envelopes.

**Returns:** `{ ok: true, value: <ADAM envelope> }` or `{ ok: false, error: { code, message, details? } }`

**Error codes:**
- `SCHEMA_VALIDATION_ERROR` — Missing required fields or invalid structure
- `UNKNOWN_EVENT` — Event type not in INTERSECT contract

### `toDlqEnvelope(originalEnvelope, failure, source, correlation?, receivedAtOverride?)`
Wraps a failed normalization into a standardized DLQ envelope.

**Supports brokers:** kafka, sqs, pubsub, nats, rabbitmq, other

## Quick Start

### 1. Start the simulator
```bash
cd simulator/python
pip install -r requirements.txt
uvicorn app.main:app --port 8090
```

### 2. Run tests
```bash
cd tests/node
npm install
npm run validate:fixtures  # Schema validation only
npm run test:bridge        # Bridge normalization tests
npm run test:simulator     # Contract tests (requires simulator)
npm test                   # All tests
```

## Integration with ADAM Platform

### Copy schemas and fixtures
```bash
# Schemas
cp -r contracts/jsonschema backend/src/integrations/intersect/contracts/

# Fixtures
cp -r contracts/fixtures backend/test/fixtures/intersect/
```

### Use bridge module
The `normalizeIntersectEvent.js` module can be adapted for your event bridge:
```javascript
import { normalizeIntersectEvent, toDlqEnvelope } from './bridge/normalizeIntersectEvent.js';

// Process incoming INTERSECT event
const result = normalizeIntersectEvent(intersectEvent, correlation);

if (result.ok) {
  // Publish to ADAM event bus
  await publishToAdam(result.value);
} else {
  // Send to DLQ
  const dlq = toDlqEnvelope(intersectEvent, result, sourceMetadata, correlation);
  await publishToDlq(dlq);
}
```

## License
This is scaffold code meant to be adapted into ARC repositories.
