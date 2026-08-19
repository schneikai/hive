import { describe, expect, it, vi } from 'vitest'
import { isHiveUpdateRequired, requiredHiveMinAppVersion } from '@/api/hive-enterprise/client'

const mockSettings: Record<string, unknown> = {}

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => (selector ? selector(mockSettings) : mockSettings),
    {
      getState: () => mockSettings
    }
  )
}))

const orgSettings = {
  hiveAuthToken: 'token-1',
  hiveOrganizationId: 'org-1',
  hiveOrganizationMinAppVersion: '1.5.0'
}

describe('requiredHiveMinAppVersion', () => {
  it('returns the org minimum only while logged in to an org', () => {
    expect(requiredHiveMinAppVersion(orgSettings)).toBe('1.5.0')
    expect(requiredHiveMinAppVersion({ ...orgSettings, hiveAuthToken: null })).toBeNull()
    expect(requiredHiveMinAppVersion({ ...orgSettings, hiveOrganizationId: null })).toBeNull()
  })

  it('treats null/blank policy values as not enforced', () => {
    expect(
      requiredHiveMinAppVersion({ ...orgSettings, hiveOrganizationMinAppVersion: null })
    ).toBeNull()
    expect(
      requiredHiveMinAppVersion({ ...orgSettings, hiveOrganizationMinAppVersion: '   ' })
    ).toBeNull()
  })
})

describe('isHiveUpdateRequired', () => {
  it('requires an update only when the running version is older than the minimum', () => {
    expect(isHiveUpdateRequired(orgSettings, '1.4.9')).toBe(true)
    expect(isHiveUpdateRequired(orgSettings, '1.5.0')).toBe(false)
    expect(isHiveUpdateRequired(orgSettings, '1.5.1')).toBe(false)
    expect(isHiveUpdateRequired(orgSettings, '2.0.0')).toBe(false)
  })

  it('never fires while the running version is unknown', () => {
    expect(isHiveUpdateRequired(orgSettings, null)).toBe(false)
  })

  it('never fires without an org login or an enforced minimum', () => {
    expect(isHiveUpdateRequired({ ...orgSettings, hiveAuthToken: null }, '1.0.0')).toBe(false)
    expect(
      isHiveUpdateRequired({ ...orgSettings, hiveOrganizationMinAppVersion: null }, '1.0.0')
    ).toBe(false)
  })

  it('counts a prerelease of the minimum as older than it', () => {
    expect(isHiveUpdateRequired(orgSettings, '1.5.0-canary.3')).toBe(true)
  })
})
