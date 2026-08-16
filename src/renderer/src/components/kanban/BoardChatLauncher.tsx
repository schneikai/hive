import { Bot, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BoardChatStatus } from '@/stores/useBoardChatStore'

interface BoardChatLauncherProps {
  disabled?: boolean
  disabledReason?: string
  onClick: () => void
  status: BoardChatStatus
}

function getStatusTone(status: BoardChatStatus): string {
  switch (status) {
    case 'thinking':
    case 'starting':
      return 'bg-emerald-500'
    case 'awaiting_confirmation':
      return 'bg-amber-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-sky-500'
  }
}

export function BoardChatLauncher({
  disabled = false,
  disabledReason,
  onClick,
  status
}: BoardChatLauncherProps): React.JSX.Element {
  return (
    <div className="pointer-events-auto">
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        title={disabledReason}
        className={cn(
          'h-7 rounded-md border-border bg-card px-2.5 shadow-none',
          disabled
            ? 'text-muted-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-muted-foreground/35'
        )}
      >
        {disabled ? (
          <Bot className="h-3 w-3" />
        ) : (
          <span className={cn('h-2 w-2 rounded-full', getStatusTone(status))} />
        )}
        <MessageSquareText className="h-3 w-3" />
        <span className="text-[12px] font-medium">Board Assistant</span>
      </Button>
    </div>
  )
}
