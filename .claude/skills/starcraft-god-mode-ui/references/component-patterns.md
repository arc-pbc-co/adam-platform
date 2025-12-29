# Component Implementation Patterns

Detailed implementation patterns for RTS-style UI components.

## Panel Component (Reusable Base)

The foundation for all UI panels with augmented-ui styling:

```tsx
// components/shared/Panel.tsx
import { forwardRef, ReactNode } from 'react';
import clsx from 'clsx';
import './Panel.css';

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'active' | 'danger' | 'success';
  augmentations?: string; // e.g., "tl-clip br-clip"
  header?: ReactNode;
  glow?: boolean;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ children, className, variant = 'default', augmentations = 'tl-clip br-clip', header, glow }, ref) => (
    <div
      ref={ref}
      className={clsx('panel', `panel--${variant}`, glow && 'panel--glow', className)}
      data-augmented-ui={`${augmentations} border`}
    >
      {header && <div className="panel__header">{header}</div>}
      <div className="panel__content">{children}</div>
    </div>
  )
);
```

```css
/* Panel.css */
.panel {
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
  --aug-tl: 12px;
  --aug-br: 12px;
  background: var(--bg-panel);
  backdrop-filter: blur(8px);
}

.panel--active {
  --aug-border-bg: var(--accent-primary);
}

.panel--danger {
  --aug-border-bg: var(--accent-danger);
}

.panel--glow {
  box-shadow: var(--glow-primary);
}

.panel__header {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.panel__content {
  padding: 1rem;
}
```

## Status Indicator

Animated status dots for unit/agent states:

```tsx
// components/shared/StatusIndicator.tsx
import clsx from 'clsx';
import './StatusIndicator.css';

type Status = 'online' | 'offline' | 'working' | 'error' | 'idle';

interface StatusIndicatorProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  label,
  pulse = true,
}) => (
  <div className={clsx('status-indicator', `status-indicator--${size}`)}>
    <span
      className={clsx(
        'status-indicator__dot',
        `status-indicator__dot--${status}`,
        pulse && status !== 'offline' && 'status-indicator__dot--pulse'
      )}
    />
    {label && <span className="status-indicator__label">{label}</span>}
  </div>
);
```

```css
/* StatusIndicator.css */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator__dot {
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator--sm .status-indicator__dot { width: 6px; height: 6px; }
.status-indicator--md .status-indicator__dot { width: 8px; height: 8px; }
.status-indicator--lg .status-indicator__dot { width: 12px; height: 12px; }

.status-indicator__dot--online { background: var(--accent-secondary); }
.status-indicator__dot--working { background: var(--accent-primary); }
.status-indicator__dot--idle { background: var(--text-muted); }
.status-indicator__dot--error { background: var(--accent-danger); }
.status-indicator__dot--offline { background: var(--text-muted); opacity: 0.5; }

.status-indicator__dot--pulse {
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.status-indicator__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## Progress Bar (Resource Gauge Style)

```tsx
// components/shared/ProgressBar.tsx
import clsx from 'clsx';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  variant = 'default',
  showLabel = false,
  animate = true,
  size = 'md',
}) => {
  const percent = Math.min(100, (value / max) * 100);
  
  return (
    <div className={clsx('progress-bar', `progress-bar--${size}`)}>
      <div className="progress-bar__track">
        <div
          className={clsx(
            'progress-bar__fill',
            `progress-bar__fill--${variant}`,
            animate && 'progress-bar__fill--animate'
          )}
          style={{ width: `${percent}%` }}
        />
        <div className="progress-bar__glow" style={{ width: `${percent}%` }} />
      </div>
      {showLabel && (
        <span className="progress-bar__label">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      )}
    </div>
  );
};
```

```css
/* ProgressBar.css */
.progress-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar__track {
  flex: 1;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-bar--sm .progress-bar__track { height: 4px; }
.progress-bar--md .progress-bar__track { height: 8px; }
.progress-bar--lg .progress-bar__track { height: 12px; }

.progress-bar__fill {
  height: 100%;
  transition: width 0.3s ease-out;
}

.progress-bar__fill--default {
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
}

.progress-bar__fill--success {
  background: var(--accent-secondary);
}

.progress-bar__fill--warning {
  background: var(--accent-warning);
}

.progress-bar__fill--danger {
  background: var(--accent-danger);
}

.progress-bar__glow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  filter: blur(4px);
  opacity: 0.5;
  background: inherit;
  pointer-events: none;
}

