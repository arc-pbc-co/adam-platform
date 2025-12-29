# Learning System

Nova incorporates a **continuous learning system** that captures insights from every experiment and makes them available for future planning. This enables the platform to improve over time, avoiding repeated failures and building on successful approaches.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Learning System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌─────────────┐                        │
│  │  Analyzer   │────────►│  Learning   │                        │
│  │   Agent     │ Insights│  Processor  │                        │
│  └─────────────┘         └──────┬──────┘                        │
│                                 │                                │
│                    ┌────────────┴────────────┐                  │
│                    ▼                         ▼                   │
│           ┌─────────────┐           ┌─────────────┐             │
│           │  Embedding  │           │   Vector    │             │
│           │   Model     │           │   Store     │             │
│           │  (OpenAI)   │           │  (Qdrant)   │             │
│           └─────────────┘           └─────────────┘             │
│                                            │                     │
│                                            ▼                     │
│                                   ┌─────────────┐               │
│                                   │  Planning   │               │
│                                   │   Agent     │◄── Query      │
│                                   └─────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Learning Types

### 1. Process Learnings

Insights about experimental processes:

```typescript
interface ProcessLearning {
  type: 'process';
  experimentId: string;
  processType: string;  // 'sintering', 'printing', etc.
  parameters: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial';
  insight: string;
  confidence: number;
}
```

**Example**:
```json
{
  "type": "process",
  "processType": "sintering",
  "parameters": { "temperature": 1350, "duration": 120 },
  "outcome": "success",
  "insight": "SS316L achieves >98% density at 1350°C for 2h in H2 atmosphere",
  "confidence": 0.92
}
```

### 2. Failure Learnings

Captured from unsuccessful experiments:

```typescript
interface FailureLearning {
  type: 'failure';
  experimentId: string;
  failureMode: string;
  rootCause: string;
  prevention: string;
  parameters: Record<string, any>;
}
```

**Example**:
```json
{
  "type": "failure",
  "failureMode": "warping",
  "rootCause": "Excessive thermal gradient during cooling",
  "prevention": "Use controlled cooling rate <5°C/min below 800°C",
  "parameters": { "coolingRate": 15 }
}
```

### 3. Material Learnings

Properties and behaviors of materials:

```typescript
interface MaterialLearning {
  type: 'material';
  materialId: string;
  property: string;
  value: any;
  conditions: Record<string, any>;
  source: string;
}
```

## Vector Storage

Learnings are stored in Qdrant with semantic embeddings:

```typescript
// Store a learning
async storeLearning(learning: Learning): Promise<void> {
  // Generate embedding from learning content
  const embedding = await this.generateEmbedding(
    this.learningToText(learning)
  );
  
  // Store in Qdrant
  await this.qdrant.upsert(LEARNINGS_COLLECTION, {
    points: [{
      id: learning.id,
      vector: embedding,
      payload: learning
    }]
  });
}
```

**Collection Configuration**:
```typescript
await qdrant.createCollection('experiment_learnings', {
  vectors: {
    size: 1536,        // OpenAI embedding dimension
    distance: 'Cosine' // Similarity metric
  }
});
```

## Retrieval

The Planning Agent queries for relevant learnings:

```typescript
// Find similar learnings
async findRelevantLearnings(
  context: ExperimentContext,
  limit: number = 10
): Promise<Learning[]> {
  // Generate query embedding from hypothesis
  const queryEmbedding = await this.generateEmbedding(
    context.hypothesis
  );
  
  // Search Qdrant
  const results = await this.qdrant.search(LEARNINGS_COLLECTION, {
    vector: queryEmbedding,
    limit,
    filter: {
      must: [
        { key: 'confidence', range: { gte: 0.7 } }
      ]
    }
  });
  
  return results.map(r => r.payload as Learning);
}
```

## Learning Pipeline

### Extraction

After each experiment, the Analyzer Agent extracts learnings:

```typescript
// In analysis phase
const analysisResult = await analyzerAgent.run(context, {
  doe,
  measurements,
  extractLearnings: true  // Enable learning extraction
});

// Store extracted learnings
for (const learning of analysisResult.learnings) {
  await this.storeLearning(learning);
}
```

### Validation

Learnings are validated before storage:

1. **Confidence Threshold** - Minimum 0.5 confidence
2. **Consistency Check** - No contradictions with high-confidence learnings
3. **Source Verification** - Traceable to experiment data

### Deduplication

Similar learnings are merged:

```typescript
// Check for duplicates before storing
const similar = await this.findSimilarLearnings(learning, 0.95);
if (similar.length > 0) {
  // Update existing learning with new evidence
  await this.mergeLearnings(similar[0], learning);
} else {
  await this.storeLearning(learning);
}
```

## Metrics

Learning system effectiveness is tracked:

| Metric | Description |
|--------|-------------|
| `learnings_stored` | Total learnings in vector store |
| `learnings_retrieved` | Queries per planning phase |
| `learning_impact` | Plans modified by learnings |
| `prediction_accuracy` | Correlation with outcomes |

## Configuration

```yaml
learning:
  embedding_model: "text-embedding-3-small"
  vector_dimension: 1536
  min_confidence: 0.5
  dedup_threshold: 0.95
  retrieval_limit: 10
  collection_name: "experiment_learnings"
```

---

*Next: [Controller Integration](../intersect/controller-integration.md) - INTERSECT protocol*

