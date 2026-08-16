import { cn } from '@/lib/utils'
import { HandoffSplitButton } from './HandoffSplitButton'
import type { HandoffSelectionOverride } from '@/lib/handoffSelection'
import { useSettingsStore } from '@/stores/useSettingsStore'

function MnemonicLabel({ letter, label }: { letter: string; label: string }): React.JSX.Element {
  const index = label.toLowerCase().indexOf(letter.toLowerCase())
  if (index === -1) return <span>{label}</span>
  return (
    <span>
      {label.slice(0, index)}
      <span className="font-semibold underline underline-offset-2 decoration-2">
        {label[index]}
      </span>
      {label.slice(index + 1)}
    </span>
  )
}

interface PlanReadyImplementFabProps {
  onImplement: () => void
  onHandoff: (override: HandoffSelectionOverride) => void
  onCopyPlan: () => void
  visible: boolean
  onSuperpowers?: () => void
  onSuperpowersLocal?: () => void
  superpowersAvailable?: boolean
  isConnectionSession?: boolean
  onSaveAsTicket?: () => void
  onSaveAsFile?: () => void
  worktreeId?: string
}

export function PlanReadyImplementFab({
  onImplement,
  onHandoff,
  onCopyPlan,
  visible,
  onSuperpowers,
  onSuperpowersLocal,
  superpowersAvailable,
  isConnectionSession,
  onSaveAsTicket,
  onSaveAsFile,
  worktreeId
}: PlanReadyImplementFabProps): React.JSX.Element {
  const vimModeEnabled = useSettingsStore((s) => s.vimModeEnabled)

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 z-10',
        'flex items-center gap-2',
        'transition-all duration-200',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      {onSaveAsTicket && (
        <button
          onClick={onSaveAsTicket}
          className={cn(
            'h-8 rounded-md px-3',
            'text-[11px] font-medium',
            'bg-secondary text-foreground border border-border',
            'shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:bg-accent transition-colors duration-200',
            'cursor-pointer',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          aria-label="Save plan as ticket"
          data-testid="plan-ready-save-ticket-fab"
        >
          {vimModeEnabled ? <MnemonicLabel letter="s" label="Save as ticket" /> : 'Save as ticket'}
        </button>
      )}
      {onSaveAsFile && (
        <button
          onClick={onSaveAsFile}
          className={cn(
            'h-8 rounded-md px-3',
            'text-[11px] font-medium',
            'bg-secondary text-foreground border border-border',
            'shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:bg-accent transition-colors duration-200',
            'cursor-pointer',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          aria-label="Save plan as md file"
          data-testid="plan-ready-save-file-fab"
        >
          {vimModeEnabled ? (
            <MnemonicLabel letter="f" label="Save as md file" />
          ) : (
            'Save as md file'
          )}
        </button>
      )}
      <button
        onClick={onCopyPlan}
        className={cn(
          'h-8 rounded-md px-3',
          'text-[11px] font-medium',
          'bg-secondary text-foreground border border-border',
          'shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:bg-accent transition-colors duration-200',
          'cursor-pointer',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Copy plan markdown"
        data-testid="plan-ready-copy-plan-fab"
      >
        {vimModeEnabled ? <MnemonicLabel letter="c" label="Copy plan" /> : 'Copy plan'}
      </button>
      <div className={cn(visible ? 'opacity-100' : 'opacity-0')}>
        <HandoffSplitButton
          worktreeId={worktreeId}
          onHandoff={onHandoff}
          vimModeEnabled={vimModeEnabled}
          testIdPrefix="plan-ready"
        />
      </div>
      {superpowersAvailable && !isConnectionSession && onSuperpowersLocal && (
        <button
          onClick={onSuperpowersLocal}
          className={cn(
            'h-8 rounded-md px-3',
            'text-[11px] font-medium',
            'bg-secondary text-foreground border border-border hover:bg-accent',
            'shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-colors duration-200',
            'cursor-pointer',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          aria-label="Supercharge plan locally"
          data-testid="plan-ready-supercharge-local-fab"
        >
          {vimModeEnabled ? (
            <MnemonicLabel letter="o" label="Supercharge locally" />
          ) : (
            'Supercharge locally'
          )}
        </button>
      )}
      {superpowersAvailable && onSuperpowers && (
        <button
          onClick={onSuperpowers}
          className={cn(
            'h-8 rounded-md px-3',
            'text-[11px] font-medium',
            'bg-secondary text-foreground border border-border',
            'shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:bg-accent transition-colors duration-200',
            'cursor-pointer',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          aria-label="Supercharge plan"
          data-testid="plan-ready-supercharge-fab"
        >
          {vimModeEnabled ? <MnemonicLabel letter="u" label="Supercharge" /> : 'Supercharge'}
        </button>
      )}
      <button
        onClick={onImplement}
        className={cn(
          'h-8 rounded-md px-3',
          'text-[11px] font-medium',
          'bg-primary text-primary-foreground',
          'shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:bg-primary/90 transition-colors duration-200',
          'cursor-pointer',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-label="Implement plan"
        data-testid="plan-ready-implement-fab"
      >
        {vimModeEnabled ? <MnemonicLabel letter="m" label="Implement" /> : 'Implement'}
      </button>
    </div>
  )
}
