# Inventory — shadcn ui primitives (src/renderer/src/components/ui/)

**Notes:** Scope reality check: several primitives named in the brief do not exist in this repo — there is no badge.tsx, card.tsx, select.tsx, command.tsx, separator.tsx or scroll-area.tsx under src/renderer/src/components/ui/. The 21 files present are the ones inventoried. cmdk (0.2.1) is a dependency but the command palette is hand-rolled at src/renderer/src/components/command-palette/CommandPalette.tsx (outside this area) and uses the same opaque `bg-popover shadow-xl rounded-lg` recipe — it needs the identical glass treatment and should be flagged to whoever owns that area.

Clean bill on two axes: there are ZERO hardcoded purple/violet/indigo/fuchsia literals, zero raw hsl(260 ...)/oklch values, and zero DM Sans references inside components/ui/. All purple in these primitives arrives indirectly through the `--primary` token, which is defined at src/renderer/src/styles/globals.css:103 (light `oklch(0.488 0.217 270)`) and :140 (dark `oklch(0.588 0.217 270)`), with `--ring: var(--primary)` at :115 and :152. The font is also global: `font-family: 'DM Sans'` at globals.css:13 and `--font-sans: 'DM Sans', ...` at :82 must become Geist. That file is outside my area but every entry above is downstream of it.

The primary-flip is the dominant risk in this area. Because --primary goes purple -> #e5e5e5 (near-white in dark), five spots silently invert meaning and must be repointed BEFORE the token flip lands, not after: checkbox.tsx:19 `border-primary` on the unchecked box, HintBadge.tsx:12-13 `bg-primary/20 text-primary` (matched hint char becomes white-on-white), HelpOverlay.tsx:23 and :205 (`text-primary bg-primary/15` highlight + INSERT mode pill), Tip.tsx:78 `bg-primary` accent rail, and button.tsx:13's `shadow-[0_1px_2px_--theme(--color-primary/24%)]` which turns into a white glow halo. `--ring: var(--primary)` also means every `ring-ring/*` currently renders purple; once ring becomes #737373 the /24 opacities in button.tsx:8, input.tsx:11 and textarea.tsx:10 will be almost invisible, which is exactly why the orca recipe specifies /50.

Two systematic patterns repeat across nearly every overlay and should be fixed with one sweep rather than file-by-file: (1) the `relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]` inner-sheen pseudo-element appears in button.tsx:8, popover.tsx:29, hover-card.tsx:40, dialog.tsx:40, alert-dialog.tsx:53, dropdown-menu.tsx:49 and :68, and context-menu.tsx:49 and :67 — it is a skeuomorphic bevel that directly contradicts orca's flat hairline look and should be deleted everywhere; (2) `shadow-lg/5` / `shadow-md/5` / `shadow-xs/5` on the same set plus tooltip.tsx:39, input.tsx:11, textarea.tsx:10 and button.tsx:17-18 — orca uses near-zero shadow in chrome and exactly one dual shadow `0 16px 36px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)` on floating glass. Note that stripping `overflow-hidden` from the menu contents is a behavior change, not just cosmetic: it currently clips submenu flyouts and any absolutely-positioned child (Tip.tsx:78's rail depends on it), so keep it selectively.

Radius has a token collision worth resolving before anyone writes classes. globals.css:84-86 defines `--radius: 0.625rem` (10px), so `rounded-sm` = 6px and `rounded-md` = 8px in THIS repo. The brief's "chrome rows rounded-md/6px" is therefore self-contradictory here — 6px is `rounded-sm`, not `rounded-md`. Every menu row today is already `rounded-sm` (= 6px, correct); I wrote the entries as explicit `rounded-[6px]` to be unambiguous, but the cleaner fix is to retune `--radius-md` to 6px once, globally, and leave the row classes alone. Decide this first or the sweep will produce mixed 6/8px rows.

dropdown-menu.tsx and context-menu.tsx are near-duplicate files that have already drifted (separator is `bg-muted` in dropdown vs `bg-border` in context; dropdown items carry `[&_svg]:size-4` guards that context items lack; context items omit `gap-2`). Extract shared `menuContentClass` / `menuItemClass` constants as part of this migration, otherwise the glass recipe will be applied twice and drift again.

