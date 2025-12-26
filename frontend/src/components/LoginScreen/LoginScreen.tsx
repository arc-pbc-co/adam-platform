/**
 * LoginScreen - God Mode styled authentication screen
 *
 * Features:
 * - Matches God Mode design system
 * - Augmented-UI styling
 * - Demo credentials support
 */

import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Lock, User, ArrowLeft, AlertCircle, Zap } from 'lucide-react'
import type { User as UserType } from '../../types/app'
import styles from './LoginScreen.module.css'

interface LoginScreenProps {
  onLogin: (user: UserType) => void
  onBack: () => void
}

// Simple hardcoded admin credentials
const ADMIN_USER = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
}

export function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
      onLogin({ username: ADMIN_USER.username, role: ADMIN_USER.role })
    } else {
      setError('Invalid username or password')
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Background effects */}
      <div className={styles.backgroundEffects}>
        <div className={styles.glowOrb1} />
        <div className={styles.glowOrb2} />
        <div className={styles.gridOverlay} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.formWrapper}
      >
        {/* Back button */}
        <button onClick={onBack} className={styles.backButton}>
          <ArrowLeft size={16} />
          <span>BACK TO HOME</span>
        </button>

        {/* Login card */}
        <div
          className={styles.card}
          data-augmented-ui="tl-clip br-clip border"
        >
          {/* Header */}
          <div className={styles.cardHeader}>
            <img src="/arc-logo.png" alt="Arc" className={styles.logoImage} />
            <h1 className={styles.title}>ADAM PLATFORM</h1>
            <p className={styles.subtitle}>
              NEURAL LINK AUTHENTICATION REQUIRED
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.errorMessage}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>USERNAME</label>
              <div className={styles.inputWrapper}>
                <User size={16} className={styles.inputIcon} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>PASSWORD</label>
              <div className={styles.inputWrapper}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
              data-augmented-ui="tl-clip br-clip border"
            >
              {isLoading ? (
                <>
                  <div className={styles.spinner} />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>CONNECT</span>
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <div className={styles.cardFooter}>
            <div className={styles.demoHint}>
              <span className={styles.demoLabel}>DEMO CREDENTIALS</span>
              <code className={styles.demoCode}>admin / admin123</code>
            </div>
          </div>
        </div>

        {/* Version info */}
        <div className={styles.versionInfo}>
          <span>ADAM PLATFORM v2.0</span>
          <span className={styles.divider}>|</span>
          <span>ARC IMPACT</span>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginScreen
