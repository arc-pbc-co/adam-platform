Context is pulled from the key architectural signals from:

* **ADAM Platform repo** (top-level README \+ architecture section embedded in the repo landing page) ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
* **INTERSECT docs** (System-of-Systems \+ Microservices Architecture, including instrument-controller capability definitions, data-management tiers, comms model, and orchestration patterns) ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/ums.html))  
* **INTERSECT repo structure/README** (it’s primarily the RST source for the docs) ([GitHub](https://github.com/ORNL/intersect-architecture))

**Note on repo deep-dive**: GitHub’s file renderer returned “error while loading” for many individual file pages (e.g., `docker-compose.yml`, `package.json`, `BACKEND_SETUP.md`) even though the repo landing page content was readable. I’m therefore grounding ADAM specifics in what is visible on the main page (README \+ architecture section), and explicitly calling out assumptions where deeper source inspection would normally confirm details. ([GitHub](https://github.com/arc-pbc-co/adam-platform/blob/main/docker-compose.yml))

---

## **1\. Executive Summary**

ARC should integrate INTERSECT as **the lab-automation and scientific-data substrate** underneath ADAM’s AI-driven closed-loop discovery workflows. ADAM remains the product “brain” (campaign design, planner–executor–critic orchestration, UI, and domain models like Campaign/ExperimentRun/Sample/MaterialSpec), while INTERSECT provides the **standardized microservice capability model** for instrument command/control, experiment execution, and data management across heterogeneous lab and HPC/edge environments. ([GitHub](https://github.com/arc-pbc-co/adam-platform))

The core strategy is a **capability-wrapping integration**: deploy INTERSECT-aligned microservices (Instrument Controllers, Data Management services, and orchestration patterns) near instruments/edge, and add an **ADAM↔INTERSECT Integration Layer** in the ADAM backend that (1) translates ADAM WorkOrders/ExperimentRuns into INTERSECT Tasks/Commands/Actions and (2) bridges INTERSECT’s asynchronous status/event streams into ADAM’s event bus \+ observability \+ experiment records. This preserves INTERSECT’s architectural guidelines (message-based comms, capability contracts, orchestration/retry patterns, and deployment patterns like sidecars/ambassador/service mesh) while keeping ADAM’s core AI/ML loop intact. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/ors.html))

---

## **Phase 1: System Discovery**

### **ADAM Platform Analysis (from repo landing-page README/architecture section)**

* **Core architecture pattern**: event-driven, service-oriented backend supporting autonomous experiment loops; UI \+ orchestrator \+ telemetry/analytics. ADAM positions itself as an “AI orchestrator that controls physical hardware…to run autonomous materials experiments in closed loops.” ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
* **Primary languages/frameworks**: Frontend React \+ TypeScript (Vite, Tailwind, Framer Motion, Recharts). AI uses Google Gemini. ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
* **Data models & persistence**: ADAM’s architecture section lists domain entities like **Campaign, ExperimentRun, Sample, MaterialSpec, WorkOrder, AnalysisResult, AgentRun, EventLog** and references a time-series store (TimescaleDB) plus vector DB (Qdrant). ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
* **API surface**: architecture section references a **REST \+ WebSocket gateway** (not confirmed from code due to GitHub renderer issues, but stated in repo content). ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
* **AI/ML pipeline architecture**: planner–executor–critic agent loop, with high-throughput experiment iteration and analytics feedback. ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
* **AuthN/AuthZ model**: not visible in the accessible repo excerpt; treated as an integration assumption (see “Assumptions”).  
* **Deployment topology**: architecture excerpt describes multiple infrastructure components (DBs, message bus, observability stack), implying containerized deployment and microservice composition. ([GitHub](https://github.com/arc-pbc-co/adam-platform))

### **INTERSECT Analysis (from docs \+ repo)**

* **Scientific automation patterns & abstractions**:  
  * System-of-systems decomposition including **Orchestration System (OrS)**, **Data Management System (DMS)**, and **Communication System (CS)**. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/ors.html))  
  * OrS uses **Tasks/Commands/Actions** and **Workflows** to place/schedule execution across systems. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/ors.html))  
* **Instrument integration interfaces**:  
  * “Scientific Instrument Controllers” are adapters providing command/control \+ state inspection for instruments and typically integrate with **ROS or EPICS**. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/control.html))  
  * Concrete capability contract **Capability – Experiment Control :: Instrument Controller** defines request-reply methods and asynchronous events (detailed below). ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/capabilities/instrument-control.html))  
