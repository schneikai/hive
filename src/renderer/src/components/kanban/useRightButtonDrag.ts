import { useCallback, useEffect, useRef } from 'react'
import type React from 'react'

/** Pixels the pointer must travel before a right-button press becomes a drag. */
const DRAG_THRESHOLD_PX = 6

const REPLAY_FLAG = '__hiveReplayedContextMenu'

interface RightButtonDragOptions {
  enabled: boolean
  /** Called with the `data-kanban-column` under the pointer on release (null = none). */
  onDrop: (column: string | null) => void
  /**
   * Called once when the drag ghost is created, right after it's cloned from
   * the pressed element and before it's attached — append any overlay (e.g. a
   * "launches with" chip) to it here.
   */
  decorateGhost?: (ghost: HTMLElement) => void
}

interface RightButtonDragHandlers {
  onMouseDown: (e: React.MouseEvent) => void
  onContextMenuCapture: (e: React.MouseEvent) => void
}

/**
 * Chromium never starts an HTML5 drag from the right mouse button (it fires
 * `contextmenu` instead), so this hook runs its own press → move → release
 * gesture on top of mouse events. While the button is held the context menu is
 * swallowed; a plain click (no movement) replays it on release so the normal
 * right-click menu still works, and a real drag suppresses it entirely.
 */
export function useRightButtonDrag({
  enabled,
  onDrop,
  decorateGhost
}: RightButtonDragOptions): RightButtonDragHandlers {
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop
  const decorateGhostRef = useRef(decorateGhost)
  decorateGhostRef.current = decorateGhost

  const pressRef = useRef<{ x: number; y: number; el: HTMLElement } | null>(null)
  const draggingRef = useRef(false)
  const swallowedMenuRef = useRef(false)
  const suppressNextMenuRef = useRef(false)
  const ghostRef = useRef<HTMLElement | null>(null)
  const hoveredColumnRef = useRef<HTMLElement | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const setHoveredColumn = (el: HTMLElement | null): void => {
    if (hoveredColumnRef.current === el) return
    hoveredColumnRef.current?.removeAttribute('data-right-drag-over')
    hoveredColumnRef.current = el
    el?.setAttribute('data-right-drag-over', 'true')
  }

  const endGesture = (): void => {
    cleanupRef.current?.()
    cleanupRef.current = null
    ghostRef.current?.remove()
    ghostRef.current = null
    setHoveredColumn(null)
    document.body.style.removeProperty('cursor')
    pressRef.current = null
    draggingRef.current = false
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => endGesture, [])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || e.button !== 2 || pressRef.current) return
      const el = e.currentTarget as HTMLElement
      pressRef.current = { x: e.clientX, y: e.clientY, el }
      draggingRef.current = false
      swallowedMenuRef.current = false

      const columnAt = (x: number, y: number): HTMLElement | null =>
        (document.elementFromPoint(x, y)?.closest('[data-kanban-column]') as HTMLElement | null) ??
        null

      const handleMove = (ev: MouseEvent): void => {
        const press = pressRef.current
        if (!press) return
        if (!draggingRef.current) {
          if (Math.hypot(ev.clientX - press.x, ev.clientY - press.y) < DRAG_THRESHOLD_PX) return
          draggingRef.current = true
          const ghost = press.el.cloneNode(true) as HTMLElement
          ghost.style.width = `${press.el.offsetWidth}px`
          ghost.style.position = 'fixed'
          ghost.style.left = '0'
          ghost.style.top = '0'
          ghost.style.pointerEvents = 'none'
          ghost.style.zIndex = '9999'
          ghost.style.opacity = '0.85'
          ghost.style.margin = '0'
          ghost.style.overflow = 'visible'
          decorateGhostRef.current?.(ghost)
          document.body.appendChild(ghost)
          ghostRef.current = ghost
          document.body.style.cursor = 'grabbing'
        }
        const ghost = ghostRef.current
        if (ghost) {
          ghost.style.transform = `translate(${ev.clientX - ghost.offsetWidth / 2}px, ${ev.clientY - ghost.offsetHeight / 2}px) rotate(3deg)`
        }
        setHoveredColumn(columnAt(ev.clientX, ev.clientY))
      }

      const handleUp = (ev: MouseEvent): void => {
        if (ev.button !== 2) return
        const press = pressRef.current
        const wasDragging = draggingRef.current
        const swallowed = swallowedMenuRef.current
        endGesture()
        if (!press) return
        if (wasDragging) {
          // Windows/Linux fire contextmenu after mouseup — eat that one only
          suppressNextMenuRef.current = true
          setTimeout(() => {
            suppressNextMenuRef.current = false
          }, 100)
          const column = columnAt(ev.clientX, ev.clientY)
          onDropRef.current(column?.getAttribute('data-kanban-column') ?? null)
        } else if (swallowed) {
          // macOS fires contextmenu on mousedown; we swallowed it while waiting
          // to see whether this was a drag — replay it as a plain right-click
          const replay = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: ev.clientX,
            clientY: ev.clientY,
            button: 2
          })
          ;(replay as unknown as Record<string, boolean>)[REPLAY_FLAG] = true
          press.el.dispatchEvent(replay)
        }
      }

      const handleKeyDown = (ev: KeyboardEvent): void => {
        if (ev.key === 'Escape') endGesture()
      }

      window.addEventListener('mousemove', handleMove, true)
      window.addEventListener('mouseup', handleUp, true)
      window.addEventListener('keydown', handleKeyDown, true)
      cleanupRef.current = () => {
        window.removeEventListener('mousemove', handleMove, true)
        window.removeEventListener('mouseup', handleUp, true)
        window.removeEventListener('keydown', handleKeyDown, true)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled]
  )

  const onContextMenuCapture = useCallback((e: React.MouseEvent) => {
    if ((e.nativeEvent as unknown as Record<string, boolean>)[REPLAY_FLAG]) return
    if (pressRef.current) {
      swallowedMenuRef.current = true
    } else if (!suppressNextMenuRef.current) {
      return
    }
    suppressNextMenuRef.current = false
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return { onMouseDown, onContextMenuCapture }
}
