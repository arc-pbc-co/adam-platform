/**
 * INTERSECT Monitoring Dashboard
 *
 * Provides real-time visibility into:
 * - Controller health and status
 * - Activity execution progress
 * - Task queue metrics
 * - Event stream
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ControllerHealth {
  controllerId: string;
  controllerName: string;
  controllerType: string;
  status: 'online' | 'offline' | 'degraded';
  healthy: boolean;
  lastHealthCheck: string;
  components?: Record<string, { healthy: boolean; status?: string }>;
}

interface ActivitySummary {
  activityId: string;
  activityName: string;
  controllerId: string;
  status: string;
  progress: number;
  experimentRunId: string;
  startTime: string;
  endTime?: string;
}

interface TaskStats {
  total: number;
  pending: number;
  scheduled: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  timeout: number;
  avgCompletionTimeMs?: number;
  avgRetryCount?: number;
}

interface IntersectEvent {
  id: string;
  eventType: string;
  controllerId: string;
  activityId?: string;
  timestamp: string;
  payload: any;
}

// ============================================================================
// Dashboard Component
// ============================================================================

export const IntersectDashboard: React.FC = () => {
  const [controllers, setControllers] = useState<ControllerHealth[]>([]);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [events, setEvents] = useState<IntersectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'controllers' | 'activities' | 'events'>('overview');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const [controllersRes, activitiesRes, statsRes, eventsRes] = await Promise.all([
        fetch('/api/intersect/controllers'),
        fetch('/api/intersect/activities?limit=20'),
        fetch('/api/intersect/tasks/stats'),
        fetch('/api/intersect/events?limit=50'),
      ]);

      if (controllersRes.ok) {
        const data = await controllersRes.json();
        setControllers(data.controllers || []);
      }

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setTaskStats(data);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }

      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="intersect-dashboard loading">
        <div className="spinner">Loading INTERSECT Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="intersect-dashboard error">
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="intersect-dashboard">
      <header className="dashboard-header">
        <h1>INTERSECT Integration Dashboard</h1>
        <div className="header-actions">
          <button onClick={fetchDashboardData} className="refresh-btn">
            Refresh
          </button>
        </div>
      </header>

      <nav className="dashboard-tabs">
        <button
          className={selectedTab === 'overview' ? 'active' : ''}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={selectedTab === 'controllers' ? 'active' : ''}
          onClick={() => setSelectedTab('controllers')}
        >
          Controllers ({controllers.length})
        </button>
        <button
          className={selectedTab === 'activities' ? 'active' : ''}
          onClick={() => setSelectedTab('activities')}
        >
          Activities ({activities.length})
        </button>
        <button
          className={selectedTab === 'events' ? 'active' : ''}
          onClick={() => setSelectedTab('events')}
        >
          Events
        </button>
      </nav>

      <main className="dashboard-content">
        {selectedTab === 'overview' && (
          <OverviewPanel
            controllers={controllers}
            activities={activities}
            taskStats={taskStats}
          />
        )}
        {selectedTab === 'controllers' && (
          <ControllersPanel controllers={controllers} />
        )}
        {selectedTab === 'activities' && (
          <ActivitiesPanel activities={activities} />
        )}
        {selectedTab === 'events' && (
          <EventsPanel events={events} />
        )}
      </main>
    </div>
  );
};

// ============================================================================
// Overview Panel
// ============================================================================

interface OverviewPanelProps {
  controllers: ControllerHealth[];
  activities: ActivitySummary[];
  taskStats: TaskStats | null;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ controllers, activities, taskStats }) => {
  const onlineControllers = controllers.filter(c => c.status === 'online').length;
  const runningActivities = activities.filter(a => a.status === 'running').length;

  return (
    <div className="overview-panel">
      <div className="stats-grid">
        <StatCard
          title="Controllers"
          value={`${onlineControllers}/${controllers.length}`}
          subtitle="Online"
          status={onlineControllers === controllers.length ? 'good' : 'warning'}
        />
        <StatCard
          title="Running Activities"
          value={runningActivities.toString()}
          subtitle="In Progress"
          status={runningActivities > 0 ? 'active' : 'idle'}
        />
        <StatCard
          title="Tasks Pending"
          value={(taskStats?.pending ?? 0).toString()}
          subtitle="In Queue"
          status={(taskStats?.pending ?? 0) > 10 ? 'warning' : 'good'}
        />
        <StatCard
          title="Failed Tasks"
          value={(taskStats?.failed ?? 0).toString()}
          subtitle="Need Attention"
          status={(taskStats?.failed ?? 0) > 0 ? 'error' : 'good'}
        />
      </div>

      <div className="overview-sections">
        <section className="controller-summary">
          <h3>Controller Status</h3>
          <div className="controller-list">
            {controllers.map(controller => (
              <div key={controller.controllerId} className={`controller-item ${controller.status}`}>
                <span className={`status-indicator ${controller.status}`} />
                <span className="controller-name">{controller.controllerName}</span>
                <span className="controller-type">{controller.controllerType}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="activity-summary">
          <h3>Recent Activities</h3>
          <div className="activity-list">
            {activities.slice(0, 5).map(activity => (
              <div key={activity.activityId} className={`activity-item ${activity.status}`}>
                <div className="activity-info">
                  <span className="activity-name">{activity.activityName}</span>
                  <span className="activity-status">{activity.status}</span>
                </div>
                {activity.status === 'running' && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${activity.progress}%` }}
                    />
                    <span className="progress-text">{activity.progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {taskStats && (
          <section className="task-stats">
            <h3>Task Queue Statistics</h3>
            <div className="stats-breakdown">
              <div className="stat-row">
                <span>Completed</span>
                <span className="stat-value success">{taskStats.completed}</span>
              </div>
              <div className="stat-row">
                <span>Running</span>
                <span className="stat-value active">{taskStats.running}</span>
              </div>
              <div className="stat-row">
                <span>Pending</span>
                <span className="stat-value">{taskStats.pending}</span>
              </div>
              <div className="stat-row">
                <span>Failed</span>
                <span className="stat-value error">{taskStats.failed}</span>
              </div>
              {taskStats.avgCompletionTimeMs && (
                <div className="stat-row">
                  <span>Avg Completion Time</span>
                  <span className="stat-value">
                    {(taskStats.avgCompletionTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  status: 'good' | 'warning' | 'error' | 'active' | 'idle';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, status }) => (
  <div className={`stat-card ${status}`}>
    <div className="stat-value">{value}</div>
    <div className="stat-title">{title}</div>
    <div className="stat-subtitle">{subtitle}</div>
  </div>
);

// ============================================================================
// Controllers Panel
// ============================================================================

interface ControllersPanelProps {
  controllers: ControllerHealth[];
}

const ControllersPanel: React.FC<ControllersPanelProps> = ({ controllers }) => {
  const [selectedController, setSelectedController] = useState<string | null>(null);

  return (
    <div className="controllers-panel">
      <div className="controllers-grid">
        {controllers.map(controller => (
          <div
            key={controller.controllerId}
            className={`controller-card ${controller.status} ${
              selectedController === controller.controllerId ? 'selected' : ''
            }`}
            onClick={() => setSelectedController(controller.controllerId)}
          >
            <div className="controller-header">
              <span className={`status-dot ${controller.status}`} />
              <h4>{controller.controllerName}</h4>
            </div>
            <div className="controller-details">
              <div className="detail-row">
                <span>Type:</span>
                <span>{controller.controllerType}</span>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                <span className={`status-badge ${controller.status}`}>
                  {controller.status}
                </span>
              </div>
              <div className="detail-row">
                <span>Last Check:</span>
                <span>{new Date(controller.lastHealthCheck).toLocaleTimeString()}</span>
              </div>
            </div>
            {controller.components && (
              <div className="controller-components">
                <h5>Components</h5>
                {Object.entries(controller.components).map(([name, comp]) => (
                  <div key={name} className={`component-item ${comp.healthy ? 'healthy' : 'unhealthy'}`}>
                    <span className={`component-status ${comp.healthy ? 'healthy' : 'unhealthy'}`} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Activities Panel
// ============================================================================

interface ActivitiesPanelProps {
  activities: ActivitySummary[];
}

const ActivitiesPanel: React.FC<ActivitiesPanelProps> = ({ activities }) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  return (
    <div className="activities-panel">
      <div className="activities-filter">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Activities</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="activities-table">
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Controller</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Experiment</th>
              <th>Started</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.map(activity => (
              <tr key={activity.activityId} className={activity.status}>
                <td>
                  <div className="activity-name">{activity.activityName}</div>
                  <div className="activity-id">{activity.activityId.slice(0, 12)}...</div>
                </td>
                <td>{activity.controllerId}</td>
                <td>
                  <span className={`status-badge ${activity.status}`}>
                    {activity.status}
                  </span>
                </td>
                <td>
                  {activity.status === 'running' ? (
                    <div className="mini-progress">
                      <div
                        className="mini-progress-fill"
                        style={{ width: `${activity.progress}%` }}
                      />
                      <span>{activity.progress}%</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{activity.experimentRunId.slice(0, 12)}...</td>
                <td>{new Date(activity.startTime).toLocaleTimeString()}</td>
                <td>
                  {activity.endTime
                    ? `${Math.round(
                        (new Date(activity.endTime).getTime() -
                          new Date(activity.startTime).getTime()) /
                          1000
                      )}s`
                    : 'In progress'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// Events Panel
// ============================================================================

interface EventsPanelProps {
  events: IntersectEvent[];
}

const EventsPanel: React.FC<EventsPanelProps> = ({ events }) => {
  const [eventFilter, setEventFilter] = useState<string>('all');

  const eventTypes = [...new Set(events.map(e => e.eventType))];

  const filteredEvents = events.filter(e => {
    if (eventFilter === 'all') return true;
    return e.eventType === eventFilter;
  });

  return (
    <div className="events-panel">
      <div className="events-filter">
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
          <option value="all">All Events</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="events-list">
        {filteredEvents.map(event => (
          <div key={event.id} className={`event-item ${event.eventType.split('.')[0]}`}>
            <div className="event-header">
              <span className="event-type">{event.eventType}</span>
              <span className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="event-details">
              <span className="event-controller">{event.controllerId}</span>
              {event.activityId && (
                <span className="event-activity">{event.activityId.slice(0, 12)}...</span>
              )}
            </div>
            <pre className="event-payload">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Styles (CSS-in-JS or add to separate CSS file)
// ============================================================================

export const intersectDashboardStyles = `
.intersect-dashboard {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.refresh-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}

.dashboard-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.dashboard-tabs button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.dashboard-tabs button.active {
  background: #007bff;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card .stat-value {
  font-size: 32px;
  font-weight: bold;
}

.stat-card.good .stat-value { color: #28a745; }
.stat-card.warning .stat-value { color: #ffc107; }
.stat-card.error .stat-value { color: #dc3545; }
.stat-card.active .stat-value { color: #007bff; }

.status-indicator, .status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

.status-indicator.online, .status-dot.online { background: #28a745; }
.status-indicator.offline, .status-dot.offline { background: #dc3545; }
.status-indicator.degraded, .status-dot.degraded { background: #ffc107; }

.progress-bar {
  height: 20px;
  background: #e9ecef;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge.running { background: #007bff; color: white; }
.status-badge.completed { background: #28a745; color: white; }
.status-badge.failed { background: #dc3545; color: white; }
.status-badge.cancelled { background: #6c757d; color: white; }
.status-badge.online { background: #28a745; color: white; }
.status-badge.offline { background: #dc3545; color: white; }

.controllers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.controller-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.controller-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.controller-card.selected {
  border: 2px solid #007bff;
}

.activities-table table {
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.activities-table th, .activities-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.event-item.activity { border-left-color: #28a745; }
.event-item.action { border-left-color: #ffc107; }

.event-payload {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin-top: 10px;
}
`;

export default IntersectDashboard;
