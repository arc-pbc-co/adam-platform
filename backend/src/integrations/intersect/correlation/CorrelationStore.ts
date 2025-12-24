/**
 * Correlation Store
 *
 * Manages mappings between ADAM entities (ExperimentRun, Artifacts) and
 * INTERSECT entities (Activities, Data Products).
 *
 * Supports both in-memory storage (for development/testing) and
 * database-backed storage (for production).
 */

import {
  ActivityCorrelation,
  DataProductMapping,
  ActivityStatus,
  Correlation,
} from '../types';

export interface ICorrelationStore {
  // Activity correlations
  saveActivityCorrelation(params: {
    activityId: string;
    experimentRunId: string;
    campaignId?: string;
    controllerId: string;
    activityName: string;
  }): Promise<ActivityCorrelation>;

  getActivityCorrelation(activityId: string): Promise<ActivityCorrelation | null>;
  getCorrelationsByExperimentRun(experimentRunId: string): Promise<ActivityCorrelation[]>;
  updateActivityStatus(activityId: string, status: ActivityStatus): Promise<void>;

  // Data product mappings
  saveDataProductMapping(params: {
    productUuid: string;
    activityId: string;
    artifactId?: string;
    storageUri?: string;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<DataProductMapping>;

  getDataProductMapping(productUuid: string): Promise<DataProductMapping | null>;
  getDataProductsByActivity(activityId: string): Promise<DataProductMapping[]>;
  linkProductToArtifact(productUuid: string, artifactId: string): Promise<void>;

  // Idempotency tracking
  wasActionPerformed(idempotencyKey: string): Promise<boolean>;
  markActionPerformed(idempotencyKey: string): Promise<void>;
}

/**
 * In-memory implementation for development and testing
 */
export class InMemoryCorrelationStore implements ICorrelationStore {
  private activityCorrelations: Map<string, ActivityCorrelation> = new Map();
  private dataProductMappings: Map<string, DataProductMapping> = new Map();
  private performedActions: Set<string> = new Set();
  private idCounter = 0;

  async saveActivityCorrelation(params: {
    activityId: string;
    experimentRunId: string;
    campaignId?: string;
    controllerId: string;
    activityName: string;
  }): Promise<ActivityCorrelation> {
    const correlation: ActivityCorrelation = {
      id: `corr_${++this.idCounter}`,
      activityId: params.activityId,
      experimentRunId: params.experimentRunId,
      campaignId: params.campaignId,
      controllerId: params.controllerId,
      activityName: params.activityName,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activityCorrelations.set(params.activityId, correlation);
    return correlation;
  }

  async getActivityCorrelation(activityId: string): Promise<ActivityCorrelation | null> {
    return this.activityCorrelations.get(activityId) || null;
  }

  async getCorrelationsByExperimentRun(experimentRunId: string): Promise<ActivityCorrelation[]> {
    return Array.from(this.activityCorrelations.values()).filter(
      (c) => c.experimentRunId === experimentRunId
    );
  }

  async updateActivityStatus(activityId: string, status: ActivityStatus): Promise<void> {
    const correlation = this.activityCorrelations.get(activityId);
    if (correlation) {
      correlation.status = status;
      correlation.updatedAt = new Date();
    }
  }

  async saveDataProductMapping(params: {
    productUuid: string;
    activityId: string;
    artifactId?: string;
    storageUri?: string;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<DataProductMapping> {
    const mapping: DataProductMapping = {
      id: `prod_${++this.idCounter}`,
      productUuid: params.productUuid,
      activityId: params.activityId,
      artifactId: params.artifactId,
      storageUri: params.storageUri,
      contentType: params.contentType,
      metadata: params.metadata,
      createdAt: new Date(),
    };

    this.dataProductMappings.set(params.productUuid, mapping);
    return mapping;
  }

  async getDataProductMapping(productUuid: string): Promise<DataProductMapping | null> {
    return this.dataProductMappings.get(productUuid) || null;
  }

  async getDataProductsByActivity(activityId: string): Promise<DataProductMapping[]> {
    return Array.from(this.dataProductMappings.values()).filter(
      (m) => m.activityId === activityId
    );
  }

  async linkProductToArtifact(productUuid: string, artifactId: string): Promise<void> {
    const mapping = this.dataProductMappings.get(productUuid);
    if (mapping) {
      mapping.artifactId = artifactId;
    }
  }

  async wasActionPerformed(idempotencyKey: string): Promise<boolean> {
    return this.performedActions.has(idempotencyKey);
  }

  async markActionPerformed(idempotencyKey: string): Promise<void> {
    this.performedActions.add(idempotencyKey);
  }

  // Test helpers
  clear(): void {
    this.activityCorrelations.clear();
    this.dataProductMappings.clear();
    this.performedActions.clear();
    this.idCounter = 0;
  }
}

/**
 * Database-backed implementation for production
 * Uses the existing database connection from ADAM
 */
export class DatabaseCorrelationStore implements ICorrelationStore {
  private db: any; // Replace with actual database client type

  constructor(database: any) {
    this.db = database;
  }

  async saveActivityCorrelation(params: {
    activityId: string;
    experimentRunId: string;
    campaignId?: string;
    controllerId: string;
    activityName: string;
  }): Promise<ActivityCorrelation> {
    const result = await this.db.query(
      `INSERT INTO intersect_activity_correlations
       (activity_id, experiment_run_id, campaign_id, controller_id, activity_name, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        params.activityId,
        params.experimentRunId,
        params.campaignId,
        params.controllerId,
        params.activityName,
      ]
    );

    return this.mapRowToActivityCorrelation(result.rows[0]);
  }

  async getActivityCorrelation(activityId: string): Promise<ActivityCorrelation | null> {
    const result = await this.db.query(
      `SELECT * FROM intersect_activity_correlations WHERE activity_id = $1`,
      [activityId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToActivityCorrelation(result.rows[0]);
  }

  async getCorrelationsByExperimentRun(experimentRunId: string): Promise<ActivityCorrelation[]> {
    const result = await this.db.query(
      `SELECT * FROM intersect_activity_correlations
       WHERE experiment_run_id = $1
       ORDER BY created_at DESC`,
      [experimentRunId]
    );

    return result.rows.map(this.mapRowToActivityCorrelation);
  }

  async updateActivityStatus(activityId: string, status: ActivityStatus): Promise<void> {
    await this.db.query(
      `UPDATE intersect_activity_correlations
       SET status = $1, updated_at = NOW()
       WHERE activity_id = $2`,
      [status, activityId]
    );
  }

  async saveDataProductMapping(params: {
    productUuid: string;
    activityId: string;
    artifactId?: string;
    storageUri?: string;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<DataProductMapping> {
    const result = await this.db.query(
      `INSERT INTO intersect_data_products
       (product_uuid, activity_id, artifact_id, storage_uri, content_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.productUuid,
        params.activityId,
        params.artifactId,
        params.storageUri,
        params.contentType,
        JSON.stringify(params.metadata || {}),
      ]
    );

    return this.mapRowToDataProductMapping(result.rows[0]);
  }

  async getDataProductMapping(productUuid: string): Promise<DataProductMapping | null> {
    const result = await this.db.query(
      `SELECT * FROM intersect_data_products WHERE product_uuid = $1`,
      [productUuid]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDataProductMapping(result.rows[0]);
  }

  async getDataProductsByActivity(activityId: string): Promise<DataProductMapping[]> {
    const result = await this.db.query(
      `SELECT * FROM intersect_data_products
       WHERE activity_id = $1
       ORDER BY created_at DESC`,
      [activityId]
    );

    return result.rows.map(this.mapRowToDataProductMapping);
  }

  async linkProductToArtifact(productUuid: string, artifactId: string): Promise<void> {
    await this.db.query(
      `UPDATE intersect_data_products
       SET artifact_id = $1
       WHERE product_uuid = $2`,
      [artifactId, productUuid]
    );
  }

  async wasActionPerformed(idempotencyKey: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT EXISTS(
        SELECT 1 FROM intersect_performed_actions WHERE idempotency_key = $1
      ) as exists`,
      [idempotencyKey]
    );

    return result.rows[0].exists;
  }

  async markActionPerformed(idempotencyKey: string): Promise<void> {
    await this.db.query(
      `INSERT INTO intersect_performed_actions (idempotency_key)
       VALUES ($1)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [idempotencyKey]
    );
  }

  private mapRowToActivityCorrelation(row: any): ActivityCorrelation {
    return {
      id: row.id.toString(),
      activityId: row.activity_id,
      experimentRunId: row.experiment_run_id,
      campaignId: row.campaign_id,
      controllerId: row.controller_id,
      activityName: row.activity_name,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToDataProductMapping(row: any): DataProductMapping {
    return {
      id: row.id.toString(),
      productUuid: row.product_uuid,
      activityId: row.activity_id,
      artifactId: row.artifact_id,
      storageUri: row.storage_uri,
      contentType: row.content_type,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: new Date(row.created_at),
    };
  }
}

// Factory function to create the appropriate store
export function createCorrelationStore(
  database?: any,
  useInMemory: boolean = false
): ICorrelationStore {
  if (useInMemory || !database) {
    return new InMemoryCorrelationStore();
  }
  return new DatabaseCorrelationStore(database);
}
