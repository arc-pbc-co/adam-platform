# ADAM Platform Integration

Patterns for integrating the God Mode UI with ARC's ADAM Platform.

## Site Onboarding Workflow

The Global Network Map feeds into the ADAM onboarding workflow:

```typescript
// types/onboarding.ts
interface OnboardingRequest {
  siteIds: string[];
  scheduledDate?: string;
  priority: 'immediate' | 'scheduled' | 'queue';
  notifyContacts: boolean;
}

interface OnboardingStatus {
  siteId: string;
  status: 'pending' | 'connecting' | 'configuring' | 'testing' | 'online' | 'failed';
  progress: number;
  message?: string;
  printers: PrinterOnboardingStatus[];
}

interface PrinterOnboardingStatus {
  printerId: string;
  serialNumber: string;
  productLine: string;
  status: 'pending' | 'discovered' | 'configuring' | 'online' | 'failed';
  mqttConnected: boolean;
  intersectRegistered: boolean;
}

// hooks/useOnboarding.ts
export function useOnboarding() {
  const [onboardingStatus, setOnboardingStatus] = useState<Map<string, OnboardingStatus>>(new Map());
  
  const startOnboarding = async (request: OnboardingRequest) => {
    const response = await api.post('/api/onboarding/start', request);
    
    // Subscribe to onboarding progress via WebSocket/MQTT
    subscribeToTopic(`intersect/adam/onboarding/${response.batchId}/progress`, (status) => {
      setOnboardingStatus((prev) => {
        const next = new Map(prev);
        next.set(status.siteId, status);
        return next;
      });
    });
    
    return response;
  };
  
  return { onboardingStatus, startOnboarding };
}
```

### Onboarding Progress Modal

```tsx
// components/OnboardingProgress/OnboardingProgress.tsx
const OnboardingProgress: React.FC<{
  sites: Site[];
  status: Map<string, OnboardingStatus>;
  onClose: () => void;
}> = ({ sites, status, onClose }) => (
  <div className="onboarding-modal" data-augmented-ui="tl-clip br-clip border">
    <div className="onboarding-modal__header">
      <h3>ADAM NETWORK ONBOARDING</h3>
      <span className="status-badge">
        {sites.filter((s) => status.get(s.id)?.status === 'online').length} / {sites.length} Complete
      </span>
    </div>
    
    <div className="onboarding-modal__sites">
      {sites.map((site) => {
        const siteStatus = status.get(site.id);
        return (
          <div key={site.id} className={`onboarding-site ${siteStatus?.status}`}>
            <div className="onboarding-site__header">
              <StatusIndicator status={mapOnboardingStatus(siteStatus?.status)} />
              <span className="site-name">{site.name}</span>
              <span className="site-location">{site.city}, {site.state}</span>
            </div>
            
            <ProgressBar 
              value={siteStatus?.progress || 0} 
              max={100}
              variant={siteStatus?.status === 'failed' ? 'danger' : 'default'}
            />
            
            {siteStatus?.message && (
              <p className="status-message">{siteStatus.message}</p>
            )}
            
            {siteStatus?.printers && (
              <div className="printer-list">
                {siteStatus.printers.map((printer) => (
                  <div key={printer.printerId} className={`printer-item ${printer.status}`}>
                    <StatusIndicator status={mapPrinterStatus(printer.status)} size="sm" />
                    <span>{printer.serialNumber}</span>
                    <span className="product-line">{printer.productLine}</span>
                    <div className="connection-indicators">
                      <span className={`indicator mqtt ${printer.mqttConnected ? 'connected' : ''}`}>
                        MQTT
                      </span>
                      <span className={`indicator intersect ${printer.intersectRegistered ? 'connected' : ''}`}>
                        INTERSECT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
    
    <div className="onboarding-modal__footer">
      <button onClick={onClose} className="close-btn" data-augmented-ui="tl-clip br-clip border">
        {status.size === sites.length ? 'Complete' : 'Run in Background'}
      </button>
    </div>
  </div>
);
```

## Agent Type Mapping

Map ADAM's hardware and services to RTS-style units:

```typescript
// types/agents.ts
type AgentType = 
  | 'printer'      // Desktop Metal printers
  | 'orchestrator' // Nova AI orchestrator
  | 'analyzer'     // Characterization instruments
  | 'worker'       // Background services
  | 'campaign';    // Active experiment campaigns

interface AdamAgent {
  id: string;
  name: string;
  type: AgentType;
  subtype?: string;  // e.g., 'X25Pro', 'ShopSystem'
  status: 'idle' | 'working' | 'error' | 'offline';
  health: number;    // 0-100
  position: { x: number; y: number };  // Percentage coordinates
  currentTask?: {
    id: string;
    name: string;
    progress: number;
  };
  capabilities: string[];
  metrics?: Record<string, number>;
}
```

