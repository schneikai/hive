import { Terminal } from 'lucide-react'
import Ansi from 'ansi-to-react'

interface BashCommandBubbleProps {
  command: string
  output: string
  status: 'running' | 'exited' | 'killed' | 'truncated' | 'error'
}

export function BashCommandBubble({ command, output, status }: BashCommandBubbleProps) {
  return (
    <div>
      {/* Command header */}
      <div className="bg-foreground/[0.04] border border-border rounded-t-md px-3 py-2 font-mono text-xs">
        <div className="flex items-start gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-emerald-400 select-none shrink-0">$</span>
          <span className="text-foreground whitespace-pre-wrap break-all">{command}</span>
        </div>
      </div>

      {/* Output area - only if there's output or it's running */}
      {(output || status === 'running') && (
        <div className="bg-secondary border border-t-0 border-border rounded-b-md px-3 py-2 font-mono text-xs">
          {output && (
            <div className="text-muted-foreground whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
              <Ansi>{output}</Ansi>
            </div>
          )}
          {status === 'running' && (
            <div className="flex items-center gap-1.5 mt-1 text-emerald-400/70 text-[10px]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              running…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
