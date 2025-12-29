# Security Architecture

ADAM implements defense-in-depth security with multiple layers of protection for sensitive research data and laboratory equipment.

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Network Security                          ││
│  │  • TLS 1.3 everywhere                                       ││
│  │  • mTLS for controller communication                        ││
│  │  • Network segmentation                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Authentication                            ││
│  │  • OAuth 2.0 / OIDC                                         ││
│  │  • JWT tokens                                               ││
│  │  • API keys for services                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Authorization                             ││
│  │  • Role-based access control (RBAC)                         ││
│  │  • Resource-level permissions                               ││
│  │  • Risk-level gating                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Data Protection                           ││
│  │  • Encryption at rest                                       ││
│  │  • Encryption in transit                                    ││
│  │  • Audit logging                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication

### OAuth 2.0 / OIDC

ADAM supports standard OAuth 2.0 flows:

```typescript
// Authentication configuration
const authConfig = {
  issuer: 'https://auth.adam-platform.io',
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  scopes: ['openid', 'profile', 'email', 'experiments:read', 'experiments:write']
};
```

### JWT Token Structure

```json
{
  "sub": "user-123",
  "iss": "https://auth.adam-platform.io",
  "aud": "adam-api",
  "exp": 1735500000,
  "iat": 1735496400,
  "roles": ["researcher", "operator"],
  "permissions": ["experiments:read", "experiments:write", "controllers:execute"],
  "org_id": "org-456"
}
```

### API Key Authentication

For service-to-service communication:

```typescript
// API key validation
const validateApiKey = async (apiKey: string): Promise<ServiceIdentity> => {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const service = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND revoked = false',
    [hash]
  );
  if (!service) throw new UnauthorizedError('Invalid API key');
  return service;
};
```

## Authorization

### Role-Based Access Control

| Role | Description | Permissions |
|------|-------------|-------------|
| `viewer` | Read-only access | View experiments, results |
| `researcher` | Create and run experiments | Create, edit, execute R1-R2 |
| `operator` | Equipment operation | Execute activities, monitor |
| `admin` | Full access | All permissions, user management |
| `safety_officer` | Safety oversight | Approve R3-R4, emergency stop |

### Permission Model

```typescript
interface Permission {
  resource: string;    // 'experiments', 'controllers', 'materials'
  action: string;      // 'read', 'write', 'execute', 'delete'
  conditions?: {
    riskLevel?: string[];
    ownOnly?: boolean;
    orgOnly?: boolean;
  };
}

// Example permissions
const researcherPermissions: Permission[] = [
  { resource: 'experiments', action: 'read' },
  { resource: 'experiments', action: 'write', conditions: { ownOnly: true } },
  { resource: 'experiments', action: 'execute', conditions: { riskLevel: ['R1', 'R2'] } },
  { resource: 'materials', action: 'read' },
  { resource: 'controllers', action: 'read' }
];
```

### Risk-Level Gating

Higher risk experiments require additional authorization:

| Risk Level | Approval Required | Execution |
|------------|-------------------|-----------|
| R1 (Low) | None | Automatic |
| R2 (Medium) | Self-approval | Automatic |
| R3 (High) | Safety officer | Manual start |
| R4 (Critical) | Safety committee | Supervised |

```typescript
// Risk level check
const canExecuteExperiment = async (
  user: User,
  experiment: Experiment
): Promise<boolean> => {
  const riskLevel = experiment.riskLevel;
  
  if (riskLevel === 'R1' || riskLevel === 'R2') {
    return hasPermission(user, 'experiments', 'execute');
  }
  
  if (riskLevel === 'R3') {
    return hasRole(user, 'safety_officer') || 
           await hasApproval(experiment.id, 'safety_officer');
  }
  
  if (riskLevel === 'R4') {
    return await hasApproval(experiment.id, 'safety_committee');
  }
  
  return false;
};
```

## Controller Security

### mTLS Authentication

Controllers authenticate using mutual TLS:

```typescript
const controllerTlsConfig = {
  cert: fs.readFileSync('/certs/controller.crt'),
  key: fs.readFileSync('/certs/controller.key'),
  ca: fs.readFileSync('/certs/ca.crt'),
  requestCert: true,
  rejectUnauthorized: true
};
```

### Controller Authorization

```typescript
// Verify controller can execute activity
const authorizeControllerActivity = async (
  controllerId: string,
  activityName: string,
  experimentId: string
): Promise<boolean> => {
  // Verify controller is registered
  const controller = await getController(controllerId);
  if (!controller || controller.status !== 'active') return false;
  
  // Verify activity is in controller's capabilities
  if (!controller.capabilities.activities.includes(activityName)) return false;
  
  // Verify experiment has valid work order for this controller
  const workOrder = await getWorkOrder(experimentId, controllerId);
  return workOrder !== null;
};
```

## Audit Logging

All security-relevant events are logged:

```typescript
interface AuditEvent {
  timestamp: Date;
  eventType: string;
  userId?: string;
  serviceId?: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Log audit event
await auditLog.log({
  eventType: 'experiment.execute',
  userId: user.id,
  resource: `experiments/${experimentId}`,
  action: 'execute',
  outcome: 'success',
  details: { riskLevel: 'R2', controllerId: 'desktop-metal-x25' }
});
```

## Data Protection

### Encryption at Rest

- PostgreSQL: Transparent Data Encryption (TDE)
- TimescaleDB: TDE with key rotation
- Qdrant: Encrypted storage volumes
- Redis: Encrypted persistence

### Encryption in Transit

- All HTTP traffic: TLS 1.3
- NATS: TLS with client certificates
- Database connections: TLS required

---

*Next: [Deployment](deployment.md) - Infrastructure and deployment*

