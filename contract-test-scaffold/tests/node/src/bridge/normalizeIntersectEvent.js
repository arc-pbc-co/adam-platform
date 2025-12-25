/**
 * ADAM ↔ INTERSECT bridge normalization (UNIT-TEST TARGET)
 *
 * Input: INTERSECT event envelope (eventName + eventData) as produced by controllers/brokers.
 * Output: ADAM-normalized envelope validated by:
 *   https://arc.example/schemas/adam/intersect-event-envelope/v1.json
 *
 * Return type (structured):
 *   - Success: { ok: true, value: <ADAM envelope> }
 *   - Failure: { ok: false, error: { code, message, details? } }
 *
 * Design goals:
 * - Deterministic + pure: no network calls; time derived from payload unless override is absent.
 * - Idempotent: same input => same output.
 * - Defensive: rejects malformed envelopes before they hit the ADAM event bus.
 */
export function normalizeIntersectEvent(envelope, correlation, occurredAtOverride = null) {
  const fail = (code, message, details = undefined) => ({
    ok: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) }
  });

  // Basic envelope validation (minimal "schema" checks)
  if (!envelope || typeof envelope !== "object") {
    return fail("SCHEMA_VALIDATION_ERROR", "Envelope must be an object");
  }
  const { eventName, eventData } = envelope;
  if (typeof eventName !== "string" || eventName.length === 0) {
    return fail("SCHEMA_VALIDATION_ERROR", "eventName must be a non-empty string");
  }
  if (!eventData || typeof eventData !== "object") {
    return fail("SCHEMA_VALIDATION_ERROR", "eventData must be an object");
  }

  // Correlation validation (required by ADAM envelope schema)
  if (!correlation || typeof correlation !== "object") {
    return fail("SCHEMA_VALIDATION_ERROR", "correlation must be an object");
  }
  const requiredCorr = ["campaignId", "experimentRunId", "traceId"];
  const missingCorr = requiredCorr.filter((k) => typeof correlation[k] !== "string" || correlation[k].length === 0);
  if (missingCorr.length) {
    return fail("SCHEMA_VALIDATION_ERROR", "Missing required correlation fields", { missing: missingCorr });
  }

  // Only pass through allowed correlation keys (avoid schema violations from extra keys)
  const corrOut = {
    campaignId: correlation.campaignId,
    experimentRunId: correlation.experimentRunId,
    traceId: correlation.traceId,
    ...(typeof correlation.instrumentControllerId === "string" ? { instrumentControllerId: correlation.instrumentControllerId } : {})
  };

  const occurredAt =
    occurredAtOverride ||
    (typeof eventData.timeEnd === "string" ? eventData.timeEnd : null) ||
    (typeof eventData.timeBegin === "string" ? eventData.timeBegin : null) ||
    new Date().toISOString();

  if (eventName === "InstrumentActionCompletion") {
    const req = ["actionName", "actionStatus", "timeBegin", "timeEnd"];
    const missing = req.filter((k) => typeof eventData[k] !== "string" || eventData[k].length === 0);
    if (missing.length) {
      return fail("SCHEMA_VALIDATION_ERROR", "InstrumentActionCompletion missing required fields", { missing });
    }
    return {
      ok: true,
      value: {
        eventType: "adam.intersect.instrument_action_completion",
        occurredAt,
        correlation: corrOut,
        payload: eventData
      }
    };
  }

  if (eventName === "InstrumentActivityStatusChange") {
    const req = ["activityId", "activityName", "activityStatus"];
    const missing = req.filter((k) => typeof eventData[k] !== "string" || eventData[k].length === 0);
    if (missing.length) {
      return fail("SCHEMA_VALIDATION_ERROR", "InstrumentActivityStatusChange missing required fields", { missing });
    }
    return {
      ok: true,
      value: {
        eventType: "adam.intersect.instrument_activity_status_change",
        occurredAt,
        correlation: corrOut,
        payload: eventData
      }
    };
  }

  return fail("UNKNOWN_EVENT", `Unsupported eventName: ${eventName}`, { eventName });
}


/**
 * Wrap a failed normalization result into a standardized DLQ envelope.
 *
 * @param {object} originalEnvelope - The original message (as received).
 * @param {{ok:false,error:{code:string,message:string,details?:object}}} failure - normalizeIntersectEvent(...) failure result.
 * @param {object} source - { broker, sourceTopic, ...optional metadata }
 * @param {object|null} correlation - optional correlation object (campaignId/experimentRunId/traceId/...)
 * @param {string|null} receivedAtOverride - optional ISO date-time for deterministic tests
 */
export function toDlqEnvelope(originalEnvelope, failure, source, correlation = null, receivedAtOverride = null) {
  const receivedAt = receivedAtOverride || new Date().toISOString();

  const base = {
    dlqVersion: "1",
    receivedAt,
    source,
    error: {
      code: failure?.error?.code || "UNKNOWN_ERROR",
      message: failure?.error?.message || "Unknown error",
      ...(failure?.error?.details !== undefined ? { details: failure.error.details } : {})
    },
    original: {
      envelope: originalEnvelope,
      raw: null
    }
  };

  if (correlation && typeof correlation === "object") {
    base.correlation = correlation;
  }

  return base;
}
