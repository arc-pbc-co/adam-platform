import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Sparkles } from 'lucide-react';
import { createExperiment, getWebSocket } from '../services/novaService';

interface Message {
  role: 'user' | 'system' | 'success' | 'error';
  text: string;
  timestamp: Date;
}

export function NovaTerminal() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      text: "🤖 ADAM NOVA ORCHESTRATOR ONLINE v2.0\n\nMulti-agent autonomous system ready.\n• Planning Agent: Active\n• Design Agent: Active\n• Simulation Agent: Active\n• Controller Agent: Active\n• Analyzer Agent: Active\n\nEnter experiment hypothesis or type 'help' for commands.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const ws = getWebSocket();
    ws.connect().then(() => {
      ws.subscribe('experiments', handleExperimentEvent);
    }).catch((err) => {
      console.error('WebSocket connection failed:', err);
    });

    return () => {
      ws.unsubscribe('experiments', handleExperimentEvent);
    };
  }, []);

  const handleExperimentEvent = (data: any) => {
    const eventMessages: Record<string, string> = {
      'experiment.created': '✅ Experiment created and queued for orchestration',
      'experiment.planned': '📋 Planning Agent completed - R${data.riskLevel} risk classification',
      'experiment.approval_required': '⏸️ Experiment requires approval (${data.approvalLevel})',
      'experiment.designed': '🎨 Design Agent completed - ${data.numberOfRuns} experimental runs',
      'experiment.simulated': '🔬 Simulation Agent completed - ${data.confidence}% confidence',
      'experiment.run_executing': '⚙️ Executing run ${data.runNumber}',
      'experiment.analyzed': '📊 Analysis Agent completed - ${data.insights} insights generated',
      'experiment.completed': '🎉 Experiment completed successfully!',
      'experiment.failed': '❌ Experiment failed: ${data.error}',
    };

    const eventType = data.type || 'unknown';
    const messageTemplate = eventMessages[eventType] || `Event: ${eventType}`;

    // Replace template variables
    let message = messageTemplate;
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(`\${data.${key}}`, String(value));
    }

    addMessage('system', message);
  };

  const addMessage = (role: Message['role'], text: string) => {
    setMessages((prev) => [
      ...prev,
      { role, text, timestamp: new Date() },
    ]);
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (trimmedInput.length > 2000) {
      addMessage('error', 'INPUT TOO LONG. Maximum 2000 characters allowed.');
      return;
    }

    addMessage('user', trimmedInput);
    setInput('');
    setIsLoading(true);

    try {
      // Check for special commands
      if (trimmedInput.toLowerCase() === 'help') {
        handleHelpCommand();
      } else if (trimmedInput.toLowerCase().startsWith('status')) {
        handleStatusCommand();
      } else if (trimmedInput.toLowerCase().startsWith('agents')) {
        handleAgentsCommand();
      } else {
        // Treat input as experiment hypothesis
        await handleCreateExperiment(trimmedInput);
      }
    } catch (error: any) {
      addMessage('error', `ERROR: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHelpCommand = () => {
    addMessage(
      'system',
      `AVAILABLE COMMANDS:

help - Show this help message
status - Check system status
agents - View agent status

EXPERIMENT CREATION:
Simply type your experiment hypothesis, e.g.:
"Fe-Co alloy with optimized grain structure achieves 90% of NdFeB performance"

The Nova orchestrator will automatically:
1. Plan the experiment (Planning Agent)
2. Design experiment matrix (Design Agent)
3. Simulate outcomes (Simulation Agent)
4. Execute on hardware (Controller Agent)
5. Analyze results (Analyzer Agent)`
    );
  };

  const handleStatusCommand = async () => {
    try {
      const response = await fetch('http://localhost:3100/health');
      const data = await response.json();

      addMessage(
        'system',
        `SYSTEM STATUS: ${data.status.toUpperCase()}
Version: ${data.version}

Agents:
• Planning: ${data.agents.planning}
• Design: ${data.agents.design}
• Simulation: ${data.agents.simulation}
• Controller: ${data.agents.controller}
• Analyzer: ${data.agents.analyzer}

All systems operational.`
      );
    } catch (error) {
      addMessage('error', 'Failed to fetch system status. Is the Nova orchestrator running?');
    }
  };

  const handleAgentsCommand = async () => {
    try {
      const response = await fetch('http://localhost:3100/agents/status');
      const data = await response.json();

      const agentStatus = data.agents
        .map((a: any) => `• ${a.name}: ${a.status} (${a.model})`)
        .join('\n');

      addMessage('system', `AGENT STATUS:\n\n${agentStatus}`);
    } catch (error) {
      addMessage('error', 'Failed to fetch agent status.');
    }
  };

  const handleCreateExperiment = async (hypothesis: string) => {
    addMessage('system', 'Creating experiment...');

    try {
      const result = await createExperiment({
        name: hypothesis.substring(0, 100), // First 100 chars as name
        hypothesis,
        description: 'Created via ADAM Terminal',
      });

      addMessage(
        'success',
        `✅ EXPERIMENT CREATED

ID: ${result.experiment.id}
Risk Level: ${result.experiment.risk_level}
Status: ${result.experiment.status}

${result.experiment.risk_level === 'R1'
  ? '🚀 Auto-approved. Nova orchestrator will begin workflow immediately.'
  : `⏸️ ${result.experiment.risk_level} risk - requires approval before proceeding.`
}

Watch this terminal for real-time progress updates.`
      );
    } catch (error: any) {
      addMessage('error', `Failed to create experiment: ${error.message}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-black/60 backdrop-blur-md border border-[#2a2a2a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-[#2a2a2a] px-6 py-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="text-white font-bold">ADAM Nova Terminal</h3>
            <p className="text-gray-400 text-xs">
              Multi-Agent Autonomous Orchestrator
            </p>
          </div>
          {isLoading && (
            <div className="ml-auto flex items-center gap-2 text-blue-400 text-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="h-[400px] overflow-y-auto p-6 space-y-4 font-mono text-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${
              msg.role === 'user'
                ? 'text-blue-400'
                : msg.role === 'success'
                ? 'text-green-400'
                : msg.role === 'error'
                ? 'text-red-400'
                : 'text-gray-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-600 text-xs">
                {msg.timestamp.toLocaleTimeString()}
              </span>
              <span className="opacity-50">
                {msg.role === 'user'
                  ? '>'
                  : msg.role === 'error'
                  ? '!'
                  : msg.role === 'success'
                  ? '✓'
                  : '•'}
              </span>
              <pre className="whitespace-pre-wrap flex-1">{msg.text}</pre>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <span>Orchestrator processing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2a2a] p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter experiment hypothesis or command..."
            disabled={isLoading}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded text-white font-semibold transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Shift+Enter for new line • Type 'help' for commands
        </div>
      </div>
    </div>
  );
}