* **Data acquisition & streaming**:  
  * Experiment Data services focus on acquisition/initial validation and making results available for campaign workflows. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/data.html))  
  * DMS is tiered and includes data transport, storage management, registration, repository and catalog services. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/dms.html))  
* **Workflow orchestration model**:  
  * Interactions can be managed via **Conductor (Orchestrator)** or **Choreography** approaches; choreography aligns naturally with asynchronous completion events. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/conductor-choreography.html))  
  * Retry/recovery guidance includes the **Scheduler–Agent–Supervisor** pattern with persistent state tracking for distributed orchestration. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/retry-recovery.html))  
* **Message passing & event systems**:  
  * CS provides point-to-point and pub/sub messaging semantics as a built-in capability of clients/services. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/cs.html))  
* **Extensibility / plugin architecture**:  
  * INTERSECT is primarily an architecture/specification (the repo is the documentation source). Extensibility is expressed through “adapters” and capability-based microservices rather than a single plugin runtime. ([GitHub](https://github.com/ORNL/intersect-architecture))

---

## **Phase 2: Integration Analysis**

### **Alignment Points**

1. **Autonomous experiment loops**: both target autonomous experimentation and AI-driven discovery workflows. ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
2. **Message-first integration**: INTERSECT CS (pub/sub \+ point-to-point) aligns with ADAM’s event-driven backend posture and listed messaging components. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/cs.html))  
3. **Campaign ↔ workflow mapping**: INTERSECT OrS workflows and DMS campaign-oriented services align with ADAM’s Campaign/ExperimentRun/WorkOrder abstractions. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/ors.html))  
4. **Instrument controller contract**: INTERSECT’s explicit instrument control capability provides a clean boundary for ADAM to request actions/activities and subscribe to completion/status events. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/capabilities/instrument-control.html))

### **Friction Points**

1. **Spec vs implementation**: INTERSECT provides architecture \+ capability definitions, not necessarily drop-in services for every capability; ARC will implement or adopt reference implementations per instrument/site. ([GitHub](https://github.com/ORNL/intersect-architecture))  
2. **Latency & safety constraints**: ADAM’s cloud AI loop must respect lab-real-time constraints; choreography/event-driven completion reduces coupling but needs robust state \+ retry. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/conductor-choreography.html))  
3. **Identity/security model mismatch**: INTERSECT docs emphasize standardized comms; ADAM’s concrete AuthN/AuthZ isn’t visible in the accessible excerpt, so the integration must define a security envelope explicitly. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/cs.html))

### **Data Model Mapping (proposed)**

* **ADAM WorkOrder** → INTERSECT **Task** (unit of orchestrated work)  
* **ADAM ExperimentRun** → INTERSECT **Workflow instance** (Task graph / workflow pattern execution)  
* **ADAM Sample/MaterialSpec** → INTERSECT **Parameter Configuration** inputs \+ metadata entities in DMS catalog  
* **ADAM AnalysisResult / telemetry** → DMS-registered data products \+ time-series streams; references stored back onto ExperimentRun

---

## **Phase 3: Architecture Design (Implementation-Ready)**

### **Assumptions (explicit)**

