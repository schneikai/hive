import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'
import { useUpdateStore } from '@/stores/useUpdateStore'
import { toast } from '@/lib/toast'
import type {
  UpdaterAvailablePayload,
  UpdaterDownloadedPayload,
  UpdaterErrorPayload,
  UpdaterNotAvailablePayload,
  UpdaterProgressPayload
} from '@shared/updater-events'

type Handlers = {
  available?: (data: UpdaterAvailablePayload) => void
  notAvailable?: (data: UpdaterNotAvailablePayload) => void
  progress?: (data: UpdaterProgressPayload) => void
  downloaded?: (data: UpdaterDownloadedPayload) => void
  error?: (data: UpdaterErrorPayload) => void
}

const handlers: Handlers = {}

const unsubscribers = {
  available: vi.fn(),
  notAvailable: vi.fn(),
  progress: vi.fn(),
  downloaded: vi.fn(),
  error: vi.fn()
}

vi.mock('@/api/updater-api', () => ({
  updaterApi: {
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve()),
    onUpdateAvailable: vi.fn((cb: (data: UpdaterAvailablePayload) => void) => {
      handlers.available = cb
      return unsubscribers.available
    }),
    onUpdateNotAvailable: vi.fn((cb: (data: UpdaterNotAvailablePayload) => void) => {
      handlers.notAvailable = cb
      return unsubscribers.notAvailable
    }),
    onProgress: vi.fn((cb: (data: UpdaterProgressPayload) => void) => {
      handlers.progress = cb
      return unsubscribers.progress
    }),
    onUpdateDownloaded: vi.fn((cb: (data: UpdaterDownloadedPayload) => void) => {
      handlers.downloaded = cb
      return unsubscribers.downloaded
    }),
    onError: vi.fn((cb: (data: UpdaterErrorPayload) => void) => {
      handlers.error = cb
      return unsubscribers.error
    })
  }
}))

vi.mock('@/lib/toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}))

let mockSkippedUpdateVersion: string | null = null

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ skippedUpdateVersion: mockSkippedUpdateVersion })
  }
}))

const progressPayload = (percent: number): UpdaterProgressPayload => ({
  percent,
  bytesPerSecond: 1000,
  transferred: percent * 1000,
  total: 100_000
})

describe('useAutoUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSkippedUpdateVersion = null
    useUpdateStore.setState({
      status: 'idle',
      version: null,
      percent: 0,
      downloadFailed: false,
      dismissedVersion: null
    })
  })

  it('drives the update store through the full update lifecycle', () => {
    renderHook(() => useAutoUpdate())

    handlers.available?.({ version: '1.3.0' })
    expect(useUpdateStore.getState().status).toBe('available')

    useUpdateStore.getState().startDownload()
    handlers.progress?.(progressPayload(55))
    expect(useUpdateStore.getState().percent).toBe(55)

    handlers.downloaded?.({ version: '1.3.0' })
    expect(useUpdateStore.getState().status).toBe('downloaded')
    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('suppresses skipped versions for background checks but not manual ones', () => {
    renderHook(() => useAutoUpdate())
    mockSkippedUpdateVersion = '1.3.0'

    handlers.available?.({ version: '1.3.0' })
    expect(useUpdateStore.getState().status).toBe('idle')

    handlers.available?.({ version: '1.3.0', isManualCheck: true })
    expect(useUpdateStore.getState().status).toBe('available')
    expect(toast.info).toHaveBeenCalledWith('Update v1.3.0 available', {
      description: 'Download it from the button at the bottom of the sidebar',
      action: expect.objectContaining({ label: 'Download' })
    })
  })

  it('reports the actual download state when a manual check re-announces', () => {
    renderHook(() => useAutoUpdate())

    handlers.available?.({ version: '1.3.0' })
    useUpdateStore.getState().startDownload()
    handlers.available?.({ version: '1.3.0', isManualCheck: true })
    expect(toast.info).toHaveBeenCalledWith('Update v1.3.0 is downloading', {
      description: 'Progress is shown at the bottom of the sidebar'
    })

    handlers.downloaded?.({ version: '1.3.0' })
    handlers.available?.({ version: '1.3.0', isManualCheck: true })
    expect(toast.info).toHaveBeenCalledWith('Update v1.3.0 is ready to install', {
      description: 'Restart Hive from the button at the bottom of the sidebar'
    })
  })

  it('unsubscribes all updater listeners on unmount', () => {
    const { unmount } = renderHook(() => useAutoUpdate())
    unmount()

    for (const unsubscribe of Object.values(unsubscribers)) {
      expect(unsubscribe).toHaveBeenCalledTimes(1)
    }
  })

  it('toasts up-to-date results only for manual checks', () => {
    renderHook(() => useAutoUpdate())

    handlers.notAvailable?.({ version: '1.2.27' })
    expect(toast.info).not.toHaveBeenCalled()

    handlers.notAvailable?.({ version: '1.2.27', isManualCheck: true })
    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith('You’re up to date', {
      description: 'Hive v1.2.27 is the latest version'
    })
  })

  it('does not let a failed check disturb an in-flight download', () => {
    renderHook(() => useAutoUpdate())

    handlers.available?.({ version: '1.3.0' })
    useUpdateStore.getState().startDownload()
    handlers.error?.({ message: 'api rate limited', source: 'check' })

    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(toast.error).not.toHaveBeenCalled()

    handlers.error?.({ message: 'api rate limited', source: 'check', isManualCheck: true })
    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(toast.error).toHaveBeenCalledWith('Update check failed', {
      description: 'api rate limited'
    })
  })

  it('reverts the pill when the download itself fails', () => {
    renderHook(() => useAutoUpdate())

    handlers.available?.({ version: '1.3.0' })
    useUpdateStore.getState().startDownload()
    handlers.error?.({ message: 'disk full', source: 'download' })

    expect(useUpdateStore.getState().status).toBe('available')
    expect(useUpdateStore.getState().downloadFailed).toBe(true)
    expect(toast.error).toHaveBeenCalledWith('Update download failed', {
      description: 'disk full'
    })
  })

  it('keeps background check errors silent but surfaces download failures', () => {
    renderHook(() => useAutoUpdate())

    handlers.error?.({ message: 'network down' })
    expect(toast.error).not.toHaveBeenCalled()

    handlers.available?.({ version: '1.3.0' })
    useUpdateStore.getState().startDownload()
    handlers.error?.({ message: 'network down' })

    expect(useUpdateStore.getState().status).toBe('available')
    expect(useUpdateStore.getState().downloadFailed).toBe(true)
    expect(toast.error).toHaveBeenCalledWith('Update download failed', {
      description: 'network down'
    })

    handlers.error?.({ message: 'boom', isManualCheck: true })
    expect(toast.error).toHaveBeenCalledWith('Update check failed', { description: 'boom' })
  })
})
