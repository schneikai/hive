import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../../../main/db/types'

const { sessionGet, sessionUpdate, terminalDestroy } = vi.hoisted(() => ({
  sessionGet: vi.fn(),
  sessionUpdate: vi.fn(),
  terminalDestroy: vi.fn()
}))

vi.mock('@/api/db-api', () => ({
  dbApi: {
    session: {
      get: sessionGet,
      update: sessionUpdate
    }
  }
}))

vi.mock('@/api/terminal-api', () => ({
  terminalApi: {
    destroy: terminalDestroy
  }
}))

import { useSessionStore } from '../useSessionStore'
import { useWorktreeStatusStore } from '../useWorktreeStatusStore'

const initialSessionState = useSessionStore.getState()
const initialStatusState = useWorktreeStatusStore.getState()

const SESSION_ID = 'sess-completed-1'

function makeDbSession(overrides: Partial<Session> = {}): Session {
  return {
    id: SESSION_ID,
    worktree_id: 'worktree-1',
    project_id: 'project-1',
    connection_id: null,
    name: 'Session',
    status: 'completed',
    opencode_session_id: null,
    claude_session_id: null,
    agent_sdk: 'claude-code-cli',
    mode: 'build',
    session_type: 'default',
    model_provider_id: null,
    model_id: null,
    model_variant: null,
    remote_launch: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-02T00:00:00.000Z',
    pinned_to_board: false,
    ...overrides
  } as Session
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionGet.mockResolvedValue(makeDbSession())
  terminalDestroy.mockResolvedValue({ success: true, value: undefined })
  sessionUpdate.mockResolvedValue(makeDbSession({ status: 'active', completed_at: null }))
})

afterEach(() => {
  useSessionStore.setState(initialSessionState, true)
  useWorktreeStatusStore.setState(initialStatusState, true)
})

