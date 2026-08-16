import ghosttyIcon from '@/assets/ghostty-icon.png'

interface GhosttyPromoToastProps {
  onActivate: () => void
  onDismiss: () => void
}

export function GhosttyPromoToast({
  onActivate,
  onDismiss
}: GhosttyPromoToastProps): React.JSX.Element {
  return (
    <div className="flex w-[360px] flex-col gap-3 rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] p-4">
      <div className="flex items-start gap-3">
        <img src={ghosttyIcon} alt="Ghostty" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Ghostty native terminal available</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Metal-accelerated rendering with your Ghostty config
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Don&apos;t show again
        </button>
        <button
          onClick={onActivate}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Activate
        </button>
      </div>
    </div>
  )
}