Finally, the sizing sweep has the widest blast radius outside these files: 69 `size="icon"` call sites exist and 33 of them hand-roll `h-6 w-6` / `h-7 w-7` / `h-8 w-8` overrides because button.tsx offers only `icon: size-9`. Adding `icon-xs` (size-6) and `icon-sm` (size-7) is cheap, but landing it without sweeping those overrides leaves the old sizes winning via cn() merge order — plan the variant addition and the call-site sweep as one change.

## 1. src/renderer/src/components/ui/button.tsx (8)
- **What:** Base cva string: `rounded-md text-sm ... focus-visible:border-ring focus-visible:ring-ring/24 focus-visible:ring-[3px] ... relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]` — a glossy inner-highlight sheen on EVERY button plus a 24%-opacity focus ring, 14px text.
- **Change:** Replace ring opacity with the orca recipe `focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring`; drop the whole `relative overflow-hidden before:*` sheen block (and its `dark:before:` twin) so chrome is flat; change `text-sm` -> `text-[13px]` and add `tracking-[0.01em]`; keep `rounded-md` only if radius-md is retuned, otherwise `rounded-[6px]` for chrome rows.
- **Risk:** Removing `relative overflow-hidden` changes stacking/clipping for callers that absolutely-position badges inside buttons (e.g. status dots); grep `<Button` for `absolute` children before deleting `relative`.

## 2. src/renderer/src/components/ui/button.tsx (13)
- **What:** `default` variant: `bg-primary text-primary-foreground shadow-[0_1px_2px_--theme(--color-primary/24%)] hover:bg-primary/90` — the drop shadow is tinted with `--primary`, which today is purple `oklch(0.588 0.217 270)`.
- **Change:** Delete the primary-tinted shadow entirely (orca = near-zero shadows in chrome): `bg-primary text-primary-foreground hover:bg-primary/90`. Once --primary flips to #e5e5e5 that shadow would render as a white glow halo under every primary button.
- **Risk:** Primary buttons become near-white/dark-text in dark mode; audit call sites that put colored icons inside a default Button.

## 3. src/renderer/src/components/ui/button.tsx (17)
- **What:** `outline` variant: `border border-input bg-background shadow-xs/5 dark:bg-input/32 hover:bg-accent/50 dark:hover:bg-input/64` — hover changes only fill, never the border; carries a shadow.
- **Change:** Adopt the orca outline recipe: `border border-input bg-transparent hover:bg-accent/50 hover:border-muted-foreground/35 dark:bg-input/30 dark:hover:bg-input/50` and drop `shadow-xs/5`. Border must lift to `muted-foreground/35` on hover since orca has no shadow cue.