1. ADAM backend exposes a gateway (REST \+ WebSocket) and uses a message bus/event log as described in the repo architecture section. ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
2. ADAM can accept new microservices under `/services` and backend integration code under `/backend` (directories exist). ([GitHub](https://github.com/arc-pbc-co/adam-platform))  
3. ARC will deploy INTERSECT-aligned services at the **edge/lab network** (close to instruments) and allow ADAM cloud/backend to communicate through a secured boundary (ambassador proxy or service mesh). INTERSECT deployment patterns support this approach. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/deployment/patterns.html))

---

## **2\. Architecture Decision Records (ADRs)**

```
## ADR-001: Use INTERSECT Capability Contracts as the Lab Automation Boundary

**Status**: Proposed

**Context**: ADAM needs a stable, vendor-agnostic integration boundary for instruments, experiment execution, and scientific data products. INTERSECT defines capability-level interfaces for instrument controllers (request/reply + async events) and experiment/data services.

**Decision**: ADAM will integrate with lab resources exclusively through INTERSECT capability contracts (starting with Capability - Experiment Control :: Instrument Controller), implemented by INTERSECT-aligned microservices deployed near instruments.

**Consequences**:
- (+) Clear separation of concerns; ADAM orchestrator remains domain/AI focused.
- (+) Easier to add new instruments via controllers/adapters.
- (-) ARC must implement/operate controller services per instrument/vendor.
- (-) Requires schema mapping between ADAM domain and INTERSECT capability payloads.

**Alternatives Considered**:
- Direct vendor SDK integrations inside ADAM (rejected: brittle, non-standard).
- Custom ARC-only instrument API (rejected: reinvents capability model already defined by INTERSECT).
```

```
## ADR-002: Event Bridge + Choreography for Instrument Execution State

**Status**: Proposed

**Context**: INTERSECT emphasizes asynchronous completion/status events; ADAM must update ExperimentRun state and trigger downstream analysis/decisions as events arrive.

**Decision**: Use a dedicated ADAM↔INTERSECT Event Bridge that subscribes to INTERSECT async events (e.g., InstrumentActionCompletion, InstrumentActivityStatusChange) and republishes normalized ADAM events. Downstream ADAM workflows use choreography (event-driven triggers) where practical.

**Consequences**:
- (+) Lower coupling and better latency characteristics for async operations.
- (+) Aligns with INTERSECT guidance on choreography benefits for async systems.
- (-) Requires durable state tracking to correlate events to ExperimentRuns.

**Alternatives Considered**:
- Pure Conductor/orchestrator polling for status (rejected: latency + load).
- Tight synchronous RPC sequencing (rejected: fragile across lab networks).
```

```
## ADR-003: Implement Scheduler–Agent–Supervisor Pattern for Resilience

**Status**: Proposed

**Context**: Lab operations and external resource adapters are failure-prone; orchestration must handle retries and recovery consistently across distributed services.

**Decision**: Build an orchestration state store and implement Scheduler–Agent–Supervisor responsibilities within ADAM’s workflow engine (or as a new orchestration component). Supervisory logic monitors incomplete/failed steps and triggers retries/recovery actions.

**Consequences**:
- (+) Robust recovery; consistent system state.
- (+) Matches INTERSECT retry/recovery guidance.
- (-) Adds complexity (state machine + persistence + idempotency).

**Alternatives Considered**:
- Best-effort retries in each service (rejected: inconsistent global state).
- Manual operator intervention (rejected: undermines autonomy goal).
```

```
## ADR-004: Secure Boundary via Ambassador Proxy (Edge-to-Cloud)

**Status**: Proposed

**Context**: Instrument controllers live on lab networks; ADAM orchestration/UI may live in cloud. Need secure comms, routing, and resiliency.

**Decision**: Place an ambassador proxy at the lab edge to terminate mTLS, handle service discovery/routing to local INTERSECT services, and enforce policy. Optionally graduate to service mesh as deployment scales.

**Consequences**:
- (+) Clean security boundary; reduced complexity for app services.
- (+) Leverages INTERSECT deployment patterns (Ambassador/Service Mesh).
- (-) Requires operating proxy/mesh infrastructure.

**Alternatives Considered**:
- Direct exposure of instrument services to cloud (rejected: security risk).
- VPN-only without application-layer policy (rejected: weak service controls).
```

