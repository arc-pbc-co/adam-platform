import { createCorrelationStore } from '../integrations/IntersectCorrelationStore';
import { ICorrelationStore, ActivityCorrelation } from '../integrations/intersect-types';

describe('IntersectCorrelationStore', () => {
  let store: ICorrelationStore;

  beforeEach(() => {
    store = createCorrelationStore('memory');
  });

  describe('save and retrieve', () => {
    it('should save and retrieve a correlation by activityId', async () => {
      const correlation: ActivityCorrelation = {
        activityId: 'act-123',
        experimentRunId: 'exp-456',
        controllerId: 'ctrl-1',
        activityName: 'print_sample',
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await store.save(correlation);
      const retrieved = await store.findByActivityId('act-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.activityId).toBe('act-123');
      expect(retrieved?.experimentRunId).toBe('exp-456');
    });

    it('should return null for non-existent activityId', async () => {
      const result = await store.findByActivityId('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('query by experiment', () => {
    beforeEach(async () => {
      const correlations: ActivityCorrelation[] = [
        {
          activityId: 'act-1',
          experimentRunId: 'exp-1',
          controllerId: 'ctrl-1',
          activityName: 'task1',
          status: 'running',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          activityId: 'act-2',
          experimentRunId: 'exp-1',
          controllerId: 'ctrl-2',
          activityName: 'task2',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          activityId: 'act-3',
          experimentRunId: 'exp-2',
          controllerId: 'ctrl-1',
          activityName: 'task3',
          status: 'running',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const c of correlations) {
        await store.save(c);
      }
    });

    it('should query by experiment run', async () => {
      const results = await store.findByExperimentRunId('exp-1');
      expect(results.length).toBe(2);
    });
  });

  describe('update status', () => {
    it('should update correlation status', async () => {
      const correlation: ActivityCorrelation = {
        activityId: 'act-update',
        experimentRunId: 'exp-1',
        controllerId: 'ctrl-1',
        activityName: 'update_test',
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await store.save(correlation);
      await store.updateStatus('act-update', 'completed');

      const updated = await store.findByActivityId('act-update');
      expect(updated?.status).toBe('completed');
    });
  });

  describe('query by step', () => {
    it('should find by step id', async () => {
      const correlation: ActivityCorrelation = {
        activityId: 'act-step',
        experimentRunId: 'exp-1',
        controllerId: 'ctrl-1',
        activityName: 'step_test',
        stepId: 'step-123',
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await store.save(correlation);
      const found = await store.findByStepId('step-123');

      expect(found).toBeDefined();
      expect(found?.activityId).toBe('act-step');
    });
  });

  describe('delete', () => {
    it('should delete a correlation', async () => {
      const correlation: ActivityCorrelation = {
        activityId: 'act-delete',
        experimentRunId: 'exp-1',
        controllerId: 'ctrl-1',
        activityName: 'delete_test',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await store.save(correlation);
      await store.delete('act-delete');

      const result = await store.findByActivityId('act-delete');
      expect(result).toBeNull();
    });
  });
});

