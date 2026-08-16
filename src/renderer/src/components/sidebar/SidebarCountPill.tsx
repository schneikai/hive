import React from 'react'
import { cn } from '@/lib/utils'
import { COUNT_PILL, COUNT_PILL_INNER } from './orca-sidebar'

/**
 * Orca section-header count pill (the small "3" / "17" bubble next to
 * "Pinned" / "In progress" in the sidebar hero). Recipe copied verbatim from
 * orca `SectionMetricsBadge` (WorktreeList.tsx@18bdef9ed0^:526-545; the same
 * markup still lives in worktree-list/rows/HostSectionHeader.tsx:13-32).
 */
export function SidebarCountPill({
  count,
  className,
  'aria-label': ariaLabel,
  ...props
}: { count: number } & React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span
      className={cn(COUNT_PILL, className)}
      aria-label={ariaLabel ?? `${count} workspace${count === 1 ? '' : 's'}`}
      {...props}
    >
      <span className={COUNT_PILL_INNER}>{count}</span>
    </span>
  )
}