---

## **3\. System Context Diagram (text for diagram generation)**

**Actors / External Systems**

* Scientist / Operator (Web UI)  
* Physical Instruments & Robots (Desktop Metal printers, reactors, microscopes, etc.)  
* Instrument Control Software (ROS, EPICS)  
* Storage Backends (Object store, file systems, DBs)  
* Compute (Edge nodes, HPC/Cloud)

**System Boundaries**

* **ADAM Platform (ARC)**: UI \+ AI Orchestrator \+ Campaign/Experiment services \+ Data/Vector stores \+ Event bus  
* **INTERSECT Federated Ecosystem (Lab/Edge)**: Orchestration System (OrS), Communication System (CS), Data Management System (DMS), Instrument Controller microservices

**Key Flows**

1. Operator → ADAM UI → ADAM API Gateway  
2. ADAM Orchestrator → ADAM↔INTERSECT Gateway → INTERSECT OrS/Instrument Controllers  
3. Instrument Controllers ↔ ROS/EPICS ↔ Instruments/Robots  
4. Instrument Controllers → DMS (store/publish data products/streams)  
5. INTERSECT async events → ADAM Event Bridge → ADAM EventLog/Timeseries \+ triggers  
6. ADAM Analysis services → results → ADAM DB/Qdrant → UI dashboards

(Instrument controllers abstract operational details and publish data products/streams; OrS manages tasks/workflows; CS provides point-to-point \+ pub/sub messaging.) ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/control.html))

---

## **4\. Component Architecture**

### **New Components Required (in ADAM)**

1. **IntersectGatewayService**  
* **Purpose**: Translate ADAM domain intents (WorkOrder / ExperimentRun steps) into INTERSECT Tasks/Commands/Actions and invoke capability methods.  
* **Responsibilities**:  
  * Build instrument “Activity” requests from experiment plans  
  * Maintain correlation IDs (ExperimentRun ↔ activityId/taskId)  
  * Enforce idempotency keys for actions  
* **Interfaces**:  
  * `POST /integrations/intersect/execute` (internal)  
  * NATS subjects: `adam.intersect.command.*`  
* **Dependencies**: ADAM workflow engine, event bus, auth policy.  
2. **IntersectEventBridge**  
* **Purpose**: Subscribe to INTERSECT async events and normalize into ADAM events/state transitions.  
* **Responsibilities**:  
  * Subscribe: `InstrumentActionCompletion`, `InstrumentActivityStatusChange`  
  * Update ExperimentRun state; append EventLog; emit downstream triggers  
* **Dependencies**: message broker, persistence (EventLog/Timescale), observability.  
3. **IntersectSchemaMapper**  
* **Purpose**: Map ADAM entities (Sample/MaterialSpec/ExperimentRun) to INTERSECT capability payloads and data product registrations.  
* **Responsibilities**:  
  * Canonical JSON schemas for commands/events  
  * Versioned mapping layer (supports evolution)  
* **Dependencies**: JSON schema tooling, UUID mapping tables.  
4. **EdgeConnectivityProxy (Ambassador)**  
* **Purpose**: Secure routing from ADAM to lab-local INTERSECT services.  
* **Responsibilities**: mTLS, routing, retries/timeouts, rate limits, auditing.  
* **Dependencies**: Envoy/Nginx/Linkerd/Istio (choose per ADR-004). ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/deployment/patterns.html))

### **Modified ADAM Components**

1. **Workflow Engine / Orchestrator (Nova / planner-executor-critic loop)**  
* **Changes**:  
  * Add “instrument execution” action type backed by IntersectGatewayService  
  * Implement Scheduler role \+ durable step state (for retries/recovery)  
  * Consume normalized events from IntersectEventBridge  
