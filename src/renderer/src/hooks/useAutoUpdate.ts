import { useEffect } from 'react'
import { toast } from '@/lib/toast'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUpdateStore } from '@/stores/useUpdateStore'
import { useForceUpdateStore } from '@/stores/useForceUpdateStore'
import { updaterApi } from '@/api/updater-api'

export function useAutoUpdate(): void {
  useEffect(() => {
    const cleanups: (() => void)[] = []

    // Update available — surface the sidebar update pill
    cleanups.push(
      updaterApi.onUpdateAvailable((data) => {
        const { skippedUpdateVersion } = useSettingsStore.getState()
        const isManual = data.isManualCheck ?? false

        // Suppress for "Skip this version" — a legacy setting written by the
        // removed toast UI; still respected, but nothing sets it anymore.
        // Never suppress while the org's forced update is enforcing: the
        // blocking modal needs the available state to offer the download.
        const forceUpdateActive = useForceUpdateStore.getState().requiredVersion !== null
        if (skippedUpdateVersion === data.version && !isManual && !forceUpdateActive) return

        useUpdateStore.getState().setAvailable(data.version, { revealDismissed: isManual })
        if (isManual) {
          // The store holds an in-flight/completed download of another version,
          // so report what is actually happening rather than the announcement
          const { status, version } = useUpdateStore.getState()
          if (status === 'downloaded') {
            toast.info(`Update v${version} is ready to install`, {
              description: 'Restart Hive from the button at the bottom of the sidebar'
            })
          } else if (status === 'downloading') {
            toast.info(`Update v${version} is downloading`, {
              description: 'Progress is shown at the bottom of the sidebar'
            })
          } else {
            toast.info(`Update v${data.version} available`, {
              description: 'Download it from the button at the bottom of the sidebar',
              action: {
                label: 'Download',
                onClick: () => useUpdateStore.getState().startDownload()
              }
            })
          }
        }
      })
    )

    // No update available — show info toast on manual checks
    cleanups.push(
      updaterApi.onUpdateNotAvailable((data) => {
        if (data.isManualCheck) {
          toast.info('You’re up to date', {
            description: `Hive v${data.version} is the latest version`
          })
        }
      })
    )

    // Download progress — reflect inside the pill
    cleanups.push(
      updaterApi.onProgress((data) => {
        useUpdateStore.getState().setProgress(data.percent)
      })
    )

    // Update downloaded — pill switches to "Restart to update"
    cleanups.push(
      updaterApi.onUpdateDownloaded((data) => {
        useUpdateStore.getState().setDownloaded(data.version)
      })
    )

    // Error — a download failure flips the pill to its retry state; check
    // failures never disturb an in-flight download and stay silent unless
    // the user asked for the check
    cleanups.push(
      updaterApi.onError((data) => {
        const wasDownloading = useUpdateStore.getState().status === 'downloading'
        const isDownloadError = data.source ? data.source === 'download' : wasDownloading
        if (isDownloadError) {
          useUpdateStore.getState().setDownloadError()
          toast.error('Update download failed', {
            description: data.message
          })
        } else if (data.isManualCheck) {
          toast.error('Update check failed', {
            description: data.message
          })
        }
      })
    )

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])
}
