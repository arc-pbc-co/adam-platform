/**
 * useSelection - Multi-select state management for tactical map
 * SC2-style unit selection with box select support
 */

import { useState, useCallback, useMemo } from 'react'

export interface SelectableItem {
  id: string
  position: { x: number; y: number }
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionState<T extends SelectableItem> {
  selectedIds: Set<string>
  selectedItems: T[]
  isSelected: (id: string) => boolean
  select: (id: string, additive?: boolean) => void
  selectMultiple: (ids: string[], additive?: boolean) => void
  selectInRect: (rect: Rect, items: T[], additive?: boolean) => void
  deselectAll: () => void
  selectAll: (items: T[]) => void
  toggleSelection: (id: string) => void
}

export function useSelection<T extends SelectableItem>(
  items: T[]
): SelectionState<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const select = useCallback((id: string, additive = false) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev)
        next.add(id)
        return next
      }
      return new Set([id])
    })
  }, [])

  const selectMultiple = useCallback((ids: string[], additive = false) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      }
      return new Set(ids)
    })
  }, [])

  const selectInRect = useCallback(
    (rect: Rect, allItems: T[], additive = false) => {
      const inRect = allItems.filter((item) => {
        const { x, y } = item.position
        return (
          x >= rect.x &&
          x <= rect.x + rect.width &&
          y >= rect.y &&
          y <= rect.y + rect.height
        )
      })
      selectMultiple(
        inRect.map((i) => i.id),
        additive
      )
    },
    [selectMultiple]
  )

  const deselectAll = useCallback(() => setSelectedIds(new Set()), [])

  const selectAll = useCallback(
    (allItems: T[]) => setSelectedIds(new Set(allItems.map((i) => i.id))),
    []
  )

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return {
    selectedIds,
    selectedItems,
    isSelected,
    select,
    selectMultiple,
    selectInRect,
    deselectAll,
    selectAll,
    toggleSelection,
  }
}
