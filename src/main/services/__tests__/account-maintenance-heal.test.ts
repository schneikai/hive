import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startAccountMaintenance } from '../account-maintenance'
import { listClaudeAccounts, readClaudeEffectiveBlob } from '../account-store-claude'
import { listCodexAccounts } from '../account-store-codex'
import {
  fetchForSavedAccount,
  refreshTokensForStoreAccount
} from '../saved-usage-orchestrator'
import { getDatabase } from '../../db'

vi.mock('../../db', () => ({ getDatabase: vi.fn() }))
vi.mock('../account-store-claude', () => ({
  listClaudeAccounts: vi.fn(),
  readClaudeEffectiveBlob: vi.fn()
}))
vi.mock('../account-store-codex', () => ({
  listCodexAccounts: vi.fn(),
  readCodexEffectiveAuth: vi.fn()
}))
vi.mock('../credentials-migration', () => ({
  migrateSavedCredentialsToStores: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('../saved-usage-orchestrator', () => ({
  fetchForSavedAccount: vi.fn(),
  refreshAllForProvider: vi.fn().mockResolvedValue([]),
  refreshTokensForStoreAccount: vi.fn().mockResolvedValue('needsLogin')
}))

const TICK_MS = 60_000

function claudeAccount(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    num: '9',
    email: 'active@example.com',
    uuid: 'u',
    expiresAtMs: Date.now() + 60 * 60_000,
    hasRefresh: true,
    plan: null,
    active: true,
    ...overrides
  }
}

function staleRow(id: string, email: string, status = 'stale'): Record<string, unknown> {
  return {
    id,
    provider: 'anthropic',
    email,
    credentials_json: '',
    last_usage_json: null,
    last_fetched_at: null,
    status,
    last_error: 'Token refresh failed: invalid_grant (...)',
    created_at: '',
    updated_at: ''
  }
}

describe('account-maintenance stale-row self-heal', () => {
  let stop: (() => void) | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(listCodexAccounts).mockResolvedValue([])
    vi.mocked(readClaudeEffectiveBlob).mockResolvedValue({
      raw: '{}',
      parsed: { refreshToken: 'current-refresh-token' }
    })
    vi.mocked(getDatabase).mockReturnValue({
      getSavedUsageAccountsByProvider: vi.fn().mockReturnValue([])
    } as never)
  })

  afterEach(() => {
    stop?.()
    stop = null
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('re-fetches a stale row whose credentials now look healthy, and skips dead ones', async () => {
    vi.mocked(listClaudeAccounts).mockResolvedValue([
      claudeAccount() as never,
      claudeAccount({
        num: '2',
        email: 'dead@example.com',
        expiresAtMs: Date.now() - 60 * 60_000,
        active: false
      }) as never
    ])
    const rows = [
      staleRow('row-healthy', 'active@example.com'),
      staleRow('row-dead', 'dead@example.com'),
      staleRow('row-fine', 'ok@example.com', 'ok')
    ]
    vi.mocked(getDatabase).mockReturnValue({
      getSavedUsageAccountsByProvider: vi.fn().mockReturnValue(rows)
    } as never)
    vi.mocked(fetchForSavedAccount).mockResolvedValue({ success: true, status: 'ok' } as never)

    stop = startAccountMaintenance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    // Only the stale row backed by a comfortably-unexpired access token is
    // retried; the row with genuinely-expired credentials and the ok row are
    // left alone.
    expect(fetchForSavedAccount).toHaveBeenCalledTimes(1)
    expect(fetchForSavedAccount).toHaveBeenCalledWith('row-healthy', {
      caller: 'usage:fetchForAccount'
    })
    // The dead account still went through the ordinary expiry watcher.
    expect(refreshTokensForStoreAccount).toHaveBeenCalledWith('anthropic', {
      num: '2',
      email: 'dead@example.com'
    })
  })

  it('parks a needsLogin heal outcome until the refresh token changes', async () => {
    vi.mocked(listClaudeAccounts).mockResolvedValue([claudeAccount() as never])
    vi.mocked(getDatabase).mockReturnValue({
      getSavedUsageAccountsByProvider: vi
        .fn()
        .mockReturnValue([staleRow('row-1', 'active@example.com')])
    } as never)
    vi.mocked(fetchForSavedAccount).mockResolvedValue({
      success: false,
      error: 'Usage API returned 401: Unauthorized',
      status: 'stale',
      needsLogin: true
    } as never)

    stop = startAccountMaintenance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    expect(fetchForSavedAccount).toHaveBeenCalledTimes(1)

    // Same refresh token → parked, no retry on the next tick.
    await vi.advanceTimersByTimeAsync(TICK_MS)
    expect(fetchForSavedAccount).toHaveBeenCalledTimes(1)

    // Another process rotates the token → the park lifts and the heal retries.
    vi.mocked(readClaudeEffectiveBlob).mockResolvedValue({
      raw: '{}',
      parsed: { refreshToken: 'rotated-refresh-token' }
    })
    await vi.advanceTimersByTimeAsync(TICK_MS)
    expect(fetchForSavedAccount).toHaveBeenCalledTimes(2)
  })
})
