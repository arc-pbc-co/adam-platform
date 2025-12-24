import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Beaker,
  Factory,
  Activity,
} from 'lucide-react';
import AdamTerminal from './AdamTerminal';
import { ExperimentDashboard } from './ExperimentDashboard';
import { HardwareIntegration } from './HardwareIntegration';
import { NovaTerminal } from './NovaTerminal';
import { WorkflowProgress, type WorkflowPhase } from './WorkflowProgress';
import { SafetyApproval } from './SafetyApproval';
import type { ExperimentDetails } from '../services/novaService';

type TabType = 'demo' | 'experiments' | 'hardware' | 'terminal';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: TabConfig[] = [
  { id: 'demo', label: 'AI Demo', icon: Terminal, description: 'Interactive demo' },
  { id: 'experiments', label: 'Experiments', icon: Beaker, description: 'Live experiments' },
  { id: 'hardware', label: 'Hardware', icon: Factory, description: 'Fleet & materials' },
  { id: 'terminal', label: 'Nova Terminal', icon: Activity, description: 'Command interface' },
];

// Demo workflow phases for the overview
const demoPhases: WorkflowPhase[] = [
  { id: 'planning', name: 'Planning', status: 'completed' },
  { id: 'design', name: 'Design', status: 'completed' },
  { id: 'simulation', name: 'Simulation', status: 'completed' },
  { id: 'execution', name: 'Execution', status: 'active', progress: 67 },
  { id: 'analysis', name: 'Analysis', status: 'pending' },
];

// Quick stats
const quickStats = [
  { label: 'Active', value: 12, color: 'blue' },
  { label: 'Printers', value: '5/13', color: 'green' },
  { label: 'Materials', value: 26, color: 'purple' },
  { label: 'Approvals', value: 2, color: 'yellow' },
];

interface AdamCoreInterfaceProps {
  apiKeyGate?: React.ComponentType<{ children: React.ReactNode }>;
}

export function AdamCoreInterface({ apiKeyGate: ApiKeyGate }: AdamCoreInterfaceProps) {
  const [activeTab, setActiveTab] = useState<TabType>('demo');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDetails | null>(null);

  const handleApprovalRequired = (experiment: ExperimentDetails) => {
    setSelectedExperiment(experiment);
    setShowApprovalModal(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'demo':
        // Wrap with ApiKeyGate if provided
        const terminalContent = <AdamTerminal />;
        return ApiKeyGate ? <ApiKeyGate>{terminalContent}</ApiKeyGate> : terminalContent;

      case 'experiments':
        return (
          <div className="space-y-4">
            {/* Workflow Progress */}
            <div className="bg-black/60 border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold text-sm">Active Workflow</h4>
                <span className="text-xs text-gray-400">EXP-2024-1251</span>
              </div>
              <WorkflowProgress phases={demoPhases} compact />
            </div>
            {/* Experiment Dashboard */}
            <div className="max-h-[450px] overflow-y-auto">
              <ExperimentDashboard onApprovalRequired={handleApprovalRequired} />
            </div>
          </div>
        );

      case 'hardware':
        return <HardwareIntegration />;

      case 'terminal':
        return <NovaTerminal />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-4 bg-black/40 border border-[#2a2a2a] rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-arc-accent text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Quick Stats Bar (only show for non-demo tabs) */}
      {activeTab !== 'demo' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-4 gap-2 mb-4"
        >
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className={`bg-${stat.color}-500/10 border border-${stat.color}-500/20 rounded-lg p-2 text-center`}
            >
              <div className={`text-lg font-bold text-${stat.color}-400`}>{stat.value}</div>
              <div className="text-[10px] text-gray-500 uppercase">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Helper Text */}
      <p className="font-mono text-xs text-arc-muted text-center mt-4">
        {activeTab === 'demo' && '* Live simulation of ADAM\'s reasoning engine. Try asking: "Design a high-strength steel experiment."'}
        {activeTab === 'experiments' && '* Real-time experiment tracking with 5-phase workflow visualization'}
        {activeTab === 'hardware' && '* Fleet status for 13 printers, 26+ materials database, and cost calculator'}
        {activeTab === 'terminal' && '* Direct command interface to Nova orchestrator. Type "help" for commands.'}
      </p>

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
