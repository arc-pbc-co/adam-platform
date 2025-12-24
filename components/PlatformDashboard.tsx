import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Beaker,
  Factory,
  Terminal as TerminalIcon,
  ShieldCheck,
  Activity,
  ChevronLeft,
  Settings,
  Bell,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { ExperimentDashboard } from './ExperimentDashboard';
import { WorkflowProgress, type WorkflowPhase } from './WorkflowProgress';
import { HardwareIntegration } from './HardwareIntegration';
import { NovaTerminal } from './NovaTerminal';
import { SafetyApproval } from './SafetyApproval';
import type { ExperimentDetails } from '../services/novaService';

type View = 'overview' | 'experiments' | 'hardware' | 'terminal';

interface PlatformDashboardProps {
  onBack: () => void;
}

// Quick stats for the overview
const quickStats = [
  { label: 'Active Experiments', value: 12, change: '+3 today', icon: Beaker, color: 'blue' },
  { label: 'Printers Running', value: 5, change: '13 total', icon: Factory, color: 'green' },
  { label: 'Materials in Stock', value: 26, change: '2,847 kg', icon: Activity, color: 'purple' },
  { label: 'Pending Approvals', value: 2, change: 'R2/R3 risk', icon: ShieldCheck, color: 'yellow' },
];

// Recent activity for the overview
const recentActivity = [
  { id: 1, type: 'experiment', message: 'Fe-Co Alloy Batch A completed successfully', time: '5 min ago', status: 'success' },
  { id: 2, type: 'approval', message: 'MnBi High-Temp experiment requires approval', time: '12 min ago', status: 'warning' },
  { id: 3, type: 'hardware', message: 'X25Pro-02 returned to online status', time: '28 min ago', status: 'info' },
  { id: 4, type: 'experiment', message: 'NASICON Electrolyte Grid started printing', time: '45 min ago', status: 'info' },
  { id: 5, type: 'agent', message: 'Analyzer Agent completed insights for EXP-2024-1247', time: '1 hour ago', status: 'success' },
];

export function PlatformDashboard({ onBack }: PlatformDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDetails | null>(null);

  // Demo workflow for the overview
  const [demoPhases] = useState<WorkflowPhase[]>([
    { id: 'planning', name: 'Planning', status: 'completed' },
    { id: 'design', name: 'Design', status: 'completed' },
    { id: 'simulation', name: 'Simulation', status: 'completed' },
    { id: 'execution', name: 'Execution', status: 'active', progress: 67 },
    { id: 'analysis', name: 'Analysis', status: 'pending' },
  ]);

  const navItems = [
    { id: 'overview' as View, label: 'Overview', icon: LayoutDashboard },
    { id: 'experiments' as View, label: 'Experiments', icon: Beaker },
    { id: 'hardware' as View, label: 'Hardware', icon: Factory },
    { id: 'terminal' as View, label: 'Nova Terminal', icon: TerminalIcon },
  ];

  const handleApprovalRequired = (experiment: ExperimentDetails) => {
    setSelectedExperiment(experiment);
    setShowApprovalModal(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#2a2a2a] z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back to Site</span>
            </button>
            <div className="w-px h-6 bg-[#2a2a2a]"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded transform rotate-45"></div>
              <span className="font-bold text-lg tracking-tight">ADAM Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-[#2a2a2a]">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Admin</div>
                <div className="text-xs text-gray-500">Research Lead</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[#0a0a0a] border-r border-[#2a2a2a] z-40">
        <div className="p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-[#2a2a2a]">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-4">
              System Status
            </div>
            <div className="px-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Nova Orchestrator</span>
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">API Gateway</span>
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Database</span>
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 pt-16 min-h-screen">
        <AnimatePresence mode="wait">
          {/* Overview View */}
          {currentView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
                <p className="text-gray-400">
                  Here's what's happening with your experiments today.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`p-2 rounded-lg bg-${stat.color}-500/20 text-${stat.color}-400`}
                      >
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-gray-500">{stat.change}</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Active Workflow */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">Active Experiment Workflow</h2>
                    <p className="text-sm text-gray-400">
                      Fe-Co Alloy Optimization - EXP-2024-1251
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentView('experiments')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Details
                  </button>
                </div>
                <WorkflowProgress phases={demoPhases} />
              </div>

              {/* Recent Activity & Hardware */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                  <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div
                          className={`mt-1 w-2 h-2 rounded-full ${
                            item.status === 'success'
                              ? 'bg-green-400'
                              : item.status === 'warning'
                              ? 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">{item.message}</p>
                          <p className="text-xs text-gray-500">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Terminal */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Nova Terminal</h2>
                    <button
                      onClick={() => setCurrentView('terminal')}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Open Full Terminal
                    </button>
                  </div>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm h-[200px] overflow-y-auto">
                    <div className="text-green-400 mb-2">
                      {'>'} ADAM NOVA ORCHESTRATOR v2.0
                    </div>
                    <div className="text-gray-400 mb-2">
                      All agents operational. Ready for commands.
                    </div>
                    <div className="text-blue-400 mb-1">
                      {'>'} status
                    </div>
                    <div className="text-gray-300">
                      Planning Agent: <span className="text-green-400">Active</span>
                      <br />
                      Design Agent: <span className="text-green-400">Active</span>
                      <br />
                      Simulation Agent: <span className="text-green-400">Active</span>
                      <br />
                      Controller Agent: <span className="text-green-400">Active</span>
                      <br />
                      Analyzer Agent: <span className="text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Experiments View */}
          {currentView === 'experiments' && (
            <motion.div
              key="experiments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <ExperimentDashboard onApprovalRequired={handleApprovalRequired} />
            </motion.div>
          )}

          {/* Hardware View */}
          {currentView === 'hardware' && (
            <motion.div
              key="hardware"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <HardwareIntegration />
            </motion.div>
          )}

          {/* Terminal View */}
          {currentView === 'terminal' && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <NovaTerminal />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Safety Approval Modal */}
      {showApprovalModal && selectedExperiment && (
        <SafetyApproval
          experiment={selectedExperiment}
          onApprove={() => {
            setShowApprovalModal(false);
            setSelectedExperiment(null);
          }}
          onReject={() => {
            setShowApprovalModal(false);
            setSelectedExperiment(null);
          }}
        />
      )}
    </div>
  );
}
