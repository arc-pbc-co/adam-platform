# INTERSECT Integration

ADAM integrates with [ORNL INTERSECT](https://intersect-architecture.readthedocs.io/) to control scientific instruments. This integration allows ADAM to talk to any hardware that implements the "Capability Contract" pattern.

> **Code Location**: `backend/src/integrations/intersect`

## Core Components

### 1. Gateway Service (`IntersectGatewayService.ts`)
The Gateway Service acts as the client for instrument controllers. It translates high-level ADAM intent into HTTP calls.

- **Activity Management**: `startActivity`, `getActivityStatus`, `cancelActivity`.
- **Action Management**: `performAction` (for discrete actions like "home axis").
- **Reliability**: Includes an Axios interceptor for exponential backoff retries on network failures (5xx errors or connection timeouts).
- **Discovery**: Can `listControllers` and check their health.

### 2. Event Bridge (`IntersectEventBridge.ts`)
Handles the asynchronous flow of information from instruments back to ADAM.

- **Normalization**: Ingests raw INTERSECT events (like `InstrumentActionCompletion`) and converts them into `NormalizedAdamEvent`.
- **Correlation**: Uses `CorrelationStore` to efficient map a specific `activityId` back to the parent `ExperimentRun`.
- **Workflow Triggers**: The `WorkflowIntegratedEventBridge` can automatically trigger new ADAM steps when specific hardware events occur (e.g., "Print Finished" -> "Start Sintering").

### 3. Schema Mapper (`SchemaMapper.ts`)
This is the translation layer. It bridges the gap between ADAM's internal data model and the external INTERSECT contracts.

- **Hardcoded Mappings**: Currently defines mappings for Desktop Metal hardware:
    - `print_job`: Requires `printerId`, `stlFileId`, `material`.
    - `sinter_cycle`: Requires `furnaceId`, `peakTemperature`, `holdTime`.
    - `quality_inspection`: Requires `sampleIds`.
- **Validation**: Ensures that options passed to `startActivity` match the expected schema types (string, number, boolean) before sending to the hardware.

## Contract Reference

ADAM expects controllers to comply with **Contract v0.1**.

### Base Controller Class
Developers building new instrument drivers should extend `ContractCompliantController`. This abstract base class enforces:
- Standardized event emission (`emitActionCompletion`).
- Required methods like `healthCheck`, `listActions`, etc.
- Unique ID generation for activities and data products.

```typescript
// Example: Creating a new controller
class MyMicroscopeController extends ContractCompliantController {
    async performAction(command: PerformActionCommand) {
        // Implementation
    }
}
```

### Event Types
The system listens for two primary event patterns:
1. `intersect.events.action.completion`: When a short-lived command finishes.
2. `intersect.events.activity.status`: Updates for long-running jobs (e.g., `running` -> `completed`).
