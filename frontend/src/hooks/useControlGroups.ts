/**
 * useControlGroups - Hook for SC2-style control group management
 *
 * Features:
 * - Assign selected agents to numbered groups (Ctrl+1-9)
 * - Select agents in a group by pressing number key (1-9)
 * - Double-tap number to center view on group
 * - Groups persist across selection changes
 * - Visual feedback for group assignments
 */

import { useState, useCallback, useRef } from 'react'

// Control group definition
export interface ControlGroup {
  /** Group number (1-9) */
  number: number
  /** IDs of agents in this group */
  agentIds: string[]
  /** When group was last modified */
  updatedAt: Date
  /** Custom label (optional) */
  label?: string
}

export interface UseControlGroupsOptions {
  /** Maximum number of control groups (default: 9) */
  maxGroups?: number
  /** Time window for double-tap detection in ms (default: 300) */
  doubleTapWindow?: number
  /** Callback when group is selected */
  onGroupSelected?: (groupNumber: number, agentIds: string[]) => void
  /** Callback for double-tap (center view) */
  onGroupDoubleTap?: (groupNumber: number, agentIds: string[]) => void
  /** Callback when group is assigned */
  onGroupAssigned?: (groupNumber: number, agentIds: string[]) => void
}

export interface UseControlGroupsReturn {
  /** All control groups (indexed by group number) */
  groups: Map<number, ControlGroup>
  /** Assign agents to a group */
  assignGroup: (groupNumber: number, agentIds: string[]) => void
  /** Add agents to existing group (without replacing) */
  addToGroup: (groupNumber: number, agentIds: string[]) => void
  /** Remove agents from a group */
  removeFromGroup: (groupNumber: number, agentIds: string[]) => void
  /** Select agents in a group */
  selectGroup: (groupNumber: number) => string[]
  /** Clear a group */
  clearGroup: (groupNumber: number) => void
  /** Clear all groups */
  clearAllGroups: () => void
  /** Get group for a specific agent */
  getAgentGroups: (agentId: string) => number[]
  /** Check if group has any agents */
  hasGroup: (groupNumber: number) => boolean
  /** Get group by number */
  getGroup: (groupNumber: number) => ControlGroup | undefined
  /** Set custom label for group */
  setGroupLabel: (groupNumber: number, label: string) => void
}

/**
 * Hook for managing SC2-style control groups
 */
export function useControlGroups(
  options: UseControlGroupsOptions = {}
): UseControlGroupsReturn {
  const {
    maxGroups = 9,
    doubleTapWindow = 300,
    onGroupSelected,
    onGroupDoubleTap,
    onGroupAssigned,
  } = options

  const [groups, setGroups] = useState<Map<number, ControlGroup>>(new Map())

  // Track last tap time for double-tap detection
  const lastTapRef = useRef<{ groupNumber: number; time: number } | null>(null)

  // Assign agents to a group (replaces existing)
  const assignGroup = useCallback(
    (groupNumber: number, agentIds: string[]) => {
      if (groupNumber < 1 || groupNumber > maxGroups) return
      if (agentIds.length === 0) return

      setGroups((prev) => {
        const next = new Map(prev)
        next.set(groupNumber, {
          number: groupNumber,
          agentIds: [...agentIds],
          updatedAt: new Date(),
        })
        return next
      })

      onGroupAssigned?.(groupNumber, agentIds)
    },
    [maxGroups, onGroupAssigned]
  )

  // Add agents to existing group
  const addToGroup = useCallback(
    (groupNumber: number, agentIds: string[]) => {
      if (groupNumber < 1 || groupNumber > maxGroups) return
      if (agentIds.length === 0) return

      setGroups((prev) => {
        const next = new Map(prev)
        const existing = prev.get(groupNumber)
        const existingIds = existing?.agentIds ?? []

        // Merge without duplicates
        const mergedIds = [...new Set([...existingIds, ...agentIds])]

        next.set(groupNumber, {
          number: groupNumber,
          agentIds: mergedIds,
          updatedAt: new Date(),
          label: existing?.label,
        })
        return next
      })
    },
    [maxGroups]
  )

  // Remove agents from a group
  const removeFromGroup = useCallback(
    (groupNumber: number, agentIds: string[]) => {
      setGroups((prev) => {
        const existing = prev.get(groupNumber)
        if (!existing) return prev

        const next = new Map(prev)
        const remainingIds = existing.agentIds.filter(
          (id) => !agentIds.includes(id)
        )

        if (remainingIds.length === 0) {
          next.delete(groupNumber)
        } else {
          next.set(groupNumber, {
            ...existing,
            agentIds: remainingIds,
            updatedAt: new Date(),
          })
        }

        return next
      })
    },
    []
  )

  // Select agents in a group
  const selectGroup = useCallback(
    (groupNumber: number): string[] => {
      const group = groups.get(groupNumber)
      const agentIds = group?.agentIds ?? []

      // Check for double-tap
      const now = Date.now()
      const lastTap = lastTapRef.current

      if (
        lastTap &&
        lastTap.groupNumber === groupNumber &&
        now - lastTap.time < doubleTapWindow
      ) {
        // Double-tap detected
        onGroupDoubleTap?.(groupNumber, agentIds)
        lastTapRef.current = null
      } else {
        // Single tap
        lastTapRef.current = { groupNumber, time: now }
        onGroupSelected?.(groupNumber, agentIds)
      }

      return agentIds
    },
    [groups, doubleTapWindow, onGroupSelected, onGroupDoubleTap]
  )

  // Clear a group
  const clearGroup = useCallback((groupNumber: number) => {
    setGroups((prev) => {
      if (!prev.has(groupNumber)) return prev
      const next = new Map(prev)
      next.delete(groupNumber)
      return next
    })
  }, [])

  // Clear all groups
  const clearAllGroups = useCallback(() => {
    setGroups(new Map())
  }, [])

  // Get groups containing a specific agent
  const getAgentGroups = useCallback(
    (agentId: string): number[] => {
      const agentGroups: number[] = []
      groups.forEach((group) => {
        if (group.agentIds.includes(agentId)) {
          agentGroups.push(group.number)
        }
      })
      return agentGroups.sort((a, b) => a - b)
    },
    [groups]
  )

  // Check if group has any agents
  const hasGroup = useCallback(
    (groupNumber: number): boolean => {
      const group = groups.get(groupNumber)
      return !!group && group.agentIds.length > 0
    },
    [groups]
  )

  // Get group by number
  const getGroup = useCallback(
    (groupNumber: number): ControlGroup | undefined => {
      return groups.get(groupNumber)
    },
    [groups]
  )

  // Set custom label for group
  const setGroupLabel = useCallback(
    (groupNumber: number, label: string) => {
      setGroups((prev) => {
        const existing = prev.get(groupNumber)
        if (!existing) return prev

        const next = new Map(prev)
        next.set(groupNumber, {
          ...existing,
          label,
        })
        return next
      })
    },
    []
  )

  return {
    groups,
    assignGroup,
    addToGroup,
    removeFromGroup,
    selectGroup,
    clearGroup,
    clearAllGroups,
    getAgentGroups,
    hasGroup,
    getGroup,
    setGroupLabel,
  }
}

export default useControlGroups
