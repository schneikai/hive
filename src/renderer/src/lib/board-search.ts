import type { KanbanTicket } from '../../../main/db/types'

export function normalizeSearchText(s: string): string {
  return s.normalize('NFC').toLowerCase()
}

/** Strip markdown syntax so snippets read as prose and matching is WYSIWYG. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type TicketMatchKind = 'title' | 'description' | null

/** normQuery must already be normalizeSearchText()-ed. Empty query = match everything (as 'title'). */
export function ticketMatchesQuery(
  ticket: Pick<KanbanTicket, 'title' | 'description'>,
  normQuery: string,
  searchDescriptions: boolean
): TicketMatchKind {
  if (!normQuery) return 'title'
  if (normalizeSearchText(ticket.title).includes(normQuery)) return 'title'
  if (
    searchDescriptions &&
    ticket.description &&
    normalizeSearchText(stripMarkdown(ticket.description)).includes(normQuery)
  ) {
    return 'description'
  }
  return null
}

export interface Snippet {
  before: string
  match: string
  after: string
  prefixEllipsis: boolean
  suffixEllipsis: boolean
}

/** One-line ~80-char excerpt around the FIRST match; ~30 chars of context before,
 *  start snapped forward to the nearest word boundary. Returns null if no match. */
export function extractSnippet(
  strippedText: string,
  normQuery: string,
  contextBefore = 30,
  total = 80
): Snippet | null {
  if (!normQuery) return null
  const display = strippedText.normalize('NFC')
  const idx = display.toLowerCase().indexOf(normQuery)
  if (idx === -1) return null
  let start = Math.max(0, idx - contextBefore)
  if (start > 0) {
    const sp = display.indexOf(' ', start)
    if (sp !== -1 && sp < idx) start = sp + 1
  }
  const end = Math.min(display.length, start + Math.max(total, normQuery.length + 20))
  return {
    before: display.slice(start, idx),
    match: display.slice(idx, idx + normQuery.length),
    after: display.slice(idx + normQuery.length, end),
    prefixEllipsis: start > 0,
    suffixEllipsis: end < display.length
  }
}
