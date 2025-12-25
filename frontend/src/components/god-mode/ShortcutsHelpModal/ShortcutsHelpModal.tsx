/**
 * ShortcutsHelpModal - Keyboard shortcuts reference
 *
 * Shows all available keyboard shortcuts in a modal overlay.
 * Triggered by pressing '?' key.
 */

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import styles from './ShortcutsHelpModal.module.css'

interface ShortcutCategory {
  name: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Tab'], description: 'Switch between GlobalMap and TacticalMap views' },
      { keys: ['?'], description: 'Toggle this shortcuts help modal' },
      { keys: ['Esc'], description: 'Close modal / Deselect all' },
      { keys: ['F'], description: 'Toggle fullscreen mode' },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Click'], description: 'Select single unit/site' },
      { keys: ['Shift', 'Click'], description: 'Add/remove from selection' },
      { keys: ['Ctrl', 'Click'], description: 'Toggle selection' },
      { keys: ['Ctrl', 'A'], description: 'Select all visible units' },
      { keys: ['Drag'], description: 'Box select multiple units' },
    ],
  },
  {
    name: 'Control Groups',
    shortcuts: [
      { keys: ['Ctrl', '0-9'], description: 'Assign selection to control group' },
      { keys: ['0-9'], description: 'Select control group' },
      { keys: ['Shift', '0-9'], description: 'Add selection to control group' },
      { keys: ['0-9', '0-9'], description: 'Double-tap to center view on group' },
    ],
  },
  {
    name: 'Commands',
    shortcuts: [
      { keys: ['S'], description: 'Stop selected units' },
      { keys: ['H'], description: 'Hold position' },
      { keys: ['P'], description: 'Pause selected units' },
      { keys: ['R'], description: 'Resume selected units' },
      { keys: ['C'], description: 'Calibrate selected printers' },
      { keys: ['E'], description: 'Emergency stop all' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { keys: ['M'], description: 'Toggle minimap' },
      { keys: ['L'], description: 'Toggle event log' },
      { keys: ['G'], description: 'Toggle grid overlay' },
      { keys: ['Space'], description: 'Center on selection' },
      { keys: ['+', '-'], description: 'Zoom in/out' },
    ],
  },
]

interface ShortcutsHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            data-augmented-ui="tl-clip tr-clip br-clip bl-clip border"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <Keyboard size={18} />
                <h2>KEYBOARD SHORTCUTS</h2>
              </div>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
              {SHORTCUT_CATEGORIES.map((category) => (
                <div key={category.name} className={styles.category}>
                  <h3 className={styles.categoryName}>{category.name}</h3>
                  <div className={styles.shortcutList}>
                    {category.shortcuts.map((shortcut, idx) => (
                      <div key={idx} className={styles.shortcutItem}>
                        <div className={styles.keys}>
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              <kbd className={styles.key}>{key}</kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className={styles.keyPlus}>+</span>
                              )}
                            </span>
                          ))}
                        </div>
                        <span className={styles.description}>
                          {shortcut.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <span className={styles.hint}>
                Press <kbd className={styles.key}>?</kbd> or{' '}
                <kbd className={styles.key}>Esc</kbd> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ShortcutsHelpModal
