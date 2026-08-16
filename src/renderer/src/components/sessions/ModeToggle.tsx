import { memo } from 'react'
import { Hammer, Map } from 'lucide-react'
import { useSessionStore, type SessionMode } from '@/stores/useSessionStore'
import { baseMode, isSuperMode } from '@shared/agent-mode-prefixes'
import { cn } from '@/lib/utils'

interface ModeToggleProps {
  sessionId: string
}

const MODE_CONFIG: Record<
  'build' | 'plan',
  { label: string; icon: typeof Hammer; description: string }
> = {
  build: {
    label: 'Build',
    icon: Hammer,
    description: 'Execute code changes and implementations'
  },
  plan: {
    label: 'Plan',
    icon: Map,
    description: 'Plan and design before implementing'
  }
}

export const ModeToggle = memo(function ModeToggle({
  sessionId
}: ModeToggleProps): React.JSX.Element {
  const rawMode = useSessionStore((state) => state.modeBySession.get(sessionId))
  const mode: SessionMode =
    rawMode === 'plan' || rawMode === 'super-plan' || rawMode === 'super-build'
      ? rawMode
      : 'build'
  const toggleSessionMode = useSessionStore((state) => state.toggleSessionMode)

  const config = MODE_CONFIG[baseMode(mode)] ?? MODE_CONFIG.build
  const Icon = config.icon
  const isSuper = isSuperMode(mode)

  return (
    <button
      onClick={() => toggleSessionMode(sessionId)}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[0.01em] transition-colors',
        'border select-none',
        isSuper
          ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20'
          : mode === 'build'
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20'
            : 'bg-violet-500/10 border-violet-500/30 text-violet-500 hover:bg-violet-500/20'
      )}
      title={`${config.description} (Tab to toggle, Shift+Tab for Super)`}
      aria-label={`Current mode: ${config.label}. Click to switch to ${baseMode(mode) === 'build' ? 'Plan' : 'Build'} mode`}
      data-testid="mode-toggle"
      data-mode={mode}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{config.label}</span>
    </button>
  )
})
