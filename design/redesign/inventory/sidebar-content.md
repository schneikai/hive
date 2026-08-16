# Inventory — Left-sidebar content (worktrees / projects / connections lists, pinned+recent lists, UsageIndicator)

**Notes:** Root cause for most of this area: `--primary` is `oklch(0.488 0.217 270)` (purple) in src/renderer/src/styles/globals.css:103/140, and the left sidebar leans on `text-primary`/`bg-primary` for *status* meaning, not for a primary action. When primary flips to #e5e5e5 the sidebar loses three signals at once — the Working label/spinner, the unread dot, and the fuzzy-search highlight all become near-white on near-white. Those must be re-pointed at real status tokens before the token flip lands, not after.

Duplication is the biggest execution risk: the status→{label,color} ladder is copy-pasted verbatim in five places (WorktreeItem.tsx:225-241, PinnedList.tsx:430-443 and :1006-1019, RecentList.tsx:260-274, ConnectionItem.tsx:122-137) and the status-icon cluster in five (WorktreeItem.tsx:589-615, PinnedList.tsx:623-632 and :1091-1099, RecentList.tsx:152-161 and :230-238, ConnectionItem.tsx:452-458). The unread dot is duplicated five times and the inline branch-rename input (with its `focus:ring-1 focus:ring-ring`) four times. Extract a shared status-style module + `<StatusGlyph/>`/`<UnreadDot/>`/`<InlineRenameInput/>` first; otherwise the orca pass will land inconsistently across pinned/recent/tree/connection rows.

