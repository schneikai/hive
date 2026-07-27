import { normalizeSearchText } from '@/lib/board-search'

/** Wraps every case-insensitive occurrence of normQuery in a <mark>.
 *  normQuery must be pre-normalized (normalizeSearchText); '' renders plain text. */
export function HighlightedText({
  text,
  normQuery
}: {
  text: string
  normQuery: string
}): React.JSX.Element {
  if (!normQuery) return <>{text}</>
  const display = text.normalize('NFC')
  const hay = normalizeSearchText(display)
  const parts: React.ReactNode[] = []
  let cursor = 0
  let idx = hay.indexOf(normQuery)
  while (idx !== -1) {
    if (idx > cursor) parts.push(display.slice(cursor, idx))
    parts.push(
      <mark key={idx} className="bg-primary/25 text-inherit rounded-[3px] px-px">
        {display.slice(idx, idx + normQuery.length)}
      </mark>
    )
    cursor = idx + normQuery.length
    idx = hay.indexOf(normQuery, cursor)
  }
  if (cursor < display.length) parts.push(display.slice(cursor))
  return <>{parts}</>
}
