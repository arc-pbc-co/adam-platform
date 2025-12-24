# ADAM-INTERSECT Integration Implementation Plan

## Executive Summary

This document outlines the implementation plan for integrating ORNL's INTERSECT architecture into the ADAM Platform. INTERSECT provides standardized microservice capability models for instrument command/control, experiment execution, and data management. ADAM will remain the AI "brain" while INTERSECT provides the lab-automation substrate.

**Integration Strategy**: Capability-wrapping integration where INTERSECT-aligned microservices run near instruments/edge, and an ADAM↔INTERSECT Integration Layer translates between ADAM's domain model and INTERSECT's capability contracts.

---

## Phase 1: Foundation (Weeks 1-3)

### 1.1 Core Integration Infrastructure

#### New Directory Structure
```
backend/
├── src/
│   └── integrations/
│       └── intersect/
│           ├── contracts/           # YAML capability contracts
│           ├── gateway/             # IntersectGatewayService
│           ├── events/              # IntersectEventBridge
│           ├── mapping/             # SchemaMapper
│           └── correlation/         # CorrelationStore
services/
└── intersect-edge/
    ├── instrument-controller-dm/    # Desktop Metal controller
    ├── instrument-controller-sim/   # Simulated controller for testing
    └── ambassador/                  # Edge proxy configuration
```

#### 1.1.1 Instrument Controller Contract (contracts/instrument_controller.v0_1.yaml)

Define the canonical INTERSECT Instrument Controller capability contract:

**Request-Reply Methods:**
- `ListActions()` → Returns available discrete operations
- `GetActionDescription(actionName)` → Returns action details
- `PerformAction(actionName, options, idempotencyKey)` → Execute discrete operation
- `ListActivities()` → Returns available activity sequences
- `GetActivityDescription(activityName)` → Returns activity details
- `StartActivity(activityName, options, deadline, correlation)` → Start activity, returns activityId
- `GetActivityStatus(activityId)` → Returns current status
- `GetActivityData(activityId)` → Returns data product UUIDs
- `CancelActivity(activityId, reason)` → Cancel ongoing activity

**Async Events:**
- `InstrumentActionCompletion` → Emitted when action completes
- `InstrumentActivityStatusChange` → Emitted on activity state transitions

#### 1.1.2 IntersectGatewayService

```typescript
// backend/src/integrations/intersect/gateway/IntersectGatewayService.ts

interface IntersectGatewayService {
  // Translate ADAM WorkOrder to INTERSECT Activity
  startActivity(params: {
    experimentRunId: string;
    campaignId: string;
    activityName: string;
    activityOptions: KeyValue[];
    deadline?: Date;
  }): Promise<{ activityId: string }>;

  // Execute discrete action
  performAction(params: {
    controllerId: string;
    actionName: string;
    actionOptions: KeyValue[];
    idempotencyKey: string;
  }): Promise<void>;

  // Query status
  getActivityStatus(activityId: string): Promise<ActivityStatus>;
  getActivityData(activityId: string): Promise<string[]>; // UUIDs

  // Discovery
  listControllers(): Promise<ControllerInfo[]>;
  listActions(controllerId: string): Promise<string[]>;
  listActivities(controllerId: string): Promise<string[]>;
}
```

**Key Responsibilities:**
- Maintain correlation mapping (experimentRunId ↔ activityId)
- Enforce idempotency keys for actions
- Route requests to appropriate edge controllers
- Handle timeouts and retry logic

#### 1.1.3 IntersectEventBridge

```typescript
// backend/src/integrations/intersect/events/IntersectEventBridge.ts

interface IntersectEventBridge {
  // Subscribe to INTERSECT events
  subscribe(): void;

  // Event handlers
  onActionCompletion(event: InstrumentActionCompletion): Promise<void>;
  onActivityStatusChange(event: InstrumentActivityStatusChange): Promise<void>;

  // Emit normalized ADAM events
  emitExperimentEvent(event: NormalizedEvent): Promise<void>;
}
```

**Event Flow:**
1. Subscribe to NATS subjects: `intersect.events.action.*`, `intersect.events.activity.*`
2. Correlate events to ExperimentRun using stored mappings
3. Update ExperimentRun state in database
4. Emit normalized events to ADAM's event bus
5. Trigger downstream analysis/decision workflows

#### 1.1.4 CorrelationStore

