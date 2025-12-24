/**
 * INTERSECT Gateway Service
 *
 * Translates ADAM domain intents (WorkOrder / ExperimentRun steps) into
 * INTERSECT Tasks/Commands/Actions and invokes capability methods.
 *
 * Responsibilities:
 * - Build instrument "Activity" requests from experiment plans
 * - Maintain correlation IDs (ExperimentRun ↔ activityId/taskId)
 * - Enforce idempotency keys for actions
 * - Route requests to appropriate edge controllers
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Correlation,
  KeyValue,
  StartActivityRequest,
  StartActivityResponse,
  PerformActionRequest,
  PerformActionResponse,
  ActivityStatusResponse,
  ActivityDataResponse,
  ActionListResponse,
  ActivityListResponse,
  ControllerInfo,
  GatewayConfig,
  ControllerEndpoint,
  IntersectServiceError,
} from '../types';
import { ICorrelationStore } from '../correlation/CorrelationStore';
import { SchemaMapper, schemaMapper } from '../mapping/SchemaMapper';
import { ExecutionPlan } from '../../../../nova/src/types';

export interface IIntersectGatewayService {
  // Activity operations
  startActivity(params: {
    controllerId: string;
    activityName: string;
    experimentRunId: string;
    campaignId?: string;
    activityOptions?: KeyValue[];
    deadline?: Date;
  }): Promise<StartActivityResponse>;

  getActivityStatus(
    controllerId: string,
    activityId: string
  ): Promise<ActivityStatusResponse>;

  getActivityData(
    controllerId: string,
    activityId: string
  ): Promise<ActivityDataResponse>;

  cancelActivity(
    controllerId: string,
    activityId: string,
    reason: string
  ): Promise<void>;

  // Action operations
  performAction(params: {
    controllerId: string;
    actionName: string;
    actionOptions?: KeyValue[];
    idempotencyKey: string;
    correlation?: Correlation;
  }): Promise<PerformActionResponse>;

  // Discovery
  listControllers(): Promise<ControllerInfo[]>;
  listActions(controllerId: string): Promise<string[]>;
  listActivities(controllerId: string): Promise<string[]>;
  getControllerHealth(controllerId: string): Promise<{ healthy: boolean; message?: string }>;

  // High-level operations
  executeExperimentPlan(
    plan: ExecutionPlan,
    correlation: Correlation
  ): Promise<StartActivityResponse>;
}

export class IntersectGatewayService implements IIntersectGatewayService {
  private clients: Map<string, AxiosInstance> = new Map();
  private controllerRegistry: Map<string, ControllerEndpoint> = new Map();
  private correlationStore: ICorrelationStore;
  private mapper: SchemaMapper;
  private config: GatewayConfig;

  constructor(
    config: GatewayConfig,
    correlationStore: ICorrelationStore,
    mapper: SchemaMapper = schemaMapper
  ) {
    this.config = config;
    this.correlationStore = correlationStore;
    this.mapper = mapper;

    // Initialize controller registry
    for (const controller of config.controllers) {
      this.registerController(controller);
    }
  }

  /**
   * Register a controller endpoint
   */
  registerController(endpoint: ControllerEndpoint): void {
    this.controllerRegistry.set(endpoint.controllerId, endpoint);

    // Create axios client for this controller
    const client = axios.create({
      baseURL: endpoint.endpoint,
      timeout: this.config.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Version': '0.1.0',
      },
    });

    // Add retry interceptor
    this.addRetryInterceptor(client);

    this.clients.set(endpoint.controllerId, client);
  }

  /**
   * Start an activity on a controller
   */
  async startActivity(params: {
    controllerId: string;
    activityName: string;
    experimentRunId: string;
    campaignId?: string;
    activityOptions?: KeyValue[];
    deadline?: Date;
  }): Promise<StartActivityResponse> {
    const client = this.getClient(params.controllerId);

    const correlation: Correlation = {
      experimentRunId: params.experimentRunId,
      campaignId: params.campaignId,
      traceId: this.generateTraceId(),
    };

    const request: StartActivityRequest = {
      activityOptions: params.activityOptions || [],
      activityDeadline: params.deadline,
      correlation,
    };

    // Validate options using schema mapper
    const validation = this.mapper.validateActivityOptions(
      params.activityName,
      request.activityOptions || []
    );
    if (!validation.success) {
      throw new IntersectServiceError(
        'invalid_options',
        `Invalid activity options: ${validation.errors?.join(', ')}`
      );
    }

    try {
      const response = await client.post<StartActivityResponse>(
        `/activities/${params.activityName}/start`,
        request
      );

      // Store correlation for event tracking
      await this.correlationStore.saveActivityCorrelation({
        activityId: response.data.activityId,
        experimentRunId: params.experimentRunId,
        campaignId: params.campaignId,
        controllerId: params.controllerId,
        activityName: params.activityName,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'startActivity');
    }
  }

  /**
   * Get activity status
   */
  async getActivityStatus(
    controllerId: string,
    activityId: string
  ): Promise<ActivityStatusResponse> {
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

  /**
   * Get activity data products
   */
  async getActivityData(
    controllerId: string,
    activityId: string
  ): Promise<ActivityDataResponse> {
    const client = this.getClient(controllerId);

    try {
      const response = await client.get<ActivityDataResponse>(
        `/activities/instance/${activityId}/data`
      );

      // Store data product mappings
      for (const productUuid of response.data.products) {
        await this.correlationStore.saveDataProductMapping({
          productUuid,
          activityId,
        });
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getActivityData');
    }
  }

  /**
   * Cancel an activity
   */
  async cancelActivity(
    controllerId: string,
    activityId: string,
    reason: string
  ): Promise<void> {
    const client = this.getClient(controllerId);

    try {
      await client.post(`/activities/instance/${activityId}/cancel`, { reason });
      await this.correlationStore.updateActivityStatus(activityId, 'cancelled');
    } catch (error) {
      throw this.handleError(error, 'cancelActivity');
    }
  }

  /**
   * Perform a discrete action
   */
  async performAction(params: {
    controllerId: string;
    actionName: string;
    actionOptions?: KeyValue[];
    idempotencyKey: string;
    correlation?: Correlation;
  }): Promise<PerformActionResponse> {
    // Check idempotency
    if (await this.correlationStore.wasActionPerformed(params.idempotencyKey)) {
      return { accepted: true, message: 'Action already performed (idempotent)' };
    }

    const client = this.getClient(params.controllerId);

    const request: PerformActionRequest = {
      actionOptions: params.actionOptions || [],
      idempotencyKey: params.idempotencyKey,
      correlation: params.correlation,
    };

    try {
      const response = await client.post<PerformActionResponse>(
        `/actions/${params.actionName}/perform`,
        request
      );

      // Mark action as performed
      await this.correlationStore.markActionPerformed(params.idempotencyKey);

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'performAction');
    }
  }

  /**
   * List all registered controllers
   */
  async listControllers(): Promise<ControllerInfo[]> {
    const controllers: ControllerInfo[] = [];

    for (const [controllerId, endpoint] of this.controllerRegistry) {
      const health = await this.getControllerHealth(controllerId);
      const actions = health.healthy ? await this.listActions(controllerId) : [];
      const activities = health.healthy ? await this.listActivities(controllerId) : [];

      controllers.push({
        controllerId,
        controllerName: controllerId,
        controllerType: 'instrument',
        endpoint: endpoint.endpoint,
        status: health.healthy ? 'online' : 'offline',
        lastSeen: new Date(),
        capabilities: { actions, activities },
      });
    }

    return controllers;
  }

  /**
   * List actions available on a controller
   */
  async listActions(controllerId: string): Promise<string[]> {
    const client = this.getClient(controllerId);

    try {
      const response = await client.get<ActionListResponse>('/actions');
      return response.data.actionNames;
    } catch (error) {
      console.error(`Failed to list actions for ${controllerId}:`, error);
      return [];
    }
  }

  /**
   * List activities available on a controller
   */
  async listActivities(controllerId: string): Promise<string[]> {
    const client = this.getClient(controllerId);

    try {
      const response = await client.get<ActivityListResponse>('/activities');
      return response.data.activityNames;
    } catch (error) {
      console.error(`Failed to list activities for ${controllerId}:`, error);
      return [];
    }
  }

  /**
   * Check controller health
   */
  async getControllerHealth(
    controllerId: string
  ): Promise<{ healthy: boolean; message?: string }> {
    const endpoint = this.controllerRegistry.get(controllerId);
    if (!endpoint) {
      return { healthy: false, message: 'Controller not registered' };
    }

    const client = this.clients.get(controllerId);
    if (!client) {
      return { healthy: false, message: 'Client not initialized' };
    }

    try {
      const healthEndpoint = endpoint.healthEndpoint || '/health';
      await client.get(healthEndpoint, { timeout: 5000 });
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: (error as Error).message,
      };
    }
  }

  /**
   * High-level: Execute an experiment plan
   */
  async executeExperimentPlan(
    plan: ExecutionPlan,
    correlation: Correlation
  ): Promise<StartActivityResponse> {
    // Map execution plan to activity request
    const mapping = this.mapper.mapExecutionPlanToActivity(plan, correlation);
    if (!mapping.success || !mapping.data) {
      throw new IntersectServiceError(
        'invalid_options',
        `Failed to map execution plan: ${mapping.errors?.join(', ')}`
      );
    }

    // Determine controller based on equipment type
    const controllerId = this.resolveControllerId(plan.equipmentId);

    // Map job type to activity name
    const activityName = this.mapJobTypeToActivity(plan.jobType);

    return this.startActivity({
      controllerId,
      activityName,
      experimentRunId: correlation.experimentRunId,
      campaignId: correlation.campaignId,
      activityOptions: mapping.data.activityOptions,
      deadline: mapping.data.activityDeadline,
    });
  }

  // Private helper methods

  private getClient(controllerId: string): AxiosInstance {
    const client = this.clients.get(controllerId);
    if (!client) {
      throw new IntersectServiceError(
        'controller_unavailable',
        `Controller not found: ${controllerId}`
      );
    }
    return client;
  }

  private addRetryInterceptor(client: AxiosInstance): void {
    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config: any = error.config;

        if (!config || !config.retryCount) {
          config.retryCount = 0;
        }

        const shouldRetry =
          config.retryCount < this.config.retryConfig.maxRetries &&
          this.isRetryableError(error);

        if (shouldRetry) {
          config.retryCount += 1;

          const delay = Math.min(
            this.config.retryConfig.baseDelayMs * Math.pow(2, config.retryCount),
            this.config.retryConfig.maxDelayMs
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          return client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private isRetryableError(error: AxiosError): boolean {
    // Retry on network errors or 5xx responses
    if (!error.response) {
      return true;
    }
    return error.response.status >= 500 && error.response.status < 600;
  }

  private handleError(error: unknown, operation: string): IntersectServiceError {
    if (error instanceof IntersectServiceError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; message: string }>;

      if (axiosError.response?.data) {
        return new IntersectServiceError(
          (axiosError.response.data.error as any) || 'internal_error',
          axiosError.response.data.message || axiosError.message
        );
      }

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        return new IntersectServiceError(
          'controller_unavailable',
          `Controller connection failed: ${axiosError.message}`
        );
      }
    }

    return new IntersectServiceError(
      'internal_error',
      `${operation} failed: ${(error as Error).message}`
    );
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private resolveControllerId(equipmentId: string): string {
    // For now, use a simple mapping based on equipment ID prefix
    // In production, this would be a lookup in a registry
    if (equipmentId.startsWith('X25') || equipmentId.startsWith('P50')) {
      return 'desktop-metal-controller';
    }
    if (equipmentId.startsWith('SF')) {
      return 'furnace-controller';
    }
    // Default to simulated controller
    return 'simulated-controller';
  }

  private mapJobTypeToActivity(jobType: string): string {
    const mapping: Record<string, string> = {
      print: 'print_job',
      sinter: 'sinter_cycle',
      measure: 'quality_inspection',
      analyze: 'quality_inspection',
    };
    return mapping[jobType] || jobType;
  }
}

/**
 * Factory function to create gateway service
 */
export function createGatewayService(
  config: GatewayConfig,
  correlationStore: ICorrelationStore
): IIntersectGatewayService {
  return new IntersectGatewayService(config, correlationStore);
}
