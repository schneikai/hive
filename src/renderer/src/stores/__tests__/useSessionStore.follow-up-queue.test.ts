import { beforeEach, describe, expect, it, vi } from 'vitest'

const { setSessionQueuedState } = vi.hoisted(() => ({
  setSessionQueuedState: vi.fn()
}))

vi.mock('@/api/system-api', () => ({
  systemApi: { setSessionQueuedState }
}))

import { useSessionStore } from '../useSessionStore'

const SESSION_ID = 'sess-queue-1'

beforeEach(() => {
  vi.clearAllMocks()
  setSessionQueuedState.mockResolvedValue(undefined)
  useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, [])
})

function queue(): string[] {
  return useSessionStore.getState().pendingFollowUpMessages.get(SESSION_ID) ?? []
}

describe('removeFollowUpMessageAt', () => {
  it('removes the entry at the given index', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['a', 'b', 'c'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 1)

    expect(queue()).toEqual(['a', 'c'])
  })

  it('removes the clicked duplicate, not the first match', () => {
    // The bug this guards: content-based removal deletes the wrong bubble when
    // two queued messages read the same.
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['same', 'other', 'same'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 2)

    expect(queue()).toEqual(['same', 'other'])
  })

  it('drops the session entry once the queue is empty', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['only'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 0)

    expect(useSessionStore.getState().pendingFollowUpMessages.has(SESSION_ID)).toBe(false)
    expect(setSessionQueuedState).toHaveBeenLastCalledWith(SESSION_ID, false)
  })

  it('keeps the backend queued flag set while messages remain', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['a', 'b'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 0)

    expect(setSessionQueuedState).toHaveBeenLastCalledWith(SESSION_ID, true)
  })

  it('does not drop the wrong entry when the index is stale', () => {
    // The rendered list lags the store by a render, so an index captured before
    // an await can point somewhere else by the time the removal runs.
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['second', 'third'])

    // index 1 was captured when the queue was ['first', 'second', 'third']
    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 1, 'second')

    expect(queue()).toEqual(['third'])
  })

  it('still honours the index when the content matches', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['same', 'other', 'same'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 2, 'same')

    expect(queue()).toEqual(['same', 'other'])
  })

  it('leaves the queue alone when the expected content is gone', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['a', 'b'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 0, 'already-drained')

    expect(queue()).toEqual(['a', 'b'])
  })

  it('ignores out-of-range and unknown-session calls', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['a'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 5)
    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, -1)
    useSessionStore.getState().removeFollowUpMessageAt('missing-session', 0)

    expect(queue()).toEqual(['a'])
  })
})
