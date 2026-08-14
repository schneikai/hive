import { cn } from '@/lib/utils'
import { ShipWheel, X } from 'lucide-react'

interface QueuedMessageBubbleProps {
  content: string
  canSteer?: boolean
  isLoading?: boolean
  onSteer?: () => void
  onDelete?: () => void
}

export function QueuedMessageBubble({ content, canSteer, isLoading, onSteer, onDelete }: QueuedMessageBubbleProps): React.JSX.Element {
  return (
    <div className="flex justify-end px-6 py-4 opacity-70" data-testid="queued-message-bubble">
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3', 'bg-primary/10 text-foreground')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium bg-primary-foreground/20 rounded px-1.5 py-0.5">
            QUEUED
          </span>
          {canSteer && (
            <button
              type="button"
              onClick={onSteer}
              disabled={isLoading}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              title="Steer — inject into active turn"
            >
              <ShipWheel className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              className={cn(
                "text-muted-foreground hover:text-destructive transition-colors",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Remove queued message"
              title="Remove queued message"
              data-testid="queued-message-delete"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
      </div>
    </div>
  )
}
