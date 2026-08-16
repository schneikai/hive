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
    // Orca footer slot: hairline sidebar border, px-2 py-1.5 rhythm; pill uses the
    // search-field surface (hairline border + 5% foreground wash) at h-7.
    <div
      className="shrink-0 border-t border-worktree-sidebar-border px-2 py-1.5"
      data-testid="update-pill"
    >
      <div className="group relative flex h-7 w-full items-center overflow-hidden rounded-md border border-worktree-sidebar-border/70 bg-worktree-sidebar-foreground/5 text-[11px] font-medium text-worktree-sidebar-foreground">
        {downloading && (
          <div
            data-testid="update-pill-progress-fill"
            className="absolute inset-y-0 left-0 bg-worktree-sidebar-foreground/8 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        )}
        <button
          type="button"
          data-testid="update-pill-action"
          title={title}
          disabled={downloading}
          onClick={status === 'downloaded' ? installUpdate : startDownload}
          className="relative flex h-full min-w-0 flex-1 items-center gap-1.5 px-2 transition-colors enabled:cursor-pointer enabled:hover:bg-worktree-sidebar-foreground/8"
        >
          <Icon className="size-3.5 shrink-0 text-blue-500" />
          <span className="truncate">{label}</span>
          {downloading && (
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
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
            className="relative mr-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent/70 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}