## Desktop Metal Printer Fleet

```typescript
// config/printers.ts
export const PRINTER_CONFIG: Record<string, {
  icon: string;
  color: string;
  capabilities: string[];
  defaultPosition: { x: number; y: number };
}> = {
  'x25-pro': {
    icon: 'cube',
    color: '#00d4ff',
    capabilities: ['print', 'queue', 'calibrate', 'status'],
    defaultPosition: { x: 20, y: 30 },
  },
  'shop-system': {
    icon: 'package',
    color: '#00ff88',
    capabilities: ['print', 'batch', 'queue', 'status'],
    defaultPosition: { x: 40, y: 30 },
  },
  'x160-pro': {
    icon: 'box',
    color: '#ffaa00',
    capabilities: ['print', 'ceramic', 'queue', 'status'],
    defaultPosition: { x: 60, y: 30 },
  },
  'innovent-x': {
    icon: 'flask',
    color: '#aa44ff',
    capabilities: ['print', 'experimental', 'configure', 'status'],
    defaultPosition: { x: 80, y: 30 },
  },
  'etec-xtreme': {
    icon: 'layers',
    color: '#ff3366',
    capabilities: ['print', 'polymer', 'dlp', 'status'],
    defaultPosition: { x: 50, y: 60 },
  },
};
```

## Resource Metrics

Map ADAM's system metrics to RTS-style resources:

```typescript
// hooks/useAdamResources.ts
interface AdamResources {
  compute: {
    current: number;
    max: number;
    unit: '%';
  };
  tokens: {
    current: number;
    max: number;
    unit: 'K';
  };
  activeJobs: {
    current: number;
    max: number;
    unit: '';
  };
  agentsOnline: {
    current: number;
    max: number;
    unit: '';
  };
  experimentsToday: {
    current: number;
    max: number;
    unit: '';
  };
}

export function useAdamResources(): AdamResources {
  const { data } = useRealTimeData<SystemMetrics>({
    url: '/api/metrics',
  });
  
  return useMemo(() => ({
    compute: {
      current: data?.cpuUsage ?? 0,
      max: 100,
      unit: '%',
    },
    tokens: {
      current: Math.round((data?.tokensUsed ?? 0) / 1000),
      max: Math.round((data?.tokenLimit ?? 0) / 1000),
      unit: 'K',
    },
    activeJobs: {
      current: data?.activeJobs ?? 0,
      max: data?.maxConcurrentJobs ?? 50,
      unit: '',
    },
    agentsOnline: {
      current: data?.onlineAgents ?? 0,
      max: data?.totalAgents ?? 8,
      unit: '',
    },
    experimentsToday: {
      current: data?.experimentsToday ?? 0,
      max: 200, // Target throughput
      unit: '',
    },
  }), [data]);
}
```

## WebSocket Event Types

```typescript
// types/events.ts
interface AdamEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Event sources
type EventSource = 
  | 'nova'        // AI orchestrator decisions
  | 'x25-pro'     // Printer events
  | 'shop-system'
  | 'x160-pro'
  | 'innovent-x'
  | 'etec-xtreme'
  | 'campaign'    // Experiment campaign events
  | 'system';     // Infrastructure events
```

## Command Definitions

```typescript
// config/commands.ts
interface Command {
  id: string;
  label: string;
  icon: string;
  hotkey?: string;
  applicableTo: AgentType[];
  disabled?: (agent: AdamAgent) => boolean;
  action: (agents: AdamAgent[]) => Promise<void>;
}

export const COMMANDS: Command[] = [
  {
    id: 'start',
    label: 'Start',
    icon: 'play',
    hotkey: 'S',
    applicableTo: ['printer'],
    disabled: (agent) => agent.status !== 'idle',
    action: async (agents) => {
      await api.post('/jobs/start', { 
        agentIds: agents.map(a => a.id) 
      });
    },
  },
  {
    id: 'stop',
    label: 'Stop',
    icon: 'square',
    hotkey: 'X',
    applicableTo: ['printer', 'worker'],
    disabled: (agent) => agent.status !== 'working',
    action: async (agents) => {
      await api.post('/jobs/stop', { 
        agentIds: agents.map(a => a.id) 
      });
    },
  },
  {
    id: 'queue',
    label: 'Queue Job',
    icon: 'list-plus',
    hotkey: 'Q',
    applicableTo: ['printer'],
    action: async (agents) => {
      // Open job queue modal
    },
  },
  {
    id: 'analyze',
    label: 'AI Analyze',
    icon: 'brain',
    hotkey: 'A',
    applicableTo: ['printer', 'campaign'],
    action: async (agents) => {
      await api.post('/nova/analyze', { 
        targetIds: agents.map(a => a.id) 
      });
    },
  },
  {
    id: 'calibrate',
    label: 'Calibrate',
    icon: 'settings',
    hotkey: 'C',
    applicableTo: ['printer'],
    disabled: (agent) => agent.status === 'working',
    action: async (agents) => {
      await api.post('/calibration/start', { 
        printerIds: agents.map(a => a.id) 
      });
    },
  },
  {
    id: 'abort',
    label: 'Abort',
    icon: 'alert-triangle',
    hotkey: 'ESCAPE',
    applicableTo: ['printer', 'campaign'],
    action: async (agents) => {
      if (confirm('Abort selected operations?')) {
        await api.post('/jobs/abort', { 
          agentIds: agents.map(a => a.id) 
        });
      }
    },
  },
];
```

