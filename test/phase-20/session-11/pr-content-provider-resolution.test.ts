import { describe, expect, it } from 'vitest'

import {
  resolvePRContentGeneration,
  resolvePRContentProvider
} from '../../../src/renderer/src/lib/pr-content-provider'

describe('resolvePRContentProvider', () => {
  it('keeps a generating preferred provider when available state is unknown', () => {
    expect(resolvePRContentProvider('codex', null)).toBe('codex')
  })

  it('maps terminal to the first available AI provider', () => {
    expect(
      resolvePRContentProvider('terminal', {
        opencode: true,
        claude: true,
        codex: true
      })
    ).toBe('claude-code')
  })

  it('falls back when the preferred provider is unavailable', () => {
    expect(
      resolvePRContentProvider('codex', {
        opencode: true,
        claude: true,
        codex: false
      })
    ).toBe('claude-code')
  })

  it('returns null when no AI provider is available', () => {
    expect(
      resolvePRContentProvider('terminal', {
        opencode: false,
        claude: false,
        codex: false
      })
    ).toBeNull()
  })

  it('normalizes claude-code-cli to the claude-code text provider', () => {
    expect(
      resolvePRContentProvider('claude-code-cli', {
        opencode: true,
        claude: true,
        codex: true
      })
    ).toBe('claude-code')
  })
})

describe('resolvePRContentGeneration', () => {
  const allAvailable = { opencode: true, claude: true, codex: true }

  it('uses the configured PR content model, mapping variant to effort', () => {
    expect(
      resolvePRContentGeneration(
        { agentSdk: 'claude-code', providerID: 'anthropic', modelID: 'sonnet', variant: 'high' },
        'codex',
        allAvailable
      )
    ).toEqual({ provider: 'claude-code', model: 'sonnet', effort: 'high' })
  })

  it('maps claude-code-cli models to the claude-code provider and ultracode to xhigh', () => {
    expect(
      resolvePRContentGeneration(
        {
          agentSdk: 'claude-code-cli',
          providerID: 'anthropic',
          modelID: 'opus',
          variant: 'ultracode'
        },
        'codex',
        allAvailable
      )
    ).toEqual({ provider: 'claude-code', model: 'opus', effort: 'xhigh' })
  })

  it('formats opencode models as provider/model', () => {
    expect(
      resolvePRContentGeneration(
        { agentSdk: 'opencode', providerID: 'anthropic', modelID: 'claude-sonnet-4-5' },
        'claude-code',
        allAvailable
      )
    ).toEqual({ provider: 'opencode', model: 'anthropic/claude-sonnet-4-5' })
  })

  it('resolves SDK-less (portable) models through the default provider chain', () => {
    expect(
      resolvePRContentGeneration(
        { providerID: 'anthropic', modelID: 'sonnet', variant: 'low' },
        'codex',
        allAvailable
      )
    ).toEqual({ provider: 'codex', model: 'sonnet', effort: 'low' })
  })

  it('ignores the configured model when its provider is unavailable', () => {
    expect(
      resolvePRContentGeneration(
        { agentSdk: 'codex', providerID: 'codex', modelID: 'gpt-5.5', variant: 'high' },
        'claude-code',
        { opencode: true, claude: true, codex: false }
      )
    ).toEqual({ provider: 'claude-code' })
  })

  it('falls back to plain provider resolution when no model is configured', () => {
    expect(resolvePRContentGeneration(null, 'codex', allAvailable)).toEqual({ provider: 'codex' })
  })

  it('returns null when nothing is available', () => {
    expect(
      resolvePRContentGeneration(null, 'terminal', { opencode: false, claude: false, codex: false })
    ).toBeNull()
  })
})
