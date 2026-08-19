import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useForceUpdateGuard } from '@/hooks/useForceUpdateGuard'
import { FORCE_UPDATE_SNOOZE_MS, useForceUpdateStore } from '@/stores/useForceUpdateStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWorktreeStatusStore } from '@/stores/useWorktreeStatusStore'

let focusCallback: (() => void) | null = null

vi.mock('@/api/system-api', () => ({
  systemApi: {
    onWindowFocused: (callback: () => void): (() => void) => {
      focusCallback = callback
      return () => {
        focusCallback = null
      }
    }
  }
}))

const getVersionMock = vi.fn(() => Promise.resolve('1.0.0'))

vi.mock('@/api/updater-api', () => ({
  updaterApi: {
    getVersion: (): Promise<string> => getVersionMock(),
    checkForUpdate: vi.fn(() => Promise.resolve())
  }
}))

const refreshOrgMock = vi.fn(() => Promise.resolve())

vi.mock('@/api/hive-enterprise/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hive-enterprise/client')>()
  return {
    ...actual,
    whenHiveOrgPolicySettled: (): Promise<void> => Promise.resolve(),
    refreshHiveEnterpriseOrg: (): Promise<void> => refreshOrgMock()
  }
})

vi.mock('@/stores/useSettingsStore', async () => {
  const { create } = await import('zustand')
  return {
    useSettingsStore: create(() => ({
      isLoading: false,
      hiveAuthToken: 'token-1' as string | null,
      hiveOrganizationId: 'org-1' as string | null,
      hiveOrganizationMinAppVersion: null as string | null,
      hiveOrganizationName: 'Acme' as string | null
    }))
  }
})

vi.mock('@/stores/useWorktreeStatusStore', async () => {
  const { create } = await import('zustand')
  return {
    useWorktreeStatusStore: create(() => ({
      sessionStatuses: {} as Record<string, { status: string; timestamp: number } | null>
    }))
  }
})

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function working(): { status: 'working'; timestamp: number } {
  return { status: 'working', timestamp: 0 }
}

describe('useForceUpdateGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    focusCallback = null
    getVersionMock.mockImplementation(() => Promise.resolve('1.0.0'))
    useSettingsStore.setState({
      isLoading: false,
      hiveAuthToken: 'token-1',
      hiveOrganizationId: 'org-1',
      hiveOrganizationMinAppVersion: null
    })
    useWorktreeStatusStore.setState({ sessionStatuses: {} })
    useForceUpdateStore.setState({
      currentVersion: null,
      modalOpen: false,
      modalOpenedAt: null,
      requiredVersion: null,
      snoozeCount: 0,
      snoozedUntil: null,
      lastCheckAt: null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the blocking modal on launch when the app is older than the org minimum', async () => {
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(true)
    expect(state.requiredVersion).toBe('2.0.0')
    expect(state.lastCheckAt).not.toBeNull()
  })

  it('stays quiet when the app already meets the minimum', async () => {
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '0.5.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)
  })

  it('stays quiet without an org login even when a stale minimum is cached', async () => {
    useSettingsStore.setState({ hiveAuthToken: null, hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)
  })

  it('defers the modal while a session is actively running and opens once it goes idle', async () => {
    useWorktreeStatusStore.setState({ sessionStatuses: { s1: working() } })
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)

    await act(async () => {
      useWorktreeStatusStore.setState({
        sessionStatuses: { s1: { status: 'completed', timestamp: 0 } }
      })
    })
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)
  })

  it('reopens the modal 2 minutes after a snooze', async () => {
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)

    await act(async () => {
      useForceUpdateStore.getState().snooze()
    })
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FORCE_UPDATE_SNOOZE_MS + 1_000)
    })
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)
    expect(useForceUpdateStore.getState().snoozeCount).toBe(1)
  })

  it('after a snooze expires mid-session, reopens only once the session goes idle', async () => {
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()

    await act(async () => {
      useForceUpdateStore.getState().snooze()
      useWorktreeStatusStore.setState({ sessionStatuses: { s1: working() } })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FORCE_UPDATE_SNOOZE_MS + 1_000)
    })
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)

    await act(async () => {
      useWorktreeStatusStore.setState({ sessionStatuses: {} })
    })
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)
  })

  it('stands the modal down when a session turns active and reopens on idle, without spending a snooze', async () => {
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)

    await act(async () => {
      useWorktreeStatusStore.setState({ sessionStatuses: { s1: working() } })
    })
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)
    expect(useForceUpdateStore.getState().snoozeCount).toBe(0)

    await act(async () => {
      useWorktreeStatusStore.setState({ sessionStatuses: {} })
    })
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)
  })

  it('closes the modal and resets snoozes when the admin clears the policy', async () => {
    useSettingsStore.setState({ hiveOrganizationMinAppVersion: '2.0.0' })
    renderHook(() => useForceUpdateGuard())
    await flush()
    expect(useForceUpdateStore.getState().modalOpen).toBe(true)

    await act(async () => {
      useSettingsStore.setState({ hiveOrganizationMinAppVersion: null })
    })
    await flush()
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(false)
    expect(state.requiredVersion).toBeNull()
    expect(state.snoozeCount).toBe(0)
  })

  it('re-fetches org settings on focus at most once per hour', async () => {
    renderHook(() => useForceUpdateGuard())
    await flush()
    refreshOrgMock.mockClear()

    // The launch check just happened — a focus right after is throttled.
    act(() => focusCallback?.())
    expect(refreshOrgMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 60 * 1000)
    })
    act(() => focusCallback?.())
    expect(refreshOrgMock).toHaveBeenCalledTimes(1)

    // Another focus straight away stays throttled.
    act(() => focusCallback?.())
    expect(refreshOrgMock).toHaveBeenCalledTimes(1)
  })
})