* **Impact**: Medium-high; touches orchestration state model and failure handling. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/retry-recovery.html))  
2. **ExperimentRun / EventLog persistence**  
* **Changes**:  
  * Add correlation fields: `intersect_activity_id`, `intersect_task_id`, `instrument_controller_id`  
  * Store mapping of INTERSECT data product UUIDs to ADAM artifact IDs  
* **Impact**: Medium; DB migrations \+ API updates. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/capabilities/instrument-control.html))  
3. **API Gateway**  
* **Changes**:  
  * Expose experiment execution status (streamed via WS) driven by INTERSECT events  
  * Add admin endpoints for controller discovery/health  
* **Impact**: Medium; new endpoints \+ auth enforcement. ([GitHub](https://github.com/arc-pbc-co/adam-platform))

### **INTERSECT Components to Adopt (conceptually, as deployable services)**

1. **Instrument Controller microservices**  
* **Source**: INTERSECT capability definition for instrument controllers (Experiment Control).  
* **Adaptation**:  
  * Implement per instrument (Desktop Metal fleet, robots, sensors)  
  * Integrate with ROS/EPICS/vendor SDKs  
  * Publish data products to DMS; emit async completion/status events  
* **Integration pattern**: **Wrap** (ADAM calls through contracts; controllers remain separate services). ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/control.html))  
2. **Data Management System services**  
* **Source**: DMS tiered architecture \+ listed services (transport, storage management, registration, repository/catalog).  
* **Adaptation**:  
  * Map Tier-0 storage abstraction to ARC’s storage (object store, DB)  
  * Ensure every generated data product gets a UUID and catalog metadata  
* **Integration pattern**: **Reference/Adopt** (use INTERSECT service decomposition; implement with ARC infra). ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/dms.html))  
3. **Communication System semantics**  
* **Source**: CS definition (point-to-point \+ pub/sub messaging).  
* **Adaptation**:  
  * Use ARC’s message broker to implement these semantics (subjects/topics, request/reply)  
* **Integration pattern**: **Embed semantics / shared broker**. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/cs.html))

---

## **5\. Integration Patterns**

### **Data Integration**

* **Synchronous vs async**:  
  * Command issuance: request/reply for `StartActivity`, `GetActivityStatus`, etc.  
  * Completion & progress: async events (`InstrumentActionCompletion`, `InstrumentActivityStatusChange`) ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/capabilities/instrument-control.html))  
* **Transformations**:  
  * ADAM `ExperimentPlan` → INTERSECT `activityName + activityOptions`  
  * INTERSECT product UUID list → ADAM `artifact_id` \+ metadata \+ storage URI  
* **Schema mapping**:  
  * Versioned JSON schema registry in ADAM (`v1alpha`, `v1beta`), with explicit “compatibility guarantees”.

### **Service Integration**

* **Gateway pattern**: ADAM IntersectGatewayService acts as a façade; it should not embed instrument specifics.  
* **Resilience**:  
  * Timeouts \+ retries implemented per INTERSECT guidance (retry count \+ delay/backoff); supervisory recovery for multi-step tasks. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/retry-recovery.html))  
* **Service mesh considerations**:  
  * Start with Ambassador proxy boundary; migrate to mesh for fleet-scale observability/security. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/deployment/patterns.html))

### **Event Integration**

* **Event schemas**:  
  * Use INTERSECT event fields as-is inside an `intersect.*` namespace; add ADAM envelope fields (`experimentRunId`, `campaignId`, `traceId`).  
* **Broker requirements**:  
  * Must support pub/sub \+ request/reply semantics. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/cs.html))  
* **Event sourcing**:  
  * Persist all normalized events to EventLog; ExperimentRun state is derived (materialized view) from event stream.

---

## **6\. Interface Contracts (key subset)**

