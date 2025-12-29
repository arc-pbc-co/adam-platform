# Deployment Architecture

ADAM is deployed as a cloud-native application with edge components for laboratory instrument control.

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloud Region                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Kubernetes Cluster                      │  │
│  │                                                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │   API   │  │  Nova   │  │INTERSECT│  │  Event  │      │  │
│  │  │ Gateway │  │  Orch   │  │ Gateway │  │  Bridge │      │  │
│  │  │  (3x)   │  │  (3x)   │  │  (2x)   │  │  (3x)   │      │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                   Data Services                      │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │  │
│  │  │  │PostgreSQL│  │TimescaleDB│ │  Qdrant  │          │  │  │
│  │  │  │ (HA)     │  │  (HA)    │  │ (Cluster)│          │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘          │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌──────────┐  ┌──────────┐                        │  │  │
│  │  │  │  Redis   │  │   NATS   │                        │  │  │
│  │  │  │ (Cluster)│  │ (Cluster)│                        │  │  │
│  │  │  └──────────┘  └──────────┘                        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ VPN / mTLS
                              │
┌─────────────────────────────┼─────────────────────────────────────┐
│                        Laboratory Edge                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐         │
│  │ Desktop Metal │  │   Furnace     │  │     XRD       │         │
│  │  Controller   │  │  Controller   │  │  Controller   │         │
│  └───────────────┘  └───────────────┘  └───────────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

## Kubernetes Resources

### Namespace Structure

```yaml
# Namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: adam-platform
---
apiVersion: v1
kind: Namespace
metadata:
  name: adam-data
---
apiVersion: v1
kind: Namespace
metadata:
  name: adam-monitoring
```

### API Gateway Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: adam-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: adam/api-gateway:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: adam-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Nova Orchestrator Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nova-orchestrator
  namespace: adam-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nova-orchestrator
  template:
    spec:
      containers:
      - name: nova-orchestrator
        image: adam/nova-orchestrator:latest
        ports:
        - containerPort: 8081
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: adam-secrets
              key: openai-api-key
        - name: NATS_URL
          value: "nats://nats.adam-data:4222"
        - name: QDRANT_URL
          value: "http://qdrant.adam-data:6333"
```

## Service Mesh (Istio)

### Virtual Service

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: adam-api
  namespace: adam-platform
spec:
  hosts:
  - api.adam-platform.io
  gateways:
  - adam-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: api-gateway
        port:
          number: 8080
```

### Destination Rule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-gateway
  namespace: adam-platform
spec:
  host: api-gateway
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
    loadBalancer:
      simple: ROUND_ROBIN
```

## Helm Chart Structure

```
adam-platform/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-prod.yaml
├── templates/
│   ├── api-gateway/
│   ├── nova-orchestrator/
│   ├── intersect-gateway/
│   ├── event-bridge/
│   ├── configmaps/
│   ├── secrets/
│   └── services/
└── charts/
    ├── postgresql/
    ├── timescaledb/
    ├── qdrant/
    ├── redis/
    └── nats/
```

## Environment Configuration

### Development

```yaml
# values-dev.yaml
replicaCount:
  apiGateway: 1
  novaOrchestrator: 1
  intersectGateway: 1

resources:
  apiGateway:
    requests:
      memory: "128Mi"
      cpu: "100m"

database:
  host: localhost
  port: 5432
```

### Production

```yaml
# values-prod.yaml
replicaCount:
  apiGateway: 3
  novaOrchestrator: 3
  intersectGateway: 2

resources:
  apiGateway:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

database:
  host: postgresql.adam-data
  port: 5432
  ssl: true
  poolSize: 20

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilization: 70
```

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy ADAM Platform

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Build and push images
      run: |
        docker build -t adam/api-gateway:${{ github.sha }} ./packages/api-gateway
        docker push adam/api-gateway:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      run: |
        helm upgrade --install adam-platform ./helm/adam-platform \
          --set image.tag=${{ github.sha }} \
          -f values-prod.yaml
```

---

*Back to: [Architecture Overview](../README.md)*

