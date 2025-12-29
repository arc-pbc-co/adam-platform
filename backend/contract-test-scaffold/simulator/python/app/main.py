from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dateutil.parser import isoparse
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse


def now_ts() -> str:
    # ISO 8601, UTC, "date-time" compatible (RFC3339 subset)
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class KeyValString(BaseModel):
    key: str = Field(min_length=1)
    value: str


class PerformActionCmd(BaseModel):
    actionName: str = Field(min_length=1)
    actionOptions: Optional[List[KeyValString]] = None


class CancelActivityCmd(BaseModel):
    activityId: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class StartActivityReq(BaseModel):
    activityName: str = Field(min_length=1)
    activityOptions: Optional[List[KeyValString]] = None
    activityDeadline: Optional[str] = None  # ISO date-time


@dataclass
class ActivityState:
    activityId: str
    activityName: str
    status: str = "ACTIVITY_PENDING"
    timeBegin: str = field(default_factory=now_ts)
    timeEnd: Optional[str] = None
    statusMsg: Optional[str] = None
    products: List[str] = field(default_factory=list)
    deadline: Optional[datetime] = None


app = FastAPI(title="INTERSECT Instrument Controller Simulator", version="0.1")

ACTIONS = ["HOME", "MOVE", "CALIBRATE"]
ACTIVITIES = ["BUILD", "SCAN"]

_event_queue: "asyncio.Queue[dict]" = asyncio.Queue()
_activities: Dict[str, ActivityState] = {}
_next_activity_num = 1


async def emit(event_name: str, event_data: dict) -> None:
    await _event_queue.put({"eventName": event_name, "eventData": event_data})


@app.get("/healthz")
def healthz():
    return {"ok": True, "ts": now_ts()}


@app.get("/v0.1/actions")
def list_actions():
    return {"actionNames": ACTIONS}


@app.get("/v0.1/activities")
def list_activities():
    return {"activityNames": ACTIVITIES}


@app.post("/v0.1/actions/perform", status_code=202)
async def perform_action(cmd: PerformActionCmd):
    # Simulate a quick async action completion
    t_begin = now_ts()

    async def complete():
        await asyncio.sleep(0.2)
        t_end = now_ts()
        status = "ACTION_SUCCESS"
        msg = None
        # deterministic "failure" trigger for contract tests
        if cmd.actionName.upper() == "CALIBRATE":
            status = "ACTION_FAILURE"
            msg = "Calibration target not found"
        payload = {
            "actionName": cmd.actionName,
            "actionStatus": status,
            "timeBegin": t_begin,
            "timeEnd": t_end,
        }
        if msg:
            payload["statusMsg"] = msg
        await emit("InstrumentActionCompletion", payload)

    asyncio.create_task(complete())
    return JSONResponse({"accepted": True}, status_code=202)


@app.post("/v0.1/activities/start")
async def start_activity(req: StartActivityReq):
    global _next_activity_num

    if req.activityName not in ACTIVITIES:
        return {"activityId": "", "errorMsg": f"Unknown activityName: {req.activityName}"}

    activity_id = f"act_{_next_activity_num:04d}"
    _next_activity_num += 1

    deadline_dt = None
    if req.activityDeadline:
        try:
            deadline_dt = isoparse(req.activityDeadline)
        except Exception as e:
            return {"activityId": "", "errorMsg": f"Invalid activityDeadline: {e}"}

    st = ActivityState(activityId=activity_id, activityName=req.activityName, deadline=deadline_dt)
    _activities[activity_id] = st

    # Emit initial status change (pending) and progress transitions
    await emit("InstrumentActivityStatusChange", {
        "activityId": st.activityId,
        "activityName": st.activityName,
        "activityStatus": st.status,
    })

    async def run():
        # pending -> in progress
        await asyncio.sleep(0.2)
        st.status = "ACTIVITY_IN_PROGRESS"
        await emit("InstrumentActivityStatusChange", {
            "activityId": st.activityId,
            "activityName": st.activityName,
            "activityStatus": st.status,
        })

        # Complete unless deadline is already exceeded
        await asyncio.sleep(0.5)
        if st.deadline and datetime.now(timezone.utc) > st.deadline.astimezone(timezone.utc):
            st.status = "ACTIVITY_CANCELED"
            st.statusMsg = "Deadline exceeded"
            st.timeEnd = now_ts()
            await emit("InstrumentActivityStatusChange", {
                "activityId": st.activityId,
                "activityName": st.activityName,
                "activityStatus": st.status,
                "statusMsg": st.statusMsg,
            })
            return

        st.status = "ACTIVITY_COMPLETED"
        st.timeEnd = now_ts()
        # Create a couple of fake data products
        st.products = [str(uuid.uuid4()), str(uuid.uuid4())]
        await emit("InstrumentActivityStatusChange", {
            "activityId": st.activityId,
            "activityName": st.activityName,
            "activityStatus": st.status,
        })

    asyncio.create_task(run())
    return {"activityId": st.activityId}


@app.post("/v0.1/activities/cancel", status_code=202)
async def cancel_activity(cmd: CancelActivityCmd):
    st = _activities.get(cmd.activityId)
    if not st:
        raise HTTPException(status_code=404, detail="Unknown activityId")
    st.status = "ACTIVITY_CANCELED"
    st.timeEnd = now_ts()
    st.statusMsg = cmd.reason
    await emit("InstrumentActivityStatusChange", {
        "activityId": st.activityId,
        "activityName": st.activityName,
        "activityStatus": st.status,
        "statusMsg": st.statusMsg,
    })
    return {"accepted": True}


@app.get("/v0.1/activities/{activity_id}/status")
def get_activity_status(activity_id: str):
    st = _activities.get(activity_id)
    if not st:
        raise HTTPException(status_code=404, detail="Unknown activityId")
    payload: Dict[str, Any] = {
        "activityStatus": st.status,
        "timeBegin": st.timeBegin,
    }
    if st.timeEnd:
        payload["timeEnd"] = st.timeEnd
    if st.statusMsg:
        payload["statusMsg"] = st.statusMsg
    return payload


@app.get("/v0.1/activities/{activity_id}/data")
def get_activity_data(activity_id: str):
    st = _activities.get(activity_id)
    if not st:
        raise HTTPException(status_code=404, detail="Unknown activityId")
    # Spec allows optional errorMsg if products can't be returned yet
    if st.status != "ACTIVITY_COMPLETED":
        return {"products": [], "errorMsg": "Data not ready"}
    return {"products": st.products}


@app.get("/events")
async def events():
    async def gen():
        while True:
            evt = await _event_queue.get()
            # SSE expects strings
            yield {"event": evt["eventName"], "data": json.dumps(evt)}
    return EventSourceResponse(gen())
