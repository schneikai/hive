# Inventory — Session view (tab strip, composer, mode/model/context controls, message + tool-card chrome, plan/permission prompts)

**Notes:** Token layer is ALREADY migrated — src/renderer/src/styles/globals.css:88 is `--font-sans: 'Geist'` (no DM Sans anywhere in src/), `--radius: 0.625rem` (:103), `--primary` is #171717 light / #e5e5e5 dark (:111, :154), `--ring` #a1a1a1/#737373 (:123, :166), and the grain overlay is gone. That means every remaining `bg-primary*` / `text-primary` / `border-primary` in this area is now ACTIVELY WRONG rather than merely pending: what used to be a 10% purple wash is now a 10% white wash in dark mode. Highest-value single sweep in this area is `grep -n "bg-primary\|text-primary\b\|border-primary" src/renderer/src/components/sessions/` — 20+ hits across SessionTabs (8 tab underlines), UserBubble, QueuedMessageBubble, ToolCard, CommandApprovalPrompt, HandoffSplitButton, SessionHistory, VirtualizedMessageList, ModelSelector, CustomProviderModelSelector.

Second sweep: `grep -n "zinc-9\|zinc-8\|zinc-4" src/renderer/src/components/sessions/` — 15 hits of hardcoded near-black/grey (PermissionPrompt/QuestionPrompt/CommandApprovalPrompt shells, CodeBlock, BashCommandBubble, tools/BashToolView, tools/EditToolView, tools/FileChangeToolView). All theme-blind; all break light mode.

Third sweep: brand purple. `purple-*` (UserBubble bubble+badge, PermissionPrompt:31, CommandApprovalPrompt:57), `violet-600` (PlanReadyImplementFab Supercharge x2, ModelSelector ultracode chip). Deliberately EXCLUDED as legitimate plan-mode semantics and left alone: ModeToggle's violet plan pill, SlashCommandPopover.tsx:133 plan-agent tag, IndeterminateProgressBar's `bg-violet-500` plan track/bar, SessionTabs' blue-400 planning spinner. Also excluded as real status: amber orphan banner (SessionView:6144), amber answering/permission tab icons, emerald terminal/steered/staged, blue-500 build, red destructive, cyan codex tag, orange super-plan (except where it collides with question/permission — see the SuperToggle entry).

Two cross-file prerequisites owned outside this area but which this area depends on: (1) components/ui/tooltip.tsx:39 is still `bg-popover text-popover-foreground` — NOT the orca inverted tooltip; ContextIndicator's internal `border-border` dividers and `text-muted-foreground` sub-labels will go invisible the moment it flips. (2) components/ui/dropdown-menu.tsx:49,68 is still an opaque `bg-popover rounded-md shadow-lg/5` — every ModelSelector/SessionTabs context menu inherits it, so the frosted-glass menu recipe must land there rather than being patched per-call-site.

Structural note on SessionTabs.tsx: the identical ~4-line tab class string is copy-pasted 8 times (SessionTab, board-assistant, FileTab, DiffTabItem, sticky board, kanban board, pinned session, context tab) and the `absolute bottom-0 ... h-0.5 bg-primary` underline div 8 times. Extracting a `tabClass(isActive)` helper + an `::after` underline before restyling turns ~16 edits into 2 and is the difference between a clean 32px strip and a strip where one variant is 34px.

