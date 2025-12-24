import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { approveExperiment, type ExperimentDetails } from '../services/novaService';

interface SafetyApprovalProps {
  experiment: ExperimentDetails;
  onApprove: () => void;
  onReject: () => void;
}

export function SafetyApproval({ experiment, onApprove, onReject }: SafetyApprovalProps) {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse planning result from parameters if available
  const planningResult = experiment.parameters.find(
    (p) => p.parameter_name === 'planning_result'
  );

  let riskAssessment: any = null;
  if (planningResult) {
    try {
      const parsed = JSON.parse(planningResult.parameter_value);
      riskAssessment = parsed.riskAssessment;
    } catch (e) {
      console.error('Failed to parse planning result:', e);
    }
  }

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      await approveExperiment(experiment.id, true, comments);
      onApprove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      await approveExperiment(experiment.id, false, comments);
      onReject();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'R1':
        return 'from-green-500 to-emerald-500';
      case 'R2':
        return 'from-yellow-500 to-orange-500';
      case 'R3':
        return 'from-red-500 to-rose-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#2a2a2a] p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Safety Approval Required</h2>
              <p className="text-gray-400">Review experiment before proceeding</p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getRiskColor(experiment.risk_level)} text-white font-bold`}
            >
              {experiment.risk_level}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Experiment Info */}
          <div>
            <h3 className="text-white font-semibold mb-3">Experiment Details</h3>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-2">
              <div>
                <div className="text-gray-500 text-xs mb-1">Name</div>
                <div className="text-white">{experiment.name}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Hypothesis</div>
                <div className="text-white">{experiment.hypothesis}</div>
              </div>
              {experiment.description && (
                <div>
                  <div className="text-gray-500 text-xs mb-1">Description</div>
                  <div className="text-gray-300 text-sm">{experiment.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          {riskAssessment && (
            <>
              {/* Risk Factors */}
              {riskAssessment.riskFactors && riskAssessment.riskFactors.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Identified Risk Factors</h3>
                  <div className="space-y-2">
                    {riskAssessment.riskFactors.map((factor: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-white">{factor.category}</div>
                          <div className="flex gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${getSeverityColor(factor.severity)} bg-current/10`}
                            >
                              {factor.severity} severity
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${getSeverityColor(factor.likelihood)} bg-current/10`}
                            >
                              {factor.likelihood} likelihood
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mitigations */}
              {riskAssessment.mitigations && riskAssessment.mitigations.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Mitigation Strategies</h3>
                  <div className="space-y-2">
                    {riskAssessment.mitigations.map((mitigation: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-[#1a1a1a] border border-green-500/20 rounded-lg p-4"
                      >
                        <div className="font-medium text-white mb-2">{mitigation.riskFactor}</div>
                        <div className="text-sm text-gray-400 mb-2">
                          <span className="text-green-400">Strategy:</span> {mitigation.strategy}
                        </div>
                        <div className="text-sm text-gray-400">
                          <span className="text-green-400">Implementation:</span> {mitigation.implementation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Level */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">ℹ️</span>
                  <span className="text-blue-400 font-semibold">Approval Required</span>
                </div>
                <p className="text-gray-300 text-sm">
                  This experiment requires <span className="text-white font-semibold capitalize">{riskAssessment.approvalLevel}</span> approval due to its{' '}
                  <span className={`font-semibold ${getRiskColor(experiment.risk_level).replace('from-', 'text-').replace(' to-', '').split(' ')[0]}`}>
                    {experiment.risk_level}
                  </span>{' '}
                  risk classification.
                </p>
              </div>
            </>
          )}

          {/* Comments */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Comments / Justification
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments or justification for this decision..."
              className="w-full h-32 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 rounded-lg text-white font-semibold transition-colors"
            >
              {loading ? 'Processing...' : '❌ Reject Experiment'}
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 rounded-lg text-white font-semibold transition-colors"
            >
              {loading ? 'Processing...' : '✅ Approve & Continue'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By approving, you authorize ADAM to proceed with this experiment following all safety protocols and mitigations.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
