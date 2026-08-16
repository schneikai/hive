import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

interface AgentPickerDialogProps {
  onSelect: (sdk: 'opencode' | 'claude-code' | 'codex') => void
  availableSdks: { opencode: boolean; claude: boolean; codex: boolean }
}

const sdkCardClass = cn(
  'flex-1 px-4 py-3 rounded-md border border-border',
  'hover:border-ring/50 hover:bg-accent transition-colors',
  'text-center cursor-pointer'
)

export function AgentPickerDialog({
  onSelect,
  availableSdks
}: AgentPickerDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Choose Your AI Agent
          </AlertDialogTitle>
          <AlertDialogDescription>
            Multiple AI agents are installed. Choose which one to use as the default for new
            sessions. You can change this later in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 pt-2">
          {availableSdks.opencode && (
            <button
              onClick={() => onSelect('opencode')}
              className={sdkCardClass}
            >
              <div className="text-[13px] font-medium">OpenCode</div>
              <div className="text-[11px] text-muted-foreground mt-1">Open-source AI coding agent</div>
            </button>
          )}
          {availableSdks.claude && (
            <button
              onClick={() => onSelect('claude-code')}
              className={sdkCardClass}
            >
              <div className="text-[13px] font-medium">Claude Code</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Anthropic&apos;s coding assistant
              </div>
            </button>
          )}
          {availableSdks.codex && (
            <button
              onClick={() => onSelect('codex')}
              className={sdkCardClass}
            >
              <div className="text-[13px] font-medium">Codex</div>
              <div className="text-[11px] text-muted-foreground mt-1">OpenAI&apos;s coding agent</div>
            </button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
