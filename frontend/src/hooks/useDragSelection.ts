/**
 * useDragSelection - Drag-to-select box selection hook
 * SC2-style marquee selection for tactical map
 */

import { useState, useCallback, useRef } from 'react'

interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function useDragSelection(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null)
  const startPoint = useRef<Point | null>(null)
  const isDragging = useRef(false)

  const getRelativePosition = useCallback(
    (e: MouseEvent | React.MouseEvent): Point | null => {
      if (!containerRef.current) return null
      const rect = containerRef.current.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    [containerRef]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag if clicking on the background (not a unit)
      if (e.button !== 0) return // Left click only
      if ((e.target as HTMLElement).closest('[data-unit]')) return // Skip if clicking a unit

      const pos = getRelativePosition(e)
      if (!pos) return

      startPoint.current = pos
      isDragging.current = true
    },
    [getRelativePosition]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !startPoint.current) return

      const currentPos = getRelativePosition(e)
      if (!currentPos) return

      const rect: Rect = {
        x: Math.min(startPoint.current.x, currentPos.x),
        y: Math.min(startPoint.current.y, currentPos.y),
        width: Math.abs(currentPos.x - startPoint.current.x),
        height: Math.abs(currentPos.y - startPoint.current.y),
      }

      setSelectionRect(rect)
    },
    [getRelativePosition]
  )

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    startPoint.current = null
    const finalRect = selectionRect
    setSelectionRect(null)
    return finalRect
  }, [selectionRect])

  const cancelDrag = useCallback(() => {
    isDragging.current = false
    startPoint.current = null
    setSelectionRect(null)
  }, [])

  return {
    selectionRect,
    isDragging: isDragging.current,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
    cancelDrag,
  }
}