## 1. src/renderer/src/components/sessions/SessionTabs.tsx (1385-1389)
- **What:** Tab strip container is `flex items-center border-b border-border bg-muted/30` with NO fixed height — height is derived from `py-1.5 text-sm` tabs (~33-34px). With orca tokens, `bg-muted/30` resolves to ~#131313, i.e. neither `--card` nor `--background`.
- **Change:** Give the strip an explicit orca height and surface: `flex items-center h-8 shrink-0 bg-card border-b border-border` (32px, `--card` = #171717 dark / #fafafa light per `.tabstrip` in design/redesign/01-orca.html:272). Children must become `h-full` with `py-0` so the row height is driven by the container, not padding.
- **Risk:** Scroll-arrow visibility math (`showLeftArrow`/`showRightArrow`, scrollContainerRef) and the sticky board/favorites/import buttons all sit on this row — they must also switch to `h-full` or the strip will grow past 32px.

## 2. src/renderer/src/components/sessions/SessionTabs.tsx (218-226, 388-395, 466-473, 1501-1508, 1527-1534, 1568-1575, 1652-1659)
- **What:** Every tab variant (SessionTab, board-assistant tab, FileTab, DiffTabItem, sticky board tab, kanban board tab, pinned session tab, context tab) repeats the same class string: active = `bg-background text-foreground`, inactive = `bg-muted/50 text-muted-foreground hover:bg-muted`, with `px-3 py-1.5 text-sm min-w-[100px] max-w-[200px]`. With orca tokens this INVERTS orca: active becomes #0a0a0a (darker than the strip) while orca wants the active tab LIGHTER than the strip.
- **Change:** Extract one shared `tabClass` helper and set: base `h-full px-2.5 text-[12px] tracking-[0.01em] min-w-[88px] w-[180px] max-w-[200px] bg-card text-muted-foreground hover:text-foreground border-r border-border`; active `bg-[color-mix(in_srgb,var(--foreground)_6%,var(--card))] text-foreground` (matches `.tab.active` at design/redesign/01-orca.html:280-283). Drop `bg-muted/50` and `bg-background` entirely.
- **Risk:** 8 duplicated copies — missing one leaves a visibly mismatched tab. `isDragOver && 'bg-accent/50'` (SessionTabs.tsx:225) must be re-tuned against the new active mix or drag feedback becomes indistinguishable from active.

## 3. src/renderer/src/components/sessions/SessionTabs.tsx (297, 404, 488, 1368, 1514, 1540, 1587, 1683)
- **What:** Active-tab underline is `<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />` in 8 places. `--primary` is now #e5e5e5 (dark) / #171717 (light), so the underline renders at full foreground brightness.
- **Change:** Replace `bg-primary` with `bg-foreground/60` (orca `.tab.active::after` uses `color-mix(in srgb, var(--foreground) 60%, var(--card))`, design/redesign/01-orca.html:284-287). Keep `h-0.5` (=2px). Ideally fold into the shared tab helper as an `::after` rather than 8 sibling divs.
- **Risk:** In light mode `bg-foreground/60` over the active mix must still read as a 2px rule — verify contrast, it is much subtler than today's solid primary.

## 4. src/renderer/src/components/sessions/SessionTabs.tsx (235-241)
- **What:** Tab working spinner is `Loader2` with `sessionStatus === 'planning' ? 'text-blue-400' : 'text-blue-500'` — the WORKING state is blue-500, which orca reserves for build mode, not for "agent is working".
- **Change:** Change the non-planning branch to `text-yellow-500` (orca `--status-working: #eab308`, `.spinner` at design/redesign/01-orca.html:230-232 and tab usage at :658). Keep `text-blue-400` for `planning` (that is `--status-plan`). Consider a 2px-border ring instead of `Loader2` to match orca's stepped spinner, sized `h-2.5 w-2.5` (10px).
- **Risk:** `ConnectionSessionTab` (SessionTabs.tsx:552-558) renders the same Loader2 but colors it from the connection color quad — it will not pick this up automatically.

## 5. src/renderer/src/components/sessions/SessionTabs.tsx (249-254, 257-261, 573)
- **What:** Tab status glyphs use `text-green-500` for completed and a 8px `w-2 h-2 rounded-full bg-blue-500` unread dot (duplicated in ConnectionSessionTab at 573).
- **Change:** `text-green-500` → `text-emerald-500` (`--status-done` #10b981). Unread dot → `w-[7px] h-[7px] bg-blue-400` (orca `.unread-dot` = 7px, `--status-plan` #60a5fa, design/redesign/01-orca.html:295).
- **Risk:** Low; `green-500` also appears at SessionTabs.tsx:477 for the staged-diff `S` badge — align that too.

## 6. src/renderer/src/components/sessions/SessionTabs.tsx (273)
- **What:** Inline tab-rename input uses `border border-primary/50 rounded` — with primary now near-white in dark this becomes a bright ring around the input, and it uses no orca focus recipe.
- **Change:** Use `border border-input rounded-md bg-transparent text-[12px] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring outline-none`.
- **Risk:** Input is inside a tab that also has an active mix background — check the border is still visible on the active tab.

## 7. src/renderer/src/components/sessions/SessionTabs.tsx (1398, 1454, 1466, 1692)
- **What:** Strip affordances (create-session `+`, scroll-left, scroll-right, extra button) are `p-1.5 hover:bg-accent transition-colors border-r border-border` / `p-1 hover:bg-accent` — irregular sizes, vertical divider rules, and `hover:bg-accent` (#404040 dark) is much heavier than orca's hover.
- **Change:** Standardize to orca `.tab-plus` (design/redesign/01-orca.html:293-294): `flex items-center justify-center w-8 h-full text-muted-foreground hover:text-foreground hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))]`, drop the `border-r border-border` separators, icon `h-3.5 w-3.5`.
- **Risk:** Removing `border-r` changes the visual anchor for the leftmost `+` against the sidebar edge — confirm against 01-orca.html:677.

## 8. src/renderer/src/components/sessions/SessionTabs.tsx (1707-1712, 1722-1727)
- **What:** Favorites / Import buttons on the tab-bar line use `px-3 py-1.5 text-xs ... border-l border-border` and the active favorites state is `bg-accent text-accent-foreground` — 12px type, full-height accent fill, and a divider rule that fights the 32px strip.
- **Change:** Move to 13px-dense chrome: `h-full px-2.5 text-[11px] tracking-[0.01em] text-muted-foreground hover:text-foreground hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))]`; active state `text-foreground` + a 2px `bg-foreground/60` underline instead of a filled `bg-accent` block; drop `border-l border-border`.
- **Risk:** These only render in board/kanban mode — easy to miss when visually diffing the session view.

## 9. src/renderer/src/components/sessions/SessionTabs.tsx (533-551, 1282)
- **What:** `ConnectionSessionTab` paints the whole tab with an arbitrary per-connection hue via inline `style={{ backgroundColor, color }}` from `parseColorQuad(connectionColor)`, and groups are separated by a `w-px bg-border/60 self-stretch my-1` rule. Saturated tab fills are exactly the "color as chrome" orca removes.
- **Change:** Render connection tabs with the same neutral tab recipe as every other tab, and express the connection identity as a 6px `rounded-full` dot (or 2px left rule) using the connection color — keep the color, remove the full-bleed fill. Keep the group separator but make it `bg-border` full-height (`self-stretch`, no `my-1`) so it lines up with the 32px strip.
- **Risk:** `parseColorQuad` returns 4 values (inactiveBg/activeBg/inactiveText/activeText); switching to a dot makes activeText/inactiveText unused — clean up or the type check will complain.

## 10. src/renderer/src/components/sessions/SessionView.tsx (6310-6321)
- **What:** Composer shell is `rounded-xl border-2` with a full mode tint: `border-zinc-400/50 bg-zinc-500/5` (bash) / `border-blue-500/50 bg-blue-500/5` (build) / `border-orange-500/50 bg-orange-500/5` (super-plan) / `border-violet-500/50 bg-violet-500/5` (plan). A 2px saturated border plus tinted fill is the single loudest non-orca element in the session view.
- **Change:** Replace with the orca composer (design/redesign/01-orca.html:326-332): `rounded-[var(--radius)] border border-border bg-card transition-colors focus-within:border-[color-mix(in_srgb,var(--ring)_60%,transparent)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ring)_18%,transparent)]`. Mode is already communicated by the `ModeToggle` pill inside — do not encode it on the shell. If a mode hint is required, use at most a 1px `border-<mode>/25` with no background tint.
- **Risk:** `overflow-hidden` on this container is what clips the textarea/attachment previews; keep it. Losing the mode tint removes the only bash-mode cue on the shell — the `$` placeholder + `text-zinc-400` timer at 6413 currently carries it, so confirm bash mode is still legible.

## 11. src/renderer/src/components/sessions/SessionView.tsx (6409-6423)
- **What:** The elapsed-timer / hint text is mode-colored and bold: `text-zinc-400 font-semibold` / `text-blue-500 font-semibold` / `text-orange-500 font-semibold` / `text-violet-500 font-semibold`, at `text-xs`.
- **Change:** Orca's `.composer-hint` is `font-size: 10px; color: color-mix(in srgb, var(--muted-foreground) 70%, transparent)` (design/redesign/01-orca.html:352). Reduce to `text-[10px] tabular-nums text-muted-foreground/70 font-normal` for the idle hint; keep a single accent only while actively timing (amber for `activeQuestion` is a legitimate status), drop the violet/blue/zinc mode branches.
- **Risk:** The `@min-[42rem]` container query hides the keyboard hint at narrow widths — keep that wrapper when restyling.

## 12. src/renderer/src/components/sessions/SessionView.tsx (6276-6283, 6374-6381)
- **What:** Composer wrapper is `p-4 bg-background` with an inner `max-w-4xl mx-auto` (896px); textarea is `text-sm px-3 py-2 min-h-[40px]` with `focus:outline-none border-none` and no orca focus ring.
- **Change:** Match orca `.composer-wrap`: `px-6 pt-2 pb-3.5 max-w-[808px] mx-auto w-full` (design/redesign/01-orca.html:325); textarea → `text-[13px] tracking-[0.01em] px-2.5 pt-0.5 pb-2 min-h-[40px]`. The focus ring belongs on the shell (`focus-within:` on the wrapper), not the textarea, so keep `focus:outline-none` here.
- **Risk:** `max-w-4xl mx-auto` is repeated for the permission/command-approval/question prompt wrappers at 6237/6250/6264 — change all four together or the prompts will be wider than the composer.

## 13. src/renderer/src/components/sessions/ModeToggle.tsx (46-52)
- **What:** Pill geometry already matches orca `.mode-pill`, but the non-build branch paints BOTH `plan` and `super-plan` violet, while `SuperToggle`/composer/`IndeterminateProgressBar` all treat `super-plan` as orange — the same state reads violet here and orange three inches away.
- **Change:** Add an explicit `super-plan` branch (orange-500/10 + orange-500/30 + text-orange-500) so the pill agrees with `SuperToggle` and the composer timer; keep the violet branch for plain `plan` (plan-mode semantic stays). Also add `tracking-[0.01em]` to match orca chrome type.
- **Risk:** `config` at line 39 deliberately maps `super-plan` → the `plan` label/icon; only the color branch should change, not the label.

## 14. src/renderer/src/components/sessions/SuperToggle.tsx (40-46)
- **What:** Active SUPER pill is `bg-orange-500/10 border-orange-500/30 text-orange-500` plus the `super-sparkle` class, which draws an animated conic-gradient orange border (globals.css:605-643). Orange-500 is orca's `--status-question` (permission/question) — using it plus an animated glow for a mode toggle is chrome decoration competing with a status color.
- **Change:** Make the active SUPER pill neutral-emphatic: `bg-secondary border-border text-foreground` (or `bg-foreground/10`), and drop `super-sparkle` (near-zero motion/glow in orca chrome). If a hue is required, reuse the plan violet so SUPER reads as an intensifier of plan mode rather than as a question/permission state.
- **Risk:** `super-sparkle` also defines the `--sparkle-angle` @property animation in globals.css — if this is its only consumer the CSS block can be deleted; check for other users first.

## 15. src/renderer/src/components/sessions/CodexFastToggle.tsx (45-51)
- **What:** Enabled state is `bg-primary border-primary text-primary-foreground`. With orca tokens that is a solid #e5e5e5 pill with #171717 text sitting in the composer bottom row — it now looks like the primary send CTA and out-shouts the actual send button.
- **Change:** Use a neutral 'on' treatment consistent with the other composer pills: `bg-secondary border-border text-foreground` (or `bg-foreground/10 border-border text-foreground`). Reserve `bg-primary` for the send button only.
- **Risk:** `aria-pressed` is the accessible signal; the visual delta between on/off gets subtler — verify the off state (`bg-muted/50 text-muted-foreground`) is still clearly distinguishable.

## 16. src/renderer/src/components/sessions/ModelSelector.tsx (65-86)
- **What:** `variantChipClass` gives ultracode/ultra a dedicated violet brand treatment: active `bg-violet-600 text-white`, inactive `bg-violet-500/15 text-violet-600 dark:text-violet-300 hover:bg-violet-500/25`. This is brand/chrome purple (a model-tier badge), not plan-mode semantics. The non-accent branch uses `bg-primary text-primary-foreground`, now a near-white block.
- **Change:** Collapse both branches to one neutral chip: active `bg-foreground/12 text-foreground border border-border`, inactive `bg-secondary text-muted-foreground hover:bg-accent`; distinguish the top-tier variant with weight/uppercase (`font-semibold uppercase`) or a small icon instead of hue. Keep `text-[10px] rounded px-1.5 py-0.5`.
- **Risk:** `ModelSelector.ultracode.test.tsx` may assert on violet classes — check before changing. `isAccentVariant`/`isUltraVariant` may become unused.

## 17. src/renderer/src/components/sessions/ModelSelector.tsx (588-598)
- **What:** Selected-variant indicator next to the model name is `text-violet-600 dark:text-violet-300` for accent variants, `text-primary` otherwise — brand purple in the composer bottom row, and `text-primary` now renders near-white/near-black.
- **Change:** Use `text-muted-foreground` for normal variants and `text-foreground` for the top-tier one; remove the violet branch.
- **Risk:** None beyond the shared `isAccentVariant` cleanup in the previous entry.

## 18. src/renderer/src/components/sessions/ModelSelector.tsx (527-539, 576-586)
- **What:** Both dropdown triggers are `rounded-full` bordered pills (`px-2 py-0.5 text-[11px] border`, one on `bg-background`, one on `bg-muted/50`). Orca's `.model-select` is a borderless 6px-radius text button that only gains a background on hover.
- **Change:** Restyle to orca `.model-select` (design/redesign/01-orca.html:339-343): `inline-flex items-center gap-1.5 px-1.5 py-[3px] rounded-md text-[11px] font-medium text-muted-foreground border-0 bg-transparent hover:bg-secondary hover:text-foreground`. Add `focus-visible:ring-[3px] focus-visible:ring-ring/50`.
- **Risk:** The composer bottom row currently reads as a row of pills (mode toggle, model, fast toggle) — de-pilling only the model selector may look inconsistent unless the provider-filter trigger at 527 is changed the same way (it is, in this entry).

## 19. src/renderer/src/components/sessions/ModelSelector.tsx (548, 560, 638, 695)
- **What:** Menu checkmarks are `text-primary` — now #e5e5e5 in dark, indistinguishable from the row's own foreground, and #171717 in light (near-invisible on a light popover).
- **Change:** Change all four to `text-foreground` (or `text-muted-foreground` for a quieter tick). Also applies to CustomProviderModelSelector.tsx:72,93.
- **Risk:** Trivial, but there are 4 copies plus 2 in CustomProviderModelSelector.

## 20. src/renderer/src/components/sessions/ContextIndicator.tsx (64-75, 16-21)
- **What:** Bar is a `w-[120px]` × `h-1.5` (6px) fully-rounded track on `bg-muted` with a 4-stop color ramp ending in `bg-green-500`, and there is no numeric label — the percentage only exists inside the tooltip.
- **Change:** Match orca `.ctx` (design/redesign/01-orca.html:347-350): track `w-14 h-[3px] rounded-[2px] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]`, fill `rounded-none` (or 2px) and `bg-emerald-500` (`--status-done`) at the healthy level; add a `text-[10px] tabular-nums text-muted-foreground` percentage label beside it. Keep the yellow/orange/red escalation stops (real status), just swap `bg-green-500` → `bg-emerald-500`.
- **Risk:** `data-testid="context-bar"` width is asserted via inline style — keep the style prop. Halving the height makes the rounded-full look wrong, hence the radius change.

## 21. src/renderer/src/components/sessions/ContextIndicator.tsx (77, 87, 93, 100)
- **What:** Tooltip content relies on `components/ui/tooltip.tsx:39`, which is still `bg-popover text-popover-foreground border border-border ... shadow-md/5` — NOT the orca inverted tooltip. Inside it, three `border-t border-border` dividers are drawn with the popover border token.
- **Change:** Once ui/tooltip flips to inverted (`bg-foreground text-background`), these `border-border` dividers become invisible — swap them to `border-background/20` and the `text-muted-foreground` sub-labels to `text-background/70`. Flag the ui/tooltip primitive change as a prerequisite.
- **Risk:** Cross-file dependency: changing ui/tooltip without fixing this file leaves grey-on-grey dividers and unreadable muted text in every context tooltip.

## 22. src/renderer/src/components/sessions/IndeterminateProgressBar.tsx (94-118)
- **What:** A `w-36` (144px) × `h-4` (16px) `rounded-full` fully saturated bouncing worm bar with a 15%-tint track, rendered inside the composer bottom row (SessionView.tsx:6435-6441). Orca has no such element — working state is a 10px yellow-500 spinner ring plus a muted `.working-line` label (design/redesign/01-orca.html:230-232, 321).
- **Change:** Replace the fat bar with orca's working affordance: a 10px `border-2 border-yellow-500 border-t-transparent rounded-full animate-spin` ring plus optional `text-[11px] text-muted-foreground` state label. If a bar is retained for the compacting/conflict cases, shrink it to `w-14 h-[3px] rounded-[2px]` with an 8%-foreground track.
- **Risk:** The Web Animations `BOUNCE_KEYFRAMES`/global-clock sync logic (lines 22-65) exists solely to phase-align many bars across the app; if the bar is replaced by a spinner that whole block plus `progress-bounce-bar` CSS can go — grep for other consumers (worktree list, board cards) before deleting.

## 23. src/renderer/src/components/sessions/IndeterminateProgressBar.tsx (67-92)
- **What:** `isFixingConflicts` maps to `bg-fuchsia-500` / `bg-fuchsia-500/15` — magenta is not in the orca status palette and reads as brand color. `isReviewing` uses `bg-green-500` rather than emerald. `isCompacting` uses red-500, which orca reserves for error.
- **Change:** `fuchsia-500` → `red-500` (merge conflicts are an error state, and `WorktreeList` already labels them with `--status-error` per design/redesign/01-orca.html:622). `green-500` → `emerald-500` (`--status-done`). Consider `amber-500` for compacting so red stays unambiguous. Keep blue-500 (build), orange-500 (super-plan/question), violet-500 (plan).
- **Risk:** Multiple call sites pass different flag combos; the branch order (`isFixingConflicts` first) determines precedence — preserve it.

## 24. src/renderer/src/components/sessions/UserBubble.tsx (30-57)
- **What:** User message bubble is `rounded-2xl px-4 py-3` with `bg-purple-500/10` for plan AND super-plan, `bg-primary/10` for the default case, and a `bg-purple-500/15 text-purple-400` PLAN badge. `purple-500` (not violet) is brand purple, and `bg-primary/10` is now a near-white wash in dark mode.
- **Change:** Adopt orca `.msg-user` (design/redesign/01-orca.html:302-306): `rounded-[10px] border border-border bg-secondary px-3 py-2 text-[13px] leading-[1.55]` for the default. For the plan badge use the plan-mode semantic `bg-violet-500/15 text-violet-400` (violet, not purple); drop the tinted bubble background entirely — the badge already carries the mode. Super-plan should use the orange badge it already has at line 44 without also tinting the bubble.
- **Risk:** `rounded-2xl` → `rounded-[10px]` and the added border change the perceived bubble width; `max-w-[80%]` is shared with the attachment card wrapper at line 26.

## 25. src/renderer/src/components/sessions/ToolCard.tsx (897-908, 144-155)
- **What:** Tool cards are `my-1 rounded-md border border-l-2` with an inline `borderLeftColor` from `getLeftBorderColor()` (hardcoded `#3b82f6` running / `#22c55e` success / `#ef4444` error), plus `bg-muted/30` and `animate-pulse` while running. Orca `.tool-card` is a flat `border-radius: 8px; border: 1px solid var(--border); background: var(--card)` row with a small status glyph and no left accent bar and no pulse.
- **Change:** Drop the `border-l-2` + inline `borderLeftColor` accent bar and the `animate-pulse`; use `rounded-lg border border-border bg-card px-2.5 py-[7px] text-[12px]`. Express status only via `StatusIndicator` (yellow-500 spinner while running, `text-emerald-500` check on success, red on error). If the left rule is kept, change the running hex `#3b82f6` → `#eab308` (working=yellow) and `#22c55e` → `#10b981` (emerald-500).
- **Risk:** `animate-pulse` on the whole card is the only running feedback for tools without a spinner — make sure `StatusIndicator` renders a spinner for `running` before removing it. Also `compact` and non-compact branches at 899-901 are currently identical strings; consolidating them is safe.

## 26. src/renderer/src/components/sessions/ToolCard.tsx (825-833, 877-891)
- **What:** ExitPlanMode plan card uses `bg-primary/[0.04]` (a purple wash before, a white wash now) and the two synthetic user messages after accept/reject are `rounded-2xl px-4 py-3 bg-primary/10 text-foreground` — a third bubble recipe that duplicates UserBubble.
- **Change:** Plan card background → `bg-card` (keep `border-red-500/30 bg-red-500/5` for the rejected case, that is a real error state). Replace both synthetic bubbles with the same recipe as UserBubble (`rounded-[10px] border border-border bg-secondary px-3 py-2 text-[13px]`), ideally by reusing `<UserBubble>` so there is one definition.
- **Risk:** `data-testid="plan-accepted-message"` / `"plan-rejected-message"` wrappers must survive the refactor.

## 27. src/renderer/src/components/sessions/QueuedMessageBubble.tsx (14-17)
- **What:** `rounded-2xl px-4 py-3 bg-primary/10` bubble with a `bg-primary-foreground/20` badge — a fourth copy of the user-bubble recipe, and `bg-primary-foreground/20` on a `bg-primary/10` surface is now near-black-on-near-white in dark mode (the badge inverts).
- **Change:** Match the new user bubble (`rounded-[10px] border border-border bg-secondary px-3 py-2 text-[13px]`) at reduced opacity, and change the QUEUED badge to `bg-foreground/10 text-muted-foreground text-[10px] rounded px-1.5 py-0.5`.
- **Risk:** Queued bubbles must stay visually subordinate to sent ones — keep the opacity/dashed-border differentiator.

## 28. src/renderer/src/components/sessions/PermissionPrompt.tsx (149, 153)
- **What:** Prompt shell is `rounded-md border border-border bg-zinc-900/50` — a hardcoded near-black zinc that is theme-blind (in light mode this is a dark grey card on a white background), and the header is `bg-muted/30`. Same literal appears in QuestionPrompt.tsx:159 and CommandApprovalPrompt.tsx:375.
- **Change:** Replace `bg-zinc-900/50` with `bg-card` in all three files; header strip `bg-secondary` or `bg-foreground/[0.03]` with `border-b border-border`. Bump the shell to `rounded-lg` and body type to `text-[13px]` for orca density.
- **Risk:** Three files, identical literal — grep `bg-zinc-900/50` to catch all. QuestionPrompt/CommandApprovalPrompt keyboard-nav focus styles sit on the same container (`outline-none` at CommandApprovalPrompt.tsx:375), so add the orca `focus-visible:ring-[3px] ring-ring/50` when touching it.

## 29. src/renderer/src/components/sessions/CommandApprovalPrompt.tsx (106-113, 155-162, 57)
- **What:** Selected command-pattern rows are `bg-primary/20 border border-primary/40 text-foreground` — a 20% near-white fill in dark mode that overwhelms the row and washes out the mono text. Separately, the Web Access category icon is `text-purple-400` (also PermissionPrompt.tsx:31) — brand purple used as a category tag.
- **Change:** Selected row → `bg-accent border border-border text-foreground` (or `bg-foreground/8 border-foreground/15`). `text-purple-400` → `text-muted-foreground` (or `text-sky-400` if a network hue is wanted, consistent with the teleport/sky usage elsewhere).
- **Risk:** Selected vs unselected must stay distinguishable for keyboard nav; `bg-muted/30` is the unselected state, so the selected fill needs enough delta.

## 30. src/renderer/src/components/sessions/PlanReadyImplementFab.tsx (60-70, 77-87, 96-106, 120-130, 141-151, 157-167)
- **What:** Six floating pill buttons, all `h-8 rounded-full ... shadow-md`. Two are hard brand violet: `border-violet-600 text-violet-600 bg-background hover:bg-violet-100 dark:hover:bg-violet-950` (Supercharge locally) and `bg-violet-600 text-white hover:bg-violet-700` (Supercharge). Orca specifies near-zero shadows in chrome and 6px chrome radii.
- **Change:** Drop the violet: Supercharge → the same neutral recipe as the other FABs (`bg-secondary text-foreground border border-border hover:bg-accent`), with the primary `bg-primary text-primary-foreground` reserved for Implement (line 162, already correct). Change `rounded-full` → `rounded-md`, `shadow-md` → `shadow-[0_1px_2px_rgba(0,0,0,0.18)]` or none, and `text-xs` → `text-[11px]`. Consider a floating container with the frosted-glass recipe instead of per-button shadows.
- **Risk:** This FAB row overlays the message list (SessionView.tsx:6209-6225) — removing shadows entirely may make it blend into scrolling content; a single glass container behind the row is the safer swap. `ScrollToBottomFab.tsx:24` shares the `shadow-md` pill idiom and should move with it.

## 31. src/renderer/src/components/sessions/HandoffSplitButton.tsx (156-171)
- **What:** `inline-flex h-8 items-center rounded-full border ... shadow-md`, with the goal-mode active state `border-primary/40 bg-primary/15` and a floating `text-primary` GOAL label. Primary-as-accent now renders as a white-ish fill/label.
- **Change:** `rounded-full` → `rounded-md`, drop `shadow-md`; active state → `border-border bg-accent` with the GOAL label at `text-[10px] text-muted-foreground` (or emerald if goal-completion is meant to be a status).
- **Risk:** This component is embedded in the FAB row above, so it must be restyled in the same pass or the row will mix pill and rounded-md geometry.

## 32. src/renderer/src/components/sessions/TaskListWidget.tsx (30)
- **What:** Floating todo panel is `rounded-lg border border-border bg-background/95 backdrop-blur shadow-md` — an opaque-ish panel that is not the orca frosted-glass overlay. Identical string in GoalStatusWidget.tsx:142 (`w-80`) and ClaudeCliSessionView.tsx:200-206 (`bg-background/95 p-3 shadow-xl backdrop-blur`).
- **Change:** Apply the orca overlay recipe to all three: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl` with the dual shadow, and drop `shadow-md`/`shadow-xl`.
- **Risk:** These panels float over the virtualized message list; heavy `backdrop-blur-2xl` on a scrolling list can cost frames — check scroll perf after the change.

## 33. src/renderer/src/components/sessions/SlashCommandPopover.tsx (99)
- **What:** Command palette surface is `mx-3 rounded-lg border bg-popover text-popover-foreground shadow-md` — a fully opaque popover, not the frosted overlay. FileMentionPopover.tsx:78 uses the identical string.
- **Change:** Switch both to the orca menu recipe: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_10px_38px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.22)]`, item rows to `rounded-md text-[13px]`.
- **Risk:** These render inside the composer's relative wrapper (SessionView.tsx:6283-6300) which sits above `overflow-hidden` — verify blur does not create a new stacking/clipping issue. The `bg-violet-500/20 text-violet-400` plan-agent tag at SlashCommandPopover.tsx:133-135 is plan-mode semantic and should STAY.

## 34. src/renderer/src/components/sessions/CodeBlock.tsx (29, 32)
- **What:** Code blocks in assistant markdown are `bg-zinc-900 dark:bg-zinc-950` with a `bg-zinc-800 dark:bg-zinc-900` header — hardcoded near-black in BOTH themes, so light mode shows a black slab. Same pattern in BashCommandBubble.tsx:14,24,26 and tools/BashToolView.tsx:29,40,44 and tools/EditToolView.tsx:53 / tools/FileChangeToolView.tsx:36,111,119.
- **Change:** Move to tokens: block `bg-secondary border border-border rounded-lg`, header `bg-foreground/[0.04] border-b border-border`, muted output text `text-muted-foreground` instead of `text-zinc-400`. Orca `.msg-assistant code` is `bg: var(--secondary); border: 1px solid var(--border); border-radius: 4px` (design/redesign/01-orca.html:311).
- **Risk:** `highlight.js/styles/github-dark-dimmed.css` is imported globally (globals.css:3) and assumes a dark background — a light-mode code surface needs a matching light highlight theme or syntax colors will be unreadable.

## 35. src/renderer/src/components/sessions/SessionHistory.tsx (258, 464, 470)
- **What:** History drawer uses `bg-primary/10` for assistant rows (now a white wash in dark), a `bg-background/80 backdrop-blur-sm` scrim, and a `bg-background shadow-xl` opaque panel.
- **Change:** Assistant row → `bg-secondary`; scrim → `bg-background/60 backdrop-blur-sm`; panel → `bg-background/96 backdrop-blur-xl border-l border-border` with `shadow-xl` reduced to the orca dual shadow (dialogs use `bg-background/96` + blur, not a hard drop shadow).
- **Risk:** Drawer is `fixed inset-y-0 right-0 max-w-3xl` — a translucent panel over the app needs enough blur to keep long transcripts readable.

## 36. src/renderer/src/components/sessions/VirtualizedMessageList.tsx (239)
- **What:** Inline action link is `text-xs text-primary hover:text-primary/80` — `--primary` is now #e5e5e5/#171717, so the link is indistinguishable from body copy and the hover state is a near-invisible opacity shift.
- **Change:** Use `text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline` so the affordance survives the neutral primary.
- **Risk:** Low; but audit any other `text-primary` link idioms in the message list for the same problem.

## 37. src/renderer/src/components/sessions/CustomProviderModelSelector.tsx (72, 93, 105)
- **What:** `text-primary` provider label and check, and an active variant chip `bg-primary text-primary-foreground` — same near-white flip as ModelSelector, and this component is the composer's model control for custom providers.
- **Change:** `text-primary` → `text-muted-foreground` (label) / `text-foreground` (check); active chip → `bg-foreground/12 text-foreground border border-border`. Keep in sync with the `variantChipClass` change in ModelSelector.tsx:71-86 — ideally export that helper and reuse it here.
- **Risk:** Two independent chip implementations will drift again unless unified.

