/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClaudeSessionState } from '../src/main/services/claude-code-implementer'

// ── Mocks ──────────────────────────────────────────────────────────────

const mockQuery = vi.fn()
vi.mock('../src/main/services/claude-sdk-loader', () => ({
  loadClaudeSDK: vi.fn(async () => ({ query: (...args: any[]) => mockQuery(...args) }))
}))

vi.mock('../src/main/services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))

vi.mock('../src/main/services/claude-transcript-reader', () => ({
  readClaudeTranscript: vi.fn().mockResolvedValue([]),
  translateEntry: vi.fn()
}))

vi.mock('../src/main/services/git-service', () => ({ autoRenameWorktreeBranch: vi.fn() }))
vi.mock('../src/main/services/worktree-events', () => ({ emitWorktreeBranchRenamed: vi.fn() }))
vi.mock('../src/main/desktop/backend-event-publisher', () => ({
  publishDesktopBackendEvent: vi.fn()
}))
vi.mock('../src/main/services/claude-session-title', () => ({
  generateSessionTitle: vi.fn().mockResolvedValue(null)
}))
vi.mock('../src/main/services/env-vars', () => ({
  getUserEnvironmentVariables: vi.fn().mockResolvedValue({})
}))
vi.mock('../src/main/services/usage/session-usage-service', () => ({
  scheduleSessionUsageReport: vi.fn()
}))
vi.mock('../src/main/services/notification-service', () => ({
  notificationService: {
    notifySessionComplete: vi.fn(),
    notifyUserFeedbackNeeded: vi.fn(),
    setSessionQueuedState: vi.fn()
  }
}))

const mockAgentPublish = vi.fn()
vi.mock('../src/main/services/agent-event-bus', () => ({
  agentEventBus: { publish: (...args: any[]) => mockAgentPublish(...args) }
}))

// Capture the subscription params so the test can drive onMessage and awaitDone.
type Captured = {
  onMessage: (m: unknown) => Promise<void>
  settleDone: (value: unknown) => void
  abort: ReturnType<typeof vi.fn>
}
const captured: Captured[] = []

vi.mock('../src/main/effect/claude/facade', () => ({
  claudeAgentFacade: {
    startSessionEvents: (params: any) => {
      let settleDone: (value: unknown) => void = () => {}
      const done = new Promise((resolve) => {
        settleDone = resolve
      })
      captured.push({ onMessage: params.onMessage, settleDone, abort: vi.fn(() => done) })
      return {
        // never settles on its own; the test decides
        awaitDone: () => done,
        abort: captured[captured.length - 1].abort
      }
    }
  }
}))

import { ClaudeCodeImplementer } from '../src/main/services/claude-code-implementer'

const WORKTREE = '/path/to/worktree'
const SDK_SESSION = 'sdk-session-123'
const HIVE_SESSION = 'hive-session-456'

function makeSession(): ClaudeSessionState {
  return {
    claudeSessionId: SDK_SESSION,
    hiveSessionId: HIVE_SESSION,
    worktreePath: WORKTREE,
    abortController: null,
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
    stderrBuffer: []
  } as ClaudeSessionState
}

function statusEvents(): any[] {
  return mockAgentPublish.mock.calls
    .map(([event]: any[]) => event)
    .filter((event: any) => event?.type === 'session.status')
}

describe('turn fencing after a timed-out abort', () => {
  let impl: ClaudeCodeImplementer
  let session: ClaudeSessionState

  beforeEach(() => {
    vi.clearAllMocks()
    captured.length = 0
    mockQuery.mockReturnValue({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
      interrupt: vi.fn(() => new Promise(() => {})),
      close: vi.fn()
    })

    impl = new ClaudeCodeImplementer()
    impl.setDatabaseService({
      getSession: vi.fn().mockReturnValue({ id: HIVE_SESSION, mode: 'build' }),
      updateSession: vi.fn(),
      getWorktreeBySessionId: vi.fn().mockReturnValue(null),
      getWorktreeByPath: vi.fn().mockReturnValue(null),
      getSetting: vi.fn().mockReturnValue(null)
    } as any)

    session = makeSession()
    const sessions = (impl as any).sessions as Map<string, ClaudeSessionState>
    sessions.set(`${WORKTREE}::${SDK_SESSION}`, session)
  })

  it('ignores stream messages from a turn that was superseded', async () => {
    await impl.prompt(WORKTREE, SDK_SESSION, 'first')
    expect(captured).toHaveLength(1)
    const firstTurn = captured[0]

    // Stop, with a teardown that never settles, then start a new turn.
    vi.useFakeTimers()
    try {
      const stopping = impl.abort(WORKTREE, SDK_SESSION)
      await vi.advanceTimersByTimeAsync(10_000)
      await stopping
    } finally {
      vi.useRealTimers()
    }
    await impl.prompt(WORKTREE, SDK_SESSION, 'second')

    mockAgentPublish.mockClear()
    await firstTurn.onMessage({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'stale' }] }
    })

    // Nothing from the dead turn may reach the renderer.
    expect(mockAgentPublish).not.toHaveBeenCalled()
  })

  it('does not let a superseded finisher clear the live turn', async () => {
    await impl.prompt(WORKTREE, SDK_SESSION, 'first')
    const firstTurn = captured[0]

    vi.useFakeTimers()
    try {
      const stopping = impl.abort(WORKTREE, SDK_SESSION)
      await vi.advanceTimersByTimeAsync(10_000)
      await stopping
    } finally {
      vi.useRealTimers()
    }
    await impl.prompt(WORKTREE, SDK_SESSION, 'second')

    const liveQuery = session.query
    expect(liveQuery).not.toBeNull()
    mockAgentPublish.mockClear()

    // The abandoned stream finally finishes.
    firstTurn.settleDone({ _tag: 'Success', value: undefined })
    await new Promise((resolve) => setTimeout(resolve, 10))

    // The live turn keeps its handle, so the next stop still has something to
    // interrupt, and the UI is not told the new turn is done.
    expect(session.query).toBe(liveQuery)
    expect(statusEvents().map((e) => e.statusPayload?.type)).not.toContain('idle')
  })
})
