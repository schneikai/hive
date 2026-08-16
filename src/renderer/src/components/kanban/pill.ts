/**
 * Orca board pill recipes (from the orca design-system port).
 *
 * Base: bordered, transparent, 10px chip. Tinted status pills reuse the base
 * geometry and swap in their semantic border/bg/text colors.
 */
export const ticketPillBaseClass =
  'inline-flex items-center gap-1 rounded-full border px-[7px] py-[2px] text-[10px] font-medium leading-[1.3]'

/** Neutral pill — hairline border, transparent fill, muted text. */
export const ticketPillClass = `${ticketPillBaseClass} border-border bg-transparent text-muted-foreground`
