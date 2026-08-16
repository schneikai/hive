// Shared orca recipes for dropdown-menu.tsx and context-menu.tsx.
// Both menus MUST consume these constants so the glass surface and row
// styling cannot drift between the two near-duplicate files.

/** Frosted-glass menu surface (content + sub-content). */
export const menuContentClass =
  'relative z-50 min-w-[8rem] rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl p-1 text-[13px] text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]'

/** Menu row (item, checkbox item, radio item, sub-trigger). */
export const menuItemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] tracking-[0.01em] outline-none transition-colors focus:bg-black/6 dark:focus:bg-white/8 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0"

/** Open-state wash for sub-triggers (matches the focus wash). */
export const menuSubTriggerOpenClass =
  'data-[state=open]:bg-black/6 dark:data-[state=open]:bg-white/8 data-[state=open]:text-accent-foreground'

/** Section label. */
export const menuLabelClass =
  'px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground'

/** Hairline separator on glass. */
export const menuSeparatorClass = '-mx-1 my-1 h-px bg-border'

/** Keyboard-shortcut hint. */
export const menuShortcutClass = 'ml-auto text-[11px] tracking-widest text-muted-foreground'