```typescript
// backend/src/integrations/intersect/correlation/CorrelationStore.ts

interface CorrelationStore {
  // Activity correlations
  saveActivityCorrelation(params: {
    activityId: string;
    experimentRunId: string;
    campaignId: string;
    controllerId: string;
  }): Promise<void>;

  getExperimentRunId(activityId: string): Promise<string | null>;

  // Data product correlations
  saveDataProductMapping(params: {
    productUuid: string;
    activityId: string;
    artifactId: string;
    storageUri: string;
  }): Promise<void>;

  getArtifactId(productUuid: string): Promise<string | null>;
}
```

### 1.2 Database Migrations

#### Add correlation fields to ExperimentRun

```sql
ALTER TABLE experiment_runs ADD COLUMN intersect_activity_id VARCHAR(255);
ALTER TABLE experiment_runs ADD COLUMN intersect_task_id VARCHAR(255);
ALTER TABLE experiment_runs ADD COLUMN instrument_controller_id VARCHAR(255);

CREATE TABLE intersect_activity_correlations (
  id SERIAL PRIMARY KEY,
  activity_id VARCHAR(255) UNIQUE NOT NULL,
  experiment_run_id VARCHAR(255) NOT NULL REFERENCES experiment_runs(id),
  campaign_id VARCHAR(255) NOT NULL,
  controller_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE intersect_data_products (
  id SERIAL PRIMARY KEY,
  product_uuid UUID UNIQUE NOT NULL,
  activity_id VARCHAR(255) NOT NULL,
  artifact_id VARCHAR(255),
  storage_uri TEXT,
  content_type VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_correlations_experiment ON intersect_activity_correlations(experiment_run_id);
CREATE INDEX idx_correlations_activity ON intersect_activity_correlations(activity_id);
CREATE INDEX idx_products_activity ON intersect_data_products(activity_id);
```

### 1.3 Simulated Instrument Controller

Create a simulated controller for end-to-end testing without real hardware.

```typescript
// services/intersect-edge/instrument-controller-sim/SimulatedController.ts

class SimulatedInstrumentController {
  private activities: Map<string, SimulatedActivity> = new Map();

  // Implement INTERSECT capability contract
  async listActions(): Promise<string[]> {
    return ['calibrate', 'home', 'preheat', 'cooldown'];
  }

  async listActivities(): Promise<string[]> {
    return ['print_job', 'sinter_cycle', 'quality_check'];
  }

  async startActivity(params: StartActivityParams): Promise<{ activityId: string }> {
    const activityId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const activity: SimulatedActivity = {
      id: activityId,
      name: params.activityName,
      status: 'running',
      startTime: new Date(),
      correlation: params.correlation,
      simulatedDuration: this.getSimulatedDuration(params.activityName),
    };

    this.activities.set(activityId, activity);
    this.runSimulation(activity);

    return { activityId };
  }

  private async runSimulation(activity: SimulatedActivity): Promise<void> {
    // Emit progress events
    const steps = 10;
    const stepDuration = activity.simulatedDuration / steps;

    for (let i = 1; i <= steps; i++) {
      await sleep(stepDuration);
      this.emitStatusChange(activity.id, `running_step_${i}`, `Progress: ${i * 10}%`);
    }

    // Complete activity
    activity.status = 'completed';
    activity.endTime = new Date();
    activity.products = [uuidv4()]; // Simulated data product

    this.emitCompletion(activity);
  }
}
```

### 1.4 Edge Connectivity (Ambassador Proxy)

```yaml
# services/intersect-edge/ambassador/envoy.yaml
static_resources:
  listeners:
    - name: edge_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8443
      filter_chains:
        - transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain: { filename: "/certs/server.crt" }
                    private_key: { filename: "/certs/server.key" }
                validation_context:
                  trusted_ca: { filename: "/certs/ca.crt" }
          filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                route_config:
                  virtual_hosts:
                    - name: intersect_services
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/instrument/" }
                          route: { cluster: instrument_controllers }
                        - match: { prefix: "/data/" }
                          route: { cluster: data_management }

  clusters:
    - name: instrument_controllers
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: instrument_controllers
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: instrument-controller
                      port_value: 8080
```

---

## Phase 2: Core Integration (Weeks 4-6)

### 2.1 Desktop Metal Instrument Controller

Refactor existing `DesktopMetalClient` to implement INTERSECT capability contract.

