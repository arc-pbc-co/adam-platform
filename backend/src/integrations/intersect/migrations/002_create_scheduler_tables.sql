-- ============================================================================
-- INTERSECT Scheduler Tables Migration
--
-- Creates tables for the Scheduler-Agent-Supervisor pattern:
-- - intersect_scheduled_tasks: Durable task queue with retry support
-- - intersect_task_history: Audit log of task state transitions
-- ============================================================================

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');

-- Task status enum
CREATE TYPE task_status AS ENUM (
  'pending',
  'scheduled',
  'running',
  'completed',
  'failed',
  'cancelled',
  'timeout'
);

-- ============================================================================
-- Scheduled Tasks Table
-- ============================================================================

CREATE TABLE intersect_scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Correlation
  experiment_run_id VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  controller_id VARCHAR(255) NOT NULL,

  -- Activity details
  activity_name VARCHAR(255) NOT NULL,
  activity_options JSONB NOT NULL DEFAULT '[]',
  activity_id VARCHAR(255),

  -- Status and scheduling
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'normal',

  -- Retry configuration
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  error TEXT,

  -- Additional metadata
  metadata JSONB,

  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT valid_max_retries CHECK (max_retries >= 0)
);

-- Indexes for common queries
CREATE INDEX idx_scheduled_tasks_status ON intersect_scheduled_tasks(status);
CREATE INDEX idx_scheduled_tasks_priority ON intersect_scheduled_tasks(priority);
CREATE INDEX idx_scheduled_tasks_experiment ON intersect_scheduled_tasks(experiment_run_id);
CREATE INDEX idx_scheduled_tasks_campaign ON intersect_scheduled_tasks(campaign_id);
CREATE INDEX idx_scheduled_tasks_controller ON intersect_scheduled_tasks(controller_id);
CREATE INDEX idx_scheduled_tasks_activity ON intersect_scheduled_tasks(activity_id);
CREATE INDEX idx_scheduled_tasks_scheduled ON intersect_scheduled_tasks(scheduled_at);
CREATE INDEX idx_scheduled_tasks_next_retry ON intersect_scheduled_tasks(next_retry)
  WHERE status IN ('pending', 'scheduled');

-- Composite index for task polling query
CREATE INDEX idx_scheduled_tasks_ready ON intersect_scheduled_tasks(priority, scheduled_at)
  WHERE status IN ('pending', 'scheduled');

-- ============================================================================
-- Task History Table (Audit Log)
-- ============================================================================

CREATE TABLE intersect_task_history (
  id SERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES intersect_scheduled_tasks(id) ON DELETE CASCADE,

  -- State change
  previous_status task_status,
  new_status task_status NOT NULL,

  -- Change details
  changed_by VARCHAR(255), -- agent ID or 'supervisor' or 'user'
  change_reason TEXT,

  -- Error info (if transitioning to failed)
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Activity snapshot at time of change
  activity_id VARCHAR(255),
  retry_count INTEGER
);

-- Index for querying task history
CREATE INDEX idx_task_history_task ON intersect_task_history(task_id);
CREATE INDEX idx_task_history_changed_at ON intersect_task_history(changed_at);

-- ============================================================================
-- Trigger for automatic timestamp updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_scheduled_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_task_updated
  BEFORE UPDATE ON intersect_scheduled_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_task_timestamp();

-- ============================================================================
-- Trigger for task history logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO intersect_task_history (
      task_id,
      previous_status,
      new_status,
      error_message,
      activity_id,
      retry_count
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      CASE WHEN NEW.status = 'failed' THEN NEW.error ELSE NULL END,
      NEW.activity_id,
      NEW.retry_count
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_status_change
  AFTER UPDATE ON intersect_scheduled_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_status_change();

-- ============================================================================
-- Helper Views
-- ============================================================================

-- View for ready-to-execute tasks
CREATE VIEW intersect_ready_tasks AS
SELECT *
FROM intersect_scheduled_tasks
WHERE status IN ('pending', 'scheduled')
  AND (next_retry IS NULL OR next_retry <= NOW())
  AND (deadline IS NULL OR deadline > NOW())
ORDER BY
  CASE priority
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'normal' THEN 2
    WHEN 'low' THEN 3
  END,
  scheduled_at ASC;

-- View for task statistics
CREATE VIEW intersect_task_stats AS
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE status = 'running') as running,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status = 'timeout') as timeout,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))
    FILTER (WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL)
    as avg_completion_time_seconds,
  AVG(retry_count) FILTER (WHERE retry_count > 0) as avg_retry_count
FROM intersect_scheduled_tasks;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE intersect_scheduled_tasks IS 'Durable task queue for INTERSECT activity scheduling with retry support';
COMMENT ON TABLE intersect_task_history IS 'Audit log of task state transitions for debugging and compliance';
COMMENT ON VIEW intersect_ready_tasks IS 'Pre-filtered view of tasks ready for execution';
COMMENT ON VIEW intersect_task_stats IS 'Aggregate statistics for task monitoring dashboards';
