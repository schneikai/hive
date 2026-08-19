import { describe, expect, it } from 'vitest'
import { compareAppVersions } from '@/lib/version-compare'

describe('compareAppVersions', () => {
  it('orders plain numeric versions', () => {
    expect(compareAppVersions('1.2.3', '1.2.4')).toBeLessThan(0)
    expect(compareAppVersions('1.2.4', '1.2.3')).toBeGreaterThan(0)
    expect(compareAppVersions('1.2.3', '1.2.3')).toBe(0)
    expect(compareAppVersions('1.10.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareAppVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
  })

  it('treats missing segments as zero', () => {
    expect(compareAppVersions('1.2', '1.2.0')).toBe(0)
    expect(compareAppVersions('1.2', '1.2.1')).toBeLessThan(0)
    expect(compareAppVersions('1.3', '1.2.9')).toBeGreaterThan(0)
  })

  it('ignores a leading v and surrounding whitespace', () => {
    expect(compareAppVersions('v1.2.3', '1.2.3')).toBe(0)
    expect(compareAppVersions(' 1.2.3 ', '1.2.3')).toBe(0)
  })

  it('ranks a release above its prereleases', () => {
    expect(compareAppVersions('1.3.0-canary.1', '1.3.0')).toBeLessThan(0)
    expect(compareAppVersions('1.3.0', '1.3.0-canary.1')).toBeGreaterThan(0)
    // ...but a prerelease of a NEWER core still wins.
    expect(compareAppVersions('1.4.0-canary.1', '1.3.0')).toBeGreaterThan(0)
  })

  it('orders prerelease identifiers numerically then lexically', () => {
    expect(compareAppVersions('1.3.0-canary.2', '1.3.0-canary.10')).toBeLessThan(0)
    expect(compareAppVersions('1.3.0-alpha', '1.3.0-beta')).toBeLessThan(0)
    expect(compareAppVersions('1.3.0-canary', '1.3.0-canary.1')).toBeLessThan(0)
    expect(compareAppVersions('1.3.0-canary.1', '1.3.0-canary.1')).toBe(0)
  })

  it('never throws on junk — malformed segments compare as zero', () => {
    expect(compareAppVersions('banana', '0.0.0')).toBe(0)
    expect(compareAppVersions('1.x.3', '1.0.3')).toBe(0)
    expect(compareAppVersions('', '0')).toBe(0)
  })
})