Also cross-cutting: (1) every row title is `text-sm` (14px) — orca wants 13px with 0.01em tracking, and every row sits on `bg-accent` when selected, which under orca must become the LIFTED worktree-sidebar surface (#2a2a2a base / #353535 accent), not the global accent; these files have no awareness of a separate sidebar surface token today. (2) There is no grain overlay, no hsl(260…) literal and no DM Sans reference inside this area — the font/grain work is entirely in globals.css. (3) Real semantic colors I deliberately did NOT flag: the sky-500 Teleported badge (WorktreeItem.tsx:684-690), blue-400 plan/plan_ready, amber-500 attention (the brief lists amber attention as a keeper even though the orca mockup uses orange-500 #f97316 for the question glyph — worth an explicit team decision), the amber Shuffle/Timer auto-switch icons (UsageIndicator.tsx:817-829), destructive menu items, and the connection color dots driven by `parseColorQuad`.

## 1. src/renderer/src/components/worktrees/WorktreeItem.tsx (225-241 (236), 596-598)
- **What:** Status map gives worktreeStatus==='working' the class `font-semibold text-primary`, and the working/planning spinner is `<Loader2 className="h-3.5 w-3.5 text-primary shrink-0 animate-spin"/>`. `--primary` today is oklch(0.488 0.217 270) = brand purple, so 'Working' + spinner currently read purple. Under orca `--primary` becomes #e5e5e5 (near-white in dark), so both silently turn into plain white text with no status meaning.
- **Change:** Move 'working' off `primary` onto the orca working token: label `font-medium text-[color:var(--status-working)]` (yellow-500 #eab308) and replace Loader2 with the orca ring spinner (12px circle, `border-2 border-yellow-500 border-t-transparent rounded-full`, `animation: agent-spin 1s steps(12,end) infinite`) per design/redesign/01-orca.html `.spinner`. Add a shared `--status-working/-done/-question/-plan/-error` token set rather than repeating Tailwind literals.
- **Risk:** 'Working' is asserted by tests via data-testid="worktree-status-text"; keep the text, change only classes. Loader2→div spinner changes DOM shape — check any querySelector('.animate-spin') in tests.

## 2. src/renderer/src/components/layout/RecentList.tsx (153-155, 230-232, 260-274 (269))
- **What:** Same purple-brand coupling duplicated: `Loader2 ... text-primary animate-spin` for worktree and connection working/planning rows, and StatusText maps 'working' → `font-semibold text-primary`.
- **Change:** Extract the status→{icon,label,className} mapping into one shared module (e.g. `@/lib/worktree-status-style.ts`) used by WorktreeItem, RecentList, PinnedList and ConnectionItem, and point 'working' at the yellow-500 orca ring spinner + yellow label instead of `text-primary`.
- **Risk:** Four call sites currently drift (WorktreeItem has command_approval/archiving cases the others lack); unifying must preserve each file's extra cases.

## 3. src/renderer/src/components/layout/PinnedList.tsx (430-443 (438), 624-626, 802-806, 1006-1019 (1014), 1091-1093)
- **What:** Purple-brand `text-primary` for 'Working' label (both pinned worktree and pinned connection), `Loader2 text-primary animate-spin` status icons (lines 625, 1092) and the sibling-count chip spinner (line 803).
- **Change:** Same swap as WorktreeItem: yellow-500 ring spinner + `--status-working` label; sibling chip icon becomes a 10px yellow ring spinner. Reuse the shared status-style module so the pinned rows can't drift again.
- **Risk:** SiblingChip icons are 10px (h-2.5); the ring spinner needs border-width 1.5px at that size per the mockup's inline override.

## 4. src/renderer/src/components/connections/ConnectionItem.tsx (122-137 (132), 452-454)
- **What:** Connection status map uses `font-semibold text-primary` for 'Working' and `Loader2 ... text-primary animate-spin` for the working/planning icon — purple today, near-white after the token flip.
- **Change:** Adopt the shared orca status vocabulary (yellow-500 ring spinner + yellow label).
- **Risk:** Connection rows also render a colored project dot at line 443; make sure the spinner and the dot don't visually merge at the new density.

## 5. src/renderer/src/components/worktrees/WorktreeItem.tsx (715-718)
- **What:** Unread badge is `<span className="h-2 w-2 rounded-full bg-primary shrink-0"/>` — a purple brand dot today, a near-white dot after the flip (indistinguishable from text).
- **Change:** Use the orca `.unread-dot` recipe: 7px circle with `background: var(--status-plan)` (blue-400 #60a5fa). Same change needed at PinnedList.tsx:725 and :1172, RecentList.tsx:175 and :250, ConnectionItem.tsx:546 — factor into one `<UnreadDot/>`.
- **Risk:** Five duplicated sites; missing one leaves a white-on-white dot in dark mode.

## 6. src/renderer/src/components/layout/UsageIndicator.tsx (301-306, 633-635)
- **What:** Active-account card highlight is a hardcoded brand purple ring: `highlightActive && row.isActive && 'border-2 border-purple-500'` (comment at 633 documents it as 'gets a purple border'). This is pure chrome purple, exactly what orca removes.
- **Change:** Replace with a neutral orca selection: keep the 1px hairline `border-border` and mark active with `ring-1 ring-ring/50` or `bg-foreground/[0.06]`, matching the mockup's `.usage-head .active-pill` treatment (no colored ring). Delete the stale 'purple border' comment.
- **Risk:** border-2 → border-1 changes the card's inner height by 2px; check the `absolute inset-0` refreshing overlay at line 431 still aligns.

## 7. src/renderer/src/components/layout/UsageIndicator.tsx (316-321)
- **What:** 'Active' pill is `bg-primary/15 ... text-primary` — a purple tinted chip today; after the flip it becomes a near-white-on-near-white ghost chip.
- **Change:** Match the orca `.active-pill`: `bg-foreground/12 text-foreground text-[9px] font-semibold px-1.5 py-px rounded-full` (no primary reference).
- **Risk:** None functional; verify contrast in light mode where foreground is #171717.

## 8. src/renderer/src/components/layout/UsageIndicator.tsx (38-45)
- **What:** `getBarColor` paints the *normal* usage bar `bg-green-500` (and yellow-500 at 60%). In orca the usage meter fill is neutral (`.usage-fill { background: var(--muted-foreground) }`); green here is decorative chrome color and also collides with emerald=done in the status vocabulary.
- **Change:** Return `bg-muted-foreground` for the normal (<60%) case and drop the 60% yellow step (yellow is now reserved for 'working'); keep orange-500 at >=80 / allowed_warning and red-500 at >=90 / rejected as genuine status.
- **Risk:** UsageIndicator.test.tsx may assert bar classes — grep for 'bg-green-500' in that test before changing.

## 9. src/renderer/src/components/layout/UsageIndicator.tsx (157-196 (168, 177, 180, 183-188))
- **What:** Usage row geometry is pre-orca: track `h-1.5 rounded-full bg-muted`, percent `text-[10px] font-mono w-7`, reset `text-[10px] text-muted-foreground/60`, status chip `rounded-sm px-1 py-0.5 text-[9px]`.
- **Change:** Match the mockup footer: track `h-[3px] rounded-[2px] bg-foreground/8`, fill `rounded-[2px]`, tag/pct at `text-[9px] tabular-nums` (mono for tag), reset line `text-[9px] text-muted-foreground/70`; status chips `rounded-md` (6px) with hairline `border border-current/20` instead of the tinted `bg-*/15` blocks.
- **Risk:** A 3px track with `minWidth: 2` inline style (line 174) makes tiny values look like a dot — re-check the min-width.

## 10. src/renderer/src/components/layout/UsageIndicator.tsx (686-715 (688, 694, 710))
- **What:** Three separators use `border-t border-background/20` — a *background*-colored border (invisible/wrong on #0a0a0a), not the orca hairline. Also `text-red-400` free text at 710.
- **Change:** Change all three to `border-t border-border` (rgb(255 255 255 / .07)); make the error line `text-destructive`.
- **Risk:** Low — purely visual, but it is currently near-invisible so the fix will make new lines appear.

## 11. src/renderer/src/components/layout/UsageIndicator.tsx (351-408 (359, 371, 387-392), 543-567)
- **What:** Popover controls use pre-orca chrome: buttons `rounded-sm border border-border/60 text-[9px]` with `hover:bg-accent/60`, and ProviderToggle uses `rounded-md border-border/60 bg-background/40` + `rounded-sm` segment buttons with `opacity-40`.
- **Change:** Chrome rows go `rounded-md` (6px) with 7%-white hairline (`border-border`) and `text-[10px]`/`text-[11px]`; the provider segmented control becomes `rounded-md bg-secondary p-0.5` with the active segment `bg-accent` and inactive at `opacity-60` (orca avoids sub-10px chrome text except the 9px usage tags).
- **Risk:** Bumping 9px→10px on Switch/Refresh/Schedule buttons widens the 288px-wide popover row; verify no wrap at w-72.

## 12. src/renderer/src/components/layout/UsageIndicator.tsx (847-855, 926-938)
- **What:** Usage hover-card is rendered through `HoverCardContent`, which is still an opaque non-glass surface (`rounded-md border bg-popover shadow-lg/5` in components/ui/hover-card.tsx:40); the indicator root is a bare `border-t` with no sidebar surface awareness.
- **Change:** Once ui/hover-card gets the orca frosted recipe (rounded-[11px], border-white/14|black/14, rgba bg + backdrop-blur-2xl, dual shadow), drop the local `p-0`/`w-72` assumptions if they fight it; make the indicator root `border-t border-border` and let it sit on the lifted `--worktree-sidebar` (#2a2a2a) surface rather than inheriting `--background`.
- **Risk:** Cross-file dependency on the ui/ overlay pass — coordinate so the popover isn't restyled twice.

## 13. src/renderer/src/components/ui/HintBadge.tsx (9-22, 30-31, 40-46)
- **What:** Sidebar hint badge (rendered by WorktreeItem, ProjectItem, PinnedList, ConnectionItem) uses `bg-primary/20 border-primary/60` + `text-primary` for the matched state — purple brand chrome today, washed-out near-white after the flip. Base is `bg-muted/60 border-border/50 rounded` (4px).
- **Change:** Matched 'select' state → neutral emphasis: `bg-foreground/12 border-foreground/30 text-foreground`; keep green (pin) / red (archive) action modes as semantics. Base badge → `rounded-md` (6px), `border-border` hairline, `text-[10px]` mono, `bg-foreground/5` to match the mockup's `.keycap`.
- **Risk:** HintBadge is shared with other panes; changing the base affects every hint overlay at once.

## 14. src/renderer/src/components/projects/HighlightedText.tsx (14-19)
- **What:** Fuzzy-match characters are painted `text-primary font-semibold` — purple brand highlight today; after the flip the 'highlight' is the same near-white as the surrounding text, so search feedback disappears entirely.
- **Change:** Highlight with weight+contrast instead of brand color: base text at `text-muted-foreground` with matched chars `text-foreground font-semibold` (or `bg-foreground/10 rounded-[2px]`), so the emphasis survives a neutral palette.
- **Risk:** Used for both name and path matches in ProjectItem (lines 415-431); the path variant is already `text-[10px] text-muted-foreground`, so pick a matched color that reads on both.

## 15. src/renderer/src/components/projects/RecentToggleButton.tsx (11-20)
- **What:** Active toggle state is `text-primary bg-accent` — purple icon today, near-white icon after the flip (loses the 'on' read against a hover state that is also accent).
- **Change:** Use the orca toggled-chrome recipe: `bg-accent text-foreground` for on and `text-muted-foreground` for off, at `h-6 w-6 rounded-md`; same fix for the pinned-board toggle in PinnedList.tsx:127-130 (`isPinnedBoardActive && 'text-primary bg-muted'`).
- **Risk:** Off/on must stay distinguishable from hover:bg-accent on the neighboring SortProjectsButton/AddProjectButton.

## 16. src/renderer/src/components/worktrees/WorktreeItem.tsx (572-579, 506-512)
- **What:** Worktree row chrome: `pl-8 pr-1 py-1 rounded-md`, selected = flat `bg-accent text-accent-foreground`, drag-over = `border-t-2 border-primary` (purple line today, near-white 2px slab after the flip). Name is `text-sm` (14px) at line 213.
- **Change:** Move to the orca `.wt-card`: sit on `--worktree-sidebar` (#2a2a2a) with a 20px status lane instead of pl-8, `rounded-lg` 8px card, hover `bg-[--worktree-sidebar-accent]/40`, selected = `bg-foreground/8 + border border-white/[0.03] + shadow-[0_1px_2px_rgba(255,255,255,0.04)]` (not flat accent); title `text-[13px] leading-5 font-medium tracking-[0.01em]`; drag indicator → 1px `border-ring` line, never `border-primary`.
- **Risk:** pl-8 currently encodes the tree indent under ProjectItem; switching to a lane changes alignment for every nested row and for the hint badge/more-menu on the right.

## 17. src/renderer/src/components/projects/ProjectItem.tsx (349-355, 378-398, 413-431, 447-467)
- **What:** Project header row is a normal list row (`px-2 py-1.5 rounded-md`, selected `bg-accent`, drag-over `border-t-2 border-primary`) with a 20px chevron Button, LanguageIcon, `text-sm` name, `text-[10px]` path and an always-visible Plus button.
- **Change:** Restyle as the orca `.section-head`: 28px fixed height, `sticky top-0 z-5` with `bg-[--worktree-sidebar]`, 16px rounded-[4px] project glyph, `text-[13px] font-semibold` label, `text-[10px] text-muted-foreground` worktree count, and hover-revealed actions (`opacity-0 group-hover:opacity-100`) instead of a permanent Plus; drop `border-primary` for the drag line.
- **Risk:** Making the header sticky inside the scroll container can conflict with the drag-reorder hit areas and with WorktreeList's `pl-4` indent; the Plus button is hint-targeted ('plus:'+id) so it must remain focusable/clickable even when hover-hidden.

## 18. src/renderer/src/components/layout/PinnedList.tsx (609-613, 690-698, 1072-1077, 1149-1157)
- **What:** Pinned rows use `px-2 py-1 rounded-md mx-1`, `bg-accent` selection, `text-sm` (14px) titles and `text-[11px]` status; same shape duplicated for connections.
- **Change:** Match the orca card density: `rounded-lg` 8px, `text-[13px]` title with `tracking-[0.01em]`, `text-[11px]` meta, lifted-sidebar hover/active surfaces (`--worktree-sidebar-accent`), and 6px vertical padding to hit the mockup's rhythm.
- **Risk:** Pinned rows nest a LanguageIcon + status icon + ModelIcon in one line; at 13px the row can overflow — verify truncation still kicks in at the 240px sidebar width.

## 19. src/renderer/src/components/layout/RecentList.tsx (78-82, 140-144, 165-171, 210-215, 90)
- **What:** Recent section header is `text-xs font-medium text-muted-foreground` with a Zap icon; rows are `px-2 py-1 rounded-md mx-1` with `text-sm` names; the section is closed with `border-b border-border/50`.
- **Change:** Header → orca uppercase section header (`text-[11px] font-medium uppercase tracking-wider text-muted-foreground`, 28px tall); rows → 13px title / 11px status at the card density; separator → `border-border` hairline (7% white), no /50 dilution.
- **Risk:** RecentList and PinnedList headers must end up identical — they are currently styled differently (text-xs vs the uppercase 11px used by ConnectionList).

## 20. src/renderer/src/components/connections/ConnectionList.tsx (35-46, 49-50)
- **What:** Section header is already close to orca (`text-[11px] font-medium uppercase tracking-wider`) but lacks the sticky lifted background and uses a chevron+Link+count layout at `px-2 py-1` with no fixed height.
- **Change:** Normalize to the shared section-header component: 28px height, `sticky top-0 bg-[--worktree-sidebar]`, `text-[11px] uppercase tracking-wider`, count as `text-[10px] tabular-nums`, hover-revealed chevron. Then reuse it for PinnedList/RecentList headers.
- **Risk:** Sticky headers inside the single scroll container will stack (projects + connections + pinned); pick z-index/order deliberately.

## 21. src/renderer/src/components/connections/ConnectionItem.tsx (432-436, 505-529, 617-632)
- **What:** Row is `px-2 py-1.5 rounded-md` with `text-sm` marquee name and `text-[11px]` status; the hover TooltipContent nests `text-muted-foreground text-[10px]` for the branch line.
- **Change:** Row → 13px/11px card density on the lifted sidebar surface. Critically: once the tooltip becomes INVERTED (bg-foreground text-background), `text-muted-foreground` inside TooltipContent will be low-contrast — change the branch line to `text-background/70` (or a token that follows the inverted surface).
- **Risk:** The inverted-tooltip change lands in components/ui/tooltip.tsx; this local override must be fixed in the same pass or the tooltip text becomes unreadable.

## 22. src/renderer/src/components/projects/ColonCommandPopover.tsx (81-110 (85, 96-101))
- **What:** Hand-rolled popover: `rounded-lg border bg-popover text-popover-foreground shadow-md` — an opaque, non-glass surface with a 10px radius and a legacy md shadow; rows are `px-3 py-1.5 text-sm`.
- **Change:** Apply the orca frosted-overlay recipe: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl` with the dual shadow; rows `px-2.5 py-1.5 text-[13px] rounded-md` with `bg-accent` selection.
- **Risk:** It renders inline (absolute) rather than in a portal, so backdrop-blur will sample the sidebar behind it — verify the blur isn't clipped by the parent's overflow.

## 23. src/renderer/src/components/projects/ProjectFilter.tsx (233-263 (245, 260))
- **What:** Filter input is `h-8 text-sm ... border border-input focus:outline-none focus:ring-1 focus:ring-ring` — a 1px non-orca focus ring and 14px text; the shortcut hint is `kbd` with `bg-muted/50 border-border/50 text-[10px]`.
- **Change:** Focus → orca recipe `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring outline-none`; text → `text-[13px]`, height 30-32px, `rounded-md`; keycap → mockup `.keycap` (`border border-border bg-foreground/5 text-[10px] text-muted-foreground rounded-[4px] px-1`).
- **Risk:** `focus:ring-1` appears on 5 inline rename inputs too (WorktreeItem:672, PinnedList:686/1144, ConnectionItem:500, RecentConnectionsDialog:500) — fix them together or focus states will be inconsistent.

## 24. src/renderer/src/components/worktrees/WorktreeItem.tsx (588-617, 594)
- **What:** Status-icon cluster is a pile of inline lucide icons with ad-hoc colors: Loader2 (working), AlertCircle amber (answering/permission), Map blue-400 (plan_ready), Folder/GitBranch muted (idle) — and `PulseAnimation className="text-green-500"` for a live run process, which collides with emerald=done in the orca vocabulary.
- **Change:** Introduce a fixed-width 20px status lane rendering exactly one glyph, per the mockup: yellow ring spinner (working), `.dot dot-done` 8px emerald-500 (ready/completed), orange-500 question glyph (answering/permission), blue-400 map (plan), `.dot dot-idle` (#737373 at 40%) for idle, red dot for error. Recolor the run-process PulseAnimation to build-blue (#3b82f6) so green stays exclusively 'done'.
- **Risk:** Idle rows currently show Folder vs GitBranch to distinguish the default worktree — the orca lane uses a neutral dot, so that distinction must move to the title row badge ('primary' `.wt-badge`) or it is lost. Same PulseAnimation recolor needed at PinnedList.tsx:623 and RecentList.tsx:152.

## 25. src/renderer/src/components/worktrees/WorktreeItem.tsx (239-241, 810 (PinnedList), 273 (RecentList), 136 (ConnectionItem))
- **What:** 'Ready'/completed uses `text-green-400` for the label and `CheckCircle2 text-green-400` for the sibling chip — off-vocabulary green (green-400) rather than the orca done token emerald-500 (#10b981), and orca shows Ready as a muted label with an emerald dot rather than a saturated green word.
- **Change:** Point completed at `--status-done` (#10b981) and render it as an 8px emerald dot in the status lane with the label at `text-muted-foreground` (mockup: `.dot-done` + plain 'Ready'), instead of a colored bold word.
- **Risk:** Four files carry the same literal; the shared status-style module should own it.

## 26. src/renderer/src/components/layout/PinnedList.tsx (110-140 (111, 127-130), 148, 838)
- **What:** Pinned section header uses `text-xs font-medium` (not the 11px uppercase orca header), the board toggle uses `p-0.5 rounded hover:bg-muted` (4px radius) plus `text-primary bg-muted` when active, and the section closes with `border-b border-border/50`.
- **Change:** Header → 28px, `text-[11px] uppercase tracking-wider`; toggle → `h-5 w-5 rounded-md hover:bg-foreground/8` with `bg-accent text-foreground` when active; separator → `border-border` hairline. Sibling chips already at `text-[11px] tabular-nums` — keep, but swap their icons to the lane glyph set.
- **Risk:** Toggle currently has no hit-area padding beyond p-0.5; growing it to 20px may shift the header's right edge.

## 27. src/renderer/src/components/worktrees/WorktreeItem.tsx (744, 865)
- **What:** Jira/Figma attachment submenu icons are hardcoded `text-blue-500` / `text-purple-500`. The purple Figma tint is exactly the kind of chrome purple orca removes (menus must be neutral greyscale).
- **Change:** Drop the per-vendor color: render both at `text-muted-foreground` (menu-icon default). Same at PinnedList.tsx:507 and worktrees/AddAttachmentDialog.tsx:94.
- **Risk:** Low; the label text already identifies the attachment type.

## 28. src/renderer/src/components/projects/LanguageIcon.tsx (57, 59, 236-246)
- **What:** Fallback language badges include `bg-purple-600` (elixir) and `bg-violet-600` (kotlin) at `rounded-sm` (4px), rendered directly in sidebar rows.
- **Change:** These are language identity, not brand chrome, so they may stay — but they are the only purple pixels left in the row. Either desaturate the whole fallback set to the orca `.proj-glyph` treatment (16px, `rounded-[4px]`, `border border-border`, `bg-[--worktree-sidebar-accent]/55`, `text-[9px] font-bold text-muted-foreground` initials) or keep the colors and accept two purple chips.
- **Risk:** Recommend the neutral glyph for the project header (matches the mockup) while keeping colored icons for real bundled SVGs.

## 29. src/renderer/src/components/worktrees/BranchPickerDialog.tsx (152-172 (155, 168), 224-231 (227))
- **What:** Tab underline is `border-primary` and the checked-out branch pill is `bg-primary/10 text-primary` — purple accents today, near-invisible near-white tints after the flip.
- **Change:** Tab underline → `border-foreground` (mockup tab uses foreground/60 2px underline); the 'active' pill → the neutral `.wt-badge` recipe (`border border-foreground/20 bg-foreground/6 text-foreground/70 text-[10px] rounded-[4px]`).
- **Risk:** `bg-primary/10` at 10% of #e5e5e5 is ~invisible on #171717 — the pill will disappear entirely if left alone.

## 30. src/renderer/src/components/connections/RecentConnectionsDialog.tsx (470-474, 517-523, 526-532)
- **What:** Selected/synthetic connection rows are tinted with `bg-primary/10 / /15 / /20` and the saved note renders `italic text-primary` — purple tinting used as chrome emphasis.
- **Change:** Replace the primary tints with neutral emphasis: `bg-accent/40` (hover `bg-accent/60`) and selected `bg-accent`; note text → `italic text-foreground` (or `text-muted-foreground`) instead of `text-primary`.
- **Risk:** Three tint levels currently encode synthetic-vs-pinned-vs-selected; collapsing them to accent levels needs the states to stay distinguishable.

## 31. src/renderer/src/components/projects/ProjectList.tsx (244-256 (248), 280-306 (282, 304))
- **What:** Empty state is a `rounded-lg` (10px) card with `hover:bg-accent/30` and `text-sm`/`text-xs` copy; list spacing is `space-y-0.5`; 'No matching projects' is `text-xs`.
- **Change:** Empty state → `rounded-md` (6px), hairline `border border-border border-dashed`, copy at `text-[13px]`/`text-[11px]`; list gap → `space-y-px` to match the mockup's 1px card rhythm.
- **Risk:** Tighter gaps make hover targets abut; keep the 8px card radius so hover states stay visually separated.

## 32. src/renderer/src/components/projects/FilterChips.tsx (12-23 (18))
- **What:** Language filter chips are `h-6 w-6 rounded-md border-border/50 bg-muted/50` with a destructive hover tint.
- **Change:** Align to orca chrome: `rounded-md` with full-strength `border-border` (7% white) and `bg-foreground/5`; keep the destructive hover as a genuine semantic. Size 20px to match the mockup's `.icon-xs-btn`.
- **Risk:** Low.

## 33. src/renderer/src/components/projects/AddProjectButton.tsx (96-107 (100), 108)
- **What:** Toolbar button is `h-6 w-6` ghost with a 16px icon; menu is `min-w-[190px]` on the shared DropdownMenuContent (opaque today).
- **Change:** Standardize sidebar toolbar buttons to the orca `.icon-xs-btn` (20px box, `rounded-md`, `text-muted-foreground`, hover `bg-foreground/8 text-foreground`) with 14px icons; same for SortProjectsButton.tsx:21-35 and ConnectionsButton.tsx:10-19. Menu glass comes from the shared ui/dropdown-menu pass — no per-file override needed.
- **Risk:** Shrinking icons from h-4 to h-3.5 across three buttons changes the sidebar header's optical weight; do all three together.

