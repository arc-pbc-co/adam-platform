# Controller Integration

ADAM integrates with laboratory instruments through the **INTERSECT Instrument Controller Capability Contract**. This standardized protocol enables consistent communication with diverse equipment from different vendors.

## INTERSECT Protocol Overview

The INTERSECT protocol defines two types of operations:

| Type | Duration | Blocking | Use Case |
|------|----------|----------|----------|
| **Actions** | Short (<30s) | Synchronous | Configuration, queries |
| **Activities** | Long (minutes-hours) | Asynchronous | Printing, sintering, measuring |

## Capability Contract

Controllers expose their capabilities through a REST API:

### Discovery Endpoints

```http
GET /actions
Response: { "actionNames": ["configure", "home", "status"] }

GET /actions/{actionName}
Response: {
  "actionName": "configure",
  "description": "Configure equipment parameters",
  "options": [
    { "name": "parameter", "type": "string", "required": true }
  ]
}

GET /activities
Response: { "activityNames": ["print_job", "sinter_cycle"] }

GET /activities/{activityName}
Response: {
  "activityName": "print_job",
  "description": "Execute a print job",
  "options": [...],
  "dataProducts": [
    { "name": "print_telemetry", "schema": {...} }
  ]
}
```

### Action Execution

```http
POST /actions/{actionName}/perform
Content-Type: application/json

{
  "options": [
    { "key": "parameter", "value": "value" }
  ]
}

Response: {
  "status": "completed",
  "result": { ... }
}
```

### Activity Lifecycle

```http
# Start activity
POST /activities/{activityName}/start
{
  "options": [
    { "key": "temperature", "value": "1350" },
    { "key": "duration", "value": "7200" }
  ]
}

Response: {
  "activityId": "act-123",
  "status": "running"
}

# Check status
GET /activities/{activityId}/status
Response: {
  "activityId": "act-123",
  "status": "running",
  "progress": 0.45,
  "message": "Phase 2: Ramp to temperature"
}

# Get data products
GET /activities/{activityId}/data
Response: {
  "dataProducts": [
    {
      "name": "temperature_profile",
      "data": { "timestamps": [...], "values": [...] }
    }
  ]
}

# Cancel if needed
POST /activities/{activityId}/cancel
Response: { "status": "cancelled" }
```

## ADAM Gateway Implementation

The INTERSECT Gateway translates between Nova and controllers:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Nova     │────►│  INTERSECT  │────►│ Controller  │
│ Orchestrator│     │   Gateway   │     │ (REST API)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │   Work Order      │   HTTP Request    │
       │ ─────────────────►│ ─────────────────►│
       │                   │                   │
       │   Activity ID     │   Response        │
       │ ◄─────────────────│ ◄─────────────────│
       │                   │                   │
       │   Status Query    │   GET /status     │
       │ ─────────────────►│ ─────────────────►│
```

### Gateway Configuration

```typescript
const gatewayConfig: GatewayConfig = {
  natsUrl: 'nats://localhost:4222',
  controllers: [
    {
      controllerId: 'desktop-metal-x25',
      endpoint: 'http://192.168.1.100:8090',
      healthEndpoint: '/health'
    },
    {
      controllerId: 'furnace-sinter500',
      endpoint: 'http://192.168.1.101:8091'
    }
  ],
  defaultTimeout: 300000,  // 5 minutes
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000
  }
};
```

### Controller Registration

```typescript
// Dynamic registration
await gateway.registerController({
  controllerId: 'new-instrument',
  endpoint: 'http://192.168.1.200:8090',
  healthEndpoint: '/health'
});

// List registered controllers
const controllers = await gateway.listControllers();
// [{ controllerId, status, lastSeen, capabilities }]
```

## Supported Controllers

### Desktop Metal Controller

Manages Desktop Metal printers (X25, Shop System, P50):

| Activity | Description |
|----------|-------------|
| `print_job` | Execute print with specified parameters |
| `clean_cycle` | Run cleaning cycle |
| `calibration` | Perform calibration routine |

### Furnace Controller

Manages sintering furnaces (Sinter500, HIP systems):

| Activity | Description |
|----------|-------------|
| `sinter_cycle` | Run sintering profile |
| `debind_cycle` | Run debinding profile |
| `atmosphere_purge` | Purge and set atmosphere |

### Characterization Controller

Manages analysis instruments (XRD, SEM, tensile tester):

| Activity | Description |
|----------|-------------|
| `xrd_scan` | X-ray diffraction measurement |
| `sem_imaging` | SEM image capture |
| `tensile_test` | Mechanical testing |

## Health Monitoring

Controllers report health status:

```http
GET /health
Response: {
  "status": "healthy",
  "components": {
    "hardware": { "status": "ok" },
    "software": { "status": "ok" }
  }
}
```

The gateway monitors controller health:

```typescript
// Check health
const health = await gateway.getControllerHealth('desktop-metal-x25');
// { healthy: true, latency: 45, lastCheck: Date }

// Subscribe to health changes
gateway.onHealthChange((controllerId, status) => {
  logger.info(`Controller ${controllerId} health: ${status}`);
});
```

---

*Next: [Event Bridge](event-bridge.md) - NATS-based event streaming*

