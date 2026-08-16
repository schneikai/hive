import { useState, memo } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import Ansi from 'ansi-to-react'
import { containsAnsi, stripAnsi } from '@/lib/ansi-utils'
import { copyTextToClipboard } from '@/lib/clipboard'

interface CodeBlockProps {
  code: string
  language?: string
}

export const CodeBlock = memo(function CodeBlock({
  code,
  language = 'typescript'
}: CodeBlockProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    if (await copyTextToClipboard(stripAnsi(code))) {
      setCopied(true)
      toast.success('Code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Failed to copy code')
    }
  }

  return (
    <div
      className="relative group my-4 rounded-lg overflow-hidden border border-border bg-secondary"
      data-testid="code-block"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-foreground/[0.04]">
        <span className="text-xs font-medium text-muted-foreground uppercase">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid="copy-code-button"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground">
        <code>{containsAnsi(code) ? <Ansi>{code}</Ansi> : code}</code>
      </pre>
    </div>
  )
})
