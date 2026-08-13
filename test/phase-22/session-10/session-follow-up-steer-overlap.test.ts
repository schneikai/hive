import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  handleSessionIdleFollowUp,
  resetSessionFollowUpDispatchState
} from '../../../src/renderer/src/lib/session-follow-up-dispatch'

/**
 * Steering claims one queued message and injects it into the active turn. If that
 * turn goes idle while the steer request is still in flight, the drain must not
 * submit the NEXT queued message as a separate prompt: the two would overlap. The
 * drain reports 'blocked' so the steer can re-run it once it settles.
 */
describe('drain versus an in-flight steer', () => {
  beforeEach(() => {
    resetSessionFollowUpDispatchState()
    vi.clearAllMocks()
  })

  test('does not dispatch while a steer is in flight', async () => {
    const dispatchFollowUp = vi.fn().mockResolvedValue(true)
    const dequeueFollowUp = vi.fn().mockReturnValue('second')
    const onComplete = vi.fn()
    let steerInFlight = true

    const result = await handleSessionIdleFollowUp({
      sessionId: 'session-steer',
      isBlocked: () => steerInFlight,
      dequeueFollowUp,
      requeueFollowUp: vi.fn(),
      dispatchFollowUp,
      onComplete
    })

    expect(result).toBe('blocked')
    // The queued message is still queued, and nothing was sent or finalized.
    expect(dequeueFollowUp).not.toHaveBeenCalled()
    expect(dispatchFollowUp).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()

    // Steer settles and re-runs the drain, which now goes through.
    steerInFlight = false
    const retry = await handleSessionIdleFollowUp({
      sessionId: 'session-steer',
      isBlocked: () => steerInFlight,
      dequeueFollowUp,
      requeueFollowUp: vi.fn(),
      dispatchFollowUp,
      onComplete
    })

    expect(retry).toBe('dispatched')
    expect(dispatchFollowUp).toHaveBeenCalledWith('second')
  })

  test('the re-run finalizes the turn when the queue is empty', async () => {
    const onComplete = vi.fn()

    const result = await handleSessionIdleFollowUp({
      sessionId: 'session-steer-empty',
      isBlocked: () => false,
      dequeueFollowUp: () => null,
      requeueFollowUp: vi.fn(),
      dispatchFollowUp: vi.fn(),
      onComplete
    })

    // This is why steer re-runs the drain unconditionally: with nothing queued it
    // still has to finalize the turn the blocked idle skipped.
    expect(result).toBe('completed')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
