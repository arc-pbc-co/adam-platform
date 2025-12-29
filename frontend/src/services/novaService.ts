/**
 * Nova Service - API Gateway Client
 * Replaces direct Gemini calls with Nova backend integration
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3200/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3200/ws';

// Types
export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  risk_level: 'R1' | 'R2' | 'R3';
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateExperimentRequest {
  name: string;
  hypothesis: string;
  description?: string;
  materials?: Array<{
    material_id: string;
    quantity: number;
    unit: string;
    role: string;
  }>;
  parameters?: Array<{
    name: string;
    value: string;
    unit?: string;
  }>;
}

export interface ExperimentDetails extends Experiment {
  parameters: Array<{
    id: string;
    parameter_name: string;
    parameter_value: string;
    unit?: string;
  }>;
  materials: Array<{
    id: string;
    material_id: string;
    quantity: number;
    unit: string;
    role: string;
  }>;
  jobs: Array<{
    id: string;
    job_type: string;
    status: string;
    created_at: string;
    completed_at?: string;
  }>;
  agent_activities: Array<{
    id: string;
    agent_type: string;
    activity_type: string;
    status: string;
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
  }>;
}

export interface Hardware {
  id: string;
  name: string;
  type: string;
  model: string;
  status: 'idle' | 'busy' | 'maintenance' | 'offline';
  capabilities: Record<string, any>;
  location: string;
}

export interface AgentActivity {
  id: string;
  experiment_id: string;
  agent_type: 'planner' | 'designer' | 'simulator' | 'controller' | 'analyzer';
  activity_type: string;
  status: 'in_progress' | 'completed' | 'failed';
  input_data?: any;
  output_data?: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface WebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'event' | 'error' | 'pong';
  clientId?: string;
  topic?: string;
  data?: any;
  message?: string;
}

// API Functions

/**
 * Get all experiments
 */
export async function getExperiments(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ experiments: Experiment[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/experiments?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch experiments: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get experiment by ID with full details
 */
export async function getExperiment(id: string): Promise<ExperimentDetails> {
  const response = await fetch(`${API_BASE}/experiments/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch experiment: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

/**
 * Create new experiment
 */
export async function createExperiment(
  request: CreateExperimentRequest
): Promise<{ experiment: Experiment; message: string }> {
  const response = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create experiment');
  }

  return response.json();
}

/**
 * Approve or reject experiment (for R2/R3)
 */
export async function approveExperiment(
  id: string,
  approved: boolean,
  comments?: string
): Promise<{ experiment: Experiment; message: string }> {
  const response = await fetch(`${API_BASE}/experiments/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ approved, comments }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve experiment');
  }

  return response.json();
}

/**
 * Cancel experiment
 */
export async function cancelExperiment(
  id: string,
  reason?: string
): Promise<{ experiment: Experiment; message: string }> {
  const response = await fetch(`${API_BASE}/experiments/${id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel experiment');
  }

  return response.json();
}

/**
 * Get all hardware
 */
export async function getHardware(params?: {
  type?: string;
  status?: string;
}): Promise<{ hardware: Hardware[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);

  const response = await fetch(`${API_BASE}/hardware?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch hardware: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get hardware by ID
 */
export async function getHardwareById(id: string): Promise<{
  hardware: Hardware;
  recent_jobs: any[];
}> {
  const response = await fetch(`${API_BASE}/hardware/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch hardware: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Submit job to hardware
 */
export async function submitJob(
  hardwareId: string,
  job: {
    experiment_id: string;
    job_type: string;
    parameters: Record<string, any>;
  }
): Promise<{ job: any; message: string }> {
  const response = await fetch(`${API_BASE}/hardware/${hardwareId}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit job');
  }

  return response.json();
}

/**
 * Get agent activities
 */
export async function getAgentActivities(params?: {
  experiment_id?: string;
  agent_type?: string;
  limit?: number;
}): Promise<{ activities: AgentActivity[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.experiment_id) queryParams.append('experiment_id', params.experiment_id);
  if (params?.agent_type) queryParams.append('agent_type', params.agent_type);
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/agents/activities?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch agent activities: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get agent metrics
 */
export async function getAgentMetrics(agentType?: string): Promise<{
  metrics: Array<{
    agent_type: string;
    total_activities: number;
    avg_duration_ms: number;
    successful: number;
    failed: number;
  }>;
}> {
  const queryParams = new URLSearchParams();
  if (agentType) queryParams.append('agent_type', agentType);

  const response = await fetch(`${API_BASE}/agents/metrics?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch agent metrics: ${response.statusText}`);
  }
  return response.json();
}

// WebSocket Connection

export class NovaWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private messageQueue: any[] = [];
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;
  private isConnecting = false;

  connect(): Promise<void> {
    // If already connected, resolve immediately
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // If currently connecting, return the existing promise
    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise;
    }

    this.isConnecting = true;
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.ws) {
          this.ws.onclose = null; // Prevent reconnect loop
          this.ws.close();
        }

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log('🔌 Connected to Nova WebSocket');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Send queued messages
          this.flushMessageQueue();

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          // Don't reject here - let onclose handle reconnection
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from Nova WebSocket');
          this.isConnected = false;
          this.isConnecting = false;
          this.attemptReconnect();
        };

        // Timeout for initial connection
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectPromise;
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Re-queue the message
        this.messageQueue.unshift(msg);
        break;
      }
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Will retry again via onclose
      });
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'connected':
        console.log('Connected to Nova, client ID:', message.clientId);
        break;

      case 'subscribed':
        console.log('Subscribed to topic:', message.topic);
        break;

      case 'event':
        if (message.topic && message.data) {
          const listeners = this.listeners.get(message.topic);
          if (listeners) {
            listeners.forEach((callback) => callback(message.data));
          }

          // Also notify wildcard listeners
          const wildcardListeners = this.listeners.get('*');
          if (wildcardListeners) {
            wildcardListeners.forEach((callback) => callback(message.data));
          }
        }
        break;

      case 'error':
        console.error('WebSocket error:', message.message);
        break;

      case 'pong':
        // Keep-alive response
        break;
    }
  }

  private send(data: any) {
    // Only send if actually connected and socket is open
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.messageQueue.push(data);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(data);
      // Try to connect if not already
      if (!this.isConnecting && !this.isConnected) {
        this.connect().catch((err) => {
          console.error('Failed to connect WebSocket:', err);
        });
      }
    }
  }

  subscribe(topic: string, callback: (data: any) => void) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);

    this.send({
      type: 'subscribe',
      payload: { topic },
    });
  }

  unsubscribe(topic: string, callback?: (data: any) => void) {
    if (callback) {
      const listeners = this.listeners.get(topic);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(topic);
        }
      }
    } else {
      this.listeners.delete(topic);
    }

    this.send({
      type: 'unsubscribe',
      payload: { topic },
    });
  }

  ping() {
    this.send({ type: 'ping' });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.messageQueue = [];
    this.isConnected = false;
  }
}

// Singleton WebSocket instance
let wsInstance: NovaWebSocket | null = null;

export function getWebSocket(): NovaWebSocket {
  if (!wsInstance) {
    wsInstance = new NovaWebSocket();
  }
  return wsInstance;
}
