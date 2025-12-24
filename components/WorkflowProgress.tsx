import React from 'react';
import { motion } from 'framer-motion';
import type { AgentActivity } from '../services/novaService';

export interface WorkflowPhase {
  id?: string;
  name: string;
  agent?: 'planner' | 'designer' | 'simulator' | 'controller' | 'analyzer';
  icon?: string;
  color?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'active';
  duration?: number;
  progress?: number;
}

interface WorkflowProgressProps {
  activities?: AgentActivity[];
  currentStatus?: string;
  phases?: WorkflowPhase[];
  compact?: boolean;
}

export function WorkflowProgress({ activities, currentStatus, phases: externalPhases, compact }: WorkflowProgressProps) {
  // Use external phases if provided, otherwise build from activities
  const defaultPhases: WorkflowPhase[] = [
    {
      name: 'Planning',
      agent: 'planner',
      icon: '📋',
      color: 'from-blue-500 to-cyan-500',
      status: 'pending',
    },
    {
      name: 'Design',
      agent: 'designer',
      icon: '🎨',
      color: 'from-purple-500 to-pink-500',
      status: 'pending',
    },
    {
      name: 'Simulation',
      agent: 'simulator',
      icon: '🔬',
      color: 'from-green-500 to-emerald-500',
      status: 'pending',
    },
    {
      name: 'Execution',
      agent: 'controller',
      icon: '⚙️',
      color: 'from-orange-500 to-red-500',
      status: 'pending',
    },
    {
      name: 'Analysis',
      agent: 'analyzer',
      icon: '📊',
      color: 'from-yellow-500 to-amber-500',
      status: 'pending',
    },
  ];

  // Use external phases if provided, otherwise use defaults
  const phases = externalPhases || defaultPhases;

  // Update phase statuses based on activities (only if using default phases)
  if (!externalPhases && activities) {
    phases.forEach((phase) => {
      if (phase.agent) {
        const phaseActivities = activities.filter((a) => a.agent_type === phase.agent);
        if (phaseActivities.length > 0) {
          const latestActivity = phaseActivities[phaseActivities.length - 1];
          phase.status = latestActivity.status === 'in_progress' ? 'in_progress' :
                        latestActivity.status === 'completed' ? 'completed' :
                        latestActivity.status === 'failed' ? 'failed' : 'pending';
          phase.duration = latestActivity.duration_ms;
        }
      }
    });
  }

  // Compact mode - horizontal layout
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        {phases.map((phase, index) => {
          const isActive = phase.status === 'active' || phase.status === 'in_progress';
          const isCompleted = phase.status === 'completed';
          const isFailed = phase.status === 'failed';

          return (
            <React.Fragment key={phase.id || phase.name}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-500 text-white animate-pulse'
                      : isFailed
                      ? 'bg-red-500 text-white'
                      : 'bg-[#2a2a2a] text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : isFailed ? '✕' : index + 1}
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}`}>
                  {phase.name}
                </span>
                {isActive && phase.progress !== undefined && (
                  <span className="text-[9px] text-blue-400">{phase.progress}%</span>
                )}
              </div>
              {index < phases.length - 1 && (
                <div className={`h-0.5 flex-1 max-w-8 ${isCompleted ? 'bg-green-500' : 'bg-[#2a2a2a]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-[#2a2a2a] rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-6">Workflow Progress</h3>

      <div className="space-y-4">
        {phases.map((phase, index) => (
          <div key={phase.name} className="relative">
            {/* Connector Line */}
            {index < phases.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-[#2a2a2a]">
                {phase.status === 'completed' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    className="w-full bg-gradient-to-b from-blue-500 to-transparent"
                  />
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Phase Icon */}
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    phase.status === 'completed'
                      ? `bg-gradient-to-br ${phase.color}`
                      : phase.status === 'in_progress'
                      ? 'bg-blue-500/20 border-2 border-blue-500'
                      : phase.status === 'failed'
                      ? 'bg-red-500/20 border-2 border-red-500'
                      : 'bg-[#1a1a1a] border-2 border-[#2a2a2a]'
                  }`}
                >
                  {phase.icon}
                </motion.div>

                {/* Spinner for in-progress */}
                {phase.status === 'in_progress' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500"
                  />
                )}

                {/* Checkmark for completed */}
                {phase.status === 'completed' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ✓
                  </motion.div>
                )}

                {/* X for failed */}
                {phase.status === 'failed' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ✕
                  </motion.div>
                )}
              </div>

              {/* Phase Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">{phase.name}</h4>
                    <p className="text-gray-500 text-sm capitalize">
                      {phase.agent} Agent
                    </p>
                  </div>

                  <div className="text-right">
                    {phase.status === 'completed' && phase.duration && (
                      <div className="text-green-400 text-sm">
                        {(phase.duration / 1000).toFixed(1)}s
                      </div>
                    )}
                    <div className={`text-xs px-2 py-1 rounded ${
                      phase.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : phase.status === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-400'
                        : phase.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {phase.status === 'in_progress' ? 'Running' :
                       phase.status === 'completed' ? 'Done' :
                       phase.status === 'failed' ? 'Failed' : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {phase.status === 'in_progress' && (
                  <div className="mt-2 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`h-full bg-gradient-to-r ${phase.color}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Overall Progress</span>
          <span className="text-sm text-white font-semibold">
            {phases.filter((p) => p.status === 'completed').length} / {phases.length}
          </span>
        </div>
        <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(phases.filter((p) => p.status === 'completed').length / phases.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400">
          {currentStatus === 'completed' ? '🎉 Experiment completed successfully!' :
           currentStatus === 'failed' ? '❌ Experiment failed' :
           currentStatus === 'waiting_approval' ? '⏸️ Waiting for approval' :
           '🚀 Running autonomous workflow...'}
        </p>
      </div>
    </div>
  );
}
