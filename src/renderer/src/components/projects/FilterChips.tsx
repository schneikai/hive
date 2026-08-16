import { LanguageIcon } from './LanguageIcon'

interface FilterChipsProps {
  languages: string[]
  onRemove: (lang: string) => void
}

export function FilterChips({ languages, onRemove }: FilterChipsProps): React.JSX.Element | null {
  if (languages.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onRemove(lang)}
          title={lang}
          className="flex size-5 cursor-pointer items-center justify-center rounded-md border border-worktree-sidebar-border/80 bg-worktree-sidebar-foreground/5 transition-colors hover:border-destructive/50 hover:bg-destructive/20"
          data-testid={`filter-chip-${lang}`}
        >
          <LanguageIcon language={lang} />
        </button>
      ))}
    </div>
  )
}
