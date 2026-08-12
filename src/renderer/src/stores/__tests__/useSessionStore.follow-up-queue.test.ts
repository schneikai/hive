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

  it('ignores out-of-range and unknown-session calls', () => {
    useSessionStore.getState().setPendingFollowUpMessages(SESSION_ID, ['a'])

    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, 5)
    useSessionStore.getState().removeFollowUpMessageAt(SESSION_ID, -1)
    useSessionStore.getState().removeFollowUpMessageAt('missing-session', 0)

    expect(queue()).toEqual(['a'])
  })
})