.progress-bar__fill--animate {
  background-size: 200% 100%;
  animation: progressShimmer 2s linear infinite;
}

@keyframes progressShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.progress-bar__label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 100px;
  text-align: right;
}
```

## Selection Hook

Multi-select state management for tactical map:

```tsx
// hooks/useSelection.ts
import { useState, useCallback, useMemo } from 'react';

interface SelectableItem {
  id: string;
  position: { x: number; y: number };
}

interface SelectionState<T extends SelectableItem> {
  selectedIds: Set<string>;
  selectedItems: T[];
  isSelected: (id: string) => boolean;
  select: (id: string, additive?: boolean) => void;
  selectMultiple: (ids: string[], additive?: boolean) => void;
  selectInRect: (rect: Rect, items: T[], additive?: boolean) => void;
  deselectAll: () => void;
  selectAll: (items: T[]) => void;
  toggleSelection: (id: string) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useSelection<T extends SelectableItem>(items: T[]): SelectionState<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const select = useCallback((id: string, additive = false) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const selectMultiple = useCallback((ids: string[], additive = false) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      }
      return new Set(ids);
    });
  }, []);

  const selectInRect = useCallback(
    (rect: Rect, allItems: T[], additive = false) => {
      const inRect = allItems.filter((item) => {
        const { x, y } = item.position;
        return (
          x >= rect.x &&
          x <= rect.x + rect.width &&
          y >= rect.y &&
          y <= rect.y + rect.height
        );
      });
      selectMultiple(
        inRect.map((i) => i.id),
        additive
      );
    },
    [selectMultiple]
  );

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(
    (allItems: T[]) => setSelectedIds(new Set(allItems.map((i) => i.id))),
    []
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
  };
}
```

## Drag Selection Box

```tsx
// hooks/useDragSelection.ts
import { useState, useCallback, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useDragSelection(containerRef: React.RefObject<HTMLElement>) {
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const startPoint = useRef<Point | null>(null);
  const isDragging = useRef(false);

  const getRelativePosition = useCallback(
    (e: MouseEvent | React.MouseEvent): Point | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [containerRef]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Left click only
      const pos = getRelativePosition(e);
      if (!pos) return;
      
      startPoint.current = pos;
      isDragging.current = true;
    },
    [getRelativePosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !startPoint.current) return;
      
      const currentPos = getRelativePosition(e);
      if (!currentPos) return;

      const rect: Rect = {
        x: Math.min(startPoint.current.x, currentPos.x),
        y: Math.min(startPoint.current.y, currentPos.y),
        width: Math.abs(currentPos.x - startPoint.current.x),
        height: Math.abs(currentPos.y - startPoint.current.y),
      };

      setSelectionRect(rect);
    },
    [getRelativePosition]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    startPoint.current = null;
    const finalRect = selectionRect;
    setSelectionRect(null);
    return finalRect;
  }, [selectionRect]);

  return {
    selectionRect,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
  };
}
```

```tsx
// components/TacticalMap/SelectionBox.tsx
import './SelectionBox.css';

interface SelectionBoxProps {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ rect }) => (
  <div
    className="selection-box"
    style={{
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    }}
  />
);
```

```css
/* SelectionBox.css */
.selection-box {
  position: absolute;
  border: 1px solid var(--accent-primary);
  background: rgba(0, 212, 255, 0.1);
  pointer-events: none;
  z-index: 100;
}
```

## WebSocket Real-Time Data Hook

```tsx
// hooks/useRealTimeData.ts
import { useEffect, useCallback, useState, useRef } from 'react';

interface UseRealTimeDataOptions<T> {
  url: string;
  onMessage?: (data: T) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useRealTimeData<T>({
  url,
  onMessage,
  onError,
  onOpen,
  onClose,
  reconnect = true,
  reconnectInterval = 3000,
}: UseRealTimeDataOptions<T>) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        setLastMessage(data);
        onMessage?.(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      onError?.(error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      onClose?.();
      
      if (reconnect) {
        reconnectTimeout.current = setTimeout(connect, reconnectInterval);
      }
    };

    wsRef.current = ws;
  }, [url, onMessage, onError, onOpen, onClose, reconnect, reconnectInterval]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    disconnect,
  };
}
```
