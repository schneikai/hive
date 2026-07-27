import { useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useKanbanStore } from '@/stores/useKanbanStore'

interface BoardSearchBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>
  matchCount: number
}

export function BoardSearchBar({ inputRef, matchCount }: BoardSearchBarProps): React.JSX.Element {
  const query = useKanbanStore((s) => s.boardSearch.query)
  const searchDescriptions = useKanbanStore((s) => s.boardSearch.searchDescriptions)
  const setBoardSearchQuery = useKanbanStore((s) => s.setBoardSearchQuery)
  const setBoardSearchDescriptions = useKanbanStore((s) => s.setBoardSearchDescriptions)
  const closeBoardSearch = useKanbanStore((s) => s.closeBoardSearch)
  const hasQuery = query.trim().length > 0

  // Bare Tab is globally bound to session:mode-toggle (allowInInput, document
  // capture) — swallow it at window capture while inside the search bar so
  // tabbing to the switch doesn't toggle a hidden session's plan/build mode.
  // preventDefault is NOT called, preserving normal focus traversal.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (!target?.closest?.('[data-testid="board-search-bar"]')) return
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  return (
    <div
      data-testid="board-search-bar"
      className="flex shrink-0 items-center gap-3 px-3 pt-3 pb-0 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="relative w-[320px]">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          data-testid="board-search-input"
          placeholder="Search tickets…"
          autoFocus
          value={query}
          onChange={(e) => setBoardSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              closeBoardSearch()
            }
          }}
          className="w-full rounded-md border border-border bg-muted/50 py-1.5 pl-8 pr-8 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          data-testid="board-search-close"
          title={hasQuery ? 'Clear' : 'Close (Escape)'}
          onClick={() => {
            if (hasQuery) {
              setBoardSearchQuery('')
              inputRef.current?.focus()
            } else {
              closeBoardSearch()
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
        <Switch
          data-testid="board-search-descriptions-toggle"
          size="sm"
          checked={searchDescriptions}
          onCheckedChange={setBoardSearchDescriptions}
        />
        Search descriptions
      </label>
      {hasQuery && (
        <span
          data-testid="board-search-count"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {matchCount === 0 ? 'No matches' : matchCount === 1 ? '1 match' : `${matchCount} matches`}
        </span>
      )}
    </div>
  )
}
