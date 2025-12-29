# Concept

The ADAM Platform architecture follows a layered approach that separates concerns across three complementary domains: **Science Use Case Patterns**, **System-of-Systems Architecture**, and **Microservices Architecture**. This mirrors the INTERSECT Architecture framework while addressing the specific needs of autonomous materials research.

## Architectural Approach

![ADAM Architecture Concept](../assets/architecture-concept.png)
*Figure 1: The three layers of the ADAM architecture and their relationships.*

### Science Use Case Patterns

At the highest level, ADAM implements patterns for autonomous experimentation:

| Pattern | Description | ADAM Implementation |
|---------|-------------|---------------------|
| **Closed-Loop Control** | Continuous feedback from measurements to control | Nova Orchestrator with real-time telemetry |
| **Design of Experiments** | Statistical experiment planning | Planning Agent with DOE generation |
| **Active Learning** | ML-guided experiment selection | Bayesian optimization in Design Agent |
| **Digital Twin** | Virtual experiment simulation | Simulation Agent with physics models |

These patterns define *what* the platform does at a conceptual level.

### System-of-Systems Architecture

The middle layer defines *how* components interact:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADAM Platform                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Planning   │  │   Design     │  │  Simulation  │          │
│  │   System     │◄─┤   System     │◄─┤   System     │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
│  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Execution   │──│   Analysis   │──│   Learning   │          │
│  │   System     │  │   System     │  │   System     │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
├─────────┼────────────────────────────────────────────────────────┤
│         │            Integration Layer                           │
│  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  INTERSECT   │  │    Event     │  │  Correlation │          │
│  │  Gateway     │──│    Bridge    │──│    Store     │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
└─────────┼────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────┐
│                    Edge / Controller Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Desktop Metal│  │   Furnace    │  │   XRD/SEM    │           │
│  │ Controller   │  │  Controller  │  │  Controller  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

Key characteristics:

- **Operational Independence** - Each system operates autonomously
- **Geographical Distribution** - Controllers at edge, orchestration in cloud
- **Emergent Behavior** - Complex experiments from simple interactions
- **Evolutionary Development** - Systems added incrementally

### Microservices Architecture

The implementation layer defines specific services:

| Service | Responsibility | Interface |
|---------|---------------|-----------|
| `nova-orchestrator` | Multi-agent AI coordination | REST + NATS |
| `api-gateway` | External API exposure | REST |
| `intersect-gateway` | Controller communication | REST + NATS |
| `event-bridge` | Event routing and persistence | NATS JetStream |
| `correlation-store` | Experiment tracking | PostgreSQL |

## Design Principles

### 1. Separation of Concerns

Each component has a single, well-defined responsibility:

- **Agents** handle domain-specific reasoning
- **Gateway** handles protocol translation
- **Event Bridge** handles message delivery
- **Store** handles persistence

### 2. Loose Coupling

Components communicate through:

- **REST APIs** for synchronous request/response
- **NATS Events** for asynchronous notifications
- **Shared Types** for contract consistency

### 3. High Cohesion

Related functionality is grouped together:

- All AI agents in Nova Orchestrator
- All INTERSECT types in shared package
- All deployment configs in deployment directory

### 4. Pluggability

New capabilities are added without modifying existing code:

```typescript
// Adding a new controller type
gateway.registerController({
  controllerId: 'new-instrument',
  endpoint: 'http://192.168.1.200:8090',
  healthEndpoint: '/health'
});
```

### 5. Resilience

The platform handles failures gracefully:

- **Retry with backoff** for transient failures
- **Circuit breakers** for cascading failure prevention
- **Supervisor monitoring** for stale activity detection
- **Event persistence** for delivery guarantees

## Mapping to INTERSECT

ADAM implements the INTERSECT Architecture through:

| INTERSECT Concept | ADAM Implementation |
|-------------------|---------------------|
| Instrument Controller | Desktop Metal, Furnace, Characterization controllers |
| Capability Contract | `/actions`, `/activities` REST endpoints |
| Activity Lifecycle | Start → Progress → Complete/Failed states |
| Data Products | Telemetry in TimescaleDB, artifacts in storage |
| Event System | NATS JetStream with topic-based routing |

---

*Next: [About](about.md) - Project background and team*

