/**
 * IDEPlatform - ADAM Platform IDE-style interface
 *
 * This component provides the main workspace for:
 * - Nova AI chat interface
 * - Experiment management
 * - Agent canvas visualization
 * - Hardware fleet monitoring
 * - Terminal/debug console
 *
 * Styled with God Mode design tokens for visual consistency.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Settings,
  Play,
  Terminal,
  Bug,
  Layers,
  Beaker,
  Factory,
  Bell,
  User,
  Search,
  Plus,
  Zap,
  Clock,
  Send,
  Paperclip,
  X,
  LogOut,
  Shield,
  BarChart3,
  Globe,
} from 'lucide-react'
import type { User as UserType, Site } from '../../types/app'
import { FlowchartCanvas, FactoryFloorCanvas } from '../Canvas'
import styles from './IDEPlatform.module.css'

interface IDEPlatformProps {
  onBack: () => void
  user: UserType | null
  sites?: Site[]
}

type LeftTab = 'chat' | 'experiments' | 'config'
type BottomTab = 'terminal' | 'debug'
type CanvasView = 'agents' | 'hardware'

interface Experiment {
  id: string
  name: string
  status: 'running' | 'pending' | 'completed' | 'failed'
  progress: number
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

// Initial experiments
const initialExperiments: Experiment[] = [
  { id: 'EXP-2024-1251', name: 'Fe-Co Alloy Optimization', status: 'running', progress: 67 },
  { id: 'EXP-2024-1250', name: 'MnBi Permanent Magnets', status: 'pending', progress: 0 },
  { id: 'EXP-2024-1249', name: 'NASICON Electrolyte Grid', status: 'completed', progress: 100 },
  { id: 'EXP-2024-1248', name: 'AlSi10Mg Heat Treatment', status: 'completed', progress: 100 },
  { id: 'EXP-2024-1247', name: 'Ti-6Al-4V Microstructure', status: 'failed', progress: 45 },
]

// Initial chat messages
const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'system',
    content: 'ADAM Orchestrator initialized. Ready to design and execute experiments.',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 2,
    role: 'user',
    content: 'Design an experiment to optimize Fe-Co alloy composition for maximum magnetic performance.',
    timestamp: new Date(Date.now() - 3500000),
  },
  {
    id: 3,
    role: 'assistant',
    content: `I'll design a comprehensive experiment for Fe-Co alloy optimization.

**Hypothesis:** Fe-Co binary alloys with optimized grain structure can achieve 80-90% of NdFeB magnetic performance.

**Risk Assessment:** R1 (Low risk - standard materials, established processes)

**Proposed Experiment Matrix:**
- 12 composition variations (Fe:Co ratios from 50:50 to 70:30)
- 3 sintering profiles
- 2 post-processing treatments

The workflow has been initiated. Monitor progress in the canvas view.`,
    timestamp: new Date(Date.now() - 3400000),
  },
]

export function IDEPlatform({ onBack, user, sites }: IDEPlatformProps) {
  // UI State
  const [leftTab, setLeftTab] = useState<LeftTab>('chat')
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal')
  const [canvasView, setCanvasView] = useState<CanvasView>('agents')
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Data State
  const [experiments, setExperiments] = useState<Experiment[]>(initialExperiments)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment>(initialExperiments[0])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
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
  ])
  const [isExecuting, setIsExecuting] = useState(false)
  const [showNewExperimentModal, setShowNewExperimentModal] = useState(false)
  const [newExperimentName, setNewExperimentName] = useState('')

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat and terminal
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalLines])

  // Simulate terminal updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTerminalLines((prev) => {
        if (prev.length > 50) return prev.slice(-40)
        const messages = [
          '→ Simulation Agent: Processing batch 8/12...',
          '→ Confidence: 87% → 89%',
          '→ Live Sinter™ model converging...',
        ]
        return [...prev, messages[Math.floor(Math.random() * messages.length)]]
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Check if input is an experiment command
  const isExperimentCommand = (text: string): boolean => {
    const keywords = ['run', 'execute', 'start', 'init', 'experiment', 'optimize', 'test', 'design', 'create']
    const lower = text.toLowerCase()
    return keywords.some((keyword) => lower.includes(keyword))
  }

  // Run execution loop simulation
  const runExecutionLoop = useCallback(async (experimentName: string) => {
    setIsExecuting(true)

    const phases = [
      { agent: 'Planning Agent', steps: ['Parsing experiment parameters...', 'Validating material constraints...', 'Generating DOE matrix...', 'Risk assessment: R1 (Auto-approved)'], duration: 600 },
      { agent: 'Design Agent', steps: ['Parametrizing composition...', 'Calculating binder saturation: 55-72%', 'Layer thickness optimization: 50μm', 'Generated 12 print profiles'], duration: 500 },
      { agent: 'Simulation Agent', steps: ['Initializing Live Sinter™...', 'Running thermal simulation...', 'ML confidence scoring: 94.2%', 'Microstructure prediction complete'], duration: 800 },
      { agent: 'Controller Agent', steps: ['Querying fleet availability...', 'Selected: X25Pro-03 (idle)', 'Dispatching print job...', 'Job queued successfully'], duration: 400 },
      { agent: 'Analyzer Agent', steps: ['Monitoring job progress...', 'Estimated completion: 4.2 hours', 'Feedback loop initialized', 'Ready for next iteration'], duration: 500 },
    ]

    // Initial response
    setChatMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        role: 'assistant',
        content: `🚀 **INITIATING EXPERIMENT:** ${experimentName}\n\nStarting multi-agent orchestration workflow...`,
        timestamp: new Date(),
      },
    ])

    setTerminalLines((prev) => [...prev, '', `$ experiment run "${experimentName}"`, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'])

    await new Promise((r) => setTimeout(r, 500))

    // Run through each phase
    for (const phase of phases) {
      setTerminalLines((prev) => [...prev, '', `▶ ${phase.agent} :: STARTED`])

      for (const step of phase.steps) {
        await new Promise((r) => setTimeout(r, phase.duration / phase.steps.length))
        setTerminalLines((prev) => [...prev, `  → ${step}`])
      }

      setTerminalLines((prev) => [...prev, `  ✓ ${phase.agent} complete`])
      await new Promise((r) => setTimeout(r, 200))
    }

    // Final summary
    const expId = `EXP-2024-${Math.floor(1000 + Math.random() * 9000)}`

    setTerminalLines((prev) => [
      ...prev,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '✅ WORKFLOW COMPLETE',
      `   Experiment ID: ${expId}`,
      '   Print Jobs: 12',
      '   ETA: 4.2 hours',
      '   Confidence: 94.2%',
      '',
    ])

    setChatMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        role: 'assistant',
        content: `✅ **WORKFLOW COMPLETE**

**Experiment ID:** ${expId}
**Status:** Running on hardware fleet

**Summary:**
• Print Jobs Dispatched: 12
• Selected Printer: X25Pro-03
• Estimated Completion: 4.2 hours
• ML Confidence Score: 94.2%

Monitor progress in the terminal or switch to Hardware view to see fleet status.`,
        timestamp: new Date(),
      },
    ])

    setIsExecuting(false)
  }, [])

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isExecuting) return

    const userInput = chatInput.trim()
    const newMessage: ChatMessage = {
      id: chatMessages.length + 1,
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, newMessage])
    setChatInput('')

    if (isExperimentCommand(userInput)) {
      const experimentName = userInput.length > 50 ? userInput.substring(0, 50) + '...' : userInput
      await runExecutionLoop(experimentName)
      return
    }

    // Regular response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          role: 'assistant',
          content: `I can help with that. To run an experiment, try commands like:

• "Run Fe-Co alloy optimization"
• "Design a NASICON electrolyte experiment"
• "Execute high-strength steel test"

Or type **help** for more commands.`,
          timestamp: new Date(),
        },
      ])
    }, 800)
  }, [chatInput, chatMessages.length, isExecuting, runExecutionLoop])

  // Handle create experiment
  const handleCreateExperiment = useCallback(async () => {
    if (!newExperimentName.trim()) return

    const newExp: Experiment = {
      id: `EXP-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newExperimentName.trim(),
      status: 'running',
      progress: 0,
    }

    setExperiments((prev) => [newExp, ...prev])
    setSelectedExperiment(newExp)
    setShowNewExperimentModal(false)
    setNewExperimentName('')
    setLeftTab('chat')

    await runExecutionLoop(newExp.name)

    setExperiments((prev) =>
      prev.map((exp) => (exp.id === newExp.id ? { ...exp, status: 'running', progress: 67 } : exp))
    )
  }, [newExperimentName, runExecutionLoop])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'var(--accent-primary)'
      case 'completed':
        return 'var(--accent-secondary)'
      case 'failed':
        return 'var(--accent-danger)'
      case 'pending':
        return 'var(--accent-warning)'
      default:
        return 'var(--text-tertiary)'
    }
  }

  return (
    <div className={`${styles.container} ide-view`}>
      {/* Top Bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={onBack} className={styles.backButton}>
            <Globe size={16} />
            <span>NETWORK</span>
          </button>
          <div className={styles.divider} />
          <div className={styles.logo}>
            <div className={styles.logoIcon} />
            <span>ADAM Platform</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.projectSelector}>
            <span className={styles.projectLabel}>Project:</span>
            <button className={styles.projectName}>
              {selectedExperiment.name}
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Canvas View Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewTab} ${canvasView === 'agents' ? styles.active : ''}`}
            onClick={() => setCanvasView('agents')}
          >
            <Layers size={14} />
            <span>Agents</span>
          </button>
          <button
            className={`${styles.viewTab} ${canvasView === 'hardware' ? styles.active : ''}`}
            onClick={() => setCanvasView('hardware')}
          >
            <Factory size={14} />
            <span>Hardware</span>
          </button>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <Zap size={12} />
              4,200 tokens
            </span>
            <span className={styles.statDivider}>|</span>
            <span className={styles.statItem}>
              <Clock size={12} />
              1d 4h 2m
            </span>
          </div>
          <div className={styles.divider} />
          <div className={styles.alerts}>
            <span className={styles.alertError}>8 Errors</span>
            <span className={styles.alertWarning}>12 Warnings</span>
          </div>
          <div className={styles.divider} />
          <button className={styles.iconButton}>
            <Bell size={16} />
            <span className={styles.notificationDot} />
          </button>
          <button className={styles.iconButton}>
            <BarChart3 size={16} />
          </button>
          <button className={styles.iconButton}>
            <Settings size={16} />
          </button>

          {/* User Menu */}
          <div className={styles.userMenu}>
            <button
              className={styles.userButton}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className={styles.userAvatar}>
                <User size={14} />
              </div>
              {user && <span className={styles.userName}>{user.username}</span>}
              <ChevronDown size={12} className={showUserMenu ? styles.rotated : ''} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={styles.userDropdown}
                >
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      <User size={16} />
                    </div>
                    <div>
                      <div className={styles.userDisplayName}>{user?.username || 'User'}</div>
                      <div className={styles.userRole}>
                        <Shield size={10} />
                        {user?.role || 'user'}
                      </div>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem}>
                    <Settings size={14} />
                    Settings
                  </button>
                  <button className={styles.dropdownItemDanger} onClick={onBack}>
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Left Panel */}
        <AnimatePresence>
          {!leftPanelCollapsed && (
            <motion.aside
              initial={{ width: 0 }}
              animate={{ width: 320 }}
              exit={{ width: 0 }}
              className={styles.leftPanel}
            >
              {/* Left Panel Tabs */}
              <div className={styles.panelTabs}>
                {[
                  { id: 'chat' as LeftTab, label: 'Chat', icon: MessageSquare },
                  { id: 'experiments' as LeftTab, label: 'Experiments', icon: Beaker },
                  { id: 'config' as LeftTab, label: 'Config', icon: Settings },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLeftTab(tab.id)}
                    className={`${styles.panelTab} ${leftTab === tab.id ? styles.active : ''}`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Left Panel Content */}
              <div className={styles.panelContent}>
                {leftTab === 'chat' && (
                  <>
                    <div className={styles.chatMessages}>
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`${styles.chatMessage} ${styles[msg.role]}`}
                        >
                          <div className={styles.messageContent}>{msg.content}</div>
                          <div className={styles.messageTime}>
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className={styles.chatInput}>
                      <div className={styles.inputWrapper}>
                        <textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          placeholder="Ask ADAM anything..."
                          rows={2}
                        />
                        <div className={styles.inputActions}>
                          <button className={styles.attachButton}>
                            <Paperclip size={14} />
                          </button>
                          <button
                            className={styles.sendButton}
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim()}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {leftTab === 'experiments' && (
                  <div className={styles.experimentsList}>
                    <div className={styles.searchBar}>
                      <Search size={14} />
                      <input type="text" placeholder="Search experiments..." />
                    </div>
                    <div className={styles.experiments}>
                      {experiments.map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => setSelectedExperiment(exp)}
                          className={`${styles.experimentItem} ${
                            selectedExperiment.id === exp.id ? styles.selected : ''
                          }`}
                        >
                          <div className={styles.experimentHeader}>
                            <span
                              className={styles.statusDot}
                              style={{ background: getStatusColor(exp.status) }}
                            />
                            <span className={styles.experimentId}>{exp.id}</span>
                          </div>
                          <div className={styles.experimentName}>{exp.name}</div>
                          {exp.status === 'running' && (
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${exp.progress}%` }}
                              />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      className={styles.newExperimentBtn}
                      onClick={() => setShowNewExperimentModal(true)}
                    >
                      <Plus size={16} />
                      New Experiment
                    </button>
                  </div>
                )}

                {leftTab === 'config' && (
                  <div className={styles.configPanel}>
                    <div className={styles.configItem}>
                      <label>Default Model</label>
                      <select>
                        <option>gpt-4o-mini</option>
                        <option>gpt-4o</option>
                        <option>gemini-pro</option>
                      </select>
                    </div>
                    <div className={styles.configItem}>
                      <label>Auto-approve R1</label>
                      <div className={styles.checkbox}>
                        <input type="checkbox" defaultChecked />
                        <span>Automatically approve low-risk experiments</span>
                      </div>
                    </div>
                    <div className={styles.configItem}>
                      <label>Simulation Model</label>
                      <select>
                        <option>Live Sinter™ v2.0</option>
                        <option>FEA Standard</option>
                        <option>ML Surrogate</option>
                      </select>
                    </div>
                    {sites && sites.length > 0 && (
                      <div className={styles.configItem}>
                        <label>Connected Sites ({sites.length})</label>
                        <div className={styles.sitesList}>
                          {sites.slice(0, 5).map((site) => (
                            <div key={site.id} className={styles.siteItem}>
                              <span className={styles.siteName}>{site.name}</span>
                              <span className={styles.siteLocation}>
                                {site.city}, {site.state}
                              </span>
                            </div>
                          ))}
                          {sites.length > 5 && (
                            <div className={styles.moreSites}>
                              +{sites.length - 5} more sites
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Left Panel Toggle */}
        <button
          className={styles.panelToggle}
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        >
          {leftPanelCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Center: Canvas + Bottom Panel */}
        <div className={styles.center}>
          {/* Canvas Area */}
          <div className={styles.canvas}>
            {canvasView === 'agents' ? (
              <FlowchartCanvas experimentId={selectedExperiment.id} />
            ) : (
              <FactoryFloorCanvas />
            )}
          </div>

          {/* Bottom Panel Toggle */}
          <button
            className={styles.bottomToggle}
            onClick={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
          >
            <ChevronDown size={16} className={bottomPanelCollapsed ? styles.rotated : ''} />
          </button>

          {/* Bottom Panel */}
          <AnimatePresence>
            {!bottomPanelCollapsed && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 200 }}
                exit={{ height: 0 }}
                className={styles.bottomPanel}
              >
                <div className={styles.bottomTabs}>
                  <div className={styles.bottomTabsList}>
                    {[
                      { id: 'terminal' as BottomTab, label: 'Terminal', icon: Terminal },
                      { id: 'debug' as BottomTab, label: 'Debug Console', icon: Bug },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setBottomTab(tab.id)}
                        className={`${styles.bottomTab} ${bottomTab === tab.id ? styles.active : ''}`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <button className={styles.closeBottom}>
                    <X size={14} />
                  </button>
                </div>
                <div className={styles.bottomContent}>
                  {bottomTab === 'terminal' && (
                    <div className={styles.terminal}>
                      {terminalLines.map((line, i) => (
                        <div
                          key={i}
                          className={`${styles.terminalLine} ${
                            line.startsWith('$')
                              ? styles.command
                              : line.startsWith('✓') || line.startsWith('✅')
                              ? styles.success
                              : line.startsWith('→') || line.startsWith('▶')
                              ? styles.info
                              : line.startsWith('!')
                              ? styles.error
                              : ''
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                      <div className={styles.terminalPrompt}>
                        <span>~/Automation/draft $&gt;</span>
                        <span className={styles.cursor}>|</span>
                      </div>
                    </div>
                  )}
                  {bottomTab === 'debug' && (
                    <div className={styles.debugConsole}>
                      <div className={styles.debugLine} data-type="warn">
                        [WARN] Simulation batch 5 took longer than expected (12.3s)
                      </div>
                      <div className={styles.debugLine} data-type="info">
                        [INFO] Controller Agent queued 8 print jobs
                      </div>
                      <div className={styles.debugLine} data-type="success">
                        [OK] All agents responding within threshold
                      </div>
                      <div className={styles.debugLine} data-type="error">
                        [ERR] Failed to connect to printer X25Pro-05 (timeout)
                      </div>
                      <div className={styles.debugLine} data-type="debug">
                        [DEBUG] Memory usage: 2.4GB / 8GB
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status Bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>
            <span className={styles.statusDotOnline} />
            Connected
          </span>
          <span>5 agents active</span>
          <span>13 printers online</span>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusError}>Error: 8</span>
          <span className={styles.statusWarning}>Warning: 12</span>
        </div>
      </footer>

      {/* New Experiment Modal */}
      <AnimatePresence>
        {showNewExperimentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modal}
            onClick={() => setShowNewExperimentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>New Experiment</h2>
                <button onClick={() => setShowNewExperimentModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Experiment Name / Hypothesis</label>
                  <textarea
                    value={newExperimentName}
                    onChange={(e) => setNewExperimentName(e.target.value)}
                    placeholder="e.g., Fe-Co alloy with optimized grain structure achieves 90% of NdFeB performance"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleCreateExperiment()
                      }
                    }}
                  />
                </div>
                <div className={styles.workflowInfo}>
                  <div className={styles.workflowLabel}>What happens next:</div>
                  <ul>
                    <li>
                      <span style={{ background: 'var(--accent-primary)' }} />
                      Planning Agent analyzes & creates DOE matrix
                    </li>
                    <li>
                      <span style={{ background: 'var(--accent-purple)' }} />
                      Design Agent generates print profiles
                    </li>
                    <li>
                      <span style={{ background: 'var(--accent-secondary)' }} />
                      Simulation Agent runs Live Sinter™
                    </li>
                    <li>
                      <span style={{ background: 'var(--accent-warning)' }} />
                      Controller Agent dispatches to printers
                    </li>
                  </ul>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowNewExperimentModal(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.createBtn}
                  onClick={handleCreateExperiment}
                  disabled={!newExperimentName.trim()}
                >
                  <Play size={14} />
                  Start Experiment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default IDEPlatform
