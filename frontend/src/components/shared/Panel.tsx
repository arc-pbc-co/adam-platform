/**
 * Panel - Reusable base panel with augmented-ui styling
 * SC2/RTS-inspired clipped corners and glow effects
 */

import { forwardRef, ReactNode } from 'react'
import clsx from 'clsx'
import './Panel.css'

interface PanelProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'active' | 'danger' | 'success' | 'warning'
  augmentations?: string // e.g., "tl-clip br-clip"
  header?: ReactNode
  glow?: boolean
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      children,
      className,
      variant = 'default',
      augmentations = 'tl-clip br-clip',
      header,
      glow,
    },
    ref
  ) => (
    <div
      ref={ref}
      className={clsx(
        'panel',
        `panel--${variant}`,
        glow && 'panel--glow',
        className
      )}
      data-augmented-ui={`${augmentations} border`}
    >
      {header && <div className="panel__header">{header}</div>}
      <div className="panel__content">{children}</div>
    </div>
  )
)

Panel.displayName = 'Panel'
