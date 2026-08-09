import { Download, RotateCw, X } from 'lucide-react'
import { selectUpdatePillVisible, useUpdateStore } from '@/stores/useUpdateStore'

export function UpdatePill(): React.JSX.Element | null {
  const visible = useUpdateStore(selectUpdatePillVisible)
  const status = useUpdateStore((s) => s.status)
  const version = useUpdateStore((s) => s.version)
  const percent = useUpdateStore((s) => s.percent)
  const downloadFailed = useUpdateStore((s) => s.downloadFailed)
  const dismiss = useUpdateStore((s) => s.dismiss)
  const startDownload = useUpdateStore((s) => s.startDownload)
  const installUpdate = useUpdateStore((s) => s.installUpdate)

  if (!visible) return null

  const downloading = status === 'downloading'
  const label =
    status === 'downloaded'
      ? 'Restart to update'
      : downloading
        ? 'Downloading'
        : downloadFailed
          ? 'Retry download'
          : 'Update available'
  // An adopted mid-download state may not know its version yet
  const versionSuffix = version ? ` v${version}` : ''
  const title =
    status === 'downloaded'
      ? `Restart Hive to finish installing${versionSuffix}`
      : downloading
        ? `Downloading update${versionSuffix}`
        : downloadFailed
          ? `Download failed${versionSuffix ? ` for${versionSuffix}` : ''} — click to retry`
          : `Update${versionSuffix} available — click to download`
  const Icon = status === 'downloaded' ? RotateCw : Download

  return (
    <div className="border-t p-2" data-testid="update-pill">
      <div className="group relative flex h-7 w-full items-center overflow-hidden rounded-md border border-primary/20 bg-primary/10 text-[11px] font-medium text-primary">
        {downloading && (
          <div
            data-testid="update-pill-progress-fill"
            className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        )}
        <button
          type="button"
          data-testid="update-pill-action"
          title={title}
          disabled={downloading}
          onClick={status === 'downloaded' ? installUpdate : startDownload}
          className="relative flex h-full min-w-0 flex-1 items-center gap-1.5 px-2 transition-colors enabled:cursor-pointer enabled:hover:bg-primary/10"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          {downloading && (
            <span className="ml-auto text-[10px] tabular-nums text-primary/70">
              {Math.round(percent)}%
            </span>
          )}
        </button>
        {status === 'available' && (
          <button
            type="button"
            data-testid="update-pill-dismiss"
            aria-label="Dismiss until next launch"
            title="Dismiss until next launch"
            onClick={dismiss}
            className="relative mr-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-primary/60 opacity-0 transition-opacity hover:bg-primary/15 hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
