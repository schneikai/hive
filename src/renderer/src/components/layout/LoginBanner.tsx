import { Loader2 } from 'lucide-react'
import { useLoginStore } from '@/stores/useLoginStore'
import { Button } from '@/components/ui/button'

const PROVIDER_LABEL: Record<'anthropic' | 'openai', string> = {
  anthropic: 'Claude',
  openai: 'OpenAI'
}

export function LoginBanner(): React.JSX.Element | null {
  const activeLogin = useLoginStore((s) => s.activeLogin)
  const cancelLogin = useLoginStore((s) => s.cancelLogin)

  if (!activeLogin) return null

  const providerName = PROVIDER_LABEL[activeLogin.provider]

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-11"
      data-testid="login-banner"
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        <span className="text-foreground">
          Signing in to {providerName} — complete the sign-in in Chrome…
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] rounded-md"
          onClick={() => cancelLogin()}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
