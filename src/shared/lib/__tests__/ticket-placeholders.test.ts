import { describe, expect, it } from 'vitest'

import {
  extractPlaceholderNames,
  hasPlaceholders,
  substitutePlaceholders
} from '../ticket-placeholders'

describe('extractPlaceholderNames', () => {
  it('extracts a single placeholder name', () => {
    expect(extractPlaceholderNames('Fix {{placeholder.file}} now')).toEqual(['file'])
  })

  it('is whitespace-agnostic inside the braces', () => {
    expect(extractPlaceholderNames('{{ placeholder.file}}')).toEqual(['file'])
    expect(extractPlaceholderNames('{{placeholder.file }}')).toEqual(['file'])
    expect(extractPlaceholderNames('{{  placeholder.file  }}')).toEqual(['file'])
  })

  it('dedupes repeated placeholders and preserves first-appearance order', () => {
    expect(
      extractPlaceholderNames('{{placeholder.b}} then {{placeholder.a}} then {{placeholder.b}}')
    ).toEqual(['b', 'a'])
  })

  it('collects names across multiple texts, skipping null/undefined', () => {
    expect(
      extractPlaceholderNames('{{placeholder.title}}', null, undefined, '{{placeholder.goal}}')
    ).toEqual(['title', 'goal'])
  })

  it('supports dots, dashes, underscores and digits in names', () => {
    expect(extractPlaceholderNames('{{placeholder.my-file_2.name}}')).toEqual(['my-file_2.name'])
  })

  it('ignores non-placeholder braces and other template tokens', () => {
    expect(extractPlaceholderNames('{{project.name}} {placeholder.x} {{placeholder}}')).toEqual([])
  })
})

describe('substitutePlaceholders', () => {
  it('replaces every occurrence of the same placeholder', () => {
    expect(
      substitutePlaceholders('a {{placeholder.x}} b {{ placeholder.x }} c', { x: 'V' })
    ).toBe('a V b V c')
  })

  it('replaces multiple distinct placeholders', () => {
    expect(
      substitutePlaceholders('{{placeholder.a}}-{{placeholder.b}}', { a: '1', b: '2' })
    ).toBe('1-2')
  })

  it('leaves tokens without a provided value untouched', () => {
    expect(substitutePlaceholders('keep {{placeholder.miss}}', {})).toBe(
      'keep {{placeholder.miss}}'
    )
  })

  it('does not interpret $ sequences in values', () => {
    expect(substitutePlaceholders('{{placeholder.x}}', { x: "$& $1 $'" })).toBe("$& $1 $'")
  })

  it('leaves non-placeholder text unchanged', () => {
    expect(substitutePlaceholders('no tokens here', { x: 'V' })).toBe('no tokens here')
  })
})

describe('hasPlaceholders', () => {
  it('detects placeholders across texts', () => {
    expect(hasPlaceholders('plain', 'with {{placeholder.a}}')).toBe(true)
    expect(hasPlaceholders('plain', null, undefined)).toBe(false)
  })
})