```typescript
// services/intersect-edge/instrument-controller-dm/DesktopMetalController.ts

export class DesktopMetalController implements InstrumentController {
  private dmClient: DesktopMetalClient;
  private eventEmitter: NatsClient;

  // INTERSECT Capability: Actions (discrete, idempotent)
  async listActions(): Promise<string[]> {
    return [
      'calibrate_printhead',
      'home_axes',
      'preheat_buildplate',
      'clean_printhead',
      'check_binder_level',
      'check_powder_level',
    ];
  }

  async performAction(actionName: string, options: KeyValue[], idempotencyKey: string): Promise<void> {
    // Check idempotency
    if (await this.wasActionPerformed(idempotencyKey)) {
      return; // Already executed
    }

    switch (actionName) {
      case 'calibrate_printhead':
        await this.dmClient.calibratePrinthead(options);
        break;
      case 'home_axes':
        await this.dmClient.homeAxes();
        break;
      case 'preheat_buildplate':
        await this.dmClient.preheatBuildplate(this.getOption(options, 'temperature'));
        break;
      // ... other actions
    }

    await this.markActionPerformed(idempotencyKey);
    await this.emitActionCompletion(actionName, 'success');
  }

  // INTERSECT Capability: Activities (sequences that produce data)
  async listActivities(): Promise<string[]> {
    return [
      'print_job',
      'sinter_cycle',
      'depowder_cycle',
      'quality_inspection',
    ];
  }

  async startActivity(
    activityName: string,
    options: KeyValue[],
    deadline: Date | null,
    correlation: CorrelationInfo
  ): Promise<{ activityId: string }> {
    const activityId = `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (activityName) {
      case 'print_job':
        await this.startPrintJob(activityId, options, deadline, correlation);
        break;
      case 'sinter_cycle':
        await this.startSinterCycle(activityId, options, deadline, correlation);
        break;
      // ... other activities
    }

    return { activityId };
  }

  private async startPrintJob(
    activityId: string,
    options: KeyValue[],
    deadline: Date | null,
    correlation: CorrelationInfo
  ): Promise<void> {
    // Extract parameters
    const printerId = this.getOption(options, 'printerId');
    const stlFileId = this.getOption(options, 'stlFileId');
    const material = this.getOption(options, 'material');
    const layerThickness = this.getOption(options, 'layerThickness');

    // Submit to Desktop Metal
    const job = await this.dmClient.submitPrintJob(printerId, correlation.experimentRunId, {
      material,
      layerThickness,
      // ... other params
    }, { stlFileId });

    // Store correlation
    await this.storeActivityCorrelation(activityId, job.id, correlation);

    // Start monitoring
    this.monitorJob(activityId, job.id, deadline);
  }

  private async monitorJob(activityId: string, jobId: string, deadline: Date | null): Promise<void> {
    const pollInterval = 5000; // 5 seconds

    const monitor = async () => {
      const status = await this.dmClient.getJobStatus(jobId);

      // Emit status change
      await this.emitActivityStatusChange(activityId, status.status, `Progress: ${status.progress}%`);

      // Check deadline
      if (deadline && new Date() > deadline) {
        await this.dmClient.cancelJob(jobId);
        await this.emitActivityStatusChange(activityId, 'cancelled', 'Deadline exceeded');
        return;
      }

      // Check completion
      if (status.status === 'completed') {
        const dataProducts = await this.generateDataProducts(jobId);
        await this.emitActivityCompletion(activityId, 'success', dataProducts);
        return;
      }

      if (status.status === 'failed') {
        await this.emitActivityStatusChange(activityId, 'failed', status.errorMessage);
        return;
      }

      // Continue polling
      setTimeout(monitor, pollInterval);
    };

    monitor();
  }

  private async emitActivityStatusChange(
    activityId: string,
    status: string,
    message: string
  ): Promise<void> {
    const event: InstrumentActivityStatusChange = {
      activityId,
      activityName: await this.getActivityName(activityId),
      activityStatus: status,
      statusMsg: message,
      correlation: await this.getCorrelation(activityId),
    };

    await this.eventEmitter.publish('intersect.events.activity.status', event);
  }
}
```

### 2.2 Workflow Engine Integration

Modify ADAM's workflow engine to emit "instrument execution" steps.

```typescript
// backend/nova/src/orchestrator/WorkflowEngine.ts

interface WorkflowEngine {
  // Add new step types
  executeStep(step: WorkflowStep): Promise<StepResult>;
}

