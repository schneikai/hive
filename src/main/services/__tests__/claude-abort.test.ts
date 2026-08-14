import { describe, expect, it, vi } from 'vitest'

import { isPermissionAbortArtifact, runBoundedAbortStep } from '../claude-abort'

describe('isPermissionAbortArtifact', () => {
  it('matches the failure a stopped turn leaves behind', () => {
    expect(
      isPermissionAbortArtifact('Tool permission request failed: AbortError: Stream closed')
    ).toBe(true)
    expect(isPermissionAbortArtifact('  tool permission request failed: aborterror')).toBe(true)
  })

  it('leaves real tool failures alone', () => {
    expect(isPermissionAbortArtifact('Error: ENOENT: no such file or directory')).toBe(false)
    expect(isPermissionAbortArtifact('')).toBe(false)
    expect(isPermissionAbortArtifact(undefined)).toBe(false)
  })

  it('does not match tool output that merely mentions an abort', () => {
    // Test output from the user's own code must keep its error styling.
    expect(
      isPermissionAbortArtifact('FAIL src/a.test.ts: expected AbortError, got Stream closed')
    ).toBe(false)
  })
})

describe('runBoundedAbortStep', () => {
  it('reports success when the step settles in time', async () => {
    await expect(runBoundedAbortStep(() => Promise.resolve('ok'), 50)).resolves.toBe(true)
  })

  it('gives up instead of hanging on a wedged step', async () => {
    vi.useFakeTimers()
    try {
      const pending = runBoundedAbortStep(() => new Promise(() => {}), 2000)
      await vi.advanceTimersByTimeAsync(2000)
      await expect(pending).resolves.toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('swallows a rejecting step', async () => {
    await expect(runBoundedAbortStep(() => Promise.reject(new Error('gone')), 50)).resolves.toBe(
      false
    )
  })

  it('swallows a step that throws synchronously', async () => {
    await expect(
      runBoundedAbortStep(() => {
        throw new Error('sync boom')
      }, 50)
    ).resolves.toBe(false)
  })
})
