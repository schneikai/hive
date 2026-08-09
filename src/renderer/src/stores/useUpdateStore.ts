import { create } from 'zustand'
import { updaterApi } from '@/api/updater-api'

export type UpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded'

interface UpdateStoreState {
  status: UpdateStatus
  version: string | null
  percent: number
  downloadFailed: boolean
  dismissedVersion: string | null

  setAvailable: (version: string, options?: { revealDismissed?: boolean }) => void
  setProgress: (percent: number) => void
  setDownloaded: (version: string) => void
  setDownloadError: () => void
  dismiss: () => void
  startDownload: () => void
  installUpdate: () => void
}

export const selectUpdatePillVisible = (state: UpdateStoreState): boolean =>
  state.status === 'downloading' ||
  state.status === 'downloaded' ||
  (state.status === 'available' && state.dismissedVersion !== state.version)

export const useUpdateStore = create<UpdateStoreState>()((set, get) => ({
  status: 'idle',
  version: null,
  percent: 0,
  downloadFailed: false,
  dismissedVersion: null,

  setAvailable: (version, options) => {
    const { status, version: currentVersion } = get()
    // An in-flight download can't be redirected (electron-updater hands any
    // new request the running download), so hold state until it settles;
    // re-checks also re-announce the same version — don't regress a
    // completed download back to "available" for it
    if (status === 'downloading') return
    if (status === 'downloaded' && version === currentVersion) return
    set((state) => ({
      status: 'available',
      version,
      percent: 0,
      downloadFailed: false,
      dismissedVersion: options?.revealDismissed ? null : state.dismissedVersion
    }))
  },

  setProgress: (percent) => {
    // A progress event means a download is running even if this renderer never
    // started it — another window did, or this window remounted mid-download —
    // so adopt it (the version arrives with the downloaded event). Running
    // progress also invalidates any stale failure flag, so a revived download
    // can't strand the pill in a disabled retry mixture.
    if (get().status === 'downloaded') return
    set({
      status: 'downloading',
      percent: Math.min(100, Math.max(0, percent)),
      downloadFailed: false
    })
  },

  setDownloaded: (version) => {
    set({ status: 'downloaded', version, percent: 100, downloadFailed: false })
  },

  setDownloadError: () => {
    if (get().status !== 'downloading') return
    set({ status: 'available', percent: 0, downloadFailed: true })
  },

  dismiss: () => {
    const { status, version } = get()
    if (status !== 'available') return
    set({ dismissedVersion: version })
  },

  startDownload: () => {
    if (get().status !== 'available') return
    set({ status: 'downloading', percent: 0, downloadFailed: false })
    // The RPC reply is not a completion signal — the relay times out at 5s
    // while real downloads keep going; failures arrive via updater:error
    updaterApi.downloadUpdate().catch(() => {})
  },

  installUpdate: () => {
    if (get().status !== 'downloaded') return
    updaterApi.installUpdate().catch(() => {})
  }
}))

declare global {
  interface Window {
    __hive_useUpdateStore__?: typeof useUpdateStore
  }
}

const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } }

if (importMeta.env?.DEV && typeof window !== 'undefined') {
  window.__hive_useUpdateStore__ = useUpdateStore
}

