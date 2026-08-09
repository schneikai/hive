import { describe, it, expect, vi, beforeEach } from 'vitest'
import { selectUpdatePillVisible, useUpdateStore } from '../useUpdateStore'
import { updaterApi } from '@/api/updater-api'

vi.mock('@/api/updater-api', () => ({
  updaterApi: {
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  }
}))

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useUpdateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updaterApi.downloadUpdate).mockImplementation(() => Promise.resolve())
    useUpdateStore.setState({
      status: 'idle',
      version: null,
      percent: 0,
      downloadFailed: false,
      dismissedVersion: null
    })
  })

  it('is hidden while idle and visible once an update is available', () => {
    expect(selectUpdatePillVisible(useUpdateStore.getState())).toBe(false)

    useUpdateStore.getState().setAvailable('1.3.0')

    const state = useUpdateStore.getState()
    expect(state.status).toBe('available')
    expect(state.version).toBe('1.3.0')
    expect(selectUpdatePillVisible(state)).toBe(true)
  })

  it('hides the dismissed version but reappears for a newer one', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().dismiss()

    expect(selectUpdatePillVisible(useUpdateStore.getState())).toBe(false)

    // Background re-check re-announces the same version — stays hidden
    useUpdateStore.getState().setAvailable('1.3.0')
    expect(selectUpdatePillVisible(useUpdateStore.getState())).toBe(false)

    // A newer version supersedes the dismissal
    useUpdateStore.getState().setAvailable('1.3.1')
    expect(selectUpdatePillVisible(useUpdateStore.getState())).toBe(true)
  })

  it('reveals a dismissed version again on manual checks', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().dismiss()

    useUpdateStore.getState().setAvailable('1.3.0', { revealDismissed: true })

    expect(selectUpdatePillVisible(useUpdateStore.getState())).toBe(true)
    expect(useUpdateStore.getState().dismissedVersion).toBeNull()
  })

  it('only dismisses while an update is available', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().setDownloaded('1.3.0')

    useUpdateStore.getState().dismiss()

    expect(useUpdateStore.getState().dismissedVersion).toBeNull()
    expect(selectUpdatePillVisible(useUpdateStore.getState())).toBe(true)
  })

  it('starts a download only from the available state', () => {
    useUpdateStore.getState().startDownload()
    expect(updaterApi.downloadUpdate).not.toHaveBeenCalled()

    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().startDownload()

    expect(updaterApi.downloadUpdate).toHaveBeenCalledTimes(1)
    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(useUpdateStore.getState().percent).toBe(0)
  })

  it('ignores the download RPC rejection — the relay times out on long downloads', async () => {
    vi.mocked(updaterApi.downloadUpdate).mockImplementation(() =>
      Promise.reject(new Error('Timed out waiting for desktop command response'))
    )
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().startDownload()
    await flushMicrotasks()

    // Still downloading — only an updater:error event (setDownloadError) reverts
    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(useUpdateStore.getState().downloadFailed).toBe(false)
  })

  it('tracks download progress and ignores stray progress events', () => {
    useUpdateStore.getState().setProgress(10)
    expect(useUpdateStore.getState().status).toBe('idle')

    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().startDownload()
    useUpdateStore.getState().setProgress(42.5)

    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(useUpdateStore.getState().percent).toBe(42.5)

    useUpdateStore.getState().setDownloaded('1.3.0')
    useUpdateStore.getState().setProgress(99)
    expect(useUpdateStore.getState().status).toBe('downloaded')
    expect(useUpdateStore.getState().percent).toBe(100)
  })

  it('adopts a download started elsewhere when progress arrives while available', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().setProgress(10)

    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(useUpdateStore.getState().percent).toBe(10)
  })

  it('clamps out-of-range progress percentages', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().startDownload()

    useUpdateStore.getState().setProgress(150)
    expect(useUpdateStore.getState().percent).toBe(100)

    useUpdateStore.getState().setProgress(-5)
    expect(useUpdateStore.getState().percent).toBe(0)
  })

  it('holds an in-flight download through any re-announcement', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().startDownload()

    useUpdateStore.getState().setAvailable('1.3.0')
    expect(useUpdateStore.getState().status).toBe('downloading')

    // A newer version can't be honored mid-download either (electron-updater
    // hands any new request the running download), so the pill stays truthful
    useUpdateStore.getState().setAvailable('1.4.0')
    expect(useUpdateStore.getState().status).toBe('downloading')
    expect(useUpdateStore.getState().version).toBe('1.3.0')
  })

  it('regresses a completed download only for a genuinely newer version', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().setDownloaded('1.3.0')

    useUpdateStore.getState().setAvailable('1.3.0')
    expect(useUpdateStore.getState().status).toBe('downloaded')

    useUpdateStore.getState().setAvailable('1.4.0')
    expect(useUpdateStore.getState().status).toBe('available')
    expect(useUpdateStore.getState().version).toBe('1.4.0')
  })

  it('turns a download error into a retry state only while downloading', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().setDownloadError()
    expect(useUpdateStore.getState().downloadFailed).toBe(false)

    useUpdateStore.getState().startDownload()
    useUpdateStore.getState().setDownloadError()

    const state = useUpdateStore.getState()
    expect(state.status).toBe('available')
    expect(state.downloadFailed).toBe(true)
    expect(selectUpdatePillVisible(state)).toBe(true)
  })

  it('installs only once a download has completed', () => {
    useUpdateStore.getState().setAvailable('1.3.0')
    useUpdateStore.getState().installUpdate()
    expect(updaterApi.installUpdate).not.toHaveBeenCalled()

    useUpdateStore.getState().setDownloaded('1.3.0')
    useUpdateStore.getState().installUpdate()
    expect(updaterApi.installUpdate).toHaveBeenCalledTimes(1)
  })
})