```
interface: InstrumentController
description: INTERSECT capability for command/control and state inspection of scientific instruments.
methods:
  - name: ListActions
    input: {}
    output:
      actionNames: "List<String>"
    errors: ["controller_unavailable", "internal_error"]

  - name: GetActionDescription
    input:
      actionName: "String"
    output:
      actionDescription: "String"
    errors: ["unknown_action", "controller_unavailable"]

  - name: PerformAction
    input:
      actionName: "String"
      actionOptions: "List<KeyVal<String>>"
      idempotencyKey: "String"
    output: {}
    errors: ["invalid_options", "controller_busy", "controller_unavailable"]
    async_events: ["InstrumentActionCompletion"]

  - name: ListActivities
    input: {}
    output:
      activityNames: "List<String>"
    errors: ["controller_unavailable"]

  - name: GetActivityDescription
    input:
      activityName: "String"
    output:
      activityDescription: "String"
    errors: ["unknown_activity"]

  - name: StartActivity
    input:
      activityName: "String"
      activityOptions: "List<KeyVal<String>>"
      activityDeadline: "Timestamp"
      correlation:
        campaignId: "String"
        experimentRunId: "String"
    output:
      activityId: "String"
      errorMsg: "String"
    errors: ["invalid_options", "controller_busy", "deadline_invalid"]
    async_events: ["InstrumentActivityStatusChange"]

  - name: GetActivityStatus
    input:
      activityId: "String"
    output:
      activityStatus: "String"
      statusMsg: "String"
      timeBegin: "Timestamp"
      timeEnd: "Timestamp"
      errorMsg: "String"
    errors: ["unknown_activity_id"]

  - name: GetActivityData
    input:
      activityId: "String"
    output:
      products: "List<UUID>"
      errorMsg: "String"
    errors: ["unknown_activity_id", "data_not_ready"]

events:
  - name: InstrumentActionCompletion
    payload:
      actionName: "String"
      actionStatus: "String"
      timeBegin: "Timestamp"
      timeEnd: "Timestamp"
      statusMsg: "String"
      correlation:
        experimentRunId: "String"
        traceId: "String"

  - name: InstrumentActivityStatusChange
    payload:
      activityId: "String"
      activityName: "String"
      activityStatus: "String"
      statusMsg: "String"
      correlation:
        experimentRunId: "String"
        traceId: "String"
```

(Methods/events grounded directly in the INTERSECT Instrument Controller capability definition.) ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/capabilities/instrument-control.html))

```
interface: DataManagementCatalog
description: Register and query scientific data products produced by activities within a campaign.
methods:
  - name: RegisterDataProduct
    input:
      productUuid: "UUID"
      activityId: "String"
      campaignId: "String"
      storageUri: "String"
      contentType: "String"
      metadata: "Map<String,String>"
    output:
      catalogId: "String"
    errors: ["storage_unreachable", "metadata_invalid"]

  - name: QueryByCampaign
    input:
      campaignId: "String"
      filters: "Map<String,String>"
    output:
      products: "List<{productUuid: UUID, storageUri: String, metadata: Map<String,String>}>"
    errors: ["catalog_unavailable"]
```

(Aligned with INTERSECT DMS/Data Catalog responsibilities and DMS service decomposition.) ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/dms.html))

---

## **7\. Data Flow Specifications**

### **Flow A: Closed-loop experiment execution (core)**

* **Source**: ADAM Orchestrator (ExperimentRun \+ WorkOrder)  
* **Transform**: `ExperimentPlan` → `StartActivity(activityName, activityOptions, deadline)`  
* **Destination**: INTERSECT InstrumentController → instrument/robot control software  
* **Latency**:  
  * Command issuance: sub-second to a few seconds  
  * Activity runtime: minutes-hours (instrument dependent)  
* **Volume**: low command volume; high event \+ data volume (depends on sensors)  
* **Notes**: Completion/status via async events; ADAM updates ExperimentRun state and triggers analysis. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/capabilities/instrument-control.html))

