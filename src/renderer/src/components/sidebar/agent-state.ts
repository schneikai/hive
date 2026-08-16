/**
 * Orca agent-state vocabulary (orca AgentStateDot.tsx:18-55), reduced to the
 * five glyphs the sidebar renders. Kept out of the component file so Fast
 * Refresh keeps working.
 */
export type AgentDotState = 'working' | 'done' | 'blocked' | 'idle' | 'question'

/** Accessible label shared by every visual agent-state marker. */
export function agentStateLabel(state: AgentDotState): string {
  switch (state) {
    case 'working':
      return 'Working'
    case 'done':
      return 'Done'
    case 'blocked':
      return 'Blocked'
    case 'idle':
      return 'Idle'
    case 'question':
      return 'Needs attention'
  }
}
