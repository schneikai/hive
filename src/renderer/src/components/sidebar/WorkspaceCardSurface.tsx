import React from 'react'
import { cn } from '@/lib/utils'
import {
  CARD_SURFACE,
  CARD_SURFACE_ACTIVE,
  CARD_SURFACE_ACTIVE_MULTI_RING,
  CARD_SURFACE_DELETING,
  CARD_SURFACE_FLUSH,
  CARD_SURFACE_IDLE,
  CARD_SURFACE_INSET,
  CARD_SURFACE_MULTI_SELECTED,
  CARD_SURFACE_PY,
  CARD_SURFACE_PY_TITLE_ONLY,
  CARD_SURFACE_RADIUS,
  CARD_SURFACE_RENAMING
} from './orca-sidebar'

/**
 * Orca workspace-card surface shell, ported verbatim from
 * orca `worktree-card-surface.tsx:119-156`. Renders the `ml-1 rounded-lg`
 * bordered div whose selected state is carried by
 * `[data-worktree-card-surface][data-worktree-card-active='primary'|'secondary']`
 * (CSS recipes in globals.css "Orca sidebar" block) and whose resting hover is
 * `.worktree-sidebar-card-hover`.
 */
export type WorkspaceCardSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Active-surface variant → data-worktree-card-active. false/undefined = resting hover card. */
  active?: 'primary' | 'secondary' | false
  /** Vertical padding: 'default' = pt-1.25 pb-1.5; 'titleOnly' = py-2 (orca surface.tsx:123). */
  py?: 'default' | 'titleOnly'
  /** Full-row flush surface (`ml-1 w-[calc(100%-0.25rem)]`) vs plain `ml-1` inset. */
  flush?: boolean
  /** Multi-select wash (orca surface.tsx:133/135). */
  multiSelected?: boolean
  /** Strips fill/border/ring while the title is inline-renamed (orca surface.tsx:140). */
  renaming?: boolean
  /** Dim + grayscale while deleting (orca surface.tsx:141). */
  deleting?: boolean
}

export const WorkspaceCardSurface = React.forwardRef<HTMLDivElement, WorkspaceCardSurfaceProps>(
  function WorkspaceCardSurface(
    {
      active = false,
      py = 'default',
      flush = true,
      multiSelected = false,
      renaming = false,
      deleting = false,
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        data-worktree-card-surface="true"
        data-worktree-card-active={active || undefined}
        className={cn(
          CARD_SURFACE,
          py === 'titleOnly' ? CARD_SURFACE_PY_TITLE_ONLY : CARD_SURFACE_PY,
          flush ? CARD_SURFACE_FLUSH : CARD_SURFACE_INSET,
          CARD_SURFACE_RADIUS,
          active
            ? CARD_SURFACE_ACTIVE
            : multiSelected
              ? CARD_SURFACE_MULTI_SELECTED
              : CARD_SURFACE_IDLE,
          active && multiSelected && CARD_SURFACE_ACTIVE_MULTI_RING,
          renaming && CARD_SURFACE_RENAMING,
          deleting && CARD_SURFACE_DELETING,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
