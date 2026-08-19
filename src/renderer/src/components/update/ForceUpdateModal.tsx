import { useEffect, useState } from 'react'
import { DownloadCloud } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { updaterApi } from '@/api/updater-api'
import { useForceUpdateStore, forceUpdateSnoozeLockMs } from '@/stores/useForceUpdateStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUpdateStore } from '@/stores/useUpdateStore'

// A manual check's result toasts arrive via useAutoUpdate; this window only
// bounds the local "Checking…" button state when no event lands.
const CHECKING_RESET_MS = 10_000

/**
 * Org policy blocker: the organization requires a newer app version. The
 * dialog is deliberately non-dismissable (controlled `open`, no
 * `onOpenChange`) — the only ways out are updating or the snooze button,
 * which stays disabled for an exponentially growing period per prior snooze.
 */
export function ForceUpdateModal(): React.JSX.Element | null {
  const modalOpen = useForceUpdateStore((state) => state.modalOpen)
  const modalOpenedAt = useForceUpdateStore((state) => state.modalOpenedAt)
  const requiredVersion = useForceUpdateStore((state) => state.requiredVersion)
  const currentVersion = useForceUpdateStore((state) => state.currentVersion)
  const snoozeCount = useForceUpdateStore((state) => state.snoozeCount)
  const snooze = useForceUpdateStore((state) => state.snooze)
  const orgName = useSettingsStore((state) => state.hiveOrganizationName)

  const updateStatus = useUpdateStore((state) => state.status)
  const percent = useUpdateStore((state) => state.percent)
  const downloadFailed = useUpdateStore((state) => state.downloadFailed)
  const startDownload = useUpdateStore((state) => state.startDownload)
  const installUpdate = useUpdateStore((state) => state.installUpdate)

  const [checking, setChecking] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const snoozeLockMs = forceUpdateSnoozeLockMs(snoozeCount)
  const snoozeLockRemainingMs =
    modalOpen && modalOpenedAt !== null ? Math.max(0, modalOpenedAt + snoozeLockMs - now) : 0
  const snoozeLocked = snoozeLockRemainingMs > 0

  // Re-anchor the countdown clock each time the modal opens.
  useEffect(() => {
    if (modalOpen) setNow(Date.now())
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen || !snoozeLocked) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [modalOpen, snoozeLocked])

  // If no update is known when the blocker opens, look for one right away.
  useEffect(() => {
    if (!modalOpen) return
    if (useUpdateStore.getState().status !== 'idle') return
    setChecking(true)
    void updaterApi.checkForUpdate({ manual: false }).catch(() => {})
  }, [modalOpen])

  // The check's outcome arrives via updater events (not the RPC reply); stop
  // the spinner when the store leaves idle, or give up after a bound.
  useEffect(() => {
    if (!checking) return
    if (updateStatus !== 'idle') {
      setChecking(false)
      return
    }
    const timer = setTimeout(() => setChecking(false), CHECKING_RESET_MS)
    return () => clearTimeout(timer)
  }, [checking, updateStatus])

  if (!modalOpen || !requiredVersion) return null

  const snoozeSeconds = Math.ceil(snoozeLockRemainingMs / 1000)

  const handleCheck = (): void => {
    setChecking(true)
    void updaterApi.checkForUpdate({ manual: false }).catch(() => {})
  }

  let primaryAction: React.JSX.Element
  if (updateStatus === 'downloaded') {
    primaryAction = (
      <Button data-testid="force-update-primary" onClick={installUpdate}>
        Restart to update
      </Button>
    )
  } else if (updateStatus === 'downloading') {
    primaryAction = (
      <Button data-testid="force-update-primary" disabled>
        Downloading… {Math.round(percent)}%
      </Button>
    )
  } else if (updateStatus === 'available') {
    primaryAction = (
      <Button data-testid="force-update-primary" onClick={startDownload}>
        {downloadFailed ? 'Retry download' : 'Download update'}
      </Button>
    )
  } else {
    primaryAction = (
      <Button data-testid="force-update-primary" onClick={handleCheck} disabled={checking}>
        {checking ? 'Checking…' : 'Check for updates'}
      </Button>
    )
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent data-testid="force-update-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <DownloadCloud className="size-5 text-primary" />
            Update required
          </AlertDialogTitle>
          <AlertDialogDescription>
            {orgName ?? 'Your organization'} requires Hive {requiredVersion} or newer. You&apos;re
            currently on {currentVersion ?? 'an older version'}. Update to keep using Hive.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {updateStatus === 'downloading' && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              data-testid="force-update-progress-fill"
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        )}
        {updateStatus === 'idle' && !checking && (
          <p className="text-xs text-muted-foreground">
            No update found yet — it may still be rolling out. Try again in a moment.
          </p>
        )}
        <AlertDialogFooter>
          <Button
            data-testid="force-update-snooze"
            variant="outline"
            disabled={snoozeLocked}
            onClick={() => snooze()}
          >
            {snoozeLocked ? `Snooze (${snoozeSeconds}s)` : 'Snooze'}
          </Button>
          {primaryAction}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
