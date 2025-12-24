import React from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Palette,
  FlaskConical,
  Cog,
  BarChart3,
  MoreHorizontal,
  Clock,
  Zap,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'waiting';

export interface AgentNodeData {
  id: string;
  type: 'planning' | 'design' | 'simulation' | 'controller' | 'analyzer';
  name: string;
  status: AgentStatus;
  duration?: number;
  tokensUsed?: number;
  messagesCount?: number;
  details?: Record<string, string | number>;
  position: { x: number; y: number };
}

interface AgentNodeProps {
  data: AgentNodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

const agentConfig = {
  planning: {
    icon: ClipboardList,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    label: 'Planning Agent',
  },
  design: {
    icon: Palette,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    label: 'Design Agent',
  },
  simulation: {
    icon: FlaskConical,
    color: 'green',
    gradient: 'from-green-500 to-emerald-500',
    label: 'Simulation Agent',
  },
  controller: {
    icon: Cog,
    color: 'orange',
    gradient: 'from-orange-500 to-amber-500',
    label: 'Controller Agent',
  },
  analyzer: {
    icon: BarChart3,
    color: 'yellow',
    gradient: 'from-yellow-500 to-lime-500',
    label: 'Analyzer Agent',
  },
};

const statusConfig = {
  idle: { color: 'gray', icon: null, pulse: false },
  running: { color: 'blue', icon: Loader2, pulse: true },
  completed: { color: 'green', icon: CheckCircle, pulse: false },
  failed: { color: 'red', icon: AlertCircle, pulse: false },
  waiting: { color: 'yellow', icon: Clock, pulse: true },
};

export function AgentNode({ data, isSelected, onClick }: AgentNodeProps) {
  const config = agentConfig[data.type];
  const status = statusConfig[data.status];
  const Icon = config.icon;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute cursor-pointer transition-all duration-200 ${
        isSelected ? 'z-20' : 'z-10'
      }`}
      style={{ left: data.position.x, top: data.position.y }}
      onClick={onClick}
    >
      <div
        className={`w-[280px] bg-[#1a1a1a] border-2 rounded-lg overflow-hidden transition-all ${
          isSelected
            ? `border-${config.color}-500 shadow-lg shadow-${config.color}-500/20`
            : data.status === 'running'
            ? `border-${config.color}-500/50`
            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
        }`}
      >
        {/* Header */}
        <div className={`px-4 py-3 bg-gradient-to-r ${config.gradient} bg-opacity-10 border-b border-[#2a2a2a] flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-${config.color}-500/20`}>
              <Icon className={`w-4 h-4 text-${config.color}-400`} />
            </div>
            <span className="font-semibold text-white text-sm">{config.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {StatusIcon && (
              <StatusIcon
                className={`w-4 h-4 text-${status.color}-400 ${
                  status.pulse ? 'animate-spin' : ''
                }`}
              />
            )}
            <button className="p-1 hover:bg-white/10 rounded transition-colors">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Duration</span>
          </div>
          <span className="text-white font-mono ml-auto">
            {data.duration ? `${(data.duration / 1000).toFixed(1)}s` : '--'}
          </span>
        </div>

        {/* Details */}
        <div className="px-4 py-3 space-y-2">
          {data.details &&
            Object.entries(data.details).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-white font-mono">{value}</span>
              </div>
            ))}
          {!data.details && (
            <div className="text-xs text-gray-500 text-center py-2">
              {data.status === 'idle' ? 'Waiting to start...' :
               data.status === 'running' ? 'Processing...' :
               data.status === 'waiting' ? 'Awaiting input...' : 'No details'}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 py-2 bg-[#0f0f0f] border-t border-[#2a2a2a] flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{data.tokensUsed?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{data.messagesCount || 0}</span>
          </div>
          <div
            className={`ml-auto px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
              data.status === 'completed'
                ? 'bg-green-500/20 text-green-400'
                : data.status === 'running'
                ? 'bg-blue-500/20 text-blue-400'
                : data.status === 'failed'
                ? 'bg-red-500/20 text-red-400'
                : data.status === 'waiting'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {data.status}
          </div>
        </div>
      </div>

      {/* Connection Points */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#2a2a2a] border-2 border-[#3a3a3a] rounded-full" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#2a2a2a] border-2 border-[#3a3a3a] rounded-full" />
    </motion.div>
  );
}
