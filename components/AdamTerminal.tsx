import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToAdam } from '../services/geminiService';
import { Send, Cpu, Activity, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
  type?: 'normal' | 'phase' | 'step' | 'success' | 'warning' | 'error';
}

interface ExecutionPhase {
  name: string;
  agent: string;
  steps: string[];
  duration: number;
}

const executionPhases: ExecutionPhase[] = [
  {
    name: 'Planning',
    agent: 'Planning Agent',
    steps: [
      'Parsing experiment parameters...',
      'Validating material constraints...',
      'Generating Design of Experiments matrix...',
      'Risk assessment: R1 (Low Risk) - Auto-approved',
    ],
    duration: 2400,
  },
  {
    name: 'Design',
    agent: 'Design Agent',
    steps: [
      'Parametrizing material composition...',
      'Calculating binder saturation: 55-72%',
      'Layer thickness optimization: 50μm',
      'Generated 12 print profile variations',
    ],
    duration: 1800,
  },
  {
    name: 'Simulation',
    agent: 'Simulation Agent',
    steps: [
      'Initializing Live Sinter™ physics engine...',
      'Running thermal simulation batch...',
      'ML confidence scoring: 94.2%',
      'Microstructure prediction complete',
    ],
    duration: 3200,
  },
  {
    name: 'Dispatch',
    agent: 'Controller Agent',
    steps: [
      'Querying fleet availability...',
      'Selected: X25Pro-03 (idle)',
      'Dispatching print job #EXP-2024-1252-A',
      'Job queued successfully',
    ],
    duration: 1200,
  },
  {
    name: 'Analysis',
    agent: 'Analyzer Agent',
    steps: [
      'Monitoring job progress...',
      'Estimated completion: 4.2 hours',
      'Feedback loop initialized',
      'Ready for next iteration',
    ],
    duration: 1500,
  },
];

const AdamTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: "ADAM ORCHESTRATOR ONLINE v2.0.\nReady for experimental parameters or material queries.\n\nTry: \"Run Fe-Co alloy optimization experiment\"" }],
      type: 'normal',
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('IDLE');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if input suggests an experiment execution
  const isExperimentCommand = (text: string): boolean => {
    const keywords = ['run', 'execute', 'start', 'init', 'experiment', 'optimize', 'test', 'design'];
    const lower = text.toLowerCase();
    return keywords.some(keyword => lower.includes(keyword));
  };

  // Simulate the execution loop
  const runExecutionLoop = async (experimentName: string) => {
    setIsExecuting(true);
    setStatusText('EXECUTING');

    // Initial acknowledgment
    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{ text: `INITIATING EXPERIMENT: ${experimentName}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` }],
      type: 'normal',
    }]);

    await new Promise(r => setTimeout(r, 500));

    // Run through each phase
    for (const phase of executionPhases) {
      setCurrentPhase(phase.name);

      // Phase header
      setMessages(prev => [...prev, {
        role: 'system',
        parts: [{ text: `▶ ${phase.agent} :: ${phase.name.toUpperCase()}` }],
        type: 'phase',
      }]);

      await new Promise(r => setTimeout(r, 300));

      // Run through steps
      for (let i = 0; i < phase.steps.length; i++) {
        const step = phase.steps[i];
        await new Promise(r => setTimeout(r, phase.duration / phase.steps.length));

        setMessages(prev => [...prev, {
          role: 'system',
          parts: [{ text: `  → ${step}` }],
          type: 'step',
        }]);
      }

      // Phase complete
      const phaseDuration = (phase.duration / 1000).toFixed(1);
      setMessages(prev => [...prev, {
        role: 'system',
        parts: [{ text: `  ✓ ${phase.name} complete (${phaseDuration}s)` }],
        type: 'success',
      }]);

      await new Promise(r => setTimeout(r, 400));
    }

    setCurrentPhase(null);

    // Final summary
    await new Promise(r => setTimeout(r, 300));
    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{
        text: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW COMPLETE

Summary:
• Experiment ID: EXP-2024-${Math.floor(1000 + Math.random() * 9000)}
• Print Jobs Dispatched: 12
• Estimated Completion: 4.2 hours
• Confidence Score: 94.2%

Monitor progress in the Platform view.
Type "status" to check job progress.`
      }],
      type: 'success',
    }]);

    setIsExecuting(false);
    setStatusText('IDLE');
  };

  const handleSend = async () => {
    console.log('handleSend called, input:', input);
    const trimmedInput = input.trim();
    console.log('trimmedInput:', trimmedInput, 'isLoading:', isLoading, 'isExecuting:', isExecuting);
    if (!trimmedInput || isLoading || isExecuting) return;

    if (trimmedInput.length > 2000) {
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: "INPUT TOO LONG. Maximum 2000 characters allowed." }],
        type: 'error',
      }]);
      return;
    }

    const userMsg: Message = { role: 'user', parts: [{ text: trimmedInput }], type: 'normal' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Check if this is an experiment command
    if (isExperimentCommand(trimmedInput)) {
      // Extract experiment name or use default
      const experimentName = trimmedInput.length > 20
        ? trimmedInput.substring(0, 50) + '...'
        : trimmedInput;

      await runExecutionLoop(experimentName.toUpperCase());
      return;
    }

    // Otherwise, use the AI for regular queries
    setIsLoading(true);
    setStatusText('PROCESSING');

    const contextHistory = messages.slice(-10);

    try {
      const responseText = await sendMessageToAdam(trimmedInput, contextHistory);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: responseText }],
        type: 'normal',
      }]);
    } catch (e) {
      console.error('Terminal error:', e);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: "CONNECTION ERROR. Neural link interrupted. Please try again." }],
        type: 'error',
      }]);
    } finally {
      setIsLoading(false);
      setStatusText('IDLE');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.role === 'user') {
      return 'bg-arc-panel border-arc-border text-arc-text';
    }

    switch (msg.type) {
      case 'phase':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400 font-bold';
      case 'step':
        return 'bg-transparent border-transparent text-arc-muted pl-4';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-arc-accent/10 border-arc-accent/30 text-arc-accent';
    }
  };

  return (
    <div className="w-full h-[600px] bg-arc-black border border-arc-border rounded-none relative overflow-hidden flex flex-col font-mono text-sm shadow-2xl">
      {/* Header */}
      <div className="bg-arc-panel border-b border-arc-border p-3 flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <Cpu className={`w-4 h-4 text-arc-accent ${isExecuting ? 'animate-spin' : 'animate-pulse'}`} />
          <span className="font-bold tracking-widest text-arc-text">ADAM_CORE // TERMINAL</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-arc-muted">
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-blue-500 animate-pulse' : 'bg-arc-success'}`}></span>
            <span>SYSTEM: NOMINAL</span>
          </div>
          <div className="flex items-center gap-1">
            {isExecuting ? (
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            ) : (
              <Activity className="w-3 h-3" />
            )}
            <span className={isExecuting ? 'text-blue-400' : ''}>{statusText}</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-arc-black/90 relative">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none"></div>

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.type === 'step' ? 'my-0' : ''}`}
          >
            <div
              className={`${msg.type === 'step' ? 'w-full' : 'max-w-[90%]'} p-2 border ${getMessageStyle(msg)}`}
            >
              {msg.role === 'model' && msg.type === 'normal' && (
                <div className="text-[10px] uppercase opacity-50 mb-1">Orchestrator</div>
              )}
              <pre className="whitespace-pre-wrap font-mono leading-relaxed text-sm">{msg.parts[0].text}</pre>
            </div>
          </div>
        ))}

        {isLoading && !isExecuting && (
          <div className="flex justify-start">
            <div className="bg-arc-accent/10 border border-arc-accent/30 p-3 flex items-center gap-2 text-arc-accent">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing query...</span>
            </div>
          </div>
        )}

        {isExecuting && currentPhase && (
          <div className="flex justify-start">
            <div className="bg-blue-500/10 border border-blue-500/30 p-3 flex items-center gap-2 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing {currentPhase}...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-arc-panel border-t border-arc-border flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-3 text-arc-accent">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Initialize experiment or query material database..."
            className="w-full bg-arc-black border border-arc-border p-2 pl-7 text-arc-text focus:outline-none focus:border-arc-accent focus:ring-1 focus:ring-arc-accent transition-all"
            autoComplete="off"
            disabled={isExecuting}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isLoading || isExecuting}
          className="bg-arc-accent text-white px-4 py-2 hover:bg-blue-600 disabled:opacity-50 transition-colors uppercase font-bold tracking-wider flex items-center gap-2"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Exec
        </button>
      </div>

      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-arc-accent pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-arc-accent pointer-events-none"></div>
    </div>
  );
};

export default AdamTerminal;
