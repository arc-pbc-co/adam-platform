import { createWorkflowAdapter, IntersectWorkflowAdapter } from '../integrations/IntersectWorkflowAdapter';
import { createCorrelationStore } from '../integrations/IntersectCorrelationStore';
import {
  IIntersectGatewayService,
  IIntersectEventBridge,
  ICorrelationStore,
} from '../integrations/intersect-types';

// Mock gateway
const mockGateway: Partial<IIntersectGatewayService> = {
  startActivity: jest.fn().mockResolvedValue({
    activityId: 'activity-123',
    status: 'submitted',
  }),
  getControllerHealth: jest.fn().mockResolvedValue({
    healthy: true,
    message: 'OK',
  }),
  cancelActivity: jest.fn().mockResolvedValue(undefined),
};

// Mock event bridge
const mockEventBridge: Partial<IIntersectEventBridge> = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  isRunning: jest.fn().mockReturnValue(false),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

describe('IntersectWorkflowAdapter', () => {
  let adapter: IntersectWorkflowAdapter;
  let correlationStore: ICorrelationStore;

  beforeEach(async () => {
    correlationStore = createCorrelationStore('memory');

    adapter = createWorkflowAdapter(
      mockGateway as IIntersectGatewayService,
      mockEventBridge as IIntersectEventBridge,
      correlationStore,
      {
        defaultControllerId: 'ctrl-1',
        defaultTimeout: 30000,
        useScheduler: false, // Disable scheduler for simpler tests
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('callbacks', () => {
    it('should register completion callback', () => {
      const callback = jest.fn();
      adapter.onActivityComplete(callback);
      // Callback registration should not throw
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register failure callback', () => {
      const callback = jest.fn();
      adapter.onActivityFailed(callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register progress callback', () => {
      const callback = jest.fn();
      adapter.onActivityProgress(callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('cancelActivity', () => {
    it('should cancel an activity', async () => {
      // Cancel should not throw
      await expect(
        adapter.cancelActivity('ctrl-1', 'activity-123', 'User cancelled')
      ).resolves.not.toThrow();

      expect(mockGateway.cancelActivity).toHaveBeenCalledWith(
        'ctrl-1',
        'activity-123',
        'User cancelled'
      );
    });
  });

  describe('factory function', () => {
    it('should create adapter with default config', () => {
      const newAdapter = createWorkflowAdapter(
        mockGateway as IIntersectGatewayService,
        mockEventBridge as IIntersectEventBridge,
        correlationStore
      );
      expect(newAdapter).toBeInstanceOf(IntersectWorkflowAdapter);
    });
  });
});

