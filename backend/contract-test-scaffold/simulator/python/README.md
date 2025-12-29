# INTERSECT Instrument Controller Simulator (contract-test scaffold)

This simulator exposes a minimal HTTP surface for the INTERSECT `Instrument Controller` capability v0.1,
and emits async events via Server-Sent Events (SSE) at `/events`.

## Run
```bash
cd simulator/python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8090
```

## Endpoints (HTTP façade for contract testing)
- `GET  /healthz`
- `GET  /v0.1/actions` -> ListActions.reply
- `GET  /v0.1/activities` -> ListActivities.reply
- `POST /v0.1/actions/perform` (PerformAction.command) -> 202 Accepted, emits InstrumentActionCompletion
- `POST /v0.1/activities/start` (StartActivity.request) -> StartActivity.reply, emits status changes
- `POST /v0.1/activities/cancel` (CancelActivity.command) -> 202 Accepted, emits canceled status change
- `GET  /v0.1/activities/{activityId}/status` -> GetActivityStatus.reply
- `GET  /v0.1/activities/{activityId}/data` -> GetActivityData.reply

## Events (SSE)
`GET /events` streams JSON objects shaped like `IntersectEventEnvelope.schema.json`.
