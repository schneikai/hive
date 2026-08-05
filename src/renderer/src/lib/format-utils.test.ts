import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTransitionAge } from './format-utils'

const NOW = new Date('2026-08-05T12:00:00.000Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const ago = (ms: number): number => NOW - ms

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatTransitionAge', () => {
  it('returns "Now" under one minute', () => {
    expect(formatTransitionAge(ago(0))).toBe('Now')
    expect(formatTransitionAge(ago(59_000))).toBe('Now')
  })

  it('returns minutes under one hour', () => {
    expect(formatTransitionAge(ago(MINUTE))).toBe('1m')
    expect(formatTransitionAge(ago(59 * MINUTE))).toBe('59m')
  })

  it('returns hours under one day', () => {
    expect(formatTransitionAge(ago(HOUR))).toBe('1h')
    expect(formatTransitionAge(ago(23 * HOUR))).toBe('23h')
  })

  it('returns days under one week', () => {
    expect(formatTransitionAge(ago(DAY))).toBe('1d')
    expect(formatTransitionAge(ago(6 * DAY))).toBe('6d')
  })

  it('returns weeks under one month', () => {
    expect(formatTransitionAge(ago(7 * DAY))).toBe('1w')
    expect(formatTransitionAge(ago(3 * 7 * DAY))).toBe('3w')
    expect(formatTransitionAge(ago(29 * DAY))).toBe('4w')
  })

  it('returns months under one year', () => {
    expect(formatTransitionAge(ago(30 * DAY))).toBe('1mo')
    expect(formatTransitionAge(ago(61 * DAY))).toBe('2mo')
    expect(formatTransitionAge(ago(364 * DAY))).toBe('12mo')
  })

  it('returns years from one year up', () => {
    expect(formatTransitionAge(ago(365 * DAY))).toBe('1yr')
    expect(formatTransitionAge(ago(2 * 365 * DAY))).toBe('2yr')
  })
})
