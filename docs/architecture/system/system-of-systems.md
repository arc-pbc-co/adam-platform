# System-of-Systems Architecture

ADAM follows a **System-of-Systems (SoS)** architecture where independent systems collaborate to achieve capabilities beyond any single system. This enables operational independence, geographic distribution, and evolutionary development.

## Architecture Views

### Logical View

```
┌─────────────────────────── ADAM Platform ───────────────────────────┐
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Presentation Layer                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │ │
│  │  │ Web UI   │  │   API    │  │  CLI     │                     │ │
│  │  │          │  │ Gateway  │  │          │                     │ │
│  │  └──────────┘  └──────────┘  └──────────┘                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Orchestration Layer                         │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │              Nova Orchestrator                            │ │ │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │ │
│  │  │  │Planning │ │ Design  │ │Simulate │ │Analyze  │        │ │ │
│  │  │  │ Agent   │ │  Agent  │ │  Agent  │ │  Agent  │        │ │ │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Integration Layer                           │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐                  │ │
│  │  │ INTERSECT │  │  Event    │  │Correlation│                  │ │
│  │  │  Gateway  │  │  Bridge   │  │  Store    │                  │ │
│  │  └───────────┘  └───────────┘  └───────────┘                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Data Layer                                │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │ │
│  │  │PostgreSQL │  │TimescaleDB│  │   Qdrant  │  │   Redis   │  │ │
│  │  │Experiments│  │ Telemetry │  │  Vectors  │  │  Cache    │  │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                         Edge Layer                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │  Desktop  │  │  Furnace  │  │   XRD     │  │   SEM     │        │
│  │  Metal    │  │Controller │  │Controller │  │Controller │        │
│  │Controller │  │           │  │           │  │           │        │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| **API Gateway** | Presentation | External API, authentication, routing |
| **Nova Orchestrator** | Orchestration | Multi-agent AI coordination |
| **INTERSECT Gateway** | Integration | Controller protocol translation |
| **Event Bridge** | Integration | Asynchronous event routing |
| **Correlation Store** | Integration | Activity tracking |
| **PostgreSQL** | Data | Experiment metadata, correlations |
| **TimescaleDB** | Data | Time-series telemetry |
| **Qdrant** | Data | AI knowledge vectors |
| **Redis** | Data | Caching, sessions |
| **Controllers** | Edge | Instrument control |

## Operational View

### Service Dependencies

```
                    ┌─────────────┐
                    │  External   │
                    │   Clients   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ API Gateway │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │    Nova     │   │  INTERSECT  │   │   Static    │
  │ Orchestrator│   │   Gateway   │   │   Assets    │
  └──────┬──────┘   └──────┬──────┘   └─────────────┘
         │                 │
         │    ┌────────────┴────────────┐
         │    │                         │
  ┌──────▼────▼──┐              ┌───────▼───────┐
  │     NATS     │              │  Controllers  │
  │  (Events)    │              │   (Edge)      │
  └──────────────┘              └───────────────┘
```

### Failure Domains

| Domain | Components | Failure Impact |
|--------|------------|----------------|
| **Cloud Core** | Nova, API Gateway | No new experiments |
| **Event System** | NATS | Delayed notifications |
| **Data Stores** | PostgreSQL, Qdrant | No persistence |
| **Individual Controller** | Single instrument | That instrument offline |

### Scaling Strategy

| Component | Scaling | Stateless |
|-----------|---------|-----------|
| API Gateway | Horizontal | Yes |
| Nova Orchestrator | Horizontal | Yes (state in DB) |
| INTERSECT Gateway | Horizontal | Yes |
| NATS | Cluster | No (replicated) |
| PostgreSQL | Vertical + Read replicas | No |
| TimescaleDB | Vertical + Chunking | No |
| Qdrant | Sharding | No |

## Communication Patterns

### Synchronous (REST)

Used for:
- Client API requests
- Controller commands
- Health checks

### Asynchronous (NATS)

Used for:
- Activity status updates
- Progress notifications
- Event streaming

### Database Queries

Used for:
- Experiment metadata
- Historical analysis
- Correlation lookups

## System Boundaries

### Cloud Boundary

Managed infrastructure with:
- Kubernetes orchestration
- Istio service mesh
- Automated scaling
- Centralized logging

### Edge Boundary

On-premise controllers with:
- mTLS communication
- Local buffering
- Graceful degradation

---

*Next: [Data Architecture](data-architecture.md) - Database design*

