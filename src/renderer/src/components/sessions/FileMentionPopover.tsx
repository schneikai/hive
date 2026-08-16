import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { FileIcon } from '@/components/file-tree/FileIcon'
import type { FlatFile } from '@/lib/file-search-utils'

interface FileMentionPopoverProps {
  suggestions: FlatFile[]
  selectedIndex: number
  visible: boolean
  onSelect: (file: FlatFile) => void
  onClose: () => void
  onNavigate: (direction: 'up' | 'down') => void
}

export function FileMentionPopover({
  suggestions,
  selectedIndex,
  visible,
  onSelect,
  onClose,
  onNavigate
}: FileMentionPopoverProps): React.JSX.Element | null {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-mention-item]')
    const item = items[selectedIndex]
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Keyboard navigation (capture phase, same as SlashCommandPopover)
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        onNavigate('down')
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        onNavigate('up')
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        const file = suggestions[selectedIndex]
        if (file) {
          onSelect(file)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [visible, suggestions, selectedIndex, onSelect, onClose, onNavigate])

  if (!visible) return null

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 z-50"
      data-testid="file-mention-popover"
    >
      <div
        ref={listRef}
        role="listbox"
        className="mx-3 p-1 rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_10px_38px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.22)] max-h-48 overflow-y-auto"
      >
        {suggestions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No files found</div>
        ) : (
          suggestions.map((file, index) => (
            <div
              key={file.relativePath}
              data-mention-item
              data-testid="file-mention-item"
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                'flex items-center gap-2 rounded-[6px] px-2 py-1.5 cursor-pointer text-[13px] overflow-hidden',
                index === selectedIndex && 'bg-black/6 dark:bg-white/8 text-foreground'
              )}
              onClick={() => onSelect(file)}
            >
              <FileIcon name={file.name} extension={file.extension} isDirectory={false} />
              <span className="font-medium truncate shrink-0 max-w-[200px]">{file.name}</span>
              <span className="text-xs text-muted-foreground truncate min-w-0">
                {file.relativePath}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