## INTERSECT Event Integration

When ADAM migrates to INTERSECT/MQTT:

```typescript
// hooks/useIntersectEvents.ts
import { useMqttSubscription } from './useMqtt';

export function useIntersectEvents() {
  const [events, setEvents] = useState<AdamEvent[]>([]);
  
  // Subscribe to INTERSECT event topics
  useMqttSubscription('intersect/adam/instruments/+/status', (topic, message) => {
    const printerId = topic.split('/')[3];
    const status = JSON.parse(message.toString());
    
    setEvents(prev => [...prev.slice(-99), {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: status.error ? 'error' : 'info',
      source: printerId,
      message: status.message,
      metadata: status,
    }]);
  });
  
  useMqttSubscription('intersect/adam/campaigns/+/events', (topic, message) => {
    const campaignId = topic.split('/')[3];
    const event = JSON.parse(message.toString());
    
    setEvents(prev => [...prev.slice(-99), {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: event.type,
      source: `campaign-${campaignId}`,
      message: event.message,
      metadata: event,
    }]);
  });
  
  useMqttSubscription('intersect/adam/nova/decisions', (topic, message) => {
    const decision = JSON.parse(message.toString());
    
    setEvents(prev => [...prev.slice(-99), {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'info',
      source: 'nova',
      message: decision.reasoning,
      metadata: decision,
    }]);
  });
  
  return events;
}
```

## Nova AI Orchestrator Integration

Display Nova's AI decisions with special styling:

```typescript
// components/NovaDecisionPanel.tsx
interface NovaDecision {
  id: string;
  timestamp: string;
  reasoning: string;
  action: string;
  confidence: number;
  affectedAgents: string[];
}

const NovaDecisionPanel: React.FC<{ decision: NovaDecision }> = ({ decision }) => (
  <div 
    className="nova-decision" 
    data-augmented-ui="tl-clip br-clip border"
    style={{
      '--aug-border-bg': 'var(--accent-purple)',
    } as React.CSSProperties}
  >
    <div className="nova-decision__header">
      <BrainIcon className="nova-decision__icon" />
      <span>NOVA DECISION</span>
      <span className="nova-decision__confidence">
        {Math.round(decision.confidence * 100)}% confidence
      </span>
    </div>
    <p className="nova-decision__reasoning">{decision.reasoning}</p>
    <div className="nova-decision__action">
      <span>Action:</span> {decision.action}
    </div>
  </div>
);
```

```css
.nova-decision {
  --aug-tl: 12px;
  --aug-br: 12px;
  --aug-border-all: 2px;
  background: rgba(170, 68, 255, 0.1);
  padding: 1rem;
  margin: 0.5rem 0;
}

.nova-decision__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--accent-purple);
  margin-bottom: 0.75rem;
}

.nova-decision__icon {
  width: 16px;
  height: 16px;
  animation: glowPulse 2s ease-in-out infinite;
}

.nova-decision__confidence {
  margin-left: auto;
  font-family: var(--font-mono);
}

.nova-decision__reasoning {
  font-size: 0.85rem;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

.nova-decision__action {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.nova-decision__action span {
  color: var(--accent-purple);
}
```

## Keyboard Shortcuts for ADAM

```typescript
// hooks/useAdamShortcuts.ts
const ADAM_SHORTCUTS = new Map<string, () => void>([
  ['A', () => selectAll()],
  ['S', () => startSelected()],
  ['X', () => stopSelected()],
  ['Q', () => openQueueModal()],
  ['C', () => calibrateSelected()],
  ['N', () => focusNova()],
  ['M', () => toggleMinimap()],
  ['L', () => focusEventLog()],
  ['ESCAPE', () => clearSelection()],
  ['F1', () => showHelp()],
  ['1', () => selectGroup(1)],
  ['2', () => selectGroup(2)],
  ['3', () => selectGroup(3)],
  ['CONTROL+1', () => assignGroup(1)],
  ['CONTROL+2', () => assignGroup(2)],
  ['CONTROL+3', () => assignGroup(3)],
]);
```
