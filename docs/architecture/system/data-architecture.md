# Data Architecture

ADAM uses a **polyglot persistence** strategy with specialized databases for different data types. This enables optimal performance for each use case while maintaining data consistency across the platform.

## Database Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Architecture                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │  PostgreSQL   │    │  TimescaleDB  │    │    Qdrant     │   │
│  │               │    │               │    │               │   │
│  │ • Experiments │    │ • Telemetry   │    │ • Learnings   │   │
│  │ • Materials   │    │ • Metrics     │    │ • Embeddings  │   │
│  │ • Correlations│    │ • Events log  │    │ • Similarity  │   │
│  │ • Users/Auth  │    │               │    │   search      │   │
│  └───────────────┘    └───────────────┘    └───────────────┘   │
│         │                    │                    │             │
│         │ Relational         │ Time-series        │ Vector      │
│         │                    │                    │             │
│  ┌───────────────┐    ┌───────────────┐                        │
│  │     Redis     │    │     NATS      │                        │
│  │               │    │   JetStream   │                        │
│  │ • Sessions    │    │               │                        │
│  │ • Cache       │    │ • Events      │                        │
│  │ • Rate limits │    │ • Pub/Sub     │                        │
│  └───────────────┘    └───────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## PostgreSQL - Primary Database

### Purpose
Stores structured data requiring ACID transactions and complex queries.

### Schema

```sql
-- Experiments
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  hypothesis TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  risk_level VARCHAR(10) DEFAULT 'R1',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  properties JSONB,
  safety_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment Materials (junction)
CREATE TABLE experiment_materials (
  experiment_id UUID REFERENCES experiments(id),
  material_id UUID REFERENCES materials(id),
  quantity DECIMAL,
  unit VARCHAR(50),
  role VARCHAR(100),
  PRIMARY KEY (experiment_id, material_id)
);

-- Activity Correlations
CREATE TABLE activity_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id),
  work_order_id VARCHAR(255) NOT NULL,
  activity_id VARCHAR(255) NOT NULL UNIQUE,
  controller_id VARCHAR(255) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  result JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_correlations_experiment ON activity_correlations(experiment_id);
CREATE INDEX idx_correlations_status ON activity_correlations(status);
```

## TimescaleDB - Time-Series Database

### Purpose
Stores high-frequency telemetry and metrics data with time-based partitioning.

### Hypertables

```sql
-- Telemetry measurements
CREATE TABLE telemetry (
  time TIMESTAMPTZ NOT NULL,
  experiment_id UUID NOT NULL,
  activity_id VARCHAR(255),
  controller_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(50),
  tags JSONB
);

SELECT create_hypertable('telemetry', 'time');

-- Create indexes for common queries
CREATE INDEX idx_telemetry_experiment ON telemetry (experiment_id, time DESC);
CREATE INDEX idx_telemetry_activity ON telemetry (activity_id, time DESC);
CREATE INDEX idx_telemetry_metric ON telemetry (metric_name, time DESC);

-- Compression policy (after 7 days)
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'experiment_id,controller_id'
);
SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- Retention policy (keep 1 year)
SELECT add_retention_policy('telemetry', INTERVAL '1 year');
```

### Common Queries

```sql
-- Get temperature profile for an activity
SELECT time_bucket('1 minute', time) AS bucket,
       AVG(value) AS avg_temp,
       MIN(value) AS min_temp,
       MAX(value) AS max_temp
FROM telemetry
WHERE activity_id = $1
  AND metric_name = 'temperature'
GROUP BY bucket
ORDER BY bucket;

-- Get latest metrics for experiment
SELECT DISTINCT ON (metric_name)
       metric_name, value, time
FROM telemetry
WHERE experiment_id = $1
ORDER BY metric_name, time DESC;
```

## Qdrant - Vector Database

### Purpose
Stores AI embeddings for semantic search and knowledge retrieval.

### Collections

```typescript
// Experiment learnings collection
await qdrant.createCollection('experiment_learnings', {
  vectors: {
    size: 1536,        // OpenAI embedding dimension
    distance: 'Cosine'
  }
});

// Create payload index for filtering
await qdrant.createPayloadIndex('experiment_learnings', {
  field_name: 'type',
  field_schema: 'keyword'
});

await qdrant.createPayloadIndex('experiment_learnings', {
  field_name: 'confidence',
  field_schema: 'float'
});
```

### Vector Operations

```typescript
// Store learning with embedding
await qdrant.upsert('experiment_learnings', {
  points: [{
    id: learningId,
    vector: embedding,  // 1536-dimensional
    payload: {
      type: 'process',
      experimentId: 'exp-001',
      insight: 'Higher sintering temperature improves density',
      confidence: 0.92,
      createdAt: new Date().toISOString()
    }
  }]
});

// Semantic search
const results = await qdrant.search('experiment_learnings', {
  vector: queryEmbedding,
  limit: 10,
  filter: {
    must: [{ key: 'confidence', range: { gte: 0.7 } }]
  }
});
```

## Redis - Cache & Sessions

### Purpose
Fast access for sessions, caching, and rate limiting.

### Usage Patterns

```typescript
// Session storage
await redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', 3600);

// Caching experiment data
await redis.set(`experiment:${id}`, JSON.stringify(experiment), 'EX', 300);

// Rate limiting
const key = `ratelimit:${clientId}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
```

## Data Flow

```
Experiment Creation → PostgreSQL
         │
         ▼
Activity Execution → NATS Events → Correlation Store (PostgreSQL)
         │
         ▼
Telemetry Stream → TimescaleDB
         │
         ▼
Analysis Complete → Learnings → Embedding → Qdrant
```

---

*Next: [Security Architecture](security.md) - Authentication and authorization*