## 4. src/renderer/src/components/ui/button.tsx (18)
- **What:** `secondary` variant carries `shadow-xs/5`.
- **Change:** Remove `shadow-xs/5` — orca chrome is shadowless; contrast comes from `bg-secondary` (#262626) against `bg-background` (#0a0a0a).

## 5. src/renderer/src/components/ui/button.tsx (23-28)
- **What:** Size scale is web-sized and has a single icon size: `default: h-9`, `sm: h-8`, `lg: h-10`, `icon: size-9`. 28 call sites across the renderer hand-roll `h-6 w-6` and 5 more `h-7 w-7` on top of `size="icon"` because no small icon size exists.
- **Change:** Retune for 13px-dense chrome and add icon sub-sizes: `default: 'h-8 px-3 py-1.5 has-[>svg]:px-2.5'`, `sm: 'h-7 gap-1.5 px-2.5 has-[>svg]:px-2'`, `lg: 'h-9 px-5'`, `icon: 'size-8'`, plus new `'icon-sm': 'size-7'` and `'icon-xs': 'size-6 [&_svg:not([class*=size-])]:size-3.5'`. Then sweep the 33 hand-rolled overrides onto the named variants.
- **Risk:** Shrinking `default` from h-9 to h-8 shifts every toolbar/dialog footer row; verify dialog footers and settings forms don't reflow.

## 6. src/renderer/src/components/ui/tooltip.tsx (39)
- **What:** TooltipContent is a mini-popover, not inverted: `bg-popover text-popover-foreground border border-border ... rounded-md px-3 py-1.5 text-xs shadow-md/5`.
- **Change:** Invert per orca: `bg-foreground text-background rounded-md px-2 py-1 text-[11px] font-medium tracking-[0.01em] shadow-none` and DROP `border border-border` (a border on an inverted chip reads as a seam). All 47 TooltipContent call sites are plain text (only `max-w-*`/`space-y-*` overrides), so inversion is safe.

## 7. src/renderer/src/components/ui/tooltip.tsx (45)
- **What:** Tooltip Arrow: `bg-popover fill-popover z-50 size-2.5 ... rounded-[2px] border border-border` — filled with the popover token and bordered.
- **Change:** Retarget to the inverted surface: `bg-foreground fill-foreground` and remove `border border-border`, otherwise the rotated square renders as a border-colored diamond floating off the inverted bubble.

## 8. src/renderer/src/components/ui/popover.tsx (29)
- **What:** PopoverContent is an OPAQUE card: `rounded-md border bg-popover p-4 text-popover-foreground shadow-lg/5` + the `before:` sheen pseudo + `relative overflow-hidden`.
- **Change:** Convert to the orca frosted-glass menu: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] p-3 text-[13px]`; delete `shadow-lg/5` and the whole `before:*`/`dark:before:*` sheen.
- **Risk:** `overflow-hidden` here clips nested absolutely-positioned children (Tip.tsx relies on it for the accent bar); keep `overflow-hidden` only where a rounded child needs clipping.

## 9. src/renderer/src/components/ui/hover-card.tsx (40, 54)
- **What:** HoverCardContent duplicates the opaque popover recipe (`rounded-md border bg-popover p-4 shadow-lg/5` + `before:` sheen); HoverCardArrow is `bg-popover fill-popover`.
- **Change:** Apply the identical glass recipe as PopoverContent (rounded-[11px], black/14|white/14 border, rgba glass bg, backdrop-blur-2xl, dual shadow, no `before:` sheen). Arrow must switch to a token that matches the glass fill or be dropped — `fill-popover` on a translucent surface produces a visibly opaque nub.

## 10. src/renderer/src/components/ui/dropdown-menu.tsx (49, 68)
- **What:** DropdownMenuSubContent (L49) and DropdownMenuContent (L68) are opaque: `rounded-md border bg-popover p-1 text-popover-foreground shadow-lg/5` plus the `before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]` sheen and `relative overflow-hidden`.
- **Change:** Both -> orca glass menu: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] p-1 text-[13px]`; strip `shadow-lg/5`, the `before:*` pseudo, and `overflow-hidden` (it clips submenu flyouts).

## 11. src/renderer/src/components/ui/dropdown-menu.tsx (29, 88, 104, 127)
- **What:** SubTrigger (L29), Item (L88), CheckboxItem (L104), RadioItem (L127) all use `rounded-sm px-2 py-1.5 text-sm` with `focus:bg-accent`. `text-sm` is 14px (orca chrome is 13px) and `--accent` becomes a strong #404040 that reads heavy on a translucent menu.
- **Change:** Set rows to `rounded-[6px] px-2 py-1.5 text-[13px] tracking-[0.01em]` and soften the highlight to `focus:bg-black/6 dark:focus:bg-white/8 focus:text-accent-foreground` (or `focus:bg-accent/60`) so the hover state doesn't punch through the frosted panel.

