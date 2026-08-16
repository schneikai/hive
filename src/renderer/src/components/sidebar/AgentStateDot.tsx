import React from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { agentStateLabel, type AgentDotState } from './agent-state'
import {
  AGENT_DOT_BLOCKED,
  AGENT_DOT_BOX_MD,
  AGENT_DOT_BOX_SM,
  AGENT_DOT_ICON_MD,
  AGENT_DOT_ICON_SM,
  AGENT_DOT_IDLE,
  AGENT_DOT_INNER_MD,
  AGENT_DOT_INNER_SM,
  AGENT_DOT_QUESTION,
  AGENT_DOT_WRAP,
  AGENT_WORKING_SPINNER,
  STATUS_DOT_DONE
} from './orca-sidebar'

/**
 * Orca agent/workspace state glyph, ported from
 * orca `src/renderer/src/components/AgentStateDot.tsx` +
 * `StatusIndicator.tsx` + `AgentWorkingSpinner.tsx`.
 *
 * States (orca semantics):
 * - working  → yellow-500 rotating ring, smooth linear spin (`agent-spinner-rotate`,
 *              CSS in globals.css "Orca sidebar" block; motion-reduce fills the
 *              top border so the frozen ring reads as an intentional marker)
 * - done     → emerald-500 dot (sidebar StatusIndicator recipe — orca's sidebar
 *              collapses done/active to the same emerald dot)
 * - blocked  → red-500 dot
 * - idle     → neutral-500/40 dot
 * - question → orange-500 MessageCircleQuestion (orca AgentQuestionIcon uses the
 *              --agent-question token = orange-600 light / orange-500 dark)
 */

type AgentStateDotProps = {
  state: AgentDotState
  size?: 'sm' | 'md'
  className?: string
}

/** Compact state glyph used by agent rows and workspace-card status lanes. */
export const AgentStateDot = React.memo(function AgentStateDot({
  state,
  size = 'sm',
  className
}: AgentStateDotProps): React.JSX.Element {
  // orca AgentStateDot.tsx:70-72 — exact size ladder.
  const box = size === 'md' ? AGENT_DOT_BOX_MD : AGENT_DOT_BOX_SM
  const inner = size === 'md' ? AGENT_DOT_INNER_MD : AGENT_DOT_INNER_SM
  const icon = size === 'md' ? AGENT_DOT_ICON_MD : AGENT_DOT_ICON_SM

  if (state === 'working') {
    return (
      <span className={cn(AGENT_DOT_WRAP, box, className)} aria-label={agentStateLabel(state)}>
        <span className={cn(AGENT_WORKING_SPINNER, inner)} />
      </span>
    )
  }

  if (state === 'question') {
    return (
      <span className={cn(AGENT_DOT_WRAP, box, className)} aria-label={agentStateLabel(state)}>
        <MessageCircleQuestion className={cn(AGENT_DOT_QUESTION, icon)} aria-hidden="true" />
      </span>
    )
  }

  return (
    <span className={cn(AGENT_DOT_WRAP, box, className)} aria-label={agentStateLabel(state)}>
      <span
        className={cn(
          'block rounded-full',
          inner,
          state === 'done'
            ? STATUS_DOT_DONE
            : state === 'blocked'
              ? AGENT_DOT_BLOCKED
              : AGENT_DOT_IDLE
        )}
      />
    </span>
  )
})
