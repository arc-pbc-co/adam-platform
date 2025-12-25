/**
 * SelectionBox - SC2-style drag selection rectangle
 */

import type { Rect } from '../../../hooks/useDragSelection'
import styles from './SelectionBox.module.css'

interface SelectionBoxProps {
  rect: Rect
}

export function SelectionBox({ rect }: SelectionBoxProps) {
  return (
    <div
      className={styles.selectionBox}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}
