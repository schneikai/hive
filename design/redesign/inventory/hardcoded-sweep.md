# Inventory — Cross-cutting hardcoded-color sweep over src/renderer/src (tokens, purples/violets, primary usage, glass/overlays, xterm/monaco/terminal themes, entry HTML)

**Notes:** STATE OF THE WORKTREE: `git status` shows only two files already migrated (uncommitted): src/renderer/src/styles/globals.css and src/renderer/src/lib/themes.ts. globals.css ALREADY has Geist @font-face + --font-sans, the full orca light/dark neutral token sets, new --worktree-sidebar / --worktree-sidebar-accent tokens (#2a2a2a / #353535 dark, #f5f5f5 / #eaeaea light), letter-spacing 0.01em, orca scrollbars, and the grain overlay + `font-size: 18px` have both been REMOVED. themes.ts's glass-dark/glass-light presets are already renamed "Orca Dark"/"Orca Light" with neutral previewColors. So the classic sweep targets (hsl(260, oklch purple, DM Sans, 18px, grain) are gone from those two files — what remains there is only what I listed (pr-comment link color, rgba(139,92,246) monaco decorations, amethyst/daylight presets, hsl(260) surfaces across the remaining 10 presets). EVERY component file is still pre-orca.

NO NEW --worktree-sidebar CONSUMERS: the new lifted left-sidebar tokens exist in globals.css:82-87/137-142/180-185 but zero components reference `worktree-sidebar` yet — grep returns hits only in globals.css. Whoever owns the sidebar area must wire them up.

VIOLET CLASSIFICATION SUMMARY (83 purple/violet/indigo/fuchsia hits total):
- KEEP (plan-mode semantic): ModeToggle.tsx:51; FollowupInput.tsx:127; WorktreePickerModal.tsx:1866 and 2427; SessionView.tsx:6319,6421; SlashCommandPopover.tsx:134 (plan agent chip); KanbanTicketModal.tsx:2951 ("Plan ready" pill), 3585, 3818 (plan-mode send buttons); KanbanTicketCard.tsx:1210,1356,1367,1479; IndeterminateProgressBar.tsx:79,92.
- KEEP (content/product identity, not chrome): lib/file-icons.ts:228-232,297-302 (video + eslint file-type icons, 11 hits); projects/LanguageIcon.tsx:56,57,59 (php/elixir/kotlin language badges); the Figma-brand `text-purple-500` icon color at PinnedList.tsx:507, WorktreeItem.tsx:744,865, AddAttachmentDialog.tsx:94, TicketAttachmentEditor.tsx:222 — these track vendor/file-type identity, not Hive brand.
- CHANGE (brand chrome): everything in my entries above — diff/PR-review comment chrome (15 hits), ModelSelector/TicketModelBadge ultra accent (4), Supercharge buttons (5), merged-state purple (5), KanbanTicketCard epic/tag/border (4), UsageIndicator active border (1), Header indigo mug (1), UserBubble purple plan bubbles (3, purple-500 → should be violet-500 ramp), IndeterminateProgressBar fuchsia (2).

TEST FILES THAT ASSERT ON DOOMED CLASS STRINGS: components/layout/UsageIndicator.test.tsx:467,487,505 ('border-purple-500') and components/kanban/TicketModelBadge.test.tsx:141,151,162 ('border-violet-500'). Both will fail the moment the styling changes — bundle the test edits with the style edits.

bg-primary/text-primary TOTALS: 128 bg-primary lines and 109 text-primary lines across ~60 files. The three buckets are (a) KEEP-NEUTRAL — active-tab underlines, mnemonic letters, search highlights, segmented selected chips, solid CTA buttons; (b) NEEDS-SEMANTIC — unread dots, "Working" labels/spinners, update/attention pills, drop-zone/drag indicators; (c) TINT-COLLAPSE — every bg-primary/5–/25 wash, which stops working entirely once primary is #e5e5e5 in dark and must move to bg-secondary/bg-accent or a status hue. Bucket (c) is the biggest and riskiest; I gave it a dedicated entry with the full site list.

NOT FOUND (clean): no `hsl(260` outside themes.ts; no `oklch(` anywhere now; no `#7c5ce0`/`#6932d4` remaining; no `DM Sans` references outside the still-present but now-unreferenced assets/fonts/DMSans-Variable.woff2 (safe to delete once nothing imports it); no rgba purple literals outside globals.css:576,586; monaco-setup.ts has no color literals.

## 1. src/renderer/src/styles/globals.css (526-528)
- **What:** .pr-comment-html a { color: var(--primary) } — worked when --primary was purple; --primary is now #e5e5e5 (dark) / #171717 (light), so PR-comment links render identical to body text.
- **Change:** Give links an explicit semantic color (blue-400 dark / blue-600 light) or keep var(--primary) + rely on the existing underline plus font-weight; do not leave color:var(--primary) alone.
- **Risk:** Only affects GitHub bodyHTML rendering; low regression risk.

## 2. src/renderer/src/styles/globals.css (574-588)
- **What:** Monaco diff-comment decorations hardcode brand violet: .diff-comment-range-highlight rgba(139, 92, 246, 0.15) and .diff-comment-jump-flash rgba(139, 92, 246, 0.35). The sibling outdated rule already uses yellow (semantic, keep).
- **Change:** Replace both violet rgba literals with neutral chrome tints — rgb(255 255 255 / 0.06) dark / rgb(0 0 0 / 0.05) light for the range highlight, and a brighter neutral (or blue-500/25 if a 'jump target' accent is wanted) for the flash.
- **Risk:** Flash must stay visible against editor bg in both themes; a pure-neutral flash at 0.35 may read as a selection.

## 3. src/renderer/src/styles/xterm.css (51, 56-58)
- **What:** xterm search decorations use purple fallbacks hsl(270 60% 55%) for --ring/--primary, and the active-result uses var(--primary) at 30% as a fill — with orca's near-white --primary the active search hit becomes a white block in dark mode and near-invisible in light mode.
- **Change:** Swap fallbacks to orca ring #737373; change the active-result outline/fill to an explicit semantic search color (amber-500 outline + amber-500/25 fill) instead of var(--primary).
- **Risk:** Terminal find UX regression if the fill loses contrast against terminal background.

## 4. src/renderer/src/lib/themes.ts (72-110)
- **What:** 'amethyst' preset is a full purple brand theme: primary/ring/sidebar-primary hsl(270 60% 55%) plus hsl(260 ...) purple-tinted surfaces across all 27 tokens and previewColors.
- **Change:** Either delete the preset (glass-dark/glass-light are now Orca Dark/Light and are the default) or re-tune it to a neutral-with-violet-accent variant; at minimum drop the hsl(260) tinted greys for hsl(0 0% ...) neutrals so purple never reaches chrome surfaces.
- **Risk:** Users with themeId='amethyst' persisted in DB — keep the id resolvable or map it to glass-dark in useThemeStore's normalizer (src/renderer/src/stores/useThemeStore.ts:46-55).

## 5. src/renderer/src/lib/themes.ts (320-359, plus hsl(260 ...) throughout (40 occurrences))
- **What:** 'daylight' preset uses purple primary hsl(270 60% 50%); daylight/cloud/mint/rose and other light presets all build surfaces from hsl(260 15% 95%) / hsl(260 10% 45%) / hsl(260 10% 90%) — i.e. purple-tinted greys reintroduced through the theme switcher.
- **Change:** Replace every hsl(260 ...) surface/border/muted value across presets with neutral hsl(0 0% ...) equivalents matching orca ramps (#f5f5f5, #737373, #e5e5e5, #262626, #a1a1a1); change daylight's primary to a non-purple accent or fold it into Orca Light.
- **Risk:** Presets are applied at runtime via THEME_CSS_PROPERTIES; changing values is safe, removing keys is not (all 27 must stay present).

## 6. src/renderer/src/lib/monaco-theme.ts (7-11, 37-40)
- **What:** Fallback hexes are the old zinc set (#09090b, #0a0a0c, #27272a, #71717a) and selection/line-highlight are hardcoded VSCode values (#264f78, #264f7840, #ffffff08).
- **Change:** Update fallbacks to orca values (#0a0a0a bg, #171717 card, #a1a1a1 muted-fg, rgba white 7% border) and make selection a neutral (#ffffff1f) or the resolved --accent (#404040) instead of blue #264f78.
- **Risk:** resolveCssColor already reads live CSS vars, so fallbacks only matter pre-hydration; the selection colors are always hardcoded and do matter.

## 7. src/renderer/src/components/terminal/backends/XtermBackend.ts (14-36, 88-101)
- **What:** DEFAULT_TERMINAL_THEME is Catppuccin Mocha — purple-blue background #1e1e2e, cursor #f5e0dc, selection #585b7066, magenta/brightMagenta #f5c2e7 — visibly clashes with a #0a0a0a orca terminal pane; buildTheme then overrides selectionBackground from --accent (now opaque #404040, no alpha) and cursor from --muted-foreground.
- **Change:** Rebase DEFAULT_TERMINAL_THEME on an orca-neutral palette (background #0a0a0a, foreground #fafafa, neutral brights); give selectionBackground an explicit alpha (e.g. rgb(255 255 255 / 0.16)) rather than raw var(--accent), since an opaque accent will hide selected text.
- **Risk:** Opaque selection background from --accent (#404040) will make selected terminal text unreadable — this is a live regression the moment the dark token set lands.

## 8. src/renderer/src/components/layout/PinnedList.tsx (725, 1172; RecentList.tsx:175,250; connections/ConnectionItem.tsx:546; worktrees/WorktreeItem.tsx:717)
- **What:** Unread indicators are `h-2 w-2 rounded-full bg-primary` — purple dots today. With neutral --primary they become near-white dots in dark mode, indistinguishable from ordinary foreground text/icons, losing the 'unread' signal.
- **Change:** NEEDS SEMANTIC COLOR: give unread dots a dedicated status color (blue-500 or emerald-500 per orca status vocabulary), not bg-primary.
- **Risk:** Four separate lists must stay visually consistent; there is also a matching dot in kanban ticket cards to keep in sync.

## 9. src/renderer/src/components/layout/RecentList.tsx (154, 231, 269; PinnedList.tsx:438,625,803,1014,1092; connections/ConnectionItem.tsx:132,453; worktrees/WorktreeItem.tsx:236,597; layout/SetupTab.tsx:124)
- **What:** 'Working' status text and Loader2 spinners are text-primary (purple today). Under orca these become near-white, so a working session looks identical to idle chrome — and orca specifies working = yellow-500.
- **Change:** NEEDS SEMANTIC COLOR: replace text-primary with text-yellow-500 on the Working label and the Loader2 spinners; keep statusClass font-semibold.
- **Risk:** statusClass strings are shared through helper objects — update the helper, not just the JSX, or the label and spinner will diverge.

## 10. src/renderer/src/components/sessions/SessionTabs.tsx (297, 404, 488, 1368, 1514, 1540, 1587, 1683; file-tree/FileSidebar.tsx:79,85,99,105,119,125,140,146; layout/BottomPanel.tsx:126,133; terminal/TerminalTabsHorizontal.tsx:169; layout/Header.tsx:411,442,468,604,677; projects/HighlightedText.tsx:17; kanban/HighlightedText.tsx:21; kanban/KanbanTicketCard.tsx:1145; file-tree/FileTreeNode.tsx:173)
- **What:** Active-tab underlines (`h-0.5 bg-primary`), vim mnemonic letters (`text-primary font-bold`) and search-match highlights (`bg-primary/25`) — all currently purple accents.
- **Change:** KEEP AS NEUTRAL: these read correctly as near-white/near-black under orca. Only adjust weight/opacity — underlines to 1px `bg-foreground`, mnemonic letters to `text-foreground` + underline so they stay legible against 13px chrome, and search marks to `bg-foreground/20 text-background` if contrast drops.
- **Risk:** On light mode the underline becomes #171717 on #fff — verify it doesn't read heavier than the orca mockups' hairline active indicator.

## 11. src/renderer/src/components/ui/button.tsx (8, 13, 21)
- **What:** Base ring is `focus-visible:ring-ring/24` (orca wants ring-ring/50); default variant carries `shadow-[0_1px_2px_--theme(--color-primary/24%)]`, which turns into a white glow under a near-white --primary; `link` variant is text-primary.
- **Change:** Change ring opacity to ring-ring/50 (keep ring-[3px]); replace the primary-tinted drop shadow with a neutral `shadow-[0_1px_2px_rgb(0_0_0/0.08)]` or drop it (orca = near-zero shadows in chrome); link variant → text-foreground with underline, or blue-400 if it must read as a hyperlink.
- **Risk:** button.tsx is the widest-blast-radius file in the renderer; the `before:shadow-[...]` inner-highlight pseudo-element at line 8 also needs re-checking against the 7% hairline system.

## 12. src/renderer/src/components/ui/tooltip.tsx (38, 44)
- **What:** TooltipContent is `bg-popover text-popover-foreground border border-border shadow-md/5` with a matching bg-popover arrow — a same-surface tooltip, not orca's inverted one.
- **Change:** Invert: `bg-foreground text-background`, drop the border, and recolor the Arrow to `bg-foreground fill-foreground`; keep rounded-md and text-[11px]/13px per orca dense chrome.
- **Risk:** Arrow is a separate element — recolor both or the arrow will float as a light square on an inverted body.

## 13. src/renderer/src/components/ui/dropdown-menu.tsx (49, 68 (and context-menu.tsx:49,67))
- **What:** Menu surfaces are opaque `bg-popover ... rounded-md ... shadow-lg/5` with a `before:` hairline pseudo-element — no frosted glass, wrong radius.
- **Change:** Move to the orca overlay recipe: rounded-[11px], border-black/14 (light) / border-white/14 (dark), bg rgba(255,255,255,0.82) / rgba(0,0,0,0.72), backdrop-blur-2xl, dual shadow; keep item rows rounded-md/6px at text-[13px].
- **Risk:** backdrop-blur on Electron portals over the terminal/Monaco can cost paint time; also `overflow-hidden` + blur can clip sub-menu shadows.

## 14. src/renderer/src/components/ui/popover.tsx (29 (and hover-card.tsx:40))
- **What:** Popover/HoverCard content uses opaque bg-popover, rounded-md, shadow-lg/5 — same non-glass treatment as menus.
- **Change:** Apply the identical frosted recipe as dropdown/context menu so all floating chrome matches 01-orca.html; factor the class string into one shared constant to avoid drift across the four overlay primitives.
- **Risk:** Popovers host inputs and lists — verify the translucent bg doesn't reduce text contrast over busy diff/terminal backdrops.

## 15. src/renderer/src/components/ui/dialog.tsx (22, 40, 46 (and alert-dialog.tsx:30,53))
- **What:** Overlay is `bg-black/32 backdrop-blur-sm`; content is fully opaque `bg-background ... shadow-lg/5 sm:rounded-lg`; the close button still uses the pre-orca ring recipe `focus:ring-2 focus:ring-ring focus:ring-offset-2`.
- **Change:** Content → `bg-background/96 backdrop-blur-xl` with the orca dual shadow and rounded-[11px]; overlay → keep black/32 but raise blur to backdrop-blur-md; close button → `focus-visible:ring-[3px] focus-visible:ring-ring/50` with no ring-offset.
- **Risk:** Translucent dialog content over a blurred overlay can double-blur and wash out; check the 3 kanban drop-zone overlays that sit inside DialogContent (KanbanTicketModal.tsx:2989,3493,3796).

## 16. src/renderer/src/components/ui/checkbox.tsx (20; settings/SettingsAppearance.tsx:29; projects/ProjectFilter.tsx:245; kanban/BoardSearchBar.tsx:88; kanban/TicketPickerModal.tsx:181; kanban/MoveToProjectModal.tsx:82; kanban/FavoriteTicketCreateModal.tsx:187; layout/RunOutputSearch.tsx:147; layout/PinnedList.tsx:686,1144; connections/ConnectionItem.tsx:500; connections/RecentConnectionsDialog.tsx:500; worktrees/WorktreeItem.tsx:672; terminal/TerminalTabsHorizontal.tsx:137; terminal/TerminalToolbar.tsx:95; terminal/TerminalTabEntry.tsx:102; discord/DiscordProvisionModal.tsx:138; custom-commands/CustomCommandsEditor.tsx:112; kanban/BoardAssistantView.tsx:437; projects/ProjectSettingsDialog.tsx:646)
- **What:** Two pre-orca focus recipes are scattered through the app: `focus:ring-1 focus:ring-ring` (solid 1px purple ring today) and `focus-visible:ring-2 ... ring-offset-2`; ProjectSettingsDialog uses ring/24 like button.tsx.
- **Change:** Normalize every hit to `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring` (drop ring-offset-*); prefer replacing raw <input> classNames with the shared ui/input.tsx which should also move from ring-ring/24 to ring-ring/50 (src/renderer/src/components/ui/input.tsx:11, textarea.tsx:10).
- **Risk:** ring-offset-2 removal changes layout spacing in tight rows; ring-[3px] on 20px-tall inline inputs (terminal tab rename) may clip inside overflow-hidden parents.

## 17. src/renderer/src/components/layout/Header.tsx (224, 263, 297)
- **What:** Titlebar is `h-12 border-b bg-background` (orca is 36px, left segment matching sidebar bg); the keep-awake mug uses `text-indigo-400` as a brand-ish armed state; the vim pill uses `text-primary bg-primary/10 border-primary/30`.
- **Change:** h-12 → h-9 with `bg-background` right segment and a `bg-sidebar` left segment; indigo-400 → a neutral (text-muted-foreground) or the sky/blue status color used elsewhere for 'armed'; vim pill → bg-secondary/border-border/text-foreground (neutral) since text-primary at 10% tint reads as a white smear in dark.
- **Risk:** Header height is load-bearing for drag-region geometry and for the panel layout math elsewhere; changing h-12 needs a pass over anything computing offsets from 48px.

## 18. src/renderer/src/components/sessions/UserBubble.tsx (34, 36, 39, 52 (and QueuedMessageBubble.tsx:14,16; ToolCard.tsx:831,879,887; SessionHistory.tsx:258))
- **What:** Plan/super-plan user bubbles use off-palette `bg-purple-500/10` and the PLAN badge is `bg-purple-500/15 text-purple-400`; default bubbles are `bg-primary/10` (a purple wash today) which becomes a near-white wash under orca, killing the bubble/background separation.
- **Change:** Plan bubbles/badges → violet-500 tokens (plan-mode semantic, so keep violet but use the violet-500 ramp, not purple-500, so plan reads consistently with ModeToggle); default/assistant bubbles → `bg-secondary` (#262626 dark / #f5f5f5 light) instead of bg-primary/10.
- **Risk:** bg-primary/10 in dark orca = ~#e5e5e5 at 10% over #0a0a0a → a grey barely distinct from bg-secondary; verify bubbles remain visually grouped after the swap.

## 19. src/renderer/src/components/sessions/ModelSelector.tsx (76-77, 592 (and kanban/TicketModelBadge.tsx:65))
- **What:** 'ultra'/'ultracode' variant chips use `bg-violet-600 text-white` / `bg-violet-500/15 text-violet-600 dark:text-violet-300`, and the ultra ticket badge uses `border-2 border-violet-500` — violet here is a tier/brand accent, not plan-mode semantics.
- **Change:** Recolor to neutral emphasis (bg-foreground text-background for active, bg-secondary text-foreground for inactive) or to an explicit non-plan status hue (amber-500) so violet stays reserved for plan mode; TicketModelBadge ring → border-foreground/40.
- **Risk:** TicketModelBadge.test.tsx:141,151,162 asserts the literal classes `border-2 border-violet-500` — the test must be updated with the styling.

## 20. src/renderer/src/components/sessions/IndeterminateProgressBar.tsx (68, 81 (fuchsia — CHANGE); 79, 92 (violet — KEEP))
- **What:** Conflict-fixing state is `bg-fuchsia-500/15` / `bg-fuchsia-500`, an off-palette brand-adjacent magenta. The violet default branch is plan-mode semantics and is correct. Other branches (red compacting, amber asking, green reviewing, blue build, orange super-plan) are semantic.
- **Change:** Replace fuchsia-500 with a defined status hue — orange-500 (attention/conflict) or red-500 if it should read as an error state; leave the violet plan branch untouched.
- **Risk:** Compacting already uses red-500 at lines 70/83 — pick a hue that doesn't collide with it.

## 21. src/renderer/src/components/diff/DiffCommentGutter.tsx (644, 736, 745, 749, 783, 836, 848, 897, 928)
- **What:** 9 violet hits are brand chrome for local diff comments, not plan mode: the hover '+' button `bg-violet-600 hover:bg-violet-500 text-white`, draft/saved comment cards `border-violet-500/30 bg-violet-950/30`, icons `text-violet-400`, textarea focus `focus:border-violet-500/50`, submit `bg-violet-600 hover:bg-violet-500`. Note the `bg-violet-950/*` fills are dark-only literals with no light-mode counterpart.
- **Change:** Move to neutral chrome: '+' button `bg-foreground text-background`, comment cards `border-border bg-secondary`, icons `text-muted-foreground`, textarea focus to the orca ring recipe, submit to the default Button variant; keep the yellow 'outdated' variant at line 834 as the semantic it is.
- **Risk:** bg-violet-950 has no light equivalent — the cards are currently unusable in light mode, so the neutral swap should be verified in both themes.

## 22. src/renderer/src/components/diff/PrCommentGutter.tsx (193 (and diff/DiffCommentSidePanel.tsx:341; pr-review/PrCommentCard.tsx:75,85; pr-review/PrReviewViewer.tsx:208,221))
- **What:** PR-review comment chrome is violet as a brand accent: highlighted thread `border-violet-500/50 bg-violet-950/40`, side-panel active section `border-l-2 border-violet-500/30`, selected comment row `bg-violet-500/10`, checkbox `accent-violet-500`, 'Select all' link `text-violet-400`, attach button `bg-violet-600 hover:bg-violet-700 text-white`.
- **Change:** Neutralize: highlighted/selected states → `bg-accent` / `ring-1 ring-ring/40`, section rule → `border-l-2 border-border`, checkbox → `accent-[var(--foreground)]`, link → text-foreground underline, attach button → default Button variant. Keep the sibling yellow 'outdated' treatments.
- **Risk:** Selected vs hovered rows both become neutral — make sure selected is distinguishable (ring or bg-secondary vs hover bg-accent/40).

## 23. src/renderer/src/components/kanban/KanbanTicketCard.tsx (123, 1082, 1086, 1791 (CHANGE); 1210, 1356, 1367, 1479 (violet plan pills — KEEP))
- **What:** PROJECT_TAG_COLORS includes '#8b5cf6' violet at line 123; card borderState 'violet' → `border-violet-500/60` (line 1082) is chrome, not plan; the 'epic' mark uses `!border-l-purple-500` (1086) and its context-menu swatch `bg-purple-500` (1791) — off-palette purple in a mark ramp that is otherwise green/blue/orange.
- **Change:** Drop or replace '#8b5cf6' in PROJECT_TAG_COLORS with a neutral/teal; map borderState 'violet' to the plan-mode violet ramp only if it truly means plan (otherwise → border-border); recolor the 'epic' mark stripe+swatch to a non-purple hue (e.g. fuchsia is also out — use a distinct blue-violet only if epic == plan, else pink-500/cyan-500).
- **Risk:** Mark colors are persisted semantics users learn — changing epic's hue is a visible behavioral change; the plan pills at 1210/1356/1367/1479 must stay violet.

## 24. src/renderer/src/components/kanban/TicketPickerModal.tsx (40 (and kanban/AttachPRPopover.tsx:32; kanban/JiraImportModal.tsx:224; kanban/ImportTicketsModal.tsx:361))
- **What:** 'Merged'/closed states are purple: TicketPickerModal merged chip `border-purple-600/50 text-purple-400/70` + active `border-purple-500 bg-purple-500/15 text-purple-300`; AttachPRPopover MERGED `bg-violet-500/20 text-violet-400 border-violet-500/30`; Jira/GitHub import 'closed' badges `bg-purple-500/10 text-purple-500`.
- **Change:** Per orca, merge/done = emerald-500: recolor merged/closed chips to the emerald ramp already used by the 'done' column in the same COLUMNS array (TicketPickerModal.tsx:41), keeping open=green/blue and in-progress=blue/amber as-is.
- **Risk:** TicketPickerModal already has both a purple 'merged' and an emerald 'done' chip — they must remain distinguishable (use emerald for merged, a neutral/zinc for done, or vary fill vs outline).

## 25. src/renderer/src/components/sessions/PlanReadyImplementFab.tsx (125, 146-147, 162-163 (and kanban/KanbanTicketModal.tsx:3022, 3035))
- **What:** 'Supercharge' actions are hardcoded brand violet (`border-violet-600 text-violet-600 ... dark:hover:bg-violet-950`, `bg-violet-600 text-white hover:bg-violet-700`) and every FAB carries `shadow-md`; the Implement FAB is `bg-primary text-primary-foreground shadow-md` which flips to a near-white pill under orca.
- **Change:** Supercharge → neutral outline/solid Button variants (or orange-500 if it should read as a special-attention action); drop shadow-md to orca's near-zero chrome shadow; verify bg-primary/text-primary-foreground FAB still reads as the dominant CTA at #e5e5e5 on #0a0a0a (it should — keep neutral).
- **Risk:** Implement/Supercharge sit side by side; if both go neutral the primary CTA hierarchy is lost — keep Supercharge as outline and Implement as solid.

## 26. src/renderer/src/components/layout/UsageIndicator.tsx (304, 318)
- **What:** Active-account row highlight is `border-2 border-purple-500` (pure brand purple) and the 'Active' pill is `bg-primary/15 ... text-primary` which becomes a near-white-on-near-white wash in dark.
- **Change:** Row highlight → `ring-1 ring-ring` or `border border-foreground/30` (neutral); 'Active' pill → `bg-secondary text-foreground` or emerald-500 tints if 'active' should read as a status.
- **Risk:** UsageIndicator.test.tsx:467,487,505 asserts on the literal string 'border-purple-500' — update those three assertions with the change.

## 27. src/renderer/src/components/settings/SettingsGeneral.tsx (84,111,138,234,263,292,319,347,420,447,474,677 (tracks) + 90,117,144,240,269,298,325,353,426,453,480,683 (knobs); settings/SettingsAdvanced.tsx:116,142,174 + 121,147,179; settings/SettingsPet.tsx:46,52; settings/SettingsPrivacy.tsx:56,61)
- **What:** Hand-rolled toggles: track `bg-primary : bg-muted` and knob `bg-background shadow-lg ring-0`. shadow-lg on a 16px knob is far outside orca's near-zero-shadow chrome, and the track relies on primary-vs-muted contrast that shrinks once primary is neutral grey.
- **Change:** Replace these hand-rolled toggles with the shared ui/switch.tsx (which already uses data-[state]:bg-primary + the orca ring recipe), or at minimum swap shadow-lg → shadow-xs and confirm bg-primary (#e5e5e5) vs bg-muted (#262626) still reads as on/off in dark and #171717 vs #f5f5f5 in light.
- **Risk:** ~30 call sites; switching to ui/switch changes DOM structure and may break settings tests that query the div-based toggles.

## 28. src/renderer/src/components/settings/SettingsGeneral.tsx (161,173,195,207,372,384,396,500,512,529,544,586,600,614,627,640,702,714; settings/SettingsSecurity.tsx:207,220,233; settings/SettingsUpdates.tsx:56,68; spaces/SpaceIconPicker.tsx:160; sessions/CodexFastToggle.tsx:49; sessions/CustomProviderModelSelector.tsx:105; kanban/WorktreePickerModal.tsx:352)
- **What:** Segmented-control selected states are `bg-primary text-primary-foreground border-primary` — currently purple-on-white, becoming #e5e5e5-on-#171717 (dark) / #171717-on-#fafafa (light).
- **Change:** KEEP AS NEUTRAL — this is exactly orca's inverted 'selected' chip. Only re-tune the surrounding geometry: rows to rounded-md/6px, text to text-[13px]/text-[11px], and unselected states to bg-secondary/border-border instead of leftover purple-tinted borders.
- **Risk:** High-contrast inverted chips at small sizes can look heavier than the mockups; consider bg-secondary + border-foreground/20 for lower-emphasis segments.

## 29. src/renderer/src/components/layout/UpdatePill.tsx (39,43,53,58,70; ui/HintBadge.tsx:12-13; ui/HelpOverlay.tsx:23,205; ui/Tip.tsx:78; settings/SettingsAccounts.tsx:159; kanban/BoardAssistantView.tsx:414,522; worktrees/BranchPickerDialog.tsx:227; layout/HeaderDiscordToggle.tsx:27; projects/RecentToggleButton.tsx:14; layout/PinnedList.tsx:129; layout/ResizeHandle.tsx:56-58; kanban/KanbanColumn.tsx:403,841,854; kanban/WorktreePickerModal.tsx:1926,1932,2030; connections/RecentConnectionsDialog.tsx:472-473,520-521,529; settings/SettingsEditor.tsx:82; settings/SettingsTerminal.tsx:190,232,349; settings/SettingsPet.tsx:87; settings/SettingsShortcuts.tsx:198,200; settings/SettingsAppearance.tsx:31,69,79; sessions/HandoffSplitButton.tsx:158-159,169; sessions/VirtualizedMessageList.tsx:239; discord/DiscordProvisionModal.tsx:182; projects/AddRepositoryDialog.tsx:212)
- **What:** The pervasive 'tinted brand chip' pattern — bg-primary/5–/25 + text-primary + border-primary/20–/60 (plus ring-primary/20-/30 and bg-primary progress fills). Today these are legible purple washes; with a near-white primary in dark mode the tint collapses toward the foreground and the text loses contrast against its own background.
- **Change:** NEEDS RECLASSIFICATION per site: informational chips/selected rows → `bg-secondary text-foreground border-border` (neutral); attention/update prompts (UpdatePill, HintBadge, Tip rail, HandoffSplitButton goal mode) → an explicit status hue (orange-500 for attention, blue-500 for build/update); progress fills (DiscordProvisionModal:182, AddRepositoryDialog:212) → `bg-foreground` on `bg-secondary` track; drag/drop indicators (ResizeHandle, KanbanColumn:841,854, ring-primary drop targets) → `bg-ring`/`border-ring` so they don't read as content.
- **Risk:** Largest single bucket (~60 sites). Doing a blanket primary→foreground rename will make several of these invisible (e.g. bg-primary/[0.03] drop zone in KanbanColumn:854) — each needs the keep-neutral vs needs-semantic call made explicitly.

## 30. src/renderer/src/components/pr/PRNotificationStack.tsx (200-201)
- **What:** The one place that already does glass — `bg-background/70 backdrop-blur-xl backdrop-saturate-150 rounded-xl border border-white/[0.08] shadow-xl shadow-black/20` — but with pre-orca numbers (wrong radius, 8% white border, blur-xl, heavy shadow) and a dark-only white border.
- **Change:** Align to the orca overlay recipe: rounded-[11px], border-white/14 (dark) / border-black/14 (light), bg rgba(0,0,0,0.72) / rgba(255,255,255,0.82), backdrop-blur-2xl, dual shadow; drop backdrop-saturate-150.
- **Risk:** This stack floats over the board — verify legibility over both the light board bg and dark terminal.

## 31. src/renderer/src/components/command-palette/CommandPalette.tsx (173; file-search/FileSearchDialog.tsx:150; ui/HelpOverlay.tsx:196; toasts/GhosttyPromoToast.tsx:13; layout/QuitConfirmationOverlay.tsx:46; layout/LoginBanner.tsx:24; sessions/SessionHistory.tsx:470; sessions/ClaudeCliSessionView.tsx:202; kanban/KanbanBoard.tsx:441; ui/sonner.tsx:15)
- **What:** Floating chrome uses heavy pre-orca elevation on opaque surfaces: shadow-xl / shadow-2xl / shadow-lg with rounded-lg|rounded-xl and solid bg-popover/bg-background (CommandPalette and FileSearchDialog are the two most-seen surfaces and are fully opaque).
- **Change:** Convert CommandPalette + FileSearchDialog to the orca frosted recipe (rounded-[11px], white/14|black/14 border, rgba bg, backdrop-blur-2xl, dual shadow); downgrade the remaining shadow-xl/2xl to the orca dual shadow; sonner toast → bg-popover glass + rounded-[11px] instead of shadow-lg rounded-lg.
- **Risk:** CommandPalette/FileSearchDialog render long virtualized lists — translucency plus blur over a scrolling list is the most expensive combination; measure before shipping blur on those two.

## 32. src/renderer/src/index.html (11-14 (and src/renderer/pet.html:12-14))
- **What:** Neither entry document sets a background color on <html>/<body>; the app relies entirely on Tailwind's bg-background applied after React mounts, so first paint flashes the browser default white even though <html class="dark">. pet.html additionally has no `class="dark"` at all.
- **Change:** Add an inline `style="background:#0a0a0a"` (or a small inline <style> setting html,body{background:#0a0a0a}) to index.html to kill the white flash on the orca dark default, and add class="dark" to pet.html so pet chrome inherits the dark token set; pet.css:119-127 status dots (#2563eb/#dc2626/#16a34a) are semantic and stay.
- **Risk:** Hardcoding a background in HTML means light-mode users get a dark flash instead — use prefers-color-scheme in the inline style if light is a supported startup state.

