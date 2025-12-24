import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Settings,
  Play,
  Square,
  Terminal,
  Bug,
  Layers,
  Beaker,
  Factory,
  Database,
  Bell,
  User,
  Search,
  Plus,
  MoreHorizontal,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Paperclip,
  X,
  LogOut,
  Shield,
} from 'lucide-react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { FactoryFloorCanvas } from './FactoryFloorCanvas';
import type { AgentNodeData } from './AgentNode';

interface User {
  username: string;
  role: string;
}

interface IDEPlatformProps {
  onBack: () => void;
  user?: User;
}

type LeftTab = 'chat' | 'experiments' | 'config';
type BottomTab = 'terminal' | 'debug';
type CanvasView = 'agents' | 'hardware';

// Mock experiments list
const experiments = [
  { id: 'EXP-2024-1251', name: 'Fe-Co Alloy Optimization', status: 'running', progress: 67 },
  { id: 'EXP-2024-1250', name: 'MnBi Permanent Magnets', status: 'pending', progress: 0 },
  { id: 'EXP-2024-1249', name: 'NASICON Electrolyte Grid', status: 'completed', progress: 100 },
  { id: 'EXP-2024-1248', name: 'AlSi10Mg Heat Treatment', status: 'completed', progress: 100 },
  { id: 'EXP-2024-1247', name: 'Ti-6Al-4V Microstructure', status: 'failed', progress: 45 },
];

// Mock chat messages
const initialMessages = [
  {
    id: 1,
    role: 'system',
    content: 'ADAM Orchestrator initialized. Ready to design and execute experiments.',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 2,
    role: 'user',
    content: 'Design an experiment to optimize Fe-Co alloy composition for maximum magnetic performance without rare earth elements.',
    timestamp: new Date(Date.now() - 3500000),
  },
  {
    id: 3,
    role: 'assistant',
    content: `I'll design a comprehensive experiment for Fe-Co alloy optimization. Here's my analysis:

**Hypothesis:** Fe-Co binary alloys with optimized grain structure can achieve 80-90% of NdFeB magnetic performance.

**Risk Assessment:** R1 (Low risk - standard materials, established processes)

**Proposed Experiment Matrix:**
- 12 composition variations (Fe:Co ratios from 50:50 to 70:30)
- 3 sintering profiles
- 2 post-processing treatments

The workflow has been initiated. You can monitor progress in the canvas view.`,
    timestamp: new Date(Date.now() - 3400000),
  },
];

