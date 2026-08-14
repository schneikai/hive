import { describe, expect, it } from 'vitest'

import { describeOpenCodeSessionError, isOpenCodeAbortedError } from '../opencode-session-error'

describe('isOpenCodeAbortedError', () => {
  it('recognises a turn the user stopped', () => {
    expect(isOpenCodeAbortedError({ name: 'MessageAbortedError', data: {} })).toBe(true)
  })

  it('does not treat real failures as a stop', () => {
    expect(isOpenCodeAbortedError({ name: 'UnknownError', data: { message: 'boom' } })).toBe(false)
    expect(isOpenCodeAbortedError({ name: 'ProviderAuthError', data: {} })).toBe(false)
    expect(isOpenCodeAbortedError(undefined)).toBe(false)
    expect(isOpenCodeAbortedError('MessageAbortedError')).toBe(false)
  })
})

describe('describeOpenCodeSessionError', () => {
  it('surfaces the message that toError() used to swallow', () => {
    // The real payload behind the "Error: [object Object]" log line.
    expect(
      describeOpenCodeSessionError({
        name: 'UnknownError',
        data: { message: 'no such provider: claude-code' }
      })
    ).toBe('UnknownError: no such provider: claude-code')
  })

  it('includes the provider for auth errors', () => {
    expect(
      describeOpenCodeSessionError({
        name: 'ProviderAuthError',
        data: { providerID: 'anthropic', message: 'missing api key' }
      })
    ).toBe('ProviderAuthError: missing api key (provider: anthropic)')
  })

  it('falls back to the name when there is no message', () => {
    expect(describeOpenCodeSessionError({ name: 'MessageOutputLengthError', data: {} })).toBe(
      'MessageOutputLengthError'
    )
  })

  it('passes a plain string through', () => {
    expect(describeOpenCodeSessionError('server exploded')).toBe('server exploded')
  })

  it('has a sane fallback for unusable input', () => {
    expect(describeOpenCodeSessionError(undefined)).toBe('OpenCode session failed')
    expect(describeOpenCodeSessionError({})).toBe('OpenCode session failed')
    expect(describeOpenCodeSessionError('')).toBe('OpenCode session failed')
  })
})
