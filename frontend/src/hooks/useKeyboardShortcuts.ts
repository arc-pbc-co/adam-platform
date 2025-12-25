/**
 * useKeyboardShortcuts - Hook for keyboard shortcut handling
 *
 * Features:
 * - Listens for hotkey presses
 * - Ignores input when typing in text fields
 * - Executes corresponding commands on selected agents
 * - Supports Ctrl+1/2/3 for control group assignment
 * - Supports 1/2/3 for control group selection
 */

import { useEffect, useCallback, useRef } from 'react'
import { getCommandByHotkey, type CommandId } from '../config/commands'

// Shortcut definition
export interface ShortcutDefinition {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  enabled?: boolean
}

// Control group callbacks
export interface ControlGroupCallbacks {
  /** Called when user presses 1/2/3 to select a group */
  onSelectGroup: (groupNumber: number) => void
  /** Called when user presses Ctrl+1/2/3 to assign selected to group */
  onAssignGroup: (groupNumber: number) => void
}

// Navigation callbacks
export interface NavigationCallbacks {
  /** Called when Escape is pressed */
  onEscape?: () => void
  /** Called when Tab is pressed (cycle selection) */
  onTab?: (reverse: boolean) => void
  /** Called when Delete/Backspace is pressed */
  onDelete?: () => void
}

export interface UseKeyboardShortcutsOptions {
  /** Execute a command by ID */
  executeCommand: (commandId: CommandId) => boolean
  /** Control group callbacks */
  controlGroups?: ControlGroupCallbacks
  /** Navigation callbacks */
  navigation?: NavigationCallbacks
  /** Additional custom shortcuts */
  customShortcuts?: ShortcutDefinition[]
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean
  /** Element to attach listener to (default: window) */
  targetElement?: HTMLElement | null
}

export interface UseKeyboardShortcutsReturn {
  /** Currently pressed modifier keys */
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  }
}

// Elements that should suppress keyboard shortcuts
const SUPPRESS_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT']
const SUPPRESS_ROLES = ['textbox', 'searchbox', 'combobox']

/**
 * Check if keyboard events should be suppressed
 */
function shouldSuppressShortcuts(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false

  // Check tag name
  if (SUPPRESS_ELEMENTS.includes(target.tagName)) return true

  // Check contentEditable
  if (target.isContentEditable) return true

  // Check ARIA roles
  const role = target.getAttribute('role')
  if (role && SUPPRESS_ROLES.includes(role)) return true

  return false
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions
): UseKeyboardShortcutsReturn {
  const {
    executeCommand,
    controlGroups,
    navigation,
    customShortcuts = [],
    enabled = true,
    targetElement,
  } = options

  // Track modifier state
  const modifiersRef = useRef({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  })

  // Handle keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return
      if (shouldSuppressShortcuts(event.target)) return

      // Update modifier state
      modifiersRef.current = {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      }

      const key = event.key
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey

      // Handle control group shortcuts (Ctrl+1/2/3 to assign, 1/2/3 to select)
      if (/^[1-9]$/.test(key)) {
        const groupNumber = parseInt(key, 10)

        if ((event.ctrlKey || event.metaKey) && controlGroups?.onAssignGroup) {
          event.preventDefault()
          controlGroups.onAssignGroup(groupNumber)
          return
        }

        if (!hasModifier && controlGroups?.onSelectGroup) {
          event.preventDefault()
          controlGroups.onSelectGroup(groupNumber)
          return
        }
      }

      // Handle navigation shortcuts
      if (key === 'Escape' && !hasModifier) {
        if (navigation?.onEscape) {
          event.preventDefault()
          navigation.onEscape()
          return
        }
      }

      if (key === 'Tab') {
        if (navigation?.onTab) {
          event.preventDefault()
          navigation.onTab(event.shiftKey)
          return
        }
      }

      if ((key === 'Delete' || key === 'Backspace') && !hasModifier) {
        if (navigation?.onDelete) {
          event.preventDefault()
          navigation.onDelete()
          return
        }
      }

      // Handle custom shortcuts
      for (const shortcut of customShortcuts) {
        if (shortcut.enabled === false) continue
        if (shortcut.key.toLowerCase() !== key.toLowerCase()) continue
        if (!!shortcut.ctrlKey !== event.ctrlKey) continue
        if (!!shortcut.metaKey !== event.metaKey) continue
        if (!!shortcut.shiftKey !== event.shiftKey) continue
        if (!!shortcut.altKey !== event.altKey) continue

        event.preventDefault()
        shortcut.action()
        return
      }

      // Handle command shortcuts (only when no modifiers except shift)
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const command = getCommandByHotkey(key)
        if (command) {
          event.preventDefault()
          executeCommand(command.id)
          return
        }
      }
    },
    [enabled, executeCommand, controlGroups, navigation, customShortcuts]
  )

  // Handle keyup to update modifier state
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    modifiersRef.current = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    }
  }, [])

  // Attach event listeners
  useEffect(() => {
    const target = targetElement ?? window

    target.addEventListener('keydown', handleKeyDown as EventListener)
    target.addEventListener('keyup', handleKeyUp as EventListener)

    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener)
      target.removeEventListener('keyup', handleKeyUp as EventListener)
    }
  }, [targetElement, handleKeyDown, handleKeyUp])

  return {
    modifiers: modifiersRef.current,
  }
}

/**
 * Get human-readable description of a shortcut
 */
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = []

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  }
  if (shortcut.altKey) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
  }
  if (shortcut.shiftKey) {
    parts.push('⇧')
  }

  // Format the key
  let keyDisplay = shortcut.key.toUpperCase()
  if (keyDisplay === 'ESCAPE') keyDisplay = 'Esc'
  if (keyDisplay === 'ARROWUP') keyDisplay = '↑'
  if (keyDisplay === 'ARROWDOWN') keyDisplay = '↓'
  if (keyDisplay === 'ARROWLEFT') keyDisplay = '←'
  if (keyDisplay === 'ARROWRIGHT') keyDisplay = '→'

  parts.push(keyDisplay)

  return parts.join('+')
}

export default useKeyboardShortcuts
