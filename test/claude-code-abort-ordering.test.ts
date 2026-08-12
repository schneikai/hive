/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClaudeSessionState } from '../src/main/services/claude-code-implementer'

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('../src/main/services/claude-sdk-loader', () => ({
  loadClaudeSDK: vi.fn()
}))

vi.mock('../src/main/services/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}))

vi.mock('../src/main/services/claude-transcript-reader', () => ({
  readClaudeTranscript: vi.fn().mockResolvedValue([]),
  translateEntry: vi.fn()
}))

vi.mock('../src/main/services/git-service', () => ({
  autoRenameWorktreeBranch: vi.fn()
}))

const mockAgentPublish = vi.fn()
vi.mock('../src/main/services/agent-event-bus', () => ({
  agentEventBus: { publish: (...args: any[]) => mockAgentPublish(...args) }
}))

vi.mock('../src/main/services/worktree-events', () => ({
  emitWorktreeBranchRenamed: vi.fn()
}))

vi.mock('../src/main/desktop/backend-event-publisher', () => ({
  publishDesktopBackendEvent: vi.fn()
}))

vi.mock('../src/main/services/notification-service', () => ({
  notificationService: {
    notifySessionComplete: vi.fn(),
    notifyUserFeedbackNeeded: vi.fn(),
    setSessionQueuedState: vi.fn()
  }
}))

vi.mock('../src/main/services/usage/session-usage-service', () => ({
  scheduleSessionUsageReport: vi.fn()
}))

import { ClaudeCodeImplementer } from '../src/main/services/claude-code-implementer'

const WORKTREE = '/path/to/worktree'
const SDK_SESSION = 'sdk-session-123'

function createMockSession(overrides: Partial<ClaudeSessionState> = {}): ClaudeSessionState {
  return {
    claudeSessionId: SDK_SESSION,
    hiveSessionId: 'hive-session-456',
    worktreePath: WORKTREE,
    abortController: new AbortController(),
    subscription: null,
    checkpointCounter: 0,
    checkpoints: new Map(),
    query: null,
    lastQuery: null,
    materialized: true,
    messages: [],
    toolNames: new Map(),
    pendingQuestion: null,
    pendingPlanApproval: null,
    revertMessageID: null,
    revertCheckpointUuid: null,
    revertDiff: null,
    pendingFork: false,
    pendingResumeSessionAt: null,
    titleDeferred: false,
    stderrBuffer: [],
    ...overrides
  } as ClaudeSessionState
}

function injectSession(impl: ClaudeCodeImplementer, session: ClaudeSessionState): void {
  const sessions = (impl as any).sessions as Map<string, ClaudeSessionState>
  sessions.set(`${session.worktreePath}::${session.claudeSessionId}`, session)
}

describe('ClaudeCodeImplementer.abort', () => {
  let impl: ClaudeCodeImplementer

  beforeEach(() => {
    vi.clearAllMocks()
    impl = new ClaudeCodeImplementer()
    impl.setDatabaseService({
      updateSession: vi.fn(),
      getSession: vi.fn(),
      getWorktreeBySessionId: vi.fn().mockReturnValue(null)
    } as any)
  })

  it('replies to a pending command approval before tearing the stream down', async () => {
    const order: string[] = []
    const approvalResolve = vi.fn(() => order.push('approval-replied'))

    const session = createMockSession({
      query: { interrupt: vi.fn(async () => order.push('interrupt')) } as any,
      subscription: { abort: vi.fn(async () => order.push('subscription-abort')) } as any
    })
    session.abortController!.signal.addEventListener('abort', () => order.push('controller-abort'))
    injectSession(impl, session)
    ;(impl as any).pendingApprovals.set('approval-1', {
      resolve: approvalResolve,
      toolName: 'Bash',
      input: {},
      commandStr: 'ls',
      hiveSessionId: session.hiveSessionId
    })

    await expect(impl.abort(WORKTREE, SDK_SESSION)).resolves.toBe(true)

    // The deny has to land first, otherwise the CLI reports
    // "Tool permission request failed: AbortError: Stream closed".
    expect(order).toEqual([
      'approval-replied',
      'interrupt',
      'controller-abort',
      'subscription-abort'
    ])
    expect(approvalResolve).toHaveBeenCalledWith({ approved: false })
    expect((impl as any).pendingApprovals.size).toBe(0)
  })

  it('rejects a pending question and plan approval too', async () => {
    const questionResolve = vi.fn()
    const planResolve = vi.fn()
    const session = createMockSession({
      pendingQuestion: { requestId: 'q-1', questions: [], resolve: questionResolve },
      pendingPlanApproval: { requestId: 'p-1', resolve: planResolve }
    })
    injectSession(impl, session)

    await impl.abort(WORKTREE, SDK_SESSION)

    expect(questionResolve).toHaveBeenCalledWith({ answers: [], rejected: true })
    expect(planResolve).toHaveBeenCalledWith({ approved: false })
    expect(session.pendingQuestion).toBeNull()
    expect(session.pendingPlanApproval).toBeNull()

    // Both must tell the renderer to drop the prompt. Without question.rejected
    // the question store keeps a stale entry, the following idle counts as
    // blocked, and the turn never finalizes.
    const emitted = mockAgentPublish.mock.calls.map(([event]: any[]) => event)
    expect(emitted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'question.rejected',
          data: expect.objectContaining({ requestId: 'q-1', id: 'q-1' })
        }),
        expect.objectContaining({
          type: 'plan.resolved',
          data: expect.objectContaining({ approved: false, aborted: true })
        })
      ])
    )
  })

  it('leaves another session’s pending approval untouched', async () => {
    const otherResolve = vi.fn()
    const session = createMockSession()
    injectSession(impl, session)
    ;(impl as any).pendingApprovals.set('approval-other', {
      resolve: otherResolve,
      toolName: 'Bash',
      input: {},
      commandStr: 'ls',
      hiveSessionId: 'some-other-session'
    })

    await impl.abort(WORKTREE, SDK_SESSION)

    expect(otherResolve).not.toHaveBeenCalled()
    expect((impl as any).pendingApprovals.size).toBe(1)
  })

  it('still finishes when interrupt and teardown never settle', async () => {
    vi.useFakeTimers()
    try {
      const session = createMockSession({
        query: { interrupt: vi.fn(() => new Promise(() => {})) } as any,
        subscription: { abort: vi.fn(() => new Promise(() => {})) } as any
      })
      injectSession(impl, session)

      const pending = impl.abort(WORKTREE, SDK_SESSION)
      await vi.advanceTimersByTimeAsync(10_000)

      await expect(pending).resolves.toBe(true)
      // The hard abort must happen even though the graceful path hung.
      expect(session.abortController!.signal.aborted).toBe(true)
      expect(session.query).toBeNull()
      expect(session.subscription).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports failure for an unknown session', async () => {
    await expect(impl.abort(WORKTREE, 'missing-session')).resolves.toBe(false)
  })

  it('emits an idle status so the UI stops showing the turn as running', async () => {
    const session = createMockSession()
    injectSession(impl, session)

    await impl.abort(WORKTREE, SDK_SESSION)

    const statusEvents = mockAgentPublish.mock.calls
      .map(([event]: any[]) => event)
      .filter((event: any) => event?.type === 'session.status')
    expect(statusEvents.at(-1)?.statusPayload).toEqual({ type: 'idle' })
  })
})