describe('destroyCompletedSessionTerminal', () => {
  it('destroys the PTY of a completed terminal-backed session and marks it closed', async () => {
    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).toHaveBeenCalledWith(SESSION_ID)
    expect(useSessionStore.getState().closedTerminalSessionIds.has(SESSION_ID)).toBe(true)
  })

  it('skips while a mount request is still held', async () => {
    useSessionStore.getState().requestSessionMount(SESSION_ID)

    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('skips when the session is the active session (Go to session jump)', async () => {
    useSessionStore.setState({ activeSessionId: SESSION_ID })

    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('skips when the session status reports live work (background follow-up)', async () => {
    useWorktreeStatusStore.setState({
      sessionStatuses: { [SESSION_ID]: { status: 'working', timestamp: Date.now() } }
    })

    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('skips when the session is not completed in the DB', async () => {
    sessionGet.mockResolvedValue(makeDbSession({ status: 'active', completed_at: null }))

    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('skips non-terminal-backed sessions', async () => {
    sessionGet.mockResolvedValue(makeDbSession({ agent_sdk: 'claude-code' }))

    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('serializes behind an in-flight revival and then leaves the active session alone', async () => {
    // Stateful DB row: the revival's active-write must be visible to the
    // destroy that runs after it.
    const dbRow = { current: makeDbSession() }
    sessionGet.mockImplementation(async () => dbRow.current)
    sessionUpdate.mockImplementation(async (_id: string, data: Partial<Session>) => {
      dbRow.current = { ...dbRow.current, ...data } as Session
      return dbRow.current
    })
    let releaseReactivateRead: (value: Session) => void = () => {}
    sessionGet.mockImplementationOnce(
      () => new Promise<Session>((resolve) => (releaseReactivateRead = resolve))
    )

    // Reactivation starts first and is parked on its DB read (holding the
    // lifecycle lock)
    const reactivation = useSessionStore.getState().reactivateSession(SESSION_ID)

    let destroyed = false
    const destroying = useSessionStore
      .getState()
      .destroyCompletedSessionTerminal(SESSION_ID)
      .then(() => {
        destroyed = true
      })
    await new Promise((resolve) => setTimeout(resolve, 0))

    // The destroy is queued behind the revival, not interleaved with it
    expect(destroyed).toBe(false)
    expect(terminalDestroy).not.toHaveBeenCalled()

    releaseReactivateRead(dbRow.current)
    await reactivation
    await destroying

    // Running after the revival, the destroy sees the active row and no-ops
    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('skips when a new mount request lands during the DB read (re-mount race)', async () => {
    sessionGet.mockImplementation(async () => {
      // Simulate a modal re-opening while the status read is in flight
      useSessionStore.getState().requestSessionMount(SESSION_ID)
      return makeDbSession()
    })

    await useSessionStore.getState().destroyCompletedSessionTerminal(SESSION_ID)

    expect(terminalDestroy).not.toHaveBeenCalled()
  })
})

describe('closeSession DB fallback', () => {
  it('destroys the PTY of a terminal-backed session missing from the store maps', async () => {
    // Session not present in sessionsByWorktree/sessionsByConnection — the
    // kanban board can close sessions of worktrees never loaded here.
    await useSessionStore.getState().closeSession(SESSION_ID)

    expect(sessionGet).toHaveBeenCalledWith(SESSION_ID)
    expect(sessionUpdate).toHaveBeenCalledWith(SESSION_ID, {
      status: 'completed',
      completed_at: expect.any(String)
    })
    expect(terminalDestroy).toHaveBeenCalledWith(SESSION_ID)
  })

  it('still completes the session when the DB row cannot be found', async () => {
    sessionGet.mockResolvedValue(null)

    await useSessionStore.getState().closeSession(SESSION_ID)

    expect(sessionUpdate).toHaveBeenCalledWith(SESSION_ID, {
      status: 'completed',
      completed_at: expect.any(String)
    })
    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('aborts an abortIfRevived close when a revival marked itself before the close ran', async () => {
    const dbRow = { current: makeDbSession({ status: 'active', completed_at: null }) }
    sessionGet.mockImplementation(async () => dbRow.current)
    sessionUpdate.mockImplementation(async (_id: string, data: Partial<Session>) => {
      dbRow.current = { ...dbRow.current, ...data } as Session
      return dbRow.current
    })

    // The close is dispatched first, then a revival starts in the same tick
    // (markReactivating is synchronous) — the close's in-lock guard must see
    // it and abort instead of completing the session under the revival.
    const closing = useSessionStore.getState().closeSession(SESSION_ID, { abortIfRevived: true })
    const reactivation = useSessionStore.getState().reactivateSession(SESSION_ID)

    const result = await closing
    await reactivation

    expect(result).toEqual({
      success: false,
      aborted: true,
      error: 'Session was revived concurrently'
    })
    expect(sessionUpdate).not.toHaveBeenCalledWith(
      SESSION_ID,
      expect.objectContaining({ status: 'completed' })
    )
    expect(terminalDestroy).not.toHaveBeenCalled()
  })

  it('serializes a close behind an in-flight revival (no mid-flight interleave)', async () => {
    const dbRow = { current: makeDbSession() }
    sessionGet.mockImplementation(async () => dbRow.current)
    sessionUpdate.mockImplementation(async (_id: string, data: Partial<Session>) => {
      dbRow.current = { ...dbRow.current, ...data } as Session
      return dbRow.current
    })
    let releaseReactivateRead: (value: Session) => void = () => {}
    sessionGet.mockImplementationOnce(
      () => new Promise<Session>((resolve) => (releaseReactivateRead = resolve))
    )

    // A revival holds the lifecycle lock (parked on its DB read)
    const reactivation = useSessionStore.getState().reactivateSession(SESSION_ID)

    let closed = false
    const closing = useSessionStore
      .getState()
      .closeSession(SESSION_ID)
      .then(() => {
        closed = true
      })
    await new Promise((resolve) => setTimeout(resolve, 0))

    // The close must not interleave with the revival: no completed-write and
    // no teardown until the revival finishes
    expect(closed).toBe(false)
    expect(sessionUpdate).not.toHaveBeenCalledWith(
      SESSION_ID,
      expect.objectContaining({ status: 'completed' })
    )
    expect(terminalDestroy).not.toHaveBeenCalled()

    releaseReactivateRead(dbRow.current)
    await reactivation
    await closing

    // The close then runs on the revival's final state as the newest intent
    expect(closed).toBe(true)
    expect(terminalDestroy).toHaveBeenCalledWith(SESSION_ID)
  })

  it('does not hit the DB when the session is present in the store', async () => {
    useSessionStore.setState({
      sessionsByWorktree: new Map([['worktree-1', [makeDbSession({ status: 'active' })]]])
    })

    await useSessionStore.getState().closeSession(SESSION_ID)

    expect(sessionGet).not.toHaveBeenCalled()
    expect(terminalDestroy).toHaveBeenCalledWith(SESSION_ID)
  })
})
