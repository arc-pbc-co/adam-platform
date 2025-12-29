/**
 * In-Memory Correlation Store for Nova
 *
 * Provides correlation tracking between ADAM experiments and INTERSECT activities.
 * Uses in-memory storage with optional database persistence.
 */

import { Pool } from 'pg';
import {
  ICorrelationStore,
  ActivityCorrelation,
  ActivityStatus,
} from './intersect-types';

/**
 * In-memory correlation store implementation
 */
export class InMemoryCorrelationStore implements ICorrelationStore {
  private correlations: Map<string, ActivityCorrelation> = new Map();
  private byExperiment: Map<string, string[]> = new Map();
  private byStep: Map<string, string> = new Map();

  async save(correlation: ActivityCorrelation): Promise<void> {
    this.correlations.set(correlation.activityId, correlation);

    // Index by experiment
    const expCorrelations = this.byExperiment.get(correlation.experimentRunId) || [];
    if (!expCorrelations.includes(correlation.activityId)) {
      expCorrelations.push(correlation.activityId);
      this.byExperiment.set(correlation.experimentRunId, expCorrelations);
    }

    // Index by step
    if (correlation.stepId) {
      this.byStep.set(correlation.stepId, correlation.activityId);
    }
  }

  async findByActivityId(activityId: string): Promise<ActivityCorrelation | null> {
    return this.correlations.get(activityId) || null;
  }

  async findByExperimentRunId(experimentRunId: string): Promise<ActivityCorrelation[]> {
    const activityIds = this.byExperiment.get(experimentRunId) || [];
    return activityIds
      .map(id => this.correlations.get(id))
      .filter((c): c is ActivityCorrelation => c !== undefined);
  }

  async findByStepId(stepId: string): Promise<ActivityCorrelation | null> {
    const activityId = this.byStep.get(stepId);
    if (!activityId) return null;
    return this.correlations.get(activityId) || null;
  }

  async updateStatus(activityId: string, status: ActivityStatus): Promise<void> {
    const correlation = this.correlations.get(activityId);
    if (correlation) {
      correlation.status = status;
      correlation.updatedAt = new Date();
    }
  }

  async delete(activityId: string): Promise<void> {
    const correlation = this.correlations.get(activityId);
    if (correlation) {
      // Remove from experiment index
      const expCorrelations = this.byExperiment.get(correlation.experimentRunId);
      if (expCorrelations) {
        const idx = expCorrelations.indexOf(activityId);
        if (idx >= 0) expCorrelations.splice(idx, 1);
      }

      // Remove from step index
      if (correlation.stepId) {
        this.byStep.delete(correlation.stepId);
      }

      this.correlations.delete(activityId);
    }
  }

  /**
   * Get all correlations (for debugging)
   */
  getAll(): ActivityCorrelation[] {
    return Array.from(this.correlations.values());
  }

  /**
   * Clear all correlations
   */
  clear(): void {
    this.correlations.clear();
    this.byExperiment.clear();
    this.byStep.clear();
  }
}

/**
 * Database-backed correlation store for production use
 */
export class DatabaseCorrelationStore implements ICorrelationStore {
  constructor(private db: Pool) {}

  async save(correlation: ActivityCorrelation): Promise<void> {
    await this.db.query(
      `INSERT INTO intersect_correlations 
       (activity_id, experiment_run_id, campaign_id, controller_id, activity_name, step_id, trace_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (activity_id) DO UPDATE SET
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        correlation.activityId,
        correlation.experimentRunId,
        correlation.campaignId,
        correlation.controllerId,
        correlation.activityName,
        correlation.stepId,
        correlation.traceId,
        correlation.status,
        correlation.createdAt,
        correlation.updatedAt,
      ]
    );
  }

  async findByActivityId(activityId: string): Promise<ActivityCorrelation | null> {
    const result = await this.db.query(
      'SELECT * FROM intersect_correlations WHERE activity_id = $1',
      [activityId]
    );
    return result.rows[0] ? this.rowToCorrelation(result.rows[0]) : null;
  }

  async findByExperimentRunId(experimentRunId: string): Promise<ActivityCorrelation[]> {
    const result = await this.db.query(
      'SELECT * FROM intersect_correlations WHERE experiment_run_id = $1 ORDER BY created_at',
      [experimentRunId]
    );
    return result.rows.map(row => this.rowToCorrelation(row));
  }

  async findByStepId(stepId: string): Promise<ActivityCorrelation | null> {
    const result = await this.db.query(
      'SELECT * FROM intersect_correlations WHERE step_id = $1',
      [stepId]
    );
    return result.rows[0] ? this.rowToCorrelation(result.rows[0]) : null;
  }

  async updateStatus(activityId: string, status: ActivityStatus): Promise<void> {
    await this.db.query(
      'UPDATE intersect_correlations SET status = $1, updated_at = NOW() WHERE activity_id = $2',
      [status, activityId]
    );
  }

  async delete(activityId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM intersect_correlations WHERE activity_id = $1',
      [activityId]
    );
  }

  private rowToCorrelation(row: any): ActivityCorrelation {
    return {
      activityId: row.activity_id,
      experimentRunId: row.experiment_run_id,
      campaignId: row.campaign_id,
      controllerId: row.controller_id,
      activityName: row.activity_name,
      stepId: row.step_id,
      traceId: row.trace_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

/**
 * Factory to create the appropriate correlation store
 */
export function createCorrelationStore(
  type: 'memory' | 'database',
  db?: Pool
): ICorrelationStore {
  if (type === 'database' && db) {
    return new DatabaseCorrelationStore(db);
  }
  return new InMemoryCorrelationStore();
}

