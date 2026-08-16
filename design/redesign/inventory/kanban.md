# Inventory — Kanban board (src/renderer/src/components/kanban)

**Notes:** Baseline: this worktree has ALREADY migrated the token layer — src/renderer/src/styles/globals.css lines 101-183 hold the full orca light/dark palettes (--primary #e5e5e5 dark / #171717 light, --border rgb(255 255 255/.07), --worktree-sidebar #2a2a2a, --radius 0.625rem) and --font-sans is already 'Geist' (line 88). No DM Sans, no hsl(260)/oklch purples, and no grain overlay anywhere under components/kanban. So every finding below is component-level chrome that still encodes the pre-orca look.

The single biggest systemic issue is the primary flip: `bg-primary`/`text-primary`/`border-primary`/`ring-primary` used to mean "brand purple" and now resolve to near-white #e5e5e5 in dark. Board occurrences: KanbanColumn.tsx 403/841/854/1025/1109, KanbanTicketCard.tsx 1141/1145, BoardAssistantView.tsx 414/522, TicketCreateModal.tsx 232. Note that KanbanBoard.tsx:452 (`bg-primary text-primary-foreground` Done button) is the one case that is CORRECT under orca — mockup `.board-btn.primary` is exactly that — so do not neutralize it.

Second systemic issue: badge pill recipe. Every neutral pill on the board is the filled `rounded-full bg-muted/40 px-2 py-0.5 text-[11px]` chip; the mockup's `.t-pill` is a bordered, transparent, 10px chip. Worth extracting one shared const (kanban/pill.ts) consumed by KanbanTicketCard, FavoriteTicketsPane, TicketModelBadge and BoardAssistantView rather than 15 individual edits.

Radius scale reference (globals.css 92-98): rounded-sm=6px, rounded-md=8px, rounded-lg=10px, rounded-xl=14px, rounded-2xl=18px, rounded-3xl=22px. The mockup's ticket card is 8px (= rounded-md, already right); the 2xl/3xl surfaces in BoardAssistantView are the outliers.

Explicitly NOT reported (semantic status colors that stay): sky-500 remote badge (1167), violet-500 subagent count + plan-ready + auto-approve pills (1210/1356/1367), emerald-500 shell (1229), cyan-500 monitor (1248), amber-500 blocked/asking (1189/1476/1486), red-500 error badge (1380), blue-500 build timer (1478), amber dependency arcs in KanbanBoard.tsx:540, telegram brand #229ED9 (1176), destructive markdown-diagnostic chips.

Out-of-area but board-facing: the board toolbar (Search/Favorites/Import/Export Board/New ticket row from mockup lines 632-639) is NOT in components/kanban — it lives in components/sessions/SessionTabs.tsx (~1774 for "Export Board", 1789 for the ImportTicketsModal mount). IndeterminateProgressBar and UserBubble/AssistantCanvas also live under components/sessions/. Also --font-mono is still 'SF Mono' (globals.css 89) while the mockups spec Geist Mono for the mono pills (`.t-pill.p-model`, `.t-pill.p-pr`) — a token-layer fix owned by whoever holds globals.css.

## 1. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1072-1074)
- **What:** Card chrome is `rounded-md border bg-card shadow-sm p-2` + `hover:bg-muted/40`; the drop shadow and background-shift hover are the old lifted-card look.
- **Change:** Drop `shadow-sm` (orca chrome is near-zero shadow), keep `rounded-md` (=8px, matches mockup .ticket), bump padding to `px-2.5 pt-2.5 pb-2` (mockup 10px/9px), and change hover from `hover:bg-muted/40` to a border-only hover: `hover:border-muted-foreground/35` with `transition-[border-color,background-color] duration-150`.
- **Risk:** Tests assert on card classes? none found, but hover affordance becomes subtler — verify drag hit-feel.

## 2. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1080-1082)
- **What:** `borderState` paints the WHOLE card border blue-500/60 (build running) or violet-500/60 (plan/plan-ready). In 06-board.html the ticket border is always neutral `var(--border)`; mode color appears only in the progress bar + timer.
- **Change:** Replace the full-perimeter tint with the neutral border (`border-border`) and let mode color live in the status row only; if a card-level cue is required, reduce to a 2px left rail (`border-l-2 border-blue-500/60` / `border-l-2 border-violet-500/60`) instead of all four sides.
- **Risk:** Mode-at-a-glance scanning gets weaker; keep the violet hue itself (plan-mode semantic stays), only reduce its surface area.

## 3. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1086, 1791)
- **What:** `ticket.mark === 'epic'` renders `border-l-4 !border-l-purple-500` and the context-menu swatch `bg-purple-500` — the last raw purple in board chrome.
- **Change:** Re-map the epic mark off purple (e.g. `!border-l-violet-500` only if you accept the plan-mode collision, otherwise `!border-l-fuchsia-500` or a neutral `!border-l-muted-foreground`), and update the matching dot at line 1791 to the same token. Also narrow `border-l-4` to `border-l-2` so the rail is a hairline accent, not a slab.
- **Risk:** Marks are a user-chosen rarity taxonomy; changing hue changes learned meaning — coordinate with any other mark legend UI.

## 4. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1092, 1099, 1104)
- **What:** Card title is `text-sm` (14px); age/token stamps are `text-[10px]`/`text-[11px]`.
- **Change:** Title → `text-[13px] font-medium leading-[1.4]` per mockup `.t-title`; keep age at `text-[10px] tabular-nums text-muted-foreground/60`; drop the token counter to `text-[10px]` so the top row is one size band.

## 5. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1158, 1198, 1265, 1277, 1293, 1298, 1309, 1334, 1343)
- **What:** All neutral badges use the filled recipe `rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground` — solid grey chips.
- **Change:** Switch every neutral pill to the mockup `.t-pill` recipe: `inline-flex items-center gap-1 rounded-full border border-border bg-transparent px-[7px] py-[2px] text-[10px] font-medium leading-[1.3] text-muted-foreground` (icons `h-2.5 w-2.5`). Keep filled+tinted only for status pills (sky remote, violet subagent, emerald shell, cyan monitor, amber blocked, red error).
- **Risk:** 9 call sites — extract a shared `ticketPillClass` const to avoid drift.

## 6. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1523-1539)
- **What:** Goal-mode badge is hardcoded `border border-black/20 bg-white px-1.5 py-0.5 text-black shadow-sm` plus `ring-1 ring-white` on the status dots — a literal white chip that ignores theme tokens and inverts wrongly in light mode.
- **Change:** Token-ize: `rounded-full border border-border bg-secondary px-1.5 py-0.5 text-foreground` (no shadow); change the corner dots' `ring-white` to `ring-background` so the halo tracks the chip surface.
- **Risk:** CheckeredFlagIcon is drawn for a light backdrop — check the glyph still reads on #262626.

## 7. src/renderer/src/components/sessions/IndeterminateProgressBar.tsx (67-92, 112-117 (used at KanbanTicketCard.tsx 1403-1407, 1484, 1495))
- **What:** Board progress bar is a fat pill: `w-36 h-4 rounded-full` with a 15%-tinted track (`bg-blue-500/15` etc.) and a fully-rounded colored worm; card overrides only width (`w-20`).
- **Change:** Match mockup `.t-progress`: track `h-[3px] rounded-[2px] bg-foreground/8` (drop the per-mode 15% tint — the track is always neutral), bar `rounded-[2px]` in the mode color, wrapper `w-20` default with no `flex-col` label slot. Keep the mode hues (build blue-500 / plan violet-500 / super-plan orange / asking amber / reviewing emerald / conflicts fuchsia→destructive).
- **Risk:** Shared with SessionView + KanbanTicketModal — a size prop (`variant="card"`) may be safer than changing the base.

## 8. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1471-1490)
- **What:** Busy status row: timer is `text-[11px] font-semibold` in blue-500/violet-500/amber-500, and the "Question" label is amber-500.
- **Change:** Timer → `text-[10px] font-normal tabular-nums` in the mode color (mockup `.t-timer`); "Question" → the mockup `.t-question` recipe `text-[11px] font-medium text-orange-500` with the message-question icon, since orca maps question/permission to orange-500 (amber stays for blocked/attention).

## 9. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1500-1506)
- **What:** "Go to review" is `text-green-500 hover:text-green-400 text-xs` — green-500 (#22c55e) instead of the orca done token emerald-500 (#10b981), and no icon.
- **Change:** → `ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 hover:underline` with a `Check h-3 w-3` glyph (mockup `.t-review-link`). Same swap for the `PulseAnimation className="text-green-500"` at line 1351.

## 10. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1417-1426, 1453-1466)
- **What:** "Fix conflicts" is a solid `variant="destructive"` Button (`h-6 px-2 text-xs font-semibold`) — a saturated red slab inside a hairline card.
- **Change:** Replace with the mockup `.t-conflicts` chip: `ml-auto rounded-[5px] border border-destructive/30 bg-destructive/8 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/15`; keep the dropdown variant but style its trigger the same way.
- **Risk:** data-testid `kanban-ticket-fix-conflicts` is asserted in tests — keep the attribute on the new element.

## 11. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1139-1147)
- **What:** Board-search snippet uses `border-l-2 border-primary/40` and `<mark className="bg-primary/25">`. With primary now #e5e5e5 (dark) these render as a bright white rail and a 25%-white highlight block — leftovers from primary being a brand accent.
- **Change:** Rail → `border-l-2 border-border`; mark → `bg-foreground/12 text-foreground rounded-[3px] px-px` (or amber-500/20 if search hits should stay warm). Also drop the snippet to `text-[11px]` — already correct.

## 12. src/renderer/src/components/kanban/KanbanTicketCard.tsx (121-130)
- **What:** `PROJECT_TAG_COLORS` includes `#8b5cf6` (violet) and `#6366f1` (indigo) — the project-identity dot can render violet on the same card as the plan-mode violet pill, and the palette is fully saturated.
- **Change:** Swap to the mockup's desaturated identity hues (`#6ea8dc`, `#d4b962`, `#d49a7c`, `#e08a5e`, plus neutral-leaning variants) and remove violet/indigo so brand-ish purple never appears as chrome; leave the dot size at `h-2 w-2`.

## 13. src/renderer/src/components/kanban/KanbanTicketCard.tsx (1697, 1897)
- **What:** Destructive context-menu items use `text-red-500 focus:text-red-500` instead of the theme token.
- **Change:** → `text-destructive focus:text-destructive` so they track --destructive (#ff6568 dark / #e40014 light). Same swap in FavoriteTicketsPane.tsx:106 and AttachPRPopover.tsx:350 (`text-red-500` error line).

## 14. src/renderer/src/components/kanban/KanbanColumn.tsx (851-858)
- **What:** Column shell is `rounded-lg border-2 bg-card/50 p-2` — a 10px-radius, 2px-bordered, card-tinted panel. In 06-board.html a column (`.col`) has NO background and NO border; it is a bare 268px flex track on --background.
- **Change:** Reduce to `flex w-[268px] min-w-[268px] flex-col min-h-0` with no border/background in the idle state; move drag feedback to a 1px dashed outline applied only while `isDragOver`/`isDragging`.
- **Risk:** `flex-1 min-w-[220px] max-w-[300px]` currently makes columns stretch to fill; fixing the width changes board layout on wide windows — confirm with the board container padding change below.

## 15. src/renderer/src/components/kanban/KanbanColumn.tsx (853-857)
- **What:** Drag-over state is `border-dashed border-primary bg-primary/[0.03]`; with primary flipped purple→#e5e5e5 this is now a bright near-white dashed frame.
- **Change:** → `border-dashed border-muted-foreground/35 bg-foreground/[0.02]` (mockup `.drop-slot` uses muted-foreground/35 dashed on a 2%-foreground fill); keep the `isDragging` idle-column hint at `border-muted-foreground/20`.

## 16. src/renderer/src/components/kanban/KanbanColumn.tsx (838-843)
- **What:** Drop indicator is `h-0.5 rounded-full bg-primary` — a solid near-white 2px bar.
- **Change:** Either tone to `bg-muted-foreground/60` or, to match the mockup, render the `.drop-slot` recipe instead: `h-11 rounded-[8px] border-[1.5px] border-dashed border-muted-foreground/35 bg-foreground/[0.02] text-[11px] text-muted-foreground/70 grid place-items-center` with a "Drop here" label.
- **Risk:** `drop-indicator-${column}` testid is asserted; keep it and note the height change affects drop-index math visuals only.

## 17. src/renderer/src/components/kanban/KanbanColumn.tsx (863-915)
- **What:** Column header centers the title between spacers (`w-[50px]` spacer + `justify-center`) and uses `text-xs font-semibold uppercase tracking-wider`; count pill is `h-5 min-w-[20px] rounded-full bg-muted/40 text-[11px]`.
- **Change:** Left-align the header (`flex items-center gap-[7px] px-1.5 pt-1 pb-2.5`, drop the 50px spacer and the centering branch), title → `text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground`, count → `rounded-full bg-secondary px-[7px] py-px text-[10px] font-semibold tabular-nums tracking-normal text-muted-foreground` (archived suffix stays italic at 65% opacity). Right-side controls move to `ml-auto` and can fade in on column hover (mockup `.col-act` opacity 0→1).
- **Risk:** The `titleMode` measurement logic (fullTextMeasureRef/shortTextMeasureRef, lines 969-989) exists purely to fit the centered title — left-aligning may let you delete it; if you keep it, update the measurement spans to `text-[11px]` or the fit math drifts.

## 18. src/renderer/src/components/kanban/KanbanColumn.tsx (1022-1029, 1105-1113)
- **What:** Add-ticket dashed card: `rounded-md border-dashed border-border/60 p-2 text-sm ... hover:border-primary/40` — `border-primary/40` is now near-white, and `text-sm` is off the 13px chrome scale.
- **Change:** → `rounded-md border border-dashed border-border p-2 text-[13px] text-muted-foreground/60 hover:border-muted-foreground/35 hover:bg-secondary/40 hover:text-muted-foreground`; icon to `h-3.5 w-3.5`.

## 19. src/renderer/src/components/kanban/KanbanColumn.tsx (400-406)
- **What:** Active transition-sort toggle is `text-primary` — under orca that's #e5e5e5, i.e. indistinguishable from foreground and semantically stale (it meant "brand purple = active").
- **Change:** → `text-foreground` for active and `hover:bg-accent` instead of `hover:bg-muted/40`; also change the button shape from `rounded` (4px) to `rounded-md` and size to `h-6 w-6` to match the mockup `.icon-xs-btn`.

## 20. src/renderer/src/components/kanban/KanbanColumn.tsx (103-106, 1079-1085)
- **What:** Invalid-markdown placeholder card carries `shadow-sm`; the archived divider label is `text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50` with `border-border/40` rules.
- **Change:** Drop `shadow-sm` from the placeholder (near-zero shadow in chrome) and use `border-destructive/30 bg-destructive/8` to match the orca destructive chip ratio; divider label → `text-[11px] font-semibold tracking-[0.05em]` and rules → `border-border`.

## 21. src/renderer/src/components/kanban/KanbanBoard.tsx (440-456)
- **What:** Dependency-mode floating instruction bar is an opaque `bg-card border border-border rounded-lg shadow-lg` slab — not the orca frosted-overlay recipe.
- **Change:** → `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] px-3 py-2 text-[12px]`. The `bg-primary text-primary-foreground` Done button (line 452) is CORRECT under orca (mockup `.board-btn.primary`) — only shrink it to `h-7 rounded-md px-2.5 text-[12px]`.

## 22. src/renderer/src/components/kanban/KanbanBoard.tsx (478-483)
- **What:** Board scroll container is `gap-3 overflow-x-auto p-3`; mockup `.board` is `gap:12px; padding:10px 16px 16px`.
- **Change:** → `gap-3 overflow-x-auto px-4 pt-2.5 pb-4`; pair with the fixed 268px column width so columns stop stretching. Also give the horizontal scrollbar the orca hover-only thumb (`muted-foreground/28` with a 3px transparent inset).

## 23. src/renderer/src/components/kanban/BoardSearchBar.tsx (64, 88, 103)
- **What:** Search input is `rounded-md border border-border bg-muted/50 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring` in a `px-3 pt-3` bar; the clear button is `rounded p-0.5`.
- **Change:** Input → `h-7 w-60 rounded-md border border-input bg-input/30 pl-8 pr-8 text-[12px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` (orca focus recipe; `focus:ring-1` is the legacy one). Bar padding → `px-4 pt-2.5`. Clear button → `rounded-md p-1 hover:bg-accent`. Search icon → `h-3 w-3` at `left-2.5`.

## 24. src/renderer/src/components/kanban/BoardChatLauncher.tsx (41-54)
- **What:** Floating launcher is a `h-12 rounded-full ... shadow-sm` pill FAB — 48px tall, fully round, shadowed; nothing in orca chrome is a round shadowed FAB.
- **Change:** → `h-7 rounded-md border border-border bg-card px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-muted-foreground/35` with no shadow (mockup `.board-btn`), status dot to `h-2 w-2`, icons `h-3 w-3`; consider moving it into the board toolbar row rather than floating over the columns.
- **Risk:** KanbanBoard.tsx:553-558 offsets the launcher by `pr-[19.5rem]` for the favorites pane — re-check that spacer if the launcher relocates.

## 25. src/renderer/src/components/kanban/BoardAssistantView.tsx (414, 522)
- **What:** `bg-primary/12 text-primary` avatar circle and `bg-primary/10 text-primary` project pill — both were purple-brand tints; with primary = #e5e5e5 they now render as washed white-on-white chips with poor contrast.
- **Change:** Avatar → `h-7 w-7 rounded-md bg-secondary text-foreground`; project pill → the neutral `.t-pill` recipe (`rounded-full border border-border bg-transparent px-[7px] py-px text-[10px] text-muted-foreground`) with an optional colored identity dot.

## 26. src/renderer/src/components/kanban/BoardAssistantView.tsx (511, 649, 674, 780)
- **What:** Assistant surfaces use `rounded-2xl` (18px) and `rounded-3xl` (22px) with `shadow-sm` — far rounder and more lifted than orca's 6-10px hairline chrome.
- **Change:** Draft card 511 → `rounded-lg border border-border bg-card p-3` (no shadow); system message 649 → `rounded-md border border-border bg-secondary/50 px-3 py-2 text-[11px]`; draft group 674 and composer 780 → `rounded-lg border border-border bg-secondary/30 p-2`, drop both `shadow-sm`; nested warning/issue boxes 550/559 `rounded-xl` → `rounded-md`.

## 27. src/renderer/src/components/kanban/BoardAssistantView.tsx (424, 431, 437, 458, 538, 675)
- **What:** Scope chips, the SDK trigger and the native `<select>` are all `rounded-full` pills at h-8 with `focus:ring-1 focus:ring-ring`; section labels use `tracking-[0.14em]`/`tracking-[0.18em]`.
- **Change:** Chips/buttons/select → `h-7 rounded-md border border-border bg-secondary/40 px-2.5 text-[12px] hover:bg-secondary`; select gets the orca focus recipe `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` (replace `focus:ring-1`). Section labels → `text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground`.

## 28. src/renderer/src/components/kanban/FavoriteTicketsPane.tsx (132, 136-142)
- **What:** Pane is `w-72 bg-background` with a header of `text-xs font-medium` + `rounded-full bg-muted/40 px-1.5 text-[11px]` count — reads as body text, not an orca panel header, and sits on the same surface as the board.
- **Change:** Pane → `w-72 border-l border-border bg-sidebar` (#171717 dark / #fafafa light) so it separates from the board canvas; header row → `h-8 px-3` with label `text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground` and count `rounded-full bg-secondary px-[7px] text-[10px] font-semibold tabular-nums`; close button → `h-6 w-6 rounded-md`.

## 29. src/renderer/src/components/kanban/FavoriteTicketsPane.tsx (56, 70, 76, 195)
- **What:** Favorite cards duplicate the old ticket recipe (`rounded-md border-border/60 bg-card shadow-sm ... hover:bg-muted/40`) and filled `bg-muted/40` pills; the error strip is `rounded-md border-destructive/30 bg-destructive/10`.
- **Change:** Mirror the updated ticket-card recipe exactly (no shadow, `border-border`, border-color hover) and switch the two meta pills to the bordered/transparent `.t-pill` recipe at `text-[10px]`; error strip → `rounded-[5px] border-destructive/30 bg-destructive/8 text-[11px]`.

## 30. src/renderer/src/components/kanban/TicketModelBadge.tsx (63-66, 73)
- **What:** Model badge is `rounded-full border border-transparent bg-muted/40 px-2 py-0.5 text-[11px]`, and the ultra variant adds `border-2 border-violet-500` — a 2px violet ring used decoratively (not plan-mode), which collides with the plan-mode violet elsewhere on the same card.
- **Change:** Base → `rounded-full border border-border bg-transparent px-[7px] py-px font-mono text-[9px] text-muted-foreground` (mockup `.t-pill.p-model` is mono 9px); ultra variant → a 1px neutral emphasis (`border-muted-foreground/50 text-foreground`) or an amber tint, dropping violet and the 2px width. Fallback tag `bg-amber-500/15` stays (semantic).

## 31. src/renderer/src/components/kanban/ImportTicketsModal.tsx (361, 262)
- **What:** Closed-issue state badge is `bg-purple-500/10 text-purple-500` — purple used as a status color that orca does not define; the repo `<select>` at 262 is `rounded-md border-border/60 bg-background px-3 py-2 text-sm`.
- **Change:** State badge → neutral `border border-border bg-transparent text-muted-foreground` for closed and keep `emerald-500` (not green-500) for open, at `text-[10px] px-[7px]`. Select → `h-8 rounded-md border-input bg-background px-2.5 text-[12px]` + orca focus ring.

## 32. src/renderer/src/components/kanban/JiraImportModal.tsx (224, 271)
- **What:** `stateBadgeClass` returns `bg-purple-500/10 text-purple-500` for done states, and the JQL textarea still uses the legacy shadcn focus recipe `ring-offset-background ... focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- **Change:** Done state → `bg-emerald-500/10 text-emerald-500` (orca done token) or a neutral bordered pill; drop `green-500` for `emerald-500` on open. Textarea → remove `ring-offset-*`, use `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none`.

## 33. src/renderer/src/components/kanban/TicketCreateModal.tsx (232, 255, 312)
- **What:** Drag-over state is `ring-2 ring-primary ring-offset-2` (near-white double ring under orca) and the form controls are `text-sm` with `border-border/60`.
- **Change:** Drag-over → `border-dashed border-muted-foreground/35 bg-foreground/[0.02]` or `ring-[3px] ring-ring/50` with no offset; inputs/selects → `border-input text-[13px] rounded-md` with the orca focus recipe. Same `ring-2 ring-primary ring-offset-2` fix applies to FavoriteTicketCreateModal.tsx:187 / MoveToProjectModal.tsx:82 which still use `focus:ring-1 focus:ring-ring`.

