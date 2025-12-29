/**
 * MarketingPage - Landing page for the ADAM Platform
 *
 * This is a simplified version that maintains the God Mode aesthetic
 * while serving as the entry point to the platform.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  ArrowRight,
  Zap,
  Layers,
  Cpu,
  Activity,
  Bot,
  Factory,
  Beaker,
  GitBranch,
  Shield,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react'
import { ProductShowcase } from '../ProductShowcase'
import styles from './MarketingPage.module.css'

interface MarketingPageProps {
  onOpenPlatform: () => void
}

export function MarketingPage({ onOpenPlatform }: MarketingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showTechSpecs, setShowTechSpecs] = useState(false)

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div
            className={styles.logo}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src="/arc-logo.png" alt="Arc" className={styles.logoImage} />
            <span className={styles.logoText}>ARC IMPACT</span>
          </div>

          <div className={styles.navLinks}>
            <button onClick={() => scrollToSection('mission')}>MISSION</button>
            <button onClick={() => scrollToSection('adam')}>ADAM CORE</button>
            <button onClick={() => scrollToSection('hardware')}>HARDWARE</button>
          </div>

          <div className={styles.navActions}>
            <button className={styles.platformBtn} onClick={onOpenPlatform}>
              <Activity size={18} />
              <span>PLATFORM</span>
            </button>
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={styles.mobileMenu}
            >
              <button onClick={() => scrollToSection('mission')}>MISSION</button>
              <button onClick={() => scrollToSection('adam')}>ADAM CORE</button>
              <button onClick={() => scrollToSection('hardware')}>HARDWARE</button>
              <button onClick={() => { setIsMobileMenuOpen(false); onOpenPlatform(); }}>
                <Activity size={16} />
                PLATFORM
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroBackground}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className={styles.heroVideo}
          >
            <source
              src="https://www.desktopmetal.com/uploads/DesktopMetalWebTeaser_25sec.mp4"
              type="video/mp4"
            />
          </video>
          <div className={styles.heroOverlay} />
          <div className={styles.heroGradient} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroStatus}>
            <span className={styles.statusDot} />
            <span>SYSTEM ONLINE</span>
          </div>
          <h1 className={styles.heroTitle}>
            AUTONOMOUS <br />
            <span>DISCOVERY</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Introducing <strong>ADAM</strong>: The world's first end-to-end AI
            materials discovery through to advanced manufacturing platform.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => scrollToSection('adam')}
            >
              DEMO PLATFORM
              <ArrowRight size={18} />
            </button>
            <button
              className={styles.secondaryBtn}
              onClick={() => setShowTechSpecs(true)}
            >
              READ TECH SPECS
            </button>
          </div>
        </div>
      </header>

      {/* Ticker Tape */}
      <div className={styles.ticker}>
        <div className={styles.tickerContent}>
          <span>// DESKTOP METAL ACQUISITION COMPLETE</span>
          <span>// ADAM CORE V2.0 ACTIVE</span>
          <span>// BINDER JETTING FLEET INTEGRATED</span>
          <span>// RARE-EARTH-FREE MAGNET PROTOCOLS LOADED</span>
          <span>// CONTINUOUS FEEDBACK LOOP ESTABLISHED</span>
          <span>// DESKTOP METAL ACQUISITION COMPLETE</span>
          <span>// ADAM CORE V2.0 ACTIVE</span>
          <span>// BINDER JETTING FLEET INTEGRATED</span>
        </div>
      </div>

      {/* Mission Section */}
      <section id="mission" className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.missionGrid}>
            <div className={styles.missionIntro}>
              <h2>THE ACCELERATION GAP</h2>
              <p>
                Traditional materials R&D is linear, manual, and slow. 5-10
                experiments per week is no longer enough.
              </p>
            </div>
            <div className={styles.missionCards}>
              <div className={styles.missionCard}>
                <Layers className={styles.cardIcon} />
                <h3>Closed Loop</h3>
                <p>
                  Design → Print → Sinter → Measure → Learn. Autonomous cycles
                  running 24/7.
                </p>
              </div>
              <div className={styles.missionCard} data-variant="warning">
                <Zap className={styles.cardIcon} />
                <h3>Massive Throughput</h3>
                <p>
                  Scale from 10 to 200 experiments per week. Parallel processing
                  across the fleet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ADAM Core Section */}
      <section id="adam" className={styles.adamSection}>
        <div className={styles.sectionContent}>
          <div className={styles.adamGrid}>
            <div className={styles.adamInfo}>
              <div className={styles.adamLabel}>
                <Cpu size={16} />
                <span>ARTIFICIAL INTELLIGENCE ORCHESTRATOR</span>
              </div>
              <h2>MEET ADAM.</h2>
              <p>
                Autonomous Discovery and Advanced Manufacturing. ADAM isn't just
                a chatbot; it's a Planner-Executor-Critic agent that controls
                physical hardware.
              </p>
              <ul className={styles.featureList}>
                <li>
                  <span className={styles.bullet} />
                  Design of Experiments (DOE) Generation
                </li>
                <li>
                  <span className={styles.bullet} />
                  Live Sinter™ Simulation Integration
                </li>
                <li>
                  <span className={styles.bullet} />
                  Microstructure Computer Vision Analysis
                </li>
                <li>
                  <span className={styles.bullet} />
                  Robotic Handling Coordination
                </li>
              </ul>
            </div>
            <div className={styles.adamTerminal}>
              <div className={styles.terminalHeader}>
                <div className={styles.terminalDots}>
                  <span />
                  <span />
                  <span />
                </div>
                <span className={styles.terminalTitle}>ADAM ORCHESTRATOR</span>
              </div>
              <div className={styles.terminalBody}>
                <div className={styles.terminalLine}>
                  <span className={styles.prompt}>$</span>
                  <span>adam status</span>
                </div>
                <div className={styles.terminalOutput}>
                  <p>🤖 ADAM NOVA ORCHESTRATOR v2.0</p>
                  <p className={styles.success}>✓ All agents operational</p>
                  <p className={styles.success}>✓ Connected to hardware fleet</p>
                  <p className={styles.success}>✓ Database sync complete</p>
                </div>
                <div className={styles.terminalLine}>
                  <span className={styles.prompt}>$</span>
                  <span className={styles.cursor}>|</span>
                </div>
              </div>
              <p className={styles.terminalHint}>
                * Live simulation of ADAM's reasoning engine
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Section - Product Showcase Carousel */}
      <section id="hardware" className={styles.section}>
        <div className={styles.sectionContent}>
          <ProductShowcase />
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>-58%</span>
            <span className={styles.statLabel}>Unit Cost</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>100%</span>
            <span className={styles.statLabel}>Data Lineage</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>ISO</span>
            <span className={styles.statLabel}>13485:2016</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>24/7</span>
            <span className={styles.statLabel}>Autonomous Ops</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <img src="/arc-logo.png" alt="Arc" className={styles.footerLogoImage} />
              <h2>ARC IMPACT</h2>
            </div>
            <p>
              Redefining the material foundation of the 21st century economy.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <a href="#">LEGAL</a>
            <a href="#">PRIVACY</a>
            <a href="#">CONTACT</a>
            <span>© 2025 ARC PUBLIC BENEFIT CORP</span>
          </div>
        </div>
      </footer>

      {/* Tech Specs Modal */}
      <AnimatePresence>
        {showTechSpecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modal}
            onClick={() => setShowTechSpecs(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2>ADAM Platform</h2>
                  <p>Technical Specifications</p>
                </div>
                <button onClick={() => setShowTechSpecs(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Overview */}
                <div className={styles.specOverview}>
                  <p>
                    <strong>ADAM</strong> (Autonomous Discovery and Advanced
                    Manufacturing) is an AI-orchestrated platform that automates
                    the entire materials discovery and production
                    lifecycle—from hypothesis generation to printed parts—using
                    a multi-agent system integrated with Desktop Metal's binder
                    jetting fleet.
                  </p>
                </div>

                {/* Core Capabilities */}
                <div className={styles.specSection}>
                  <h3>
                    <Target size={16} />
                    Core Capabilities
                  </h3>
                  <div className={styles.specGrid}>
                    {[
                      {
                        icon: Beaker,
                        title: 'Hypothesis Generation',
                        desc: 'AI-driven material composition design',
                      },
                      {
                        icon: GitBranch,
                        title: 'Experiment Planning',
                        desc: 'Automated DOE with optimized parameters',
                      },
                      {
                        icon: Factory,
                        title: 'Autonomous Execution',
                        desc: 'Direct dispatch to 13+ printer fleet',
                      },
                      {
                        icon: BarChart3,
                        title: 'Continuous Learning',
                        desc: 'Closed-loop feedback optimization',
                      },
                    ].map((item, i) => (
                      <div key={i} className={styles.specCard}>
                        <item.icon size={16} />
                        <span>{item.title}</span>
                        <p>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Orchestration */}
                <div className={styles.specSection}>
                  <h3>
                    <Bot size={16} />
                    Multi-Agent Orchestration
                  </h3>
                  <div className={styles.agentList}>
                    {[
                      {
                        agent: 'Planning Agent',
                        role: 'Generates experiment parameters, risk assessment',
                      },
                      {
                        agent: 'Design Agent',
                        role: 'Parametrizes material compositions and print profiles',
                      },
                      {
                        agent: 'Simulation Agent',
                        role: 'Runs Live Sinter™ physics simulations',
                      },
                      {
                        agent: 'Controller Agent',
                        role: 'Dispatches print jobs to hardware fleet',
                      },
                      {
                        agent: 'Analyzer Agent',
                        role: 'Processes results, extracts insights',
                      },
                    ].map((item, i) => (
                      <div key={i} className={styles.agentItem}>
                        <span className={styles.agentNumber}>{i + 1}</span>
                        <div>
                          <strong>{item.agent}</strong>
                          <p>{item.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className={styles.specSection}>
                  <h3>
                    <Clock size={16} />
                    Performance Metrics
                  </h3>
                  <div className={styles.metricsGrid}>
                    {[
                      {
                        label: 'Experiments/Week',
                        value: '100-200',
                        note: 'vs 5-10 traditional',
                      },
                      {
                        label: 'Time to Deploy',
                        value: '<2 weeks',
                        note: 'from hypothesis',
                      },
                      {
                        label: 'Cost Reduction',
                        value: '58%',
                        note: 'vs traditional R&D',
                      },
                      {
                        label: 'Throughput',
                        value: '20x',
                        note: 'faster iteration',
                      },
                    ].map((item, i) => (
                      <div key={i} className={styles.metricItem}>
                        <span className={styles.metricValue}>{item.value}</span>
                        <span className={styles.metricLabel}>{item.label}</span>
                        <span className={styles.metricNote}>{item.note}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div className={styles.compliance}>
                  <Shield size={20} />
                  <div>
                    <strong>Enterprise Compliance</strong>
                    <p>
                      ISO 13485:2016 certified • 100% data lineage traceability
                      • Risk-aware experimentation
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.modalSecondaryBtn}
                  onClick={() => setShowTechSpecs(false)}
                >
                  Close
                </button>
                <button
                  className={styles.modalPrimaryBtn}
                  onClick={() => {
                    setShowTechSpecs(false)
                    onOpenPlatform()
                  }}
                >
                  Launch Platform
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MarketingPage