type WorkflowStep =
  | PlanningStep
  | DesignStep
  | SimulationStep
  | IntersectActivityStep  // NEW
  | IntersectActionStep    // NEW
  | AnalysisStep;

interface IntersectActivityStep {
  type: 'intersect.start_activity';
  controllerId: string;
  activityName: string;
  activityOptions: KeyValue[];
  deadline?: Date;
  correlation: {
    experimentRunId: string;
    campaignId: string;
  };
}

interface IntersectActionStep {
  type: 'intersect.perform_action';
  controllerId: string;
  actionName: string;
  actionOptions: KeyValue[];
  idempotencyKey: string;
}

// Step executor
async function executeIntersectActivityStep(
  step: IntersectActivityStep,
  gateway: IntersectGatewayService
): Promise<StepResult> {
  try {
    const result = await gateway.startActivity({
      experimentRunId: step.correlation.experimentRunId,
      campaignId: step.correlation.campaignId,
      activityName: step.activityName,
      activityOptions: step.activityOptions,
      deadline: step.deadline,
    });

    // Step completes when activity is started
    // Actual completion comes via events
    return {
      status: 'started',
      activityId: result.activityId,
      waitingForCompletion: true,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error.message,
    };
  }
}
```

### 2.3 Data Management Integration

```typescript
// backend/src/integrations/intersect/data/DataCatalogClient.ts

interface DataCatalogClient {
  // Register data product from instrument activity
  registerDataProduct(params: {
    productUuid: string;
    activityId: string;
    campaignId: string;
    storageUri: string;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<{ catalogId: string }>;

  // Query products by campaign
  queryByCampaign(campaignId: string, filters?: Record<string, string>): Promise<DataProduct[]>;

  // Link to ADAM artifact
  linkToArtifact(productUuid: string, artifactId: string): Promise<void>;
}
```

---

## Phase 3: Enhancement (Weeks 7-9)

### 3.1 Scheduler-Agent-Supervisor Pattern

Implement robust orchestration with durable state and recovery.

```typescript
// backend/src/integrations/intersect/orchestration/Scheduler.ts

interface Scheduler {
  // Schedule activity with tracking
  scheduleActivity(task: ScheduledTask): Promise<string>;

  // Query scheduled tasks
  getPendingTasks(): Promise<ScheduledTask[]>;
  getFailedTasks(): Promise<ScheduledTask[]>;
}

interface ScheduledTask {
  id: string;
  experimentRunId: string;
  activityStep: IntersectActivityStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  error?: string;
}

// backend/src/integrations/intersect/orchestration/Supervisor.ts

class Supervisor {
  private db: Database;
  private scheduler: Scheduler;
  private gateway: IntersectGatewayService;

  async monitor(): Promise<void> {
    // Run every 30 seconds
    setInterval(async () => {
      await this.checkIncompleteActivities();
      await this.retryFailedTasks();
      await this.handleTimeouts();
    }, 30000);
  }

  private async checkIncompleteActivities(): Promise<void> {
    const staleActivities = await this.db.query(`
      SELECT * FROM intersect_activity_correlations
      WHERE status = 'running'
      AND updated_at < NOW() - INTERVAL '10 minutes'
    `);

    for (const activity of staleActivities) {
      // Query actual status from controller
      const status = await this.gateway.getActivityStatus(activity.activity_id);

      if (status.activityStatus === 'completed') {
        await this.handleLateCompletion(activity, status);
      } else if (status.activityStatus === 'failed') {
        await this.handleFailure(activity, status);
      }
      // If still running, update timestamp
    }
  }

  private async retryFailedTasks(): Promise<void> {
    const failedTasks = await this.scheduler.getFailedTasks();

    for (const task of failedTasks) {
      if (task.retryCount < task.maxRetries && this.shouldRetry(task)) {
        await this.scheduler.scheduleActivity({
          ...task,
          retryCount: task.retryCount + 1,
          nextRetry: this.calculateBackoff(task.retryCount),
        });
      } else {
        await this.escalateFailure(task);
      }
    }
  }

  private calculateBackoff(retryCount: number): Date {
    const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
    return new Date(Date.now() + delayMs);
  }
}
```

### 3.2 Additional Instrument Controllers

Expand to support more instruments:

- **Robot Arm Controller**: For sample handling, build box transfers
- **Furnace Controller**: For sintering operations
- **Characterization Controller**: For measurements (XRD, SEM, etc.)

### 3.3 Service Mesh Upgrade

For fleet-scale deployments, upgrade from Ambassador proxy to full service mesh:

```yaml
# Istio configuration for INTERSECT services
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: intersect-services
spec:
  hosts:
    - instrument-controller
  http:
    - match:
        - uri:
            prefix: /activity/
      retries:
        attempts: 3
        perTryTimeout: 30s
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: instrument-controller
            port:
              number: 8080
```

---

## Testing Strategy

### Unit Tests

- Contract validation for all capability methods
- Schema mapping correctness
- Correlation store operations

### Integration Tests

- End-to-end flow with simulated controller
- Event bridge subscription and processing
- Retry/recovery scenarios

### Contract Tests

```typescript
// tests/contracts/instrument-controller.test.ts

describe('Instrument Controller Contract', () => {
  it('should return valid activity list', async () => {
    const activities = await controller.listActivities();
    expect(activities).toContain('print_job');
    expect(activities).toContain('sinter_cycle');
  });

  it('should emit status change events during activity', async () => {
    const events: InstrumentActivityStatusChange[] = [];
    eventBridge.on('activity.status', (e) => events.push(e));

    const { activityId } = await controller.startActivity('print_job', [], null, correlation);

    await waitForCompletion(activityId, 60000);

    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].activityStatus).toBe('completed');
  });

  it('should handle deadline cancellation', async () => {
    const deadline = new Date(Date.now() + 1000); // 1 second
    const { activityId } = await controller.startActivity('print_job', [], deadline, correlation);

    await sleep(2000);

    const status = await controller.getActivityStatus(activityId);
    expect(status.activityStatus).toBe('cancelled');
  });
});
```

---

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "uuid": "^9.0.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-trace-node": "^1.18.0"
  }
}
```

