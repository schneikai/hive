export const PLAN_MODE_PREFIX =
  '[Mode: Plan] You are in planning mode. Focus on designing, analyzing, and outlining an approach. Do NOT make code changes - instead describe what changes should be made and why.\n\n'

export const SUPER_PLAN_MODE_PREFIX =
  'Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.\n\nIf a question can be answered by exploring the codebase, explore the codebase instead.\nAll questions should be asked using the AskUserQuestion tool if possible\n\n'

export const CODEX_SUPER_PLAN_MODE_PREFIX =
  'Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.\n\nIf a question can be answered by exploring the codebase, explore the codebase instead.\nAll questions should be asked using the request_user_input tool if possible\n\n'

// Super-build: the same relentless interview as super-plan, but in build mode —
// no plan is produced; once every question is resolved the agent implements.
export const SUPER_BUILD_MODE_PREFIX =
  'Before doing anything, interview me relentlessly about every aspect of this task until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.\n\nIf a question can be answered by exploring the codebase, explore the codebase instead.\nAll questions should be asked using the AskUserQuestion tool if possible\nOnly start implementing once every question has been resolved.\n\n'

export const CODEX_SUPER_BUILD_MODE_PREFIX =
  'Before doing anything, interview me relentlessly about every aspect of this task until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.\n\nIf a question can be answered by exploring the codebase, explore the codebase instead.\nAll questions should be asked using the request_user_input tool if possible\nOnly start implementing once every question has been resolved.\n\n'

// Header that introduces the raw plan in a plan→implementor handoff prompt. Shared so the
// renderer (which writes it in buildHandoffPrompt) and the main process (which detects and
// strips it when externalizing oversized claude-cli goal handoffs) can't drift apart.
export const HANDOFF_PLAN_PROMPT_HEADER = 'Implement the following plan\n'

export type AgentMode = 'build' | 'plan' | 'super-plan' | 'super-build'

/** Plan-like modes drive plan permission mode / planning status. */
export function isPlanLikeMode(mode: string | null | undefined): boolean {
  return mode === 'plan' || mode === 'super-plan'
}

/** Super modes are one-shot: they prefix the next prompt with the interview
 * instructions and then revert to their base mode. */
export function isSuperMode(mode: string | null | undefined): mode is 'super-plan' | 'super-build' {
  return mode === 'super-plan' || mode === 'super-build'
}

/** Base (non-super) mode: super-plan → plan, super-build → build. */
export function baseMode(mode: AgentMode | null | undefined): 'build' | 'plan' {
  return isPlanLikeMode(mode) ? 'plan' : 'build'
}

/** Toggle super on/off while preserving plan/build. */
export function toggleSuper(mode: AgentMode | null | undefined): AgentMode {
  switch (mode) {
    case 'plan':
      return 'super-plan'
    case 'super-plan':
      return 'plan'
    case 'super-build':
      return 'build'
    default:
      return 'super-build'
  }
}

export function getSuperPlanModePrefix(agentSdk: string | null | undefined): string {
  return agentSdk === 'codex' ? CODEX_SUPER_PLAN_MODE_PREFIX : SUPER_PLAN_MODE_PREFIX
}

export function getSuperBuildModePrefix(agentSdk: string | null | undefined): string {
  return agentSdk === 'codex' ? CODEX_SUPER_BUILD_MODE_PREFIX : SUPER_BUILD_MODE_PREFIX
}

/** Prefix for a super mode (super-plan / super-build); '' for anything else. */
export function getSuperModePrefix(
  mode: string | null | undefined,
  agentSdk: string | null | undefined
): string {
  if (mode === 'super-plan') return getSuperPlanModePrefix(agentSdk)
  if (mode === 'super-build') return getSuperBuildModePrefix(agentSdk)
  return ''
}

export function applyModePrefix(text: string, mode: AgentMode | null | undefined): string {
  if (mode === 'plan') return PLAN_MODE_PREFIX + text
  if (mode === 'super-plan') return SUPER_PLAN_MODE_PREFIX + text
  if (mode === 'super-build') return SUPER_BUILD_MODE_PREFIX + text
  return text
}
