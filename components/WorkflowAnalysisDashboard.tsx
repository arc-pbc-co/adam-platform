import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  DollarSign,
  Clock,
  Cpu,
  Zap,
  Play,
  X,
  TrendingUp,
  Database,
} from 'lucide-react';
import {
  workflowAnalyzer,
  runAnalysisDemo,
  WorkflowAnalysis,
  MODEL_PRICING,
} from '../services/workflowAnalyzer';

interface WorkflowAnalysisDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowAnalysisDashboard({ isOpen, onClose }: WorkflowAnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'calls' | 'projections'>('summary');

  const runDemo = async () => {
    setIsRunning(true);
    try {
      const result = await runAnalysisDemo('Demo Fe-Co Alloy Optimization');
      setAnalysis(result);
    } finally {
      setIsRunning(false);
    }
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Cost projections
  const projections = [
    { experiments: 10, label: '10 experiments' },
    { experiments: 100, label: '100 experiments' },
    { experiments: 1000, label: '1,000 experiments' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Workflow Analysis</h2>
                  <p className="text-gray-400 text-sm">AI API usage, tokens & cost tracking</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#2a2a2a] px-6">
              <div className="flex gap-1">
                {(['summary', 'calls', 'projections'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab
                        ? 'text-blue-400 border-blue-400'
                        : 'text-gray-400 border-transparent hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {!analysis ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No Analysis Data</h3>
                  <p className="text-gray-500 mb-6">
                    Run a demo workflow to see token usage and cost analysis
                  </p>
                  <button
                    onClick={runDemo}
                    disabled={isRunning}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Demo Workflow
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <DollarSign className="w-4 h-4" />
                            Total Cost
                          </div>
                          <div className="text-2xl font-bold text-green-400">
                            {formatCost(analysis.totalCost)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Database className="w-4 h-4" />
                            Total Tokens
                          </div>
                          <div className="text-2xl font-bold text-blue-400">
                            {analysis.totalTokens.totalTokens.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Clock className="w-4 h-4" />
                            Duration
                          </div>
                          <div className="text-2xl font-bold text-yellow-400">
                            {formatDuration(analysis.totalDurationMs)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Cpu className="w-4 h-4" />
                            API Calls
                          </div>
                          <div className="text-2xl font-bold text-purple-400">
                            {analysis.calls.length}
                          </div>
                        </div>
                      </div>

                      {/* Cost by Model */}
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-4">Cost by Model</h3>
                        <div className="space-y-3">
                          {Object.entries(analysis.costByModel).map(([model, cost]) => {
                            const pricing = MODEL_PRICING[model];
                            const percentage = analysis.totalCost > 0
                              ? (cost / analysis.totalCost) * 100
                              : 0;
                            return (
                              <div key={model}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-400">{pricing?.name || model}</span>
                                  <span className="text-white">{formatCost(cost)}</span>
                                </div>
                                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    style={{ width: `${Math.max(percentage, 5)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cost by Agent */}
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-4">Cost by Agent</h3>
                        <div className="space-y-3">
                          {Object.entries(analysis.costByAgent).map(([agent, cost]) => {
                            const percentage = analysis.totalCost > 0
                              ? (cost / analysis.totalCost) * 100
                              : 0;
                            return (
                              <div key={agent}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-400">{agent}</span>
                                  <span className="text-white">{formatCost(cost)}</span>
                                </div>
                                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                                    style={{ width: `${Math.max(percentage, 5)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Token Breakdown */}
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-4">Token Breakdown</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {analysis.totalTokens.inputTokens.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Input Tokens</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">
                              {analysis.totalTokens.outputTokens.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Output Tokens</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">
                              {analysis.totalTokens.totalTokens.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Total Tokens</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'calls' && (
                    <div className="space-y-2">
                      {analysis.calls.map((call, index) => (
                        <div
                          key={call.id}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                {index + 1}
                              </span>
                              <span className="font-medium text-white">{call.agent}</span>
                              <span className="text-gray-500">::</span>
                              <span className="text-gray-400">{call.operation}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className={call.success ? 'text-green-400' : 'text-red-400'}>
                                {call.success ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 text-xs">Model</div>
                              <div className="text-gray-300">
                                {MODEL_PRICING[call.model]?.name || call.model}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs">Tokens</div>
                              <div className="text-gray-300">
                                {call.usage.totalTokens.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs">Cost</div>
                              <div className="text-green-400">{formatCost(call.cost)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs">Duration</div>
                              <div className="text-yellow-400">{formatDuration(call.durationMs)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'projections' && (
                    <div className="space-y-6">
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                          <h3 className="text-sm font-medium text-gray-300">
                            Cost Projections (Based on Current Workflow)
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 border-b border-[#2a2a2a]">
                                <th className="text-left py-2">Scale</th>
                                <th className="text-right py-2">Cost</th>
                                <th className="text-right py-2">Tokens</th>
                                <th className="text-right py-2">Est. Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projections.map(proj => (
                                <tr key={proj.experiments} className="border-b border-[#2a2a2a]/50">
                                  <td className="py-3 text-white">{proj.label}</td>
                                  <td className="py-3 text-right text-green-400">
                                    {formatCost(analysis.totalCost * proj.experiments)}
                                  </td>
                                  <td className="py-3 text-right text-blue-400">
                                    {(analysis.totalTokens.totalTokens * proj.experiments).toLocaleString()}
                                  </td>
                                  <td className="py-3 text-right text-yellow-400">
                                    {formatDuration(analysis.totalDurationMs * proj.experiments)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-4">
                          Model Pricing Reference
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 border-b border-[#2a2a2a]">
                                <th className="text-left py-2">Model</th>
                                <th className="text-right py-2">Input (per 1K)</th>
                                <th className="text-right py-2">Output (per 1K)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(MODEL_PRICING).slice(0, 8).map(([key, pricing]) => (
                                <tr key={key} className="border-b border-[#2a2a2a]/50">
                                  <td className="py-2 text-white">{pricing.name}</td>
                                  <td className="py-2 text-right text-gray-400">
                                    ${pricing.inputPer1k.toFixed(6)}
                                  </td>
                                  <td className="py-2 text-right text-gray-400">
                                    ${pricing.outputPer1k.toFixed(6)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {analysis && (
              <div className="border-t border-[#2a2a2a] px-6 py-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Workflow: {analysis.experimentName}
                </div>
                <button
                  onClick={runDemo}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run New Analysis
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