export function IDEPlatform({ onBack, user }: IDEPlatformProps) {
  const [leftTab, setLeftTab] = useState<LeftTab>('chat');
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');
  const [canvasView, setCanvasView] = useState<CanvasView>('agents');
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [selectedNode, setSelectedNode] = useState<AgentNodeData | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState(experiments[0]);
  const [chatMessages, setChatMessages] = useState(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '$ nova status',
    '🤖 ADAM NOVA ORCHESTRATOR v2.0',
    '✓ All agents operational',
    '✓ Connected to hardware fleet',
    '✓ Database sync complete',
    '',
    '$ experiment run EXP-2024-1251',
    '→ Planning Agent: Started',
    '→ Planning Agent: Completed (21.3s)',
    '→ Design Agent: Started',
    '→ Design Agent: Completed (15.7s)',
    '→ Simulation Agent: Running...',
  ]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Simulate terminal updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTerminalLines((prev) => {
        if (prev.length > 50) return prev.slice(-40);
        const messages = [
          '→ Simulation Agent: Processing batch 8/12...',
          '→ Confidence: 87% → 89%',
          '→ Live Sinter™ model converging...',
        ];
        return [...prev, messages[Math.floor(Math.random() * messages.length)]];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      role: 'user' as const,
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          role: 'assistant' as const,
          content: 'I understand. Let me analyze that and update the experiment parameters accordingly. The changes will be reflected in the workflow canvas.',
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 bg-[#0f0f0f] border-b border-[#2a2a2a] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded transform rotate-45" />
            <span className="font-bold">ADAM Platform</span>
          </div>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Project:</span>
            <button className="flex items-center gap-1 text-white hover:text-blue-400 transition-colors">
              {selectedExperiment.name}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas View Toggle */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
          <button
            onClick={() => setCanvasView('agents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              canvasView === 'agents'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Agents
          </button>
          <button
            onClick={() => setCanvasView('hardware')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              canvasView === 'hardware'
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            Hardware
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              4,200 tokens
            </span>
            <span className="text-[#2a2a2a]">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              1d 4h 2m
            </span>
          </div>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-red-400">8 Errors</span>
            <span className="text-yellow-400">12 Warnings</span>
          </div>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <button className="p-1.5 hover:bg-[#2a2a2a] rounded transition-colors relative">
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button className="p-1.5 hover:bg-[#2a2a2a] rounded transition-colors">
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 hover:bg-[#2a2a2a] rounded transition-colors"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              {user && (
                <span className="text-xs text-gray-400 hidden sm:block">{user.username}</span>
              )}
              <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  {/* User Info */}
                  <div className="p-3 border-b border-[#2a2a2a]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{user?.username || 'User'}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Shield className="w-3 h-3" />
                          {user?.role || 'user'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        // Could open settings
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] rounded transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onBack();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <AnimatePresence>
          {!leftPanelCollapsed && (
            <motion.aside
              initial={{ width: 0 }}
              animate={{ width: leftPanelWidth }}
              exit={{ width: 0 }}
              className="bg-[#0f0f0f] border-r border-[#2a2a2a] flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Left Panel Tabs */}
              <div className="flex border-b border-[#2a2a2a]">
                {[
                  { id: 'chat' as LeftTab, label: 'Chat', icon: MessageSquare },
                  { id: 'experiments' as LeftTab, label: 'Experiments', icon: Beaker },
                  { id: 'config' as LeftTab, label: 'Config', icon: Settings },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLeftTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      leftTab === tab.id
                        ? 'text-white bg-[#1a1a1a] border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]/50'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Left Panel Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {leftTab === 'chat' && (
                  <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`${
                            msg.role === 'user' ? 'ml-4' : msg.role === 'system' ? 'opacity-60' : ''
                          }`}
                        >
                          <div
                            className={`rounded-lg p-3 text-sm ${
                              msg.role === 'user'
                                ? 'bg-blue-500/20 border border-blue-500/30'
                                : msg.role === 'system'
                                ? 'bg-[#1a1a1a] text-gray-400 text-xs'
                                : 'bg-[#1a1a1a] border border-[#2a2a2a]'
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1 px-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t border-[#2a2a2a]">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                          <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Ask ADAM anything..."
                            className="w-full bg-transparent px-3 py-2 text-sm resize-none focus:outline-none"
                            rows={2}
                          />
                          <div className="flex items-center justify-between px-2 pb-2">
                            <button className="p-1 text-gray-500 hover:text-white transition-colors">
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleSendMessage}
                              disabled={!chatInput.trim()}
                              className="p-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 rounded transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {leftTab === 'experiments' && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-3 border-b border-[#2a2a2a]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search experiments..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="p-2">
                      {experiments.map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => setSelectedExperiment(exp)}
                          className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                            selectedExperiment.id === exp.id
                              ? 'bg-blue-500/20 border border-blue-500/30'
                              : 'hover:bg-[#1a1a1a]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(exp.status)}`} />
                            <span className="text-xs text-gray-500">{exp.id}</span>
                          </div>
                          <div className="font-medium text-sm mb-2">{exp.name}</div>
                          {exp.status === 'running' && (
                            <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${exp.progress}%` }}
                              />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-[#2a2a2a]">
                      <button className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                        New Experiment
                      </button>
                    </div>
                  </div>
                )}

                {leftTab === 'config' && (
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Default Model</label>
                        <select className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm">
                          <option>gpt-4o-mini</option>
                          <option>gpt-4o</option>
                          <option>gemini-pro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Auto-approve R1</label>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm">Automatically approve low-risk experiments</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Simulation Model</label>
                        <select className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm">
                          <option>Live Sinter™ v2.0</option>
                          <option>FEA Standard</option>
                          <option>ML Surrogate</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Left Panel Toggle */}
        <button
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          className="w-5 bg-[#0f0f0f] border-r border-[#2a2a2a] flex items-center justify-center hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
        >
          {leftPanelCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Center: Canvas + Bottom Panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Canvas Area - Toggle between views */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              {canvasView === 'agents' ? (
                <motion.div
                  key="agents"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <FlowchartCanvas
                    experimentId={selectedExperiment.id}
                    onNodeSelect={setSelectedNode}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="hardware"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <FactoryFloorCanvas
                    onPrinterSelect={(printer) => {
                      // Could show printer details in right panel
                      if (printer) {
                        setSelectedNode(null); // Clear agent selection when viewing hardware
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Panel Toggle */}
          <button
            onClick={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
            className="h-6 bg-[#0f0f0f] border-t border-[#2a2a2a] flex items-center justify-center hover:bg-[#1a1a1a] transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                bottomPanelCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Bottom Panel */}
          <AnimatePresence>
            {!bottomPanelCollapsed && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: bottomPanelHeight }}
                exit={{ height: 0 }}
                className="bg-[#0f0f0f] border-t border-[#2a2a2a] flex flex-col overflow-hidden flex-shrink-0"
              >
                {/* Bottom Panel Tabs */}
                <div className="flex items-center justify-between border-b border-[#2a2a2a] px-2">
                  <div className="flex">
                    {[
                      { id: 'terminal' as BottomTab, label: 'Terminal', icon: Terminal },
                      { id: 'debug' as BottomTab, label: 'Debug Console', icon: Bug },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setBottomTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                          bottomTab === tab.id
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="bg-transparent text-xs text-gray-400 focus:outline-none">
                      <option>1: Node</option>
                      <option>2: Planning</option>
                      <option>3: Design</option>
                    </select>
                    <button className="p-1 hover:bg-[#2a2a2a] rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Bottom Panel Content */}
                <div className="flex-1 overflow-hidden">
                  {bottomTab === 'terminal' && (
                    <div className="h-full overflow-y-auto p-3 font-mono text-xs">
                      {terminalLines.map((line, i) => (
                        <div
                          key={i}
                          className={`${
                            line.startsWith('$')
                              ? 'text-green-400'
                              : line.startsWith('✓')
                              ? 'text-green-400'
                              : line.startsWith('→')
                              ? 'text-blue-400'
                              : line.startsWith('!')
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-green-400">~/Automation/draft $&gt;</span>
                        <span className="animate-pulse">|</span>
                      </div>
                    </div>
                  )}

                  {bottomTab === 'debug' && (
                    <div className="h-full overflow-y-auto p-3 font-mono text-xs space-y-1">
                      <div className="text-yellow-400">[WARN] Simulation batch 5 took longer than expected (12.3s)</div>
                      <div className="text-blue-400">[INFO] Controller Agent queued 8 print jobs</div>
                      <div className="text-green-400">[OK] All agents responding within threshold</div>
                      <div className="text-red-400">[ERR] Failed to connect to printer X25Pro-05 (timeout)</div>
                      <div className="text-gray-400">[DEBUG] Memory usage: 2.4GB / 8GB</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Node Details (shows when node is selected) */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#0f0f0f] border-l border-[#2a2a2a] overflow-hidden flex-shrink-0"
            >
              <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
                <h3 className="font-semibold">{selectedNode.name}</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-[#2a2a2a] rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                    selectedNode.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedNode.status === 'running'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {selectedNode.status === 'running' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    )}
                    {selectedNode.status}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Duration</div>
                  <div className="text-lg font-mono">
                    {selectedNode.duration ? `${(selectedNode.duration / 1000).toFixed(1)}s` : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tokens Used</div>
                  <div className="text-lg font-mono">{selectedNode.tokensUsed?.toLocaleString() || 0}</div>
                </div>
                {selectedNode.details && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Details</div>
                    <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                      {Object.entries(selectedNode.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-[#0f0f0f] border-t border-[#2a2a2a] flex items-center justify-between px-3 text-xs text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Connected
          </span>
          <span>5 agents active</span>
          <span>13 printers online</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-red-400">Error: 8</span>
          <span className="text-yellow-400">Warning: 12</span>
        </div>
      </footer>
    </div>
  );
}
