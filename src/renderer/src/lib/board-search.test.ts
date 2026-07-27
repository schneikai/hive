import { describe, it, expect } from 'vitest'
import {
  normalizeSearchText,
  stripMarkdown,
  ticketMatchesQuery,
  extractSnippet
} from './board-search'

describe('normalizeSearchText', () => {
  it('lowercases and NFC-normalizes', () => {
    expect(normalizeSearchText('HeLLo')).toBe('hello')
    // e + combining acute (NFD) normalizes to precomposed é
    expect(normalizeSearchText('Café')).toBe('café')
  })
})

describe('stripMarkdown', () => {
  it('strips code fences, inline code, links, images, headings, and emphasis', () => {
    const md = [
      '# Heading',
      'Some **bold** and _italic_ text with `inline code`.',
      '```ts',
      'const hidden = true',
      '```',
      '[link text](https://example.com) and ![alt text](img.png)',
      '> quoted'
    ].join('\n')
    const out = stripMarkdown(md)
    expect(out).not.toContain('#')
    expect(out).not.toContain('```')
    expect(out).not.toContain('hidden')
    expect(out).not.toContain('https://example.com')
    expect(out).toContain('Heading')
    expect(out).toContain('bold')
    expect(out).toContain('inline code')
    expect(out).toContain('link text')
    expect(out).toContain('alt text')
    expect(out).toContain('quoted')
  })

  it('collapses whitespace', () => {
    expect(stripMarkdown('a\n\n  b\tc')).toBe('a b c')
  })
})

describe('ticketMatchesQuery', () => {
  const ticket = { title: 'Fix Login Bug', description: 'The OAuth flow breaks on refresh' }

  it('matches everything on empty query', () => {
    expect(ticketMatchesQuery(ticket, '', false)).toBe('title')
  })

  it('matches title case-insensitively', () => {
    expect(ticketMatchesQuery(ticket, 'login', false)).toBe('title')
    expect(ticketMatchesQuery(ticket, 'LOGIN'.toLowerCase(), false)).toBe('title')
  })

  it('ignores description when toggle is off', () => {
    expect(ticketMatchesQuery(ticket, 'oauth', false)).toBeNull()
  })

  it('matches description when toggle is on', () => {
    expect(ticketMatchesQuery(ticket, 'oauth', true)).toBe('description')
  })

  it('prefers title over description', () => {
    const t = { title: 'OAuth revamp', description: 'oauth details' }
    expect(ticketMatchesQuery(t, 'oauth', true)).toBe('title')
  })

  it('returns null when nothing matches', () => {
    expect(ticketMatchesQuery(ticket, 'zzz', true)).toBeNull()
  })

  it('handles null description', () => {
    expect(ticketMatchesQuery({ title: 'abc', description: null }, 'zzz', true)).toBeNull()
  })

  it('matches through markdown syntax in descriptions', () => {
    const t = { title: 'abc', description: 'uses **OAuth two** under the hood' }
    expect(ticketMatchesQuery(t, 'oauth two', true)).toBe('description')
  })
})

describe('extractSnippet', () => {
  it('returns null for no match or empty query', () => {
    expect(extractSnippet('hello world', 'zzz')).toBeNull()
    expect(extractSnippet('hello world', '')).toBeNull()
  })

  it('extracts a full short string without ellipsis', () => {
    const s = extractSnippet('hello world', 'world')
    expect(s).toEqual({
      before: 'hello ',
      match: 'world',
      after: '',
      prefixEllipsis: false,
      suffixEllipsis: false
    })
  })

  it('adds ellipsis on both sides for a mid-string match in long text', () => {
    const long = `${'a'.repeat(100)} needle ${'b'.repeat(100)}`
    const s = extractSnippet(long, 'needle')
    expect(s).not.toBeNull()
    expect(s!.match).toBe('needle')
    expect(s!.prefixEllipsis).toBe(true)
    expect(s!.suffixEllipsis).toBe(true)
    expect(s!.before.length).toBeLessThanOrEqual(30)
  })

  it('handles match at string start', () => {
    const s = extractSnippet('needle in a haystack', 'needle')
    expect(s!.before).toBe('')
    expect(s!.prefixEllipsis).toBe(false)
  })

  it('matches case-insensitively and preserves original casing', () => {
    const s = extractSnippet('The NEEDLE is here', 'needle')
    expect(s!.match).toBe('NEEDLE')
  })

  it('snaps the start forward to a word boundary', () => {
    const long = `wwwwwwwwww xxxxxxxxxx yyyyyyyyyy zzzzzzzzzz needle tail`
    const s = extractSnippet(long, 'needle')
    // start lands mid-word without snapping; after snapping, before-context begins post-space
    expect(s!.before.startsWith(' ')).toBe(false)
    expect(s!.match).toBe('needle')
  })
})
