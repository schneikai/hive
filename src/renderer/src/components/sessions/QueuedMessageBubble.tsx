import { cn } from '@/lib/utils'
import { ShipWheel } from 'lucide-react'

interface QueuedMessageBubbleProps {
  content: string
  canSteer?: boolean
  isLoading?: boolean
  onSteer?: () => void
}

export function QueuedMessageBubble({
  content,
  canSteer,
  isLoading,
  onSteer
}: QueuedMessageBubbleProps): React.JSX.Element {
  return (
    <div className="flex justify-end px-6 py-4 opacity-70" data-testid="queued-message-bubble">
      <div
        className={cn(
          'max-w-[80%] rounded-[10px] border border-dashed border-border bg-secondary px-3 py-2 text-foreground'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium bg-foreground/10 text-muted-foreground rounded px-1.5 py-0.5">
            QUEUED
          </span>
          {canSteer && (
            <button
              type="button"
              onClick={onSteer}
              disabled={isLoading}
              className={cn(
                'text-muted-foreground hover:text-foreground transition-colors',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              title="Steer — inject into active turn"
            >
              <ShipWheel className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </button>
          )}
        </div>
        <p className="text-[13px] whitespace-pre-wrap break-words leading-[1.55]">{content}</p>
      </div>
    </div>
  )
}