## 12. src/renderer/src/components/ui/dropdown-menu.tsx (150, 162, 169)
- **What:** Label is `px-2 py-1.5 text-sm font-semibold` (not an orca section header); Separator uses `bg-muted` (#262626 — a solid block on glass) while ContextMenu's uses `bg-border`; Shortcut uses `opacity-60` instead of a muted token.
- **Change:** Label -> `px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground`. Separator -> `-mx-1 my-1 h-px bg-border` (align with context-menu, hairline 7% white). Shortcut -> `ml-auto text-[11px] tracking-widest text-muted-foreground` (drop `opacity-60`).

## 13. src/renderer/src/components/ui/context-menu.tsx (49, 67)
- **What:** ContextMenuSubContent (L49) and ContextMenuContent (L67) are the same opaque `rounded-md border bg-popover p-1 shadow-lg/5` + `before:` sheen + `relative overflow-hidden` recipe as dropdown-menu.
- **Change:** Identical change to dropdown-menu content: `rounded-[11px] border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl` + dual shadow, remove `shadow-lg/5`, the `before:*` sheen and `overflow-hidden`. Keep dropdown-menu and context-menu byte-identical — consider extracting one shared `menuContentClass` const so they cannot drift again.

## 14. src/renderer/src/components/ui/context-menu.tsx (29, 86, 102, 125, 148)
- **What:** SubTrigger/Item/CheckboxItem/RadioItem all `rounded-sm px-2 py-1.5 text-sm focus:bg-accent`; Label is `text-sm font-semibold text-foreground`. Items also lack the `[&_svg]:size-4 [&_svg]:shrink-0` guard that dropdown-menu has, so icons render inconsistently between the two menus.
- **Change:** Rows -> `rounded-[6px] px-2 py-1.5 text-[13px] gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:pointer-events-none` with `focus:bg-black/6 dark:focus:bg-white/8`. Label -> `text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground` (drop `text-foreground`/`font-semibold`).

## 15. src/renderer/src/components/ui/dialog.tsx (40)
- **What:** DialogContent: `border bg-background p-6 shadow-lg/5 ... sm:rounded-lg` + `relative overflow-hidden` + the `before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]` sheen — fully opaque, no blur, 10px radius only at sm.
- **Change:** Orca dialog glass: `rounded-[11px] border border-black/14 dark:border-white/14 bg-background/96 backdrop-blur-xl p-5 shadow-[0_24px_64px_rgba(0,0,0,0.35)]`; drop `shadow-lg/5`, the `before:*` sheen, and the `sm:`-only radius so the radius is unconditional.

## 16. src/renderer/src/components/ui/dialog.tsx (22)
- **What:** DialogOverlay: `bg-black/32 backdrop-blur-sm` — a light scrim that leaves the #0a0a0a app visible behind a glass dialog, killing the frosted separation.
- **Change:** Deepen to `bg-black/50 backdrop-blur-[2px]` (or `bg-background/60`) so the `bg-background/96` glass panel actually reads as lifted.

## 17. src/renderer/src/components/ui/dialog.tsx (46)
- **What:** Dialog close button: `rounded-sm opacity-70 ring-offset-background ... focus:ring-2 focus:ring-ring focus:ring-offset-2` — pre-orca `ring-2 + ring-offset` focus recipe and an opacity-based (not token-based) rest state.
- **Change:** Swap to the orca ring and a real hit target: `size-6 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-accent/60 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring`; drop `opacity-70`, `ring-offset-*` and `focus:ring-2`.

## 18. src/renderer/src/components/ui/alert-dialog.tsx (53, 30)
- **What:** AlertDialogContent (L53) is opaque `bg-background ... rounded-lg border p-6 shadow-lg/5` + `before:` sheen; AlertDialogOverlay (L30) is `bg-black/32 backdrop-blur-sm`.
- **Change:** Mirror the dialog.tsx changes exactly: content -> `rounded-[11px] border-black/14 dark:border-white/14 bg-background/96 backdrop-blur-xl p-5` with the deep single shadow and no `before:*` sheen; overlay -> `bg-black/50`. Dialog and AlertDialog must not diverge visually.

## 19. src/renderer/src/components/ui/alert-dialog.tsx (123)
- **What:** AlertDialogMedia: `bg-muted mb-2 inline-flex size-16 items-center justify-center rounded-md` — a 64px muted block with an 8px radius, oversized for 13px-dense orca chrome.
- **Change:** Tighten to `size-10 rounded-[10px] bg-secondary text-muted-foreground *:[svg:not([class*='size-'])]:size-5` so the confirm dialogs read as dense chrome rather than a marketing modal.

## 20. src/renderer/src/components/ui/input.tsx (11)
- **What:** `h-9 ... px-3 py-1 text-base shadow-xs/5 ... focus-visible:ring-[3px] focus-visible:ring-ring/24 focus-visible:border-ring ... md:text-sm dark:bg-input/32` — correct 3px ring width but wrong opacity (/24 vs orca /50), plus a shadow and a `text-base`→`md:text-sm` dance.
- **Change:** `h-8 px-2.5 text-[13px] tracking-[0.01em]` with `focus-visible:ring-ring/50` (drop `/24`), remove `shadow-xs/5`, remove the `text-base ... md:text-sm` pair, keep `border-input` and `dark:bg-input/30`.
- **Risk:** h-9→h-8 changes alignment in every settings form and inline rename field.

## 21. src/renderer/src/components/ui/textarea.tsx (10)
- **What:** `min-h-[60px] ... text-sm shadow-xs/5 focus-visible:ring-[3px] focus-visible:ring-ring/24` — same off-spec /24 ring opacity and shadow as input.
- **Change:** `focus-visible:ring-ring/50`, drop `shadow-xs/5`, `text-sm` -> `text-[13px]`; keep the rest so input and textarea stay in lockstep.

## 22. src/renderer/src/components/ui/checkbox.tsx (19-22)
- **What:** Hand-rolled (non-Radix) checkbox: `border border-primary` on the UNCHECKED box and `data-[state=checked]:bg-primary`, plus the legacy `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` recipe and `rounded-sm`.
- **Change:** `border-input` for the resting border (an unchecked box must not be drawn in --primary), keep `data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary`, and replace the focus block with `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring` (delete `ring-offset-background`/`ring-offset-2`/`ring-2`). Size `size-4 rounded-[4px]`.
- **Risk:** Today the unchecked outline is purple and clearly visible; with --primary at #e5e5e5 an unchanged `border-primary` would render a near-white outline on every unchecked box — this is the highest-visibility primary-flip regression in the primitives.

## 23. src/renderer/src/components/ui/switch.tsx (18)
- **What:** Focus recipe is already orca-correct (`focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`) but the track carries `shadow-xs`.
- **Change:** Drop `shadow-xs` only. Otherwise leave as-is and use this string as the canonical focus-ring reference when fixing button/input/textarea/checkbox/tabs.

## 24. src/renderer/src/components/ui/tabs.tsx (14, 26)
- **What:** TabsList `h-9 rounded-md bg-muted p-1` and TabsTrigger `rounded-sm px-3 py-1 text-sm ... data-[state=active]:bg-background data-[state=active]:shadow-sm` — a pill-in-a-tray with a drop shadow on the active tab, 14px text, and NO focus-visible ring at all.
- **Change:** Flatten and densify: List -> `h-8 rounded-[8px] bg-secondary p-0.5 text-muted-foreground`; Trigger -> `rounded-[6px] px-2.5 py-1 text-[13px] tracking-[0.01em] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none` plus the missing `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`. Delete `data-[state=active]:shadow-sm`.

## 25. src/renderer/src/components/ui/sonner.tsx (7, 15)
- **What:** `theme="dark"` is hardcoded (toasts stay dark in light mode), and toast surface is `bg-background border-border shadow-lg rounded-lg` — opaque, no blur, 10px radius, 14px default text.
- **Change:** Pass `theme` from the app theme store instead of hardcoding `"dark"`; retarget the toast class to the orca overlay recipe `rounded-[11px] border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] text-[13px]` and drop `shadow-lg`.
- **Risk:** Status accent bars on L16-19 (green/red/blue/amber left borders) are semantic and stay; only align `border-l-green-500` -> `border-l-emerald-500` to match the orca done token.

## 26. src/renderer/src/components/ui/HelpOverlay.tsx (187, 196)
- **What:** Overlay card is `rounded-lg border border-border bg-background shadow-2xl p-5` over a `bg-black/60` backdrop — an opaque panel with the heaviest Tailwind shadow, the opposite of the orca near-zero-shadow / frosted rule.
- **Change:** Match the orca dialog: `rounded-[11px] border border-black/14 dark:border-white/14 bg-background/96 backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.35)] p-5` and replace `shadow-2xl`. Backdrop `bg-black/60` -> `bg-black/50 backdrop-blur-[2px]`.

## 27. src/renderer/src/components/ui/HelpOverlay.tsx (23, 202-205)
- **What:** Uses --primary as a BRAND highlight: matched hint char is `text-primary font-bold bg-primary/15 decoration-primary`, and the INSERT-mode pill is `text-primary bg-primary/10 border-primary/30`. Both rely on primary being a saturated purple that pops against grey.
- **Change:** Repoint both to explicit tokens that survive the neutral flip: hint char -> `text-foreground bg-foreground/12 decoration-foreground/60`; the INSERT pill is a mode signal, so give it a real status color (e.g. `text-emerald-500 bg-emerald-500/12 border-emerald-500/30`) rather than `primary`.
- **Risk:** With --primary at #e5e5e5 these become near-white text on a near-white 10-15% wash — the mode pill loses all distinction from the NORMAL state.

## 28. src/renderer/src/components/ui/HelpOverlay.tsx (37)
- **What:** kbd chip: `min-w-[22px] h-[22px] rounded border border-border/60 bg-muted/40 text-foreground` — `rounded` is 4px and the border is a diluted 60% of an already-7% hairline, so it nearly vanishes on orca's #0a0a0a.
- **Change:** `rounded-[5px] border border-border bg-secondary text-[11px] text-muted-foreground` — use the full-strength hairline, not `border-border/60`, now that --border is already only 7% white.

## 29. src/renderer/src/components/ui/HintBadge.tsx (11-14)
- **What:** The `select` action mode (the default and by far the most common) is styled `bg-primary/20 border-primary/60` + `text-primary` — pure brand-purple usage in the vim hint overlay, while `pin`/`archive` correctly use green/red status colors.
- **Change:** Repoint `select` to neutral-with-emphasis: `bg: 'bg-foreground/15 border-foreground/50'`, `text: 'text-foreground'` (or a deliberate status hue if selection should stay chromatic). Leave the `pin`/`archive` green/red entries untouched — those are semantic.
- **Risk:** Once --primary is #e5e5e5, `text-primary` on `bg-primary/20` is white-on-white-wash and the matched hint character becomes unreadable.

## 30. src/renderer/src/components/ui/Tip.tsx (78)
- **What:** `<div className="w-[3px] shrink-0 bg-primary" />` — a 3px brand-colored accent rail down the left edge of every tip popover, currently purple.
- **Change:** Change to a neutral or informational token: `bg-border` for pure chrome, or `bg-blue-400` if tips should read as an informational status. A `bg-primary` rail becomes a bright near-white stripe against the frosted popover.

## 31. src/renderer/src/components/ui/Tip.tsx (69, 87, 95)
- **What:** `className="w-64 p-0 overflow-hidden"` cancels the popover padding while relying on `overflow-hidden` to clip the accent rail; buttons are hand-sized `h-7 text-xs`.
- **Change:** Keep `overflow-hidden` here (the rail needs the 11px corner clip) even after it is removed from the shared PopoverContent recipe, and swap `h-7 text-xs` for the new `size="sm"` variant once button sizes are retuned so tip buttons stop drifting from the scale.

## 32. src/renderer/src/components/ui/provider-icon.tsx (16-19, 29-34)
- **What:** GitHub and the fallback use `bg-zinc-200 dark:bg-zinc-700` / `text-zinc-700 dark:text-zinc-200` — the zinc ramp is blue-tinted, whereas orca's greyscale is the pure `neutral` ramp (#171717/#262626/#404040/#a1a1a1).
- **Change:** Swap to orca tokens: `bg-secondary` + `text-foreground` (or `bg-neutral-200 dark:bg-neutral-700` / `text-neutral-700 dark:text-neutral-200`) so provider chips don't carry a cool cast next to true-neutral chrome. Leave the Jira `bg-blue-500` entry alone — that is brand-of-a-third-party, not Hive chrome.

## 33. src/renderer/src/components/ui/loading.tsx (17, 30)
- **What:** `LoadingSpinner` is a generic `Loader2 animate-spin text-muted-foreground`; `LoadingOverlay` uses `bg-background/80 backdrop-blur-sm`.
- **Change:** Low priority: keep the neutral spinner for generic loading, but if any agent-working state routes through `LoadingSpinner` it must instead use the orca yellow-500 stepped ring — audit call sites and split a `<WorkingSpinner>` out rather than tinting this one. Bump overlay to `bg-background/85 backdrop-blur-md` to match the dialog blur family.

