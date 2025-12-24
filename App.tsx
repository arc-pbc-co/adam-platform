import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Menu, X, ArrowRight, Zap,
  Layers, Cpu, Lock, Activity,
  Bot, Factory, Beaker, GitBranch, Shield, BarChart3, Clock, Target
} from 'lucide-react';
import AdamTerminal from './components/AdamTerminal';
import PerformanceChart from './components/PerformanceChart';
import ProductShowcase from './components/ProductShowcase';
import { IDEPlatform } from './components/IDEPlatform';
import { LoginScreen } from './components/LoginScreen';

// --- Types ---
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

interface User {
  username: string;
  role: string;
}

// --- Components ---

const ApiKeyGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // Use type assertion to avoid conflict with existing global types
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
         try {
           const has = await aiStudio.hasSelectedApiKey();
           setHasKey(has);
         } catch (e) {
           console.error("Error checking API key:", e);
           setHasKey(false);
         }
      } else {
         // Fallback for dev environments without the wrapper
         setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleConnect = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
        try {
            await aiStudio.openSelectKey();
            // Assume success as per instructions to mitigate race condition
            setHasKey(true);
            setShowPrompt(false);
        } catch (e) {
            console.error("Error selecting API key:", e);
        }
    }
  };

  if (hasKey === null) {
      return (
        <div className="w-full h-[600px] bg-arc-black border border-arc-border flex items-center justify-center text-arc-muted font-mono text-sm animate-pulse">
            INITIALIZING SECURE CONNECTION...
        </div>
      );
  }

  return (
    <div className="relative w-full h-full group">
        {/* Render the actual component (Terminal) regardless of key status, so it's visible */}
        <div className={!hasKey ? "blur-[2px] opacity-80 transition-all duration-500 group-hover:blur-0 group-hover:opacity-100" : ""}>
            {children}
        </div>

        {/* Lock Overlay logic */}
        {!hasKey && (
            <div className="absolute inset-0 z-20 overflow-hidden rounded-none">
                <AnimatePresence>
                    {!showPrompt ? (
                        // Invisible interaction layer that triggers the prompt
                        <div 
                            className="w-full h-full cursor-not-allowed bg-transparent"
                            onClick={() => setShowPrompt(true)}
                            title="Click to authenticate"
                        >
                            <div className="absolute top-4 right-4 bg-arc-black/80 text-arc-warning border border-arc-warning/30 px-3 py-1 text-xs font-mono flex items-center gap-2 backdrop-blur-md shadow-lg pointer-events-none">
                                <Lock size={12} />
                                <span>READ ONLY</span>
                            </div>
                        </div>
                    ) : (
                        // The Lock Screen "Pop-up" (Overlay)
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full bg-arc-black/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 absolute inset-0 border border-arc-border shadow-2xl z-30"
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowPrompt(false); }}
                                className="absolute top-4 right-4 text-arc-muted hover:text-white transition-colors p-2"
                            >
                                <X size={24} />
                            </button>
                            
                            <div className="relative z-10 max-w-md">
                                <div className="flex justify-center mb-6">
                                    <div className="w-16 h-16 bg-arc-black border border-arc-accent rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                        <Lock className="text-arc-accent w-8 h-8" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 font-mono tracking-tighter">ADAM CORE LOCKED</h3>
                                <p className="text-arc-muted mb-8 text-sm leading-relaxed">
                                Neural link inactive. Connect API Key to access the orchestrator.
                                </p>
                                <button 
                                    onClick={handleConnect} 
                                    className="w-full bg-arc-accent text-white px-6 py-3 font-bold tracking-widest hover:bg-blue-600 transition-all uppercase text-xs flex items-center justify-center gap-2 group shadow-lg"
                                >
                                    <Zap className="w-4 h-4 group-hover:fill-current" />
                                    Connect Intelligence Unit
                                </button>
                                <div className="mt-4 pt-4 border-t border-arc-border">
                                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[10px] text-arc-muted hover:text-white transition-colors underline decoration-arc-muted/50 underline-offset-4">
                                        Billing Documentation
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )}
    </div>
  );
};

