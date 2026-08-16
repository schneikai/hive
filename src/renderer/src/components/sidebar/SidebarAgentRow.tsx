import React from 'react'
import { cn } from '@/lib/utils'
import {
  AGENT_CHILDREN_INDENT,
  AGENT_MODEL_CHIP,
  AGENT_MODEL_CHIP_SELECTED,
  AGENT_ROW,
  AGENT_ROW_LABEL,
  AGENT_ROW_PRIMARY,
  AGENT_ROW_PRIMARY_SELECTED,
  AGENT_ROW_SECONDARY,
  AGENT_ROW_SECONDARY_SELECTED,
  AGENT_ROW_SELECTED,
  AGENT_TIME,
  AGENT_TIME_SELECTED
} from './orca-sidebar'

/**
 * Orca compact inline agent row shell, ported verbatim from
 * orca `worktree-card-compact-agent-row.tsx:248-296` — the h-6 rounded-sm
 * 11px row with `.worktree-agent-row-hover` (CSS in globals.css) and the
 * muted primary/secondary/model/time text ladder.
 */
export type SidebarAgentRowProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Leading glyphs: state dot, agent identity icon, disclosure chevron, etc. */
  leading?: React.ReactNode
  /** Primary text (prompt / conversation name). */
  label: React.ReactNode
  /** Secondary text, rendered as ` - {secondary}` inside the truncating label. */
  secondary?: React.ReactNode
  /** Mono model chip (e.g. "opus"), max-w-24 truncated. */
  modelChip?: string
  /** Trailing custom nodes (badges, +N counters) before the time. */
  trailing?: React.ReactNode
  /** Short relative time ("now", "4h"). */
  time?: string
  /** Focused/selected pane — solid accent fill + lifted text tones. */
  selected?: boolean
  /** Nesting depth; each level wraps the row in the orca
   * `.worktree-agent-lineage-children` rail (12px margin + 1px border + 4px pad). */
  indent?: number
}

export const SidebarAgentRow = React.forwardRef<HTMLDivElement, SidebarAgentRowProps>(
  function SidebarAgentRow(
    {
      leading,
      label,
      secondary,
      modelChip,
      trailing,
      time,
      selected = false,
      indent = 0,
      className,
      ...props
    },
    ref
  ) {
    let row = (
      <div
        ref={ref}
        className={cn(AGENT_ROW, selected && AGENT_ROW_SELECTED, className)}
        data-focused-agent-pane={selected ? 'true' : undefined}
        {...props}
      >
        {leading}
        <span className={AGENT_ROW_LABEL}>
          {/* orca row.tsx:204-206 — the selected-row fill washes out dimmed text, so lift both. */}
          <span className={selected ? AGENT_ROW_PRIMARY_SELECTED : AGENT_ROW_PRIMARY}>{label}</span>
          {secondary ? (
            <span className={selected ? AGENT_ROW_SECONDARY_SELECTED : AGENT_ROW_SECONDARY}>
              {' '}
              - {secondary}
            </span>
          ) : null}
        </span>
        {modelChip ? (
          <span
            className={selected ? AGENT_MODEL_CHIP_SELECTED : AGENT_MODEL_CHIP}
            title={modelChip}
          >
            {modelChip}
          </span>
        ) : null}
        {trailing}
        {time ? <span className={selected ? AGENT_TIME_SELECTED : AGENT_TIME}>{time}</span> : null}
      </div>
    )

    for (let level = 0; level < indent; level++) {
      row = <div className={AGENT_CHILDREN_INDENT}>{row}</div>
    }

    return row
  }
)
