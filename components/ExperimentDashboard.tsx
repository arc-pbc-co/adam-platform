import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getExperiments,
  getExperiment,
  type Experiment,
  type ExperimentDetails,
  getWebSocket,
} from '../services/novaService';

interface ExperimentDashboardProps {
  onSelectExperiment?: (experiment: ExperimentDetails) => void;
  onApprovalRequired?: (experiment: ExperimentDetails) => void;
}

export function ExperimentDashboard({ onSelectExperiment, onApprovalRequired }: ExperimentDashboardProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'pending'>('all');

  useEffect(() => {
    loadExperiments();

    // Subscribe to experiment events
    const ws = getWebSocket();
    ws.connect().then(() => {
      ws.subscribe('experiments', handleExperimentEvent);
    }).catch((err) => {
      console.error('Failed to connect to WebSocket:', err);
    });

    return () => {
      ws.unsubscribe('experiments', handleExperimentEvent);
    };
  }, [filter]);

  const handleExperimentEvent = (data: any) => {
    console.log('Experiment event:', data);
    // Reload experiments when events occur
    loadExperiments();
  };

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await getExperiments(params);
      setExperiments(data.experiments);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExperiment = async (exp: Experiment) => {
    try {
      const details = await getExperiment(exp.id);
      setSelectedExperiment(details);
      onSelectExperiment?.(details);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'R1':
        return 'text-green-400';
      case 'R2':
        return 'text-yellow-400';
      case 'R3':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-[#2a2a2a] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Experiment Dashboard</h2>
        <button
          onClick={loadExperiments}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'running', 'pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && experiments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No experiments found. Create one to get started!
        </div>
      )}

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {experiments.map((exp) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={() => handleSelectExperiment(exp)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-blue-500/50 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">{exp.name}</h3>
                  <p className="text-gray-400 text-xs line-clamp-2">{exp.hypothesis}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(exp.status)} ml-2 mt-1`}></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className="text-white capitalize">{exp.status}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Risk Level</span>
                  <span className={`font-bold ${getRiskColor(exp.risk_level)}`}>
                    {exp.risk_level}
                  </span>
                </div>

                {exp.approval_status !== 'approved' && exp.risk_level !== 'R1' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Approval</span>
                    <span className="text-yellow-400 capitalize">{exp.approval_status}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-2 border-t border-[#2a2a2a]">
                  Created {new Date(exp.created_at).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Selected Experiment Details Modal */}
      {selectedExperiment && (
        <ExperimentDetailsModal
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </div>
  );
}

// Experiment Details Modal
function ExperimentDetailsModal({
  experiment,
  onClose,
}: {
  experiment: ExperimentDetails;
  onClose: () => void;
}) {
  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'planner':
        return '📋';
      case 'designer':
        return '🎨';
      case 'simulator':
        return '🔬';
      case 'controller':
        return '⚙️';
      case 'analyzer':
        return '📊';
      default:
        return '🤖';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#2a2a2a] p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{experiment.name}</h2>
            <p className="text-gray-400 text-sm">{experiment.hypothesis}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a1a] rounded p-4">
              <div className="text-gray-500 text-xs mb-1">Status</div>
              <div className="text-white font-semibold capitalize">{experiment.status}</div>
            </div>
            <div className="bg-[#1a1a1a] rounded p-4">
              <div className="text-gray-500 text-xs mb-1">Risk Level</div>
              <div className="text-white font-semibold">{experiment.risk_level}</div>
            </div>
            <div className="bg-[#1a1a1a] rounded p-4">
              <div className="text-gray-500 text-xs mb-1">Approval</div>
              <div className="text-white font-semibold capitalize">{experiment.approval_status}</div>
            </div>
            <div className="bg-[#1a1a1a] rounded p-4">
              <div className="text-gray-500 text-xs mb-1">Jobs</div>
              <div className="text-white font-semibold">{experiment.jobs.length}</div>
            </div>
          </div>

          {/* Agent Activities */}
          {experiment.agent_activities.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">Agent Activities</h3>
              <div className="space-y-2">
                {experiment.agent_activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3 flex items-center gap-3"
                  >
                    <div className="text-2xl">{getAgentIcon(activity.agent_type)}</div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium capitalize">
                        {activity.agent_type} - {activity.activity_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(activity.started_at).toLocaleString()}
                        {activity.duration_ms && ` • ${(activity.duration_ms / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      activity.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : activity.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {activity.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parameters */}
          {experiment.parameters.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {experiment.parameters.map((param) => (
                  <div key={param.id} className="bg-[#1a1a1a] rounded p-3">
                    <div className="text-gray-500 text-xs">{param.parameter_name}</div>
                    <div className="text-white text-sm font-medium">
                      {param.parameter_value} {param.unit && `${param.unit}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs */}
          {experiment.jobs.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">Jobs</h3>
              <div className="space-y-2">
                {experiment.jobs.map((job) => (
                  <div key={job.id} className="bg-[#1a1a1a] rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white text-sm capitalize">
                        {job.job_type}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        job.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : job.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {job.status}
                      </div>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {new Date(job.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