### Python Packages (for edge controllers)

```txt
fastapi>=0.110.0
pydantic>=2.0.0
uvicorn>=0.27.0
nats-py>=2.6.0
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Correlation/idempotency bugs | Enforce idempotency keys; event de-duplication; durable correlation store |
| Distributed failures | Scheduler-Agent-Supervisor pattern; persistent step state; compensating actions |
| Latency-sensitive operations | Choreography/event-driven completion; keep controllers at edge; avoid cloud polling |
| Instrument SDK variability | Per-instrument controller boundary; contract tests; simulators |
| Security exposure | Ambassador proxy with mTLS; least-privilege service identities; audit logs |

---

## Open Questions

1. **Message Broker**: Reuse ADAM's NATS bus or deploy dedicated edge bus with bridge?
2. **AuthN/AuthZ**: What is ADAM's current mechanism (OIDC/JWT/API keys)?
3. **DMS Scope**: Minimum DMS subset needed for Phase 2 (catalog only vs full storage management)?

---

## File Change Manifest

### New Files

| Path | Purpose |
|------|---------|
| `backend/src/integrations/intersect/contracts/instrument_controller.v0_1.yaml` | INTERSECT capability contract |
| `backend/src/integrations/intersect/gateway/IntersectGatewayService.ts` | ADAM↔INTERSECT translation layer |
| `backend/src/integrations/intersect/events/IntersectEventBridge.ts` | Event subscription and normalization |
| `backend/src/integrations/intersect/mapping/SchemaMapper.ts` | Domain entity mapping |
| `backend/src/integrations/intersect/correlation/CorrelationStore.ts` | Activity/product correlation |
| `services/intersect-edge/instrument-controller-dm/DesktopMetalController.ts` | Desktop Metal adapter |
| `services/intersect-edge/instrument-controller-sim/SimulatedController.ts` | Test controller |
| `services/intersect-edge/ambassador/envoy.yaml` | Edge proxy config |

### Modified Files

| Path | Changes |
|------|---------|
| `backend/nova/src/orchestrator/WorkflowEngine.ts` | Add intersect step types |
| `backend/nova/src/types/index.ts` | Add INTERSECT correlation fields |
| `backend/api-gateway/src/routes/experiments.ts` | Expose execution status streaming |
| `docker-compose.yml` | Add intersect-edge services |

---

## Success Criteria

- [ ] Simulated controller passes all contract tests
- [ ] End-to-end print job execution via INTERSECT abstraction
- [ ] Event-driven status updates reflected in ADAM UI
- [ ] Correlation maintained across activity lifecycle
- [ ] Retry/recovery handles transient failures
- [ ] mTLS secured edge-to-cloud communication