const NavBar = ({ onOpenPlatform }: { onOpenPlatform?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper for smooth scroll that works with fixed headers better than CSS sometimes
  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-arc-black/80 backdrop-blur-md border-b border-arc-border">
      <div className="max-w-7xl mx-auto px-8 h-24 flex justify-between items-center">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 bg-arc-accent rounded-none transform rotate-45"></div>
          <span className="font-bold text-2xl tracking-tighter text-white">ARC IMPACT</span>
        </div>

        <div className="hidden md:flex gap-12 font-mono text-base tracking-widest text-arc-muted">
          <button onClick={() => scrollToSection('mission')} className="hover:text-arc-accent transition-colors uppercase">Mission</button>
          <button onClick={() => scrollToSection('adam')} className="hover:text-arc-accent transition-colors uppercase">ADAM Core</button>
          <button onClick={() => scrollToSection('hardware')} className="hover:text-arc-accent transition-colors uppercase">Hardware</button>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={onOpenPlatform}
            className="hidden md:flex items-center gap-2 bg-arc-accent hover:bg-blue-600 text-white px-6 py-3 font-mono text-base tracking-wider transition-colors"
          >
            <Activity size={18} />
            PLATFORM
          </button>
          <button
            className="md:hidden text-arc-text"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="md:hidden bg-arc-black border-b border-arc-border overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-6 font-mono text-sm">
               <button onClick={() => scrollToSection('mission')} className="text-left text-arc-text">MISSION</button>
               <button onClick={() => scrollToSection('adam')} className="text-left text-arc-text">ADAM CORE</button>
               <button onClick={() => scrollToSection('hardware')} className="text-left text-arc-text">HARDWARE</button>
               <button onClick={() => { setIsOpen(false); onOpenPlatform?.(); }} className="text-left text-arc-accent font-bold flex items-center gap-2">
                 <Activity size={16} />
                 PLATFORM
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// Added scroll-mt-28 to handle fixed header offset
const Section: React.FC<SectionProps> = ({ children, className = "", id = "" }) => (
  <section id={id} className={`scroll-mt-28 py-24 px-6 md:px-12 max-w-7xl mx-auto ${className}`}>
    {children}
  </section>
);

// --- Main App ---

type AppView = 'home' | 'login' | 'platform';

const App = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [user, setUser] = useState<User | null>(null);
  const [showTechSpecs, setShowTechSpecs] = useState(false);

  const handleOpenPlatform = () => {
    if (user) {
      // Already logged in, go directly to platform
      setCurrentView('platform');
    } else {
      // Not logged in, show login screen
      setCurrentView('login');
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('platform');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('home');
  };

  // Show login screen
  if (currentView === 'login') {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onBack={() => setCurrentView('home')}
      />
    );
  }

  // Show platform (user must be logged in)
  if (currentView === 'platform' && user) {
    return <IDEPlatform onBack={handleLogout} user={user} />;
  }

  return (
    <div className="min-h-screen bg-arc-black text-arc-text selection:bg-arc-accent selection:text-white">
      <NavBar onOpenPlatform={handleOpenPlatform} />
      
      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Fullscreen Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="https://www.desktopmetal.com/uploads/DesktopMetalWebTeaser_25sec.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl w-full px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 bg-arc-success animate-pulse rounded-full"></span>
              <span className="font-mono text-arc-accent text-sm tracking-widest">SYSTEM ONLINE</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
              AUTONOMOUS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-arc-muted">DISCOVERY</span>
            </h1>
            <p className="text-xl text-arc-muted max-w-xl leading-relaxed mb-10">
              Introducing <strong className="text-white">ADAM</strong>: The world's first end-to-end AI materials discovery through to advanced manufacturing platform.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const element = document.getElementById('adam');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-white text-black px-8 py-4 font-bold tracking-wider hover:bg-arc-accent hover:text-white transition-colors flex items-center gap-2"
                aria-label="Demo ADAM Platform"
              >
                DEMO PLATFORM <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setShowTechSpecs(true)}
                className="border border-white/30 text-white px-8 py-4 font-mono text-sm hover:border-arc-accent hover:bg-white/10 transition-colors backdrop-blur-sm"
                aria-label="Read technical specifications"
              >
                READ TECH SPECS
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Technical Specs Modal */}
      <AnimatePresence>
        {showTechSpecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTechSpecs(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] border border-arc-border max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#0a0a0a] border-b border-arc-border p-6 flex items-start justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white">ADAM Platform</h2>
                  <p className="text-sm font-mono text-arc-accent uppercase tracking-wider mt-1">
                    Technical Specifications
                  </p>
                </div>
                <button
                  onClick={() => setShowTechSpecs(false)}
                  className="p-2 hover:bg-arc-panel rounded transition-colors"
                >
                  <X className="w-5 h-5 text-arc-muted" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-8">
                {/* Overview */}
                <div className="p-4 bg-arc-panel border-l-2 border-arc-accent">
                  <p className="text-arc-text leading-relaxed">
                    <strong className="text-white">ADAM</strong> (Autonomous Discovery and Advanced Manufacturing) is an AI-orchestrated platform that automates the entire materials discovery and production lifecycle—from hypothesis generation to printed parts—using a multi-agent system integrated with Desktop Metal's binder jetting fleet.
                  </p>
                </div>

                {/* Core Capabilities */}
                <div>
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Core Capabilities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: Beaker, title: 'Hypothesis Generation', desc: 'AI-driven material composition design for rare-earth-free magnets, electrolytes, and alloys' },
                      { icon: GitBranch, title: 'Experiment Planning', desc: 'Automated DOE with optimized parameters: binder saturation, sintering temps, layer thickness' },
                      { icon: Factory, title: 'Autonomous Execution', desc: 'Direct dispatch to 13+ printer fleet with robotic handling and real-time telemetry' },
                      { icon: BarChart3, title: 'Continuous Learning', desc: 'Closed-loop feedback: results feed into next hypothesis for iterative optimization' },
                    ].map((item, i) => (
                      <div key={i} className="bg-arc-panel border border-arc-border p-4">
                        <div className="flex items-center gap-2 text-white mb-2">
                          <item.icon className="w-4 h-4 text-arc-accent" />
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <p className="text-sm text-arc-muted">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Orchestration */}
                <div>
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Multi-Agent Orchestration
                  </h3>
                  <div className="space-y-2">
                    {[
                      { agent: 'Planning Agent', role: 'Generates experiment parameters, risk assessment (R1-R3), auto-approval logic' },
                      { agent: 'Design Agent', role: 'Parametrizes material compositions and print profiles (12+ variations/experiment)' },
                      { agent: 'Simulation Agent', role: 'Runs Live Sinter™ physics simulations with ML-accelerated confidence scoring' },
                      { agent: 'Controller Agent', role: 'Dispatches print jobs to hardware fleet, manages queues and scheduling' },
                      { agent: 'Analyzer Agent', role: 'Processes results, extracts insights, determines next experiment parameters' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-arc-panel border border-arc-border">
                        <span className="w-6 h-6 bg-arc-accent text-white text-xs font-bold rounded flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-white font-medium">{item.agent}</span>
                          <p className="text-sm text-arc-muted mt-0.5">{item.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hardware Integration */}
                <div>
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Factory className="w-4 h-4" />
                    Hardware Integration
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                      { label: 'Printers', value: '13+' },
                      { label: 'Max Build Volume', value: '160L' },
                      { label: 'Build Rate', value: '3,120 cc/hr' },
                      { label: 'Layer Resolution', value: '30-200 μm' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-arc-panel border border-arc-border p-3 text-center">
                        <div className="text-xl font-bold text-white">{stat.value}</div>
                        <div className="text-[10px] text-arc-muted uppercase tracking-wider">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-arc-muted">
                    <p>Desktop Metal fleet: X160Pro, X25Pro, Shop System, Studio System 2, InnoventX</p>
                    <p className="mt-1">Real-time telemetry: job progress, temperature monitoring, consumables tracking, binder saturation limits</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Experiments/Week', value: '100-200', subtext: 'vs 5-10 traditional' },
                      { label: 'Time to Deploy', value: '<2 weeks', subtext: 'from hypothesis' },
                      { label: 'Cost Reduction', value: '58%', subtext: 'vs traditional R&D' },
                      { label: 'Throughput', value: '20x', subtext: 'faster iteration' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-arc-panel border border-arc-border p-4">
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-arc-muted uppercase tracking-wider">{stat.label}</div>
                        <div className="text-[10px] text-arc-accent mt-1">{stat.subtext}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Stack */}
                <div>
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Technical Stack
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'React 19', 'TypeScript', 'Framer Motion', 'Tailwind CSS',
                      'Gemini 2.0 Flash', 'WebSocket API', 'Live Sinter™', 'Recharts'
                    ].map((tech, i) => (
                      <span key={i} className="px-3 py-1.5 bg-arc-panel border border-arc-border text-sm text-arc-text font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div className="flex items-center gap-3 p-4 bg-arc-panel border border-arc-border">
                  <Shield className="w-5 h-5 text-green-500" />
                  <div>
                    <span className="text-white font-medium">Enterprise Compliance</span>
                    <p className="text-sm text-arc-muted">ISO 13485:2016 certified • 100% data lineage traceability • Risk-aware experimentation with human-in-the-loop approvals</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-arc-border p-4 flex justify-end gap-4">
                <button
                  onClick={() => setShowTechSpecs(false)}
                  className="px-6 py-2 border border-arc-border text-white text-sm font-medium hover:bg-arc-panel transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowTechSpecs(false);
                    handleOpenPlatform();
                  }}
                  className="px-6 py-2 bg-arc-accent text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  Launch Platform <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticker Tape */}
      <div className="border-y border-arc-border bg-arc-panel overflow-hidden py-3" aria-label="System status ticker">
        <div className="animate-marquee whitespace-nowrap font-mono text-xs tracking-[0.2em] text-arc-muted flex gap-12">
          <span>// DESKTOP METAL ACQUISITION COMPLETE</span>
          <span>// ADAM CORE V2.0 ACTIVE</span>
          <span>// BINDER JETTING FLEET INTEGRATED</span>
          <span>// RARE-EARTH-FREE MAGNET PROTOCOLS LOADED</span>
          <span>// CONTINUOUS FEEDBACK LOOP ESTABLISHED</span>
          <span>// DESKTOP METAL ACQUISITION COMPLETE</span>
          <span>// ADAM CORE V2.0 ACTIVE</span>
          <span>// BINDER JETTING FLEET INTEGRATED</span>
          <span>// RARE-EARTH-FREE MAGNET PROTOCOLS LOADED</span>
          <span>// CONTINUOUS FEEDBACK LOOP ESTABLISHED</span>
        </div>
      </div>

      {/* The Mission / Problem */}
      <Section id="mission">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="col-span-1">
                <h2 className="text-4xl font-bold mb-4">THE ACCELERATION GAP</h2>
                <p className="text-arc-muted">Traditional materials R&D is linear, manual, and slow. 5-10 experiments per week is no longer enough.</p>
            </div>
            <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-arc-panel p-6 border-l-2 border-arc-accent">
                    <Layers className="mb-4 text-arc-accent" />
                    <h3 className="font-bold mb-2">Closed Loop</h3>
                    <p className="text-sm text-arc-muted">Design → Print → Sinter → Measure → Learn. Autonomous cycles running 24/7.</p>
                </div>
                <div className="bg-arc-panel p-6 border-l-2 border-arc-warning">
                    <Zap className="mb-4 text-arc-warning" />
                    <h3 className="font-bold mb-2">Massive Throughput</h3>
                    <p className="text-sm text-arc-muted">Scale from 10 to 200 experiments per week. Parallel processing across the fleet.</p>
                </div>
            </div>
        </div>
      </Section>

      {/* ADAM Core - The AI */}
      {/* Added scroll-mt-28 here to handle fixed header offset */}
      <section id="adam" className="scroll-mt-28 bg-arc-panel py-24 border-y border-arc-border">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
                <div className="flex items-center gap-2 mb-4 text-arc-accent font-mono text-sm">
                    <Cpu />
                    <span>ARTIFICIAL INTELLIGENCE ORCHESTRATOR</span>
                </div>
                <h2 className="text-5xl font-black mb-8">MEET ADAM.</h2>
                <p className="text-lg text-arc-muted mb-6">
                    Autonomous Discovery and Advanced Manufacturing. ADAM isn't just a chatbot; it's a Planner-Executor-Critic agent that controls physical hardware.
                </p>
                <ul className="space-y-4 font-mono text-sm text-arc-text mb-8">
                    <li className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-arc-accent"></span>
                        Design of Experiments (DOE) Generation
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-arc-accent"></span>
                        Live Sinter™ Simulation Integration
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-arc-accent"></span>
                        Microstructure Computer Vision Analysis
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-arc-accent"></span>
                        Robotic Handling Coordination
                    </li>
                </ul>
                
                <div className="bg-black border border-arc-border p-6 relative">
                    <h3 className="font-mono text-xs text-arc-muted mb-4 uppercase">Throughput Velocity</h3>
                    <PerformanceChart />
                </div>
            </div>
            
            <div className="relative">
                {/* The Terminal Interface */}
                <div className="sticky top-24">
                    <AdamTerminal />
                    <p className="font-mono text-xs text-arc-muted text-center mt-4">
                        * Live simulation of ADAM's reasoning engine. Try: "Run Fe-Co alloy optimization experiment"
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* Hardware Fleet */}
      <Section id="hardware">
        <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4">THE EXECUTORS</h2>
            <p className="text-arc-muted max-w-2xl">
                Desktop Metal's binder jetting technology provides the speed and flexibility required for high-throughput discovery. 
                Integrated via Live Suite APIs directly into ADAM.
            </p>
        </div>
        
        <ProductShowcase />
      </Section>

      {/* Trust & Stats */}
      <section className="bg-white text-black py-24 px-6">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center font-mono">
                  <div>
                      <div className="text-5xl font-black mb-2">-58%</div>
                      <div className="text-sm font-bold tracking-widest uppercase">Unit Cost</div>
                  </div>
                  <div>
                      <div className="text-5xl font-black mb-2">100%</div>
                      <div className="text-sm font-bold tracking-widest uppercase">Data Lineage</div>
                  </div>
                  <div>
                      <div className="text-5xl font-black mb-2">ISO</div>
                      <div className="text-sm font-bold tracking-widest uppercase">13485:2016</div>
                  </div>
                  <div>
                      <div className="text-5xl font-black mb-2">24/7</div>
                      <div className="text-sm font-bold tracking-widest uppercase">Autonomous Ops</div>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-arc-black border-t border-arc-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tighter text-white mb-4">ARC IMPACT</h2>
                <p className="text-arc-muted text-sm max-w-xs">
                    Redefining the material foundation of the 21st century economy.
                </p>
            </div>
            <div className="flex gap-8 font-mono text-xs text-arc-muted">
                <a href="#" className="hover:text-white">LEGAL</a>
                <a href="#" className="hover:text-white">PRIVACY</a>
                <a href="#" className="hover:text-white">CONTACT</a>
                <span>© 2025 ARC PUBLIC BENEFIT CORP</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;