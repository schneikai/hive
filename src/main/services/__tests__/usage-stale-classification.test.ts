import { describe, expect, it } from 'vitest'

import { isClaudeStaleError, isOpenAIStaleError } from '../saved-usage-orchestrator'
import { parseDumpAccounts } from '../keychain'

describe('stale-vs-error classification', () => {
  it('flags genuine auth rejections as stale', () => {
    expect(
      isClaudeStaleError(
        'Token refresh failed: invalid_grant (Anthropic refresh needs login (400): {"error": "invalid_grant", "error_description": "Refresh token expired"})'
      )
    ).toBe(true)
    expect(isClaudeStaleError('Usage API returned 401: Unauthorized')).toBe(true)
    expect(isClaudeStaleError('No refresh token available')).toBe(true)

    expect(isOpenAIStaleError('Usage API returned 403: Forbidden')).toBe(true)
    expect(isOpenAIStaleError('Token refresh failed: invalid_grant (bad token)')).toBe(true)
    expect(isOpenAIStaleError('No refresh token available')).toBe(true)
  })

  it('does NOT flag transient refresh failures as stale', () => {
    // These arrive with the same "Token refresh failed:" prefix as
    // invalid_grant but mean the network/endpoint hiccuped, not that the
    // user must sign in again — they must map to `error`, never `stale`.
    expect(isClaudeStaleError('Token refresh failed: fetch failed')).toBe(false)
    expect(isClaudeStaleError('Token refresh failed: Anthropic token request timed out')).toBe(false)
    expect(
      isClaudeStaleError('Token refresh failed: Anthropic token refresh returned 503: upstream')
    ).toBe(false)
    expect(isClaudeStaleError('Usage API request timed out')).toBe(false)
    expect(isClaudeStaleError('Usage API returned 429: Too Many Requests')).toBe(false)

    expect(isOpenAIStaleError('Token refresh failed: fetch failed')).toBe(false)
    expect(isOpenAIStaleError('Usage API returned 500: Internal Server Error')).toBe(false)
  })
})

describe('parseDumpAccounts', () => {
  const item = (opts: { keychain?: string; cls?: string; svce: string; acct?: string | null }): string => {
    const acctLine =
      opts.acct === null
        ? '    "acct"<blob>=<NULL>'
        : `    "acct"<blob>="${opts.acct ?? 'user'}"`
    return [
      `keychain: "${opts.keychain ?? '/Users/u/Library/Keychains/login.keychain-db'}"`,
      'version: 512',
      `class: "${opts.cls ?? 'genp'}"`,
      'attributes:',
      '    0x00000007 <blob>="ignored"',
      acctLine,
      '    "cdat"<timedate>=0x32303236 "20260415123456Z\\000"',
      `    "svce"<blob>="${opts.svce}"`
    ].join('\n')
  }

  it('returns the acct of a single matching item', () => {
    const dump = [
      item({ svce: 'Other Service', acct: 'someone' }),
      item({ svce: 'Claude Code-credentials', acct: 'idan_bg' })
    ].join('\n')
    expect(parseDumpAccounts(dump, 'Claude Code-credentials')).toEqual(['idan_bg'])
  })

  it('returns every duplicate item for the same service, in order', () => {
    const dump = [
      item({ svce: 'Claude Code-credentials', acct: 'stale-copy' }),
      item({ svce: 'Claude Code-Account-1-a@b.com', acct: 'user' }),
      item({ svce: 'Claude Code-credentials', acct: 'fresh-copy' })
    ].join('\n')
    expect(parseDumpAccounts(dump, 'Claude Code-credentials')).toEqual([
      'stale-copy',
      'fresh-copy'
    ])
  })

  it('reports NULL acct attributes as null', () => {
    const dump = item({ svce: 'Claude Code-credentials', acct: null })
    expect(parseDumpAccounts(dump, 'Claude Code-credentials')).toEqual([null])
  })

  it('ignores non-generic-password items and other services', () => {
    const dump = [
      item({ svce: 'Claude Code-credentials', acct: 'cert-item', cls: 'inet' }),
      item({ svce: 'Claude Code-credentials-other', acct: 'near-miss' })
    ].join('\n')
    expect(parseDumpAccounts(dump, 'Claude Code-credentials')).toEqual([])
  })

  it('returns [] for empty dumps', () => {
    expect(parseDumpAccounts('', 'Claude Code-credentials')).toEqual([])
  })
})