### **Flow B: Data products and metadata**

* **Source**: InstrumentController `GetActivityData()` products UUID list  
* **Transform**:  
  1. Fetch/store raw data to Tier-0 storage  
  2. Register product \+ metadata in catalog  
  3. Write ADAM artifact linkage (productUuid ↔ artifactId)  
* **Destination**: INTERSECT DMS repository/catalog \+ ADAM DB/Qdrant  
* **Latency**: seconds-minutes post-activity completion  
* **Volume**: potentially large binaries \+ many metadata rows. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/dms.html))

### **Flow C: Telemetry / real-time analytics**

* **Source**: Controllers publishing streams / periodic status  
* **Transform**: normalize metrics → time-series points  
* **Destination**: ADAM time-series \+ dashboards  
* **Latency**: near-real-time (sub-second to few seconds)  
* **Volume**: high (instrument dependent). ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/sos/logical/systems/cs.html))

---

## **8\. Implementation Roadmap**

### **Phase 1: Foundation**

* Implement **IntersectGatewayService** \+ **IntersectEventBridge** \+ **SchemaMapper**  
* Add DB migration for correlation IDs \+ data product mapping  
* Stand up edge connectivity boundary (Ambassador proxy) and basic mTLS  
* Build a **simulated instrument controller** to validate contracts end-to-end  
* **Estimated complexity**: Medium (integration scaffolding \+ state model changes)

### **Phase 2: Core Integration**

* Implement first real **Instrument Controller** (Desktop Metal printer fleet) following Instrument Controller capability contract (actions/activities \+ async events)  
* Implement minimal **DMS Catalog registration** for produced artifacts  
* Integrate ADAM orchestrator planning to emit “StartActivity” steps  
* End-to-end testing:  
  * contract tests for controller methods/events  
  * failure injection tests (timeouts, retries, partial completion) per retry/recovery guidance ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/retry-recovery.html))

### **Phase 3: Enhancement**

* Implement Supervisor logic \+ full Scheduler–Agent–Supervisor pattern (durable orchestration)  
* Expand to additional instruments (robots, sensors, characterization tools)  
* Upgrade deployment to service mesh for richer observability/security where needed ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/deployment/patterns.html))  
* Performance tuning (stream ingestion, catalog query patterns, vectorization pipeline)

---

## **9\. File Change Manifest (adam-platform)**

