import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAccountStoreCacheForTests,
  readClaudeEffectiveBlob,
  readClaudeLiveKeychainRaw
} from '../account-store-claude'
import { keychainListAccounts, keychainRead } from '../keychain'
import { readJsonFile } from '../atomic-json'

vi.mock('../keychain', () => ({
  keychainRead: vi.fn(),
  keychainWrite: vi.fn(),
  keychainDelete: vi.fn(),
  keychainListAccounts: vi.fn()
}))

vi.mock('../atomic-json', () => ({
  readJsonFile: vi.fn(),
  atomicWriteJson: vi.fn()
}))

const LIVE_SERVICE = 'Claude Code-credentials'
const BACKUP_SERVICE = 'Claude Code-Account-9-user@example.com'

const blob = (oauth: Record<string, unknown>): string => JSON.stringify({ claudeAiOauth: oauth })

/** Wire keychainRead to a (service[, account]) lookup table; keys without an
 * account segment answer first-match (no explicit account) reads. */
function stubKeychain(entries: Record<string, string>): void {
  vi.mocked(keychainRead).mockImplementation(async (service, account) => {
    const key = account === undefined ? service : `${service}::${account}`
    return entries[key] ?? null
  })
}

beforeEach(() => {
  vi.mocked(keychainRead).mockReset()
  vi.mocked(keychainListAccounts).mockReset()
  clearAccountStoreCacheForTests()
  // Live identity matches the account under test.
  vi.mocked(readJsonFile).mockResolvedValue({
    oauthAccount: { emailAddress: 'user@example.com', accountUuid: 'uuid-9' }
  })
})

describe('duplicate live Keychain entry resolution', () => {
  it('picks the duplicate whose blob has an access token and the latest expiresAt', async () => {
    vi.mocked(keychainListAccounts).mockResolvedValue(['stale-copy', 'fresh-copy'])
    stubKeychain({
      // First-match read would land on the stale copy — the bug this fixes.
      [LIVE_SERVICE]: blob({ accessToken: 'old', refreshToken: 'burned', expiresAt: 1 }),
      [`${LIVE_SERVICE}::stale-copy`]: blob({
        accessToken: 'old',
        refreshToken: 'burned',
        expiresAt: 1
      }),
      [`${LIVE_SERVICE}::fresh-copy`]: blob({
        accessToken: 'fresh',
        refreshToken: 'current',
        expiresAt: 2_000_000_000_000
      })
    })

    const effective = await readClaudeEffectiveBlob('9', 'user@example.com')
    expect(effective?.parsed.accessToken).toBe('fresh')
    expect(effective?.parsed.refreshToken).toBe('current')
  })

  it('skips duplicates whose blob has no access token', async () => {
    vi.mocked(keychainListAccounts).mockResolvedValue(['empty-copy', 'real-copy'])
    stubKeychain({
      [`${LIVE_SERVICE}::empty-copy`]: '{}',
      [`${LIVE_SERVICE}::real-copy`]: blob({ accessToken: 'fresh', expiresAt: 5 })
    })

    const raw = await readClaudeLiveKeychainRaw()
    expect(raw).toBe(blob({ accessToken: 'fresh', expiresAt: 5 }))
  })

  it('falls back to a first-match read when enumeration fails', async () => {
    vi.mocked(keychainListAccounts).mockRejectedValue(new Error('security dump-keychain failed'))
    stubKeychain({ [LIVE_SERVICE]: blob({ accessToken: 'only', expiresAt: 5 }) })

    const effective = await readClaudeEffectiveBlob('9', 'user@example.com')
    expect(effective?.parsed.accessToken).toBe('only')
  })
})

describe('readClaudeEffectiveBlob live-blob fallback', () => {
  it('falls back to the backup blob when the live blob parses without an access token', async () => {
    vi.mocked(keychainListAccounts).mockResolvedValue(['the-only-copy'])
    stubKeychain({
      [`${LIVE_SERVICE}::the-only-copy`]: '{"someOtherShape": true}',
      [BACKUP_SERVICE]: blob({ accessToken: 'backup-token', refreshToken: 'backup-refresh' })
    })

    const effective = await readClaudeEffectiveBlob('9', 'user@example.com')
    expect(effective?.parsed.accessToken).toBe('backup-token')
  })

  it('still prefers a live blob that does carry an access token', async () => {
    vi.mocked(keychainListAccounts).mockResolvedValue(['the-only-copy'])
    stubKeychain({
      [`${LIVE_SERVICE}::the-only-copy`]: blob({ accessToken: 'live-token' }),
      [BACKUP_SERVICE]: blob({ accessToken: 'backup-token' })
    })

    const effective = await readClaudeEffectiveBlob('9', 'user@example.com')
    expect(effective?.parsed.accessToken).toBe('live-token')
  })

  it('reads the backup blob directly for non-active accounts', async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      oauthAccount: { emailAddress: 'someone-else@example.com' }
    })
    stubKeychain({ [BACKUP_SERVICE]: blob({ accessToken: 'backup-token' }) })

    const effective = await readClaudeEffectiveBlob('9', 'user@example.com')
    expect(effective?.parsed.accessToken).toBe('backup-token')
    expect(keychainListAccounts).not.toHaveBeenCalled()
  })
})
