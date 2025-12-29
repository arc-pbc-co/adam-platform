# Correlation & Tracing

The Correlation Store provides **end-to-end traceability** from high-level experiments down to individual instrument activities. This enables debugging, auditing, and analysis across the distributed system.

## Correlation Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         Experiment                               │
│  experimentId: "exp-001"                                         │
│  hypothesis: "Higher sintering temp improves density"            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   Work Order 1   │  │   Work Order 2   │  ...                │
│  │ workOrderId: wo1 │  │ workOrderId: wo2 │                     │
│  │ type: print      │  │ type: sinter     │                     │
│  └────────┬─────────┘  └────────┬─────────┘                     │
│           │                     │                                │
│  ┌────────▼─────────┐  ┌────────▼─────────┐                     │
│  │   Activity 1     │  │   Activity 2     │                     │
│  │ activityId: a1   │  │ activityId: a2   │                     │
│  │ controller: DM   │  │ controller: FRN  │                     │
│  │ status: complete │  │ status: running  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Correlation Types

### Base Correlation

Links experiments to INTERSECT activities:

```typescript
interface Correlation {
  experimentId: string;
  workOrderId: string;
  activityId: string;
  controllerId: string;
  activityName: string;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### Activity Correlation

Extended correlation with workflow tracking:

```typescript
interface ActivityCorrelation extends Correlation {
  // Workflow context
  workflowId?: string;
  stepId?: string;
  parentActivityId?: string;
  
  // Timing
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Results
  result?: any;
  error?: string;
  
  // Data products
  dataProducts?: DataProductMapping[];
  
  // Retry tracking
  retryCount: number;
  maxRetries: number;
}
```

### Data Product Mapping

Links INTERSECT data products to ADAM artifacts:

```typescript
interface DataProductMapping {
  intersectName: string;      // e.g., "temperature_profile"
  adamArtifactId: string;     // UUID in ADAM storage
  adamArtifactType: string;   // e.g., "telemetry", "measurement"
  capturedAt: Date;
}
```

## Correlation Store Interface

```typescript
interface ICorrelationStore {
  // Create correlation when activity starts
  createCorrelation(correlation: Correlation): Promise<void>;
  
  // Update status as activity progresses
  updateActivityStatus(
    activityId: string,
    status: ActivityStatus,
    result?: any,
    error?: string
  ): Promise<void>;
  
  // Query correlations
  getActivityCorrelation(activityId: string): Promise<ActivityCorrelation | null>;
  getExperimentActivities(experimentId: string): Promise<ActivityCorrelation[]>;
  getWorkOrderActivities(workOrderId: string): Promise<ActivityCorrelation[]>;
  
  // Data product tracking
  addDataProduct(activityId: string, mapping: DataProductMapping): Promise<void>;
}
```

## Storage Implementations

### In-Memory Store

For development and testing:

```typescript
const store = createCorrelationStore('memory');
```

### Database Store

For production with PostgreSQL:

```typescript
const store = createCorrelationStore('database', {
  connectionString: process.env.DATABASE_URL
});
```

**Schema**:
```sql
CREATE TABLE activity_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id VARCHAR(255) NOT NULL,
  work_order_id VARCHAR(255) NOT NULL,
  activity_id VARCHAR(255) NOT NULL UNIQUE,
  controller_id VARCHAR(255) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  workflow_id VARCHAR(255),
  step_id VARCHAR(255),
  result JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_correlations_experiment ON activity_correlations(experiment_id);
CREATE INDEX idx_correlations_work_order ON activity_correlations(work_order_id);
CREATE INDEX idx_correlations_status ON activity_correlations(status);
```

## Usage in Workflow

### Creating Correlation

```typescript
// When starting an activity
const correlation = await adapter.startActivity(
  workOrder,
  (activityId, controllerId, activityName) => {
    // Callback creates correlation
    return correlationStore.createCorrelation({
      experimentId: workOrder.experimentId,
      workOrderId: workOrder.id,
      activityId,
      controllerId,
      activityName,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
);
```

### Updating Status

```typescript
// Event handler updates correlation
bridge.on('activity.status', async (event) => {
  await correlationStore.updateActivityStatus(
    event.activityId,
    normalizeActivityStatus(event.status),
    event.result,
    event.error
  );
});
```

### Querying History

```typescript
// Get all activities for an experiment
const activities = await correlationStore.getExperimentActivities(experimentId);

// Calculate experiment statistics
const stats = {
  total: activities.length,
  completed: activities.filter(a => a.status === 'completed').length,
  failed: activities.filter(a => a.status === 'failed').length,
  avgDuration: calculateAvgDuration(activities)
};
```

## Distributed Tracing

Correlations support distributed tracing with trace context:

```typescript
// Propagate trace context
const traceContext = {
  traceId: crypto.randomUUID(),
  spanId: crypto.randomUUID(),
  parentSpanId: parentActivity?.spanId
};

// Include in correlation
await correlationStore.createCorrelation({
  ...correlation,
  traceId: traceContext.traceId,
  spanId: traceContext.spanId
});
```

---

*Next: [Orchestration Patterns](orchestration-patterns.md) - Scheduler-Agent-Supervisor*

