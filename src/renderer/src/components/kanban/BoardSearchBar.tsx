import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useKanbanStore } from '@/stores/useKanbanStore'

const SEARCH_DEBOUNCE_MS = 150

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

  // The input is locally controlled so typing stays instant; the store query
  // (which drives filtering, highlights, and the count) updates debounced.
  const [inputValue, setInputValue] = useState(query)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPendingQuery = (): void => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  useEffect(() => cancelPendingQuery, [])

  const handleChange = (value: string): void => {
    setInputValue(value)
    cancelPendingQuery()
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      setBoardSearchQuery(value)
    }, SEARCH_DEBOUNCE_MS)
  }

  const hasText = inputValue.trim().length > 0
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
      className="flex shrink-0 items-center gap-3 px-4 pt-2.5 pb-0 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="relative w-60">
        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          data-testid="board-search-input"
          placeholder="Search tickets…"
          autoFocus
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              cancelPendingQuery()
              closeBoardSearch()
            } else if (e.key === 'Enter') {
              // Flush the pending debounce — search now
              cancelPendingQuery()
              setBoardSearchQuery(inputValue)
            }
          }}
          className="h-7 w-full rounded-md border border-input bg-input/30 pl-8 pr-8 text-[12px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <button
          data-testid="board-search-close"
          title={hasText ? 'Clear' : 'Close (Escape)'}
          onClick={() => {
            if (hasText) {
              cancelPendingQuery()
              setInputValue('')
              setBoardSearchQuery('')
              inputRef.current?.focus()
            } else {
              closeBoardSearch()
            }
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="h-3 w-3" />
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
