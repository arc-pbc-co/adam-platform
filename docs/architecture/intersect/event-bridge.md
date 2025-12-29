# Event Bridge

The Event Bridge provides **asynchronous event streaming** between ADAM components using NATS JetStream. This enables real-time coordination without tight coupling between services.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Nova      │     │    NATS      │     │ Controllers  │
│ Orchestrator │────►│  JetStream   │◄────│              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │  Publish           │  Persist           │  Publish
       │  Subscribe         │  Replay            │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ API Gateway  │     │   Streams    │     │  INTERSECT   │
│              │────►│   Consumers  │◄────│   Gateway    │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Event Types

### Activity Events

Published by controllers during activity execution:

```typescript
// Activity progress
interface ActivityProgressEvent {
  type: 'activity.progress';
  activityId: string;
  controllerId: string;
  progress: number;  // 0.0 - 1.0
  message: string;
  timestamp: Date;
}

// Activity status change
interface ActivityStatusEvent {
  type: 'activity.status';
  activityId: string;
  controllerId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  timestamp: Date;
}

// Data product ready
interface DataReadyEvent {
  type: 'activity.data_ready';
  activityId: string;
  controllerId: string;
  dataProduct: string;
  location: string;
  timestamp: Date;
}
```

### Controller Events

Published by controllers about their state:

```typescript
// Health change
interface ControllerHealthEvent {
  type: 'controller.health';
  controllerId: string;
  healthy: boolean;
  components: Record<string, ComponentHealth>;
  timestamp: Date;
}

// Registration
interface ControllerRegisteredEvent {
  type: 'controller.registered';
  controllerId: string;
  endpoint: string;
  capabilities: ControllerCapabilities;
  timestamp: Date;
}
```

### Experiment Events

Published by Nova Orchestrator:

```typescript
// Phase transition
interface ExperimentPhaseEvent {
  type: 'experiment.phase';
  experimentId: string;
  phase: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: Date;
}

// Experiment completion
interface ExperimentCompleteEvent {
  type: 'experiment.complete';
  experimentId: string;
  success: boolean;
  summary: string;
  timestamp: Date;
}
```

## Topic Structure

Events are published to hierarchical topics:

```
adam.activity.{controllerId}.progress
adam.activity.{controllerId}.status
adam.activity.{controllerId}.data
adam.controller.{controllerId}.health
adam.experiment.{experimentId}.phase
adam.experiment.{experimentId}.complete
```

**Wildcard Subscriptions**:
```typescript
// All activity events from a controller
bridge.subscribe('adam.activity.desktop-metal-x25.*', handler);

// All experiment events
bridge.subscribe('adam.experiment.>', handler);
```

## Event Bridge Implementation

### Publishing Events

```typescript
const bridge = createEventBridge({
  natsUrl: 'nats://localhost:4222'
});

await bridge.connect();

// Publish activity progress
await bridge.publish('adam.activity.desktop-metal-x25.progress', {
  type: 'activity.progress',
  activityId: 'act-123',
  controllerId: 'desktop-metal-x25',
  progress: 0.45,
  message: 'Layer 150/333 complete',
  timestamp: new Date()
});
```

### Subscribing to Events

```typescript
// Subscribe to specific topic
bridge.subscribe(
  'adam.activity.*.status',
  async (event: ActivityStatusEvent) => {
    if (event.status === 'completed') {
      await handleActivityComplete(event);
    } else if (event.status === 'failed') {
      await handleActivityFailed(event);
    }
  }
);
```

### Event Handler Registration

```typescript
// Register typed handler
bridge.on('activity.status', async (event) => {
  logger.info(`Activity ${event.activityId}: ${event.status}`);
});

bridge.on('controller.health', async (event) => {
  if (!event.healthy) {
    await alertOps(`Controller ${event.controllerId} unhealthy`);
  }
});
```

## JetStream Configuration

Events are persisted in JetStream for durability:

```typescript
// Stream configuration
const streamConfig = {
  name: 'ADAM_EVENTS',
  subjects: ['adam.>'],
  retention: 'limits',  // or 'workqueue' for single delivery
  maxAge: 7 * 24 * 60 * 60 * 1e9,  // 7 days in nanoseconds
  maxBytes: 1024 * 1024 * 1024,    // 1 GB
  storage: 'file',
  replicas: 3
};
```

**Consumer Configuration**:
```typescript
const consumerConfig = {
  name: 'nova-orchestrator',
  durable: 'nova-orchestrator',
  ackPolicy: 'explicit',
  deliverPolicy: 'new',
  maxDeliver: 5,
  ackWait: 30 * 1e9  // 30 seconds
};
```

## Event Flow Example

```
1. Controller starts activity
   └─► publish: adam.activity.furnace.status {status: 'running'}

2. Controller reports progress
   └─► publish: adam.activity.furnace.progress {progress: 0.25}

3. Nova receives progress
   └─► update: workflow state, notify UI

4. Controller completes
   └─► publish: adam.activity.furnace.status {status: 'completed'}
   └─► publish: adam.activity.furnace.data {dataProduct: 'temperature_profile'}

5. Nova receives completion
   └─► store: correlation record
   └─► trigger: next workflow step
```

## Metrics

| Metric | Description |
|--------|-------------|
| `events_published_total` | Events published by type |
| `events_received_total` | Events received by handler |
| `event_latency_ms` | Publish-to-receive latency |
| `consumer_lag` | Messages behind head |

---

*Next: [Correlation & Tracing](correlation-tracing.md) - End-to-end experiment tracking*