```
changes:
  new_directories:
    - path: backend/src/integrations/intersect
      purpose: Intersect integration layer (clients, schemas, mapping, bridge logic)
    - path: services/intersect-edge
      purpose: Deployable edge services (controllers, proxies, local adapters)

  new_files:
    - path: backend/src/integrations/intersect/contracts/instrument_controller.v0_1.yaml
      purpose: Canonical INTERSECT Instrument Controller contract (methods/events) for codegen + validation
      template_source: INTERSECT docs capability "Experiment Control :: Instrument Controller"

    - path: backend/src/integrations/intersect/IntersectGatewayService.ts
      purpose: Translate ADAM WorkOrders/ExperimentRuns into INTERSECT actions/activities; manage idempotency + correlation

    - path: backend/src/integrations/intersect/IntersectEventBridge.ts
      purpose: Subscribe to INTERSECT events; normalize and publish ADAM events; persist to EventLog

    - path: backend/src/integrations/intersect/SchemaMapper.ts
      purpose: Versioned mapping between ADAM domain entities and INTERSECT payloads

    - path: backend/src/integrations/intersect/CorrelationStore.ts
      purpose: Persist mappings (experimentRunId <-> activityId/taskId, productUuid <-> artifactId)

    - path: services/intersect-edge/instrument_controller_desktop_metal/app.py
      purpose: First instrument controller implementation (Desktop Metal fleet adapter) exposing INTERSECT capability semantics

    - path: services/intersect-edge/ambassador/envoy.yaml
      purpose: Edge ambassador proxy config (mTLS termination, routing, retries, rate limits)

  modified_files:
    - path: backend/src/workflows/WorkflowEngine.ts
      changes:
        - description: Add step type "intersect.start_activity" and "intersect.perform_action"
          location: step dispatch / executor registry
        - description: Persist orchestration step state for retry/recovery; emit traceId/correlation
          location: workflow state machine + persistence adapter

    - path: backend/src/models/ExperimentRun.ts
      changes:
        - description: Add fields intersect_activity_id, intersect_task_id, instrument_controller_id
          location: model definition + migrations

    - path: backend/src/api/routes/experiments.ts
      changes:
        - description: Expose execution status streaming sourced from normalized events
          location: websocket/event endpoints

    - path: docker-compose.yml
      changes:
        - description: Add services for intersect-edge simulator, ambassador proxy, and (optional) object storage for artifacts
          location: services section

  dependencies:
    - name: ajv
      version: "^8"
      reason: JSON-schema validation for versioned contracts (commands/events)
    - name: uuid
      version: "^9"
      reason: Correlation IDs and data product identifiers
    - name: jsonwebtoken
      version: "^9"
      reason: Service-to-service auth (if ADAM uses JWT/OIDC)
    - name: "@opentelemetry/api"
      version: "^1"
      reason: Trace correlation across ADAM ↔ INTERSECT calls/events
    - name: fastapi
      version: "^0.110"
      reason: Python edge controller service HTTP API (controller implementations)
    - name: pydantic
      version: "^2"
      reason: Strongly-typed controller payload validation
```

(Directory assumptions are grounded by the visible repo structure showing `/backend` and `/services`.) ([GitHub](https://github.com/arc-pbc-co/adam-platform))

---

## **10\. Risk Assessment**

### **Technical risks**

* **Correlation/idempotency bugs** (events arriving out of order, duplicate completions)  
  * *Mitigation*: enforce idempotency keys; event de-duplication; durable correlation store; state machine invariants.  
* **Distributed failure handling** (partial completion across multi-step workflows)  
  * *Mitigation*: Scheduler–Agent–Supervisor pattern; persistent step state; compensating actions. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/retry-recovery.html))  
* **Latency-sensitive operations**  
  * *Mitigation*: choreography/event-driven completion; keep controllers at edge; avoid cloud polling. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/orchestration/patterns/conductor-choreography.html))

### **Dependency risks**

* **Instrument SDK/ROS/EPICS variability**  
  * *Mitigation*: per-instrument controller microservice boundary; contract tests; simulators. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/classification/experiment/control.html))

### **Performance risks**

* **High-volume data streams**  
  * *Mitigation*: separate telemetry ingestion path; batch writes; tiered storage; backpressure at broker.

### **Security considerations (security-first)**

* **Edge-to-cloud exposure**  
  * *Mitigation*: ambassador proxy with mTLS \+ policy enforcement; least-privilege service identities; audit logs. ([intersect-architecture.readthedocs.io](https://intersect-architecture.readthedocs.io/en/latest/ms/deployment/patterns.html))  
* **Command authorization**  
  * *Mitigation*: explicit roles/scopes for “execute”, “cancel”, “admin”; dual-control option for dangerous actions (configurable).

---

## **(Optional) Open Questions to Resolve During Implementation**

* Which broker/transport will back INTERSECT CS semantics in your deployment (reuse ADAM’s bus vs dedicated edge bus bridged upstream)?  
* What is ADAM’s current AuthN/AuthZ mechanism in backend services (OIDC/JWT/API keys), so we can standardize service identities and scopes?  
* What minimum DMS subset is needed for Phase 2 (catalog only vs catalog \+ storage management \+ transfer)?

If you want, I can also produce **contract-test scaffolding** (e.g., JSON-schema \+ golden event fixtures \+ simulated controller) so Claude Code can implement controllers and the bridge with tight feedback loops.

