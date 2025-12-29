/**
 * INTERSECT Gateway Service for Nova
 *
 * Provides communication with INTERSECT instrument controllers.
 * Handles routing, retries, and response translation.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  IIntersectGatewayService,
  KeyValue,
  Correlation,
  StartActivityResponse,
  ActivityStatusResponse,
  ActivityDataResponse,
  PerformActionResponse,
  ControllerInfo,
  GatewayConfig,
  ControllerEndpoint,
} from './intersect-types';

/**
 * INTERSECT Gateway Service implementation for Nova
 */
export class NovaIntersectGateway implements IIntersectGatewayService {
  private clients: Map<string, AxiosInstance> = new Map();
  private controllerRegistry: Map<string, ControllerEndpoint> = new Map();
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;

    // Initialize controller clients
    for (const controller of config.controllers) {
      this.registerController(controller);
    }
  }

  private registerController(endpoint: ControllerEndpoint): void {
    this.controllerRegistry.set(endpoint.controllerId, endpoint);

    const client = axios.create({
      baseURL: endpoint.endpoint,
      timeout: this.config.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Nova-Version': '2.0.0',
      },
    });

    // Add retry interceptor
    this.addRetryInterceptor(client);
    this.clients.set(endpoint.controllerId, client);
  }

  async startActivity(params: {
    controllerId: string;
    activityName: string;
    experimentRunId: string;
    campaignId?: string;
    activityOptions?: KeyValue[];
    deadline?: Date;
  }): Promise<StartActivityResponse> {
    const client = this.getClient(params.controllerId);

    const request = {
      activityOptions: params.activityOptions || [],
      activityDeadline: params.deadline,
      correlation: {
        experimentRunId: params.experimentRunId,
        campaignId: params.campaignId,
        traceId: `nova_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    try {
      const response = await client.post<StartActivityResponse>(
        `/activities/${params.activityName}/start`,
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'startActivity');
    }
  }

  async getActivityStatus(controllerId: string, activityId: string): Promise<ActivityStatusResponse> {
    const client = this.getClient(controllerId);
    try {
      const response = await client.get<ActivityStatusResponse>(
        `/activities/instance/${activityId}/status`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getActivityStatus');
    }
  }

  async getActivityData(controllerId: string, activityId: string): Promise<ActivityDataResponse> {
    const client = this.getClient(controllerId);
    try {
      const response = await client.get<ActivityDataResponse>(
        `/activities/instance/${activityId}/data`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getActivityData');
    }
  }

  async cancelActivity(controllerId: string, activityId: string, reason: string): Promise<void> {
    const client = this.getClient(controllerId);
    try {
      await client.post(`/activities/instance/${activityId}/cancel`, { reason });
    } catch (error) {
      throw this.handleError(error, 'cancelActivity');
    }
  }

  async performAction(params: {
    controllerId: string;
    actionName: string;
    actionOptions?: KeyValue[];
    idempotencyKey: string;
    correlation?: Correlation;
  }): Promise<PerformActionResponse> {
    const client = this.getClient(params.controllerId);
    try {
      const response = await client.post<PerformActionResponse>(
        `/actions/${params.actionName}/perform`,
        {
          actionOptions: params.actionOptions || [],
          idempotencyKey: params.idempotencyKey,
          correlation: params.correlation,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'performAction');
    }
  }

  async listControllers(): Promise<ControllerInfo[]> {
    const controllers: ControllerInfo[] = [];
    for (const [controllerId, endpoint] of this.controllerRegistry) {
      const health = await this.getControllerHealth(controllerId);
      controllers.push({
        controllerId,
        controllerName: controllerId,
        controllerType: 'instrument',
        endpoint: endpoint.endpoint,
        status: health.healthy ? 'online' : 'offline',
        lastSeen: new Date(),
        capabilities: { actions: [], activities: [] },
      });
    }
    return controllers;
  }

  async listActions(controllerId: string): Promise<string[]> {
    const client = this.getClient(controllerId);
    try {
      const response = await client.get<{ actionNames: string[] }>('/actions');
      return response.data.actionNames;
    } catch {
      return [];
    }
  }

  async listActivities(controllerId: string): Promise<string[]> {
    const client = this.getClient(controllerId);
    try {
      const response = await client.get<{ activityNames: string[] }>('/activities');
      return response.data.activityNames;
    } catch {
      return [];
    }
  }

  async getControllerHealth(controllerId: string): Promise<{ healthy: boolean; message?: string }> {
    const client = this.clients.get(controllerId);
    if (!client) return { healthy: false, message: 'Controller not registered' };
    try {
      await client.get('/health', { timeout: 5000 });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, message: (error as Error).message };
    }
  }

  private getClient(controllerId: string): AxiosInstance {
    const client = this.clients.get(controllerId);
    if (!client) {
      throw new Error(`Controller not found: ${controllerId}`);
    }
    return client;
  }

  private addRetryInterceptor(client: AxiosInstance): void {
    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config: any = error.config;
        if (!config || config.retryCount >= this.config.retryConfig.maxRetries) {
          return Promise.reject(error);
        }
        config.retryCount = (config.retryCount || 0) + 1;
        const delay = Math.min(
          this.config.retryConfig.baseDelayMs * Math.pow(2, config.retryCount),
          this.config.retryConfig.maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(config);
      }
    );
  }

  private handleError(error: unknown, operation: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; message: string }>;
      if (axiosError.response?.data?.message) {
        return new Error(`${operation}: ${axiosError.response.data.message}`);
      }
    }
    return new Error(`${operation} failed: ${(error as Error).message}`);
  }
}

/**
 * Factory function to create gateway service
 */
export function createGatewayService(config: GatewayConfig): IIntersectGatewayService {
  return new NovaIntersectGateway(config);
}

