# Implementation agent reports

## Agent 1

**Completed (20):**
- src/renderer/src/components/ui/button.tsx
- src/renderer/src/components/ui/tooltip.tsx
- src/renderer/src/components/ui/popover.tsx
- src/renderer/src/components/ui/hover-card.tsx
- src/renderer/src/components/ui/dropdown-menu.tsx
- src/renderer/src/components/ui/context-menu.tsx
- src/renderer/src/components/ui/menu-classes.ts (new shared glass-menu/menu-row constants consumed by both menu files)
- src/renderer/src/components/ui/dialog.tsx
- src/renderer/src/components/ui/alert-dialog.tsx
- src/renderer/src/components/ui/input.tsx
- src/renderer/src/components/ui/textarea.tsx
- src/renderer/src/components/ui/checkbox.tsx
- src/renderer/src/components/ui/switch.tsx
- src/renderer/src/components/ui/tabs.tsx
- src/renderer/src/components/ui/sonner.tsx
- src/renderer/src/components/ui/HelpOverlay.tsx
- src/renderer/src/components/ui/HintBadge.tsx
- src/renderer/src/components/ui/Tip.tsx
- src/renderer/src/components/ui/provider-icon.tsx
- src/renderer/src/components/ui/loading.tsx

**Skipped (5):**
- entry 5 call-site sweep (33 hand-rolled h-6/h-7/h-8 overrides on size="icon" across the renderer): Directive: do NOT sweep call sites outside ui/. icon-sm (size-7) and icon-xs (size-6 + svg size-3.5) variants were added; existing overrides still win via cn() merge so nothing breaks, but area agents must migrate them.
- src/renderer/src/components/command-palette/CommandPalette.tsx: Flagged in ui-primitives.md notes as needing the identical glass treatment, but it is outside the ui/ ownership list.
- src/renderer/src/styles/globals.css (--radius-md retune to 6px suggested in inventory notes): Outside ownership; used explicit rounded-[6px]/rounded-[8px]/rounded-[11px] literals instead, per the additional directive.
- hardcoded-sweep entry 16 non-ui files (SettingsAppearance, ProjectFilter, kanban/terminal/connection focus recipes, etc.): Only ui/checkbox.tsx (and input/textarea ring/50) are in my ownership; the ~20 raw <input> focus-recipe call sites belong to area agents.
- entry 33 WorkingSpinner split / agent-working call-site audit: Inventory marks it low priority and the audit spans call sites outside ui/; LoadingSpinner kept neutral, LoadingOverlay bumped to bg-background/85 backdrop-blur-md as prescribed.

**Concerns (11):**
- Density shift: Button default h-9->h-8 (sm h-8->h-7, lg h-10->h-9, icon size-9->size-8) and Input h-9->h-8 will reflow dialog footers, toolbars and settings forms - verify visually (entry 5/20 risks).
- overflow-hidden removed from PopoverContent/HoverCardContent and both menu contents: submenu flyouts and shadows no longer clipped (intended), but any caller relying on corner-clipping of edge-to-edge children now shows square corners; Tip.tsx re-adds its own overflow-hidden and was verified.
- Deliberate behavior-preserving keeps: inert `relative` retained on the button base (callers position badges against it) and `overflow-hidden` retained on Dialog/AlertDialog content (KanbanTicketModal drop overlays rely on corner clipping); visual result is still flat/sheen-free.
- Destructive button variant's tinted drop shadow was also deleted (CONVENTIONS 'no shadows in chrome') even though entry 2 only named the default variant; link variant went text-primary -> text-foreground per hardcoded-sweep entry 11.
- menuItemClass adds a guarded [&_svg:not([class*=size-])]:size-4 to context-menu rows that previously had no svg sizing: icons hand-sized with h-*/w-* (not size-*) inside context/dropdown menu items now render at 16px. I used the guarded variant instead of the inventory's unguarded [&_svg]:size-4 to limit collateral.
- Tooltip is now inverted (bg-foreground text-background, 11px): call sites that pass color/background overrides via className could clash - inventory says all 47 are plain text, but worth a visual pass.
- backdrop-blur-2xl now runs on every dropdown/context menu, popover, hover-card and toast over terminal/Monaco panes - watch paint cost (hardcoded-sweep entry 13 risk).
- sonner theme now derives from useThemeStore getCurrentTheme()?.type (fallback 'dark'); toasts fired before DB theme hydration briefly render dark in light mode.
- Tabs: active trigger is bg-background inside a bg-secondary tray with shadow removed - verify the active tab still reads in light mode; TabsTrigger also gained the previously missing focus ring.
- Checkbox resting border moved border-primary -> border-input (entry 22, highest-visibility flip): unchecked boxes are now hairline-grey - confirm they remain findable on bg-background in light theme.
- dark:bg-input/32 was normalized to /30 on input/textarea (and outline button per entry 3) for lockstep - a 2% fill change, listed here for completeness.

## Agent 2

**Completed (13):**
- src/renderer/src/components/command-palette/CommandPalette.tsx
- src/renderer/src/components/command-palette/CommandItem.tsx
- src/renderer/src/components/file-search/FileSearchDialog.tsx
- src/renderer/src/components/toasts/GhosttyPromoToast.tsx
- src/renderer/src/components/pr/CreatePRModal.tsx
- src/renderer/src/components/pr/ConnectionPRModal.tsx
- src/renderer/src/components/pr/PRNotificationStack.tsx
- src/renderer/src/components/pr-review/PrCommentCard.tsx
- src/renderer/src/components/pr-review/PrReviewViewer.tsx
- src/renderer/src/components/diff/DiffCommentGutter.tsx
- src/renderer/src/components/diff/DiffCommentSidePanel.tsx
- src/renderer/src/components/diff/PrCommentGutter.tsx
- src/renderer/src/components/diff/DiffCommentToolbar.tsx

**Skipped (10):**
- src/renderer/src/components/settings/* (overlays-settings entries 14-16, 25-30): Owned by the settings agent per task instructions
- src/renderer/src/components/ui/popover.tsx, dropdown-menu.tsx, tooltip.tsx, dialog.tsx, hover-card.tsx (entries 3-7): ui/* primitives are fixed in a prior wave; outside my ownership list
- src/renderer/src/components/ui/HelpOverlay.tsx (entries 10-12; sweep 31): Outside ownership (ui/*)
- src/renderer/src/components/layout/QuitConfirmationOverlay.tsx (entry 13; sweep 31): Outside ownership (layout/*)
- src/renderer/src/components/kanban/WorktreePickerModal.tsx (entries 17-19): Outside ownership (kanban/*)
- src/renderer/src/components/sessions/HandoffSplitButton.tsx + HandoffModelPicker.tsx (entries 20-21): Outside ownership (sessions/*)
- src/renderer/src/components/setup/AgentPickerDialog.tsx (entry 23): Outside ownership (setup/*)
- src/renderer/src/lib/themes.ts + src/renderer/src/stores/useThemeStore.ts (entries 1-2): Outside ownership (lib/stores, theme pipeline)
- sweep entry 31 remainder (LoginBanner, SessionHistory, ClaudeCliSessionView, KanbanBoard, sonner): Outside ownership; only my files (CommandPalette, FileSearchDialog, GhosttyPromoToast) were converted
- Entry 9 suggestion to extract a shared <PaletteShell>/glass-surface utility: Kept the two palettes byte-identical inline instead; a shared utility would touch globals.css which another agent owns

**Concerns (10):**
- Perf: backdrop-blur-2xl now sits on the two most-seen overlays (CommandPalette/FileSearchDialog) which render scrolling cmdk lists over terminal/Monaco - sweep entry 31 flagged this as the most expensive combination; measure paint cost before shipping.
- cmdk group headings were previously unstyled inherited text; they are now 11px uppercase muted labels via [&_[cmdk-group-heading]] selectors - eyeball the palette sections once in the running app.
- CommandItem selected shortcut chip is bg-background/40 text-foreground - over the 82%-white light glass this is subtle; the surrounding bg-accent row carries the selection but verify in light mode.
- PrCommentGutter highlighted thread went violet->border-ring/60 bg-accent while the non-highlighted state stays blue-950/30; verify the jump-to-comment flash still reads as 'highlighted' against blue neighbors in both themes.
- DiffCommentGutter cards went bg-violet-950/30 (dark-only literal) -> border-border bg-secondary, which finally gives them a light-mode appearance - verify both themes over the Monaco diff background per sweep entry 21 risk note.
- PrCommentCard selected row uses bg-accent + ring-1 ring-inset ring-ring/40 vs hover:bg-accent/40 to keep selected/hover distinguishable (task requirement) - confirm visually.
- PRNotificationStack now has a light-mode surface (was dark-only white/8 border + bg-background/70); verify the status accent-strip borders (border-l-emerald/red/amber/blue) and text legibility over the new rgba(255,255,255,0.82) light glass floating above the board.
- Save/'Add to chat' buttons in DiffCommentGutter/PrReviewViewer dropped their violet overrides and now use the default Button variant - their final look depends on the ui/button.tsx orca pass landing (neutral primary CTA).
- ConnectionPRModal.tsx is not named in any inventory entry; I applied the identical mechanical fixes as its CreatePRModal clone (semantic-hue focus rings reshaped to ring-[3px]/50, selected tick text-primary->text-foreground, trigger hover:bg-accent) since it is in my ownership - flag if that should be reverted.
- Kbd chips use full-strength border-border (not the inventory's border-border/60) because CONVENTIONS.md forbids diluting the 7% border token on dark; light-mode chip borders may read slightly stronger than the inventory intended.

## Agent 3

**Completed (17):**
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsGeneral.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsAdvanced.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsPet.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsPrivacy.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsSecurity.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsUpdates.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsTerminal.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsEditor.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsShortcuts.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsAccounts.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsHiveEnterprise.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsAppearance.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsModal.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/discord/DiscordProvisionModal.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/custom-commands/CustomCommandsEditor.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/spaces/SpacesTabBar.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/spaces/SpaceIconPicker.tsx

**Skipped (3):**
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/lib/themes.ts: Entry 15's fifth previewColors key ('worktree-sidebar') + populating it for all 11 presets requires editing themes.ts, which is outside my ownership and still has only 4 preview keys. Consequently the two-stripe swatch in SettingsAppearance ThemeCard was NOT added (no data to drive it); the single sidebar stripe already shows the lifted #2a2a2a rail for the Orca presets. The themes.ts/useThemeStore owner should add the key, then ThemeCard needs a follow-up to render the second stripe.
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsSecurity.tsx: The two inline-style toggles (lines ~110-144 and ~155-192, hardcoded #059669/#52525b with a boxShadow knob) are not inventoried anywhere (inventory lists only lines 207/220/233/298/310 for this file, all fixed). Left untouched to preserve behavior; flagging as residual off-system styling.
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/settings/SettingsPet.tsx: The accent-primary native range sliders/checkbox (lines 115/126/151) are not in any inventory entry; accent-color now resolves to the neutral primary token which is orca-consistent, so left as-is (file's inventoried entries — toggle knob shadow and R3 size cards — were applied).

**Concerns (8):**
- Toggle tracks keep bg-primary/bg-muted per sweep entry 27: checked contrast is good (#e5e5e5 track vs #0a0a0a knob in dark), but the UNCHECKED state (bg-background knob on #262626 muted track, now shadowless) is a small delta in dark mode — eyeball, and if too flat consider a bg-foreground/90 knob or a knob border.
- Selected cards in SettingsTerminal/SettingsEditor/SettingsPet size grid now rely on bg-accent lift + text-foreground check only; verify bg-accent (#404040) stays distinguishable from hover:bg-accent/50 on adjacent unselected rows in both themes.
- SettingsModal left nav is now bg-sidebar inside DialogContent; once the dialog primitive gains bg-background/96 + rounded-[11px] + backdrop-blur (another agent's change), check the opaque nav column clips correctly against the rounded dialog corner and that the sidebar/background seam reads as intended.
- SettingsHiveEnterprise buttons converted to the Button primitive: height drops from ~36px (py-2) to size-sm h-8 and disabled opacity goes from 60 to the primitive's 50 — intended per entry 30, but it is a small layout change worth a visual glance.
- Inverted-neutral segmented active chips at 13px (kept per sweep entry 28 over inventory entry 26's bg-secondary suggestion, as directed) can read heavy in light mode (#171717 slabs, up to 5 in the AI Provider row) — sweep flags this; screenshot both themes.
- Shortcut recording state is now orange-500 (attention semantic); orange is also the permission/attention hue elsewhere — same family by design, but confirm no confusing adjacency in the shortcuts pane.
- SettingsAccounts Active badge is now rounded-md emerald per entry 29 while sibling plan/OK/Expired pills remain rounded-full muted/destructive — inventory prescribed exactly this shape/color, but the mixed radii on one row is a deliberate deviation to spot-check.
- DiscordProvisionModal filter input focus moved to focus-visible:ring-[3px]; text inputs match :focus-visible on pointer focus too per spec, but verify the ring renders on click-focus in Electron's Chromium.

## Agent 4

**Completed (23):**
- src/main/window-chrome.ts (HEADER_HEIGHT 48->36; trafficLightPosition {x:12,y:12}; both Windows overlay call sites read the constant)
- src/renderer/src/components/layout/Header.tsx (36px split titlebar: left segment at leftSidebarWidth on bg-worktree-sidebar with inset bottom hairline + 78px mac traffic pad + 16px logo @75% + 'Hive' app-name label, hidden when leftSidebarCollapsed with a mac spacer fallback in the main segment; main segment bg-card border-b px-2.5; title/branch -> 12px foreground/muted-foreground; vim pill neutral secondary; keep-awake armed indigo-400 -> blue-400; vim hint letters -> text-foreground underline decoration-ring; selected PR row -> text-foreground font-semibold; all action buttons h-6 px-2 text-[12px] rounded-md incl. emerald merge + destructive fix-conflicts + split Review pair + ghost branch pickers; six icon buttons -> shared 24px tbIconBtn constant merged via cn(); both PR-picker popovers converted to glass-density p-1 / rounded-md rows / 13px-11px type / h-px bg-border separators (glass surface itself comes from ui/popover.tsx primitives pass); right cluster gap-1; drag/no-drag regions preserved)
- src/renderer/src/components/layout/QuickActions.tsx (buttons -> h-6 px-2 text-[12px] font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-foreground; container gap-3 -> gap-1; green copy ticks kept)
- src/renderer/src/components/layout/LeftSidebar.tsx (aside -> bg-worktree-sidebar/text-worktree-sidebar-foreground/border-worktree-sidebar-border; connection banner -> bg-black/[0.04] dark:bg-white/[0.06] lift + muted Link icon; Projects header -> h-8 px-3 pr-2 text-[12px] font-semibold text-muted-foreground/80 with h-3.5 icon; filter/chip strips densified with worktree-sidebar hairlines)
- src/renderer/src/components/layout/UpdatePill.tsx (neutral re-skin: border-border + black/4//white/6 surface, neutral progress fill, hover:bg-accent, muted dismiss, blue-500 icon-only availability signal, worktree-sidebar border-t)
- src/renderer/src/components/layout/BottomPanel.tsx (tab strip -> 30px row px-1; tabs h-full px-2.5 text-[11px] with conventions active recipe: color-mix 6% bg + inset left-2/right-2 h-0.5 color-mix 60% underline; vim keybind letter -> text-foreground; Chrome-command popover -> glass recipe with orca input focus ring, rounded-md Cancel/Save, Save keeps neutral primary CTA; data-active + testids untouched)
- src/renderer/src/components/layout/ResizeHandle.tsx (primary washes -> hover:bg-ring/40 active:bg-ring/60, dragging bg-ring/60; hairline kept)
- src/renderer/src/components/layout/HeaderDiscordToggle.tsx (base size-6 rounded-md muted; enabled -> neutral bg-accent text-foreground; tooltip path intact)
- src/renderer/src/components/layout/HeaderTelegramToggle.tsx (base size-6 rounded-md muted; #229ED9 tint -> neutral bg-accent toggled state; Q/A badge -> bg-foreground text-background; amber/red status dots kept)
- src/renderer/src/components/layout/WindowChromeControls.tsx (three Linux caption buttons -> size-6 rounded-md muted, close gets hover:bg-red-600 hover:text-white, wrapper gap-0.5)
- src/renderer/src/components/layout/DesktopWindowEscapeChrome.tsx (h-12 -> h-9, bg-muted/bg-background -> bg-card to match titlebar-main; Linux close h-9 w-9)
- src/renderer/src/components/layout/AppLayout.tsx (LeftSidebar fallback -> bg-worktree-sidebar + worktree border at stored leftSidebarWidth via useLayoutStore.getState(); RightSidebar fallback -> bg-sidebar border-border)
- src/renderer/src/components/layout/MainPaneTerminalPanel.tsx (toggle bar -> text-[11px] font-medium px-2.5 rounded-none hover:bg-accent hover:text-foreground; 30px height + testid untouched)
- src/renderer/src/components/layout/LoginBanner.tsx (glass floating-overlay recipe, text-[11px], Cancel h-6 text-[11px] rounded-md; pt-2 -> pt-11 so it clears the 36px bar)
- src/renderer/src/components/layout/QuitConfirmationOverlay.tsx (rounded-[11px] bg-background/96 backdrop-blur-2xl orca shadow; copy text-[13px]; kbd rounded-md bg-secondary text-[11px])
- src/renderer/src/components/layout/SetupTab.tsx (Running spinner text-primary -> text-yellow-500 per status vocabulary, sweep #9)
- src/renderer/src/components/layout/RunOutputSearch.tsx (focus:ring-1 -> canonical focus-visible:ring-[3px] ring-ring/50 border-ring, rounded-md; sweep #16)
- src/renderer/src/components/file-tree/FileSidebar.tsx (tab strip -> 30px row; 4 tabs h-full px-2.5 text-[11px] with conventions active bg + inset color-mix 60% underline replacing bg-primary; vim mnemonic letters -> text-foreground)
- src/renderer/src/components/file-tree/FileTreeNode.tsx (filter-match text-primary -> text-foreground, keep-neutral per sweep #10)
- src/renderer/src/components/file-tree/BranchDiffView.tsx (hand-rolled branch dropdown: bg-popover/shadow-md -> glass menu recipe + overflow-hidden; rows -> soft black/6//white/8 hover wash)
- src/renderer/src/components/terminal/TerminalTabsHorizontal.tsx (tabs -> h-full text-[11px] px-3 with 07-terminal-usage active recipe: color-mix 6% bg + full-bleed color-mix 60% underline replacing bg-primary; rename input -> orca focus ring; + button h-full text-[11px])
- src/renderer/src/components/terminal/TerminalTabEntry.tsx (rename input focus:ring-1 -> canonical orca focus ring, rounded-md)
- src/renderer/src/components/terminal/TerminalToolbar.tsx (rename input focus:ring-1 -> canonical orca focus ring, rounded-md)

**Skipped (5):**
- src/renderer/src/components/spaces/SpacesTabBar.tsx: Inventory entry 24 targets components/spaces/, outside my ownership list (layout/file-tree/terminal/window-chrome). Needs the worktree-sidebar-accent active tab, white/8 hover, and ring-primary -> ring-ring drag ring; it renders in the now-lifted left sidebar so its bg-accent active state is currently wrong-toned.
- src/renderer/src/styles/globals.css: Inventory entry 25 (grain body::after removal) belongs to the theme-tokens area; per hardcoded-sweep notes the landed globals.css already has the grain block removed — nothing to do.
- src/renderer/src/components/layout/PinnedList.tsx + RecentList.tsx + UsageIndicator.tsx: Explicitly excluded from my ownership (sidebar-lists agent); their working/unread primary usages are flagged in sweep #8/#9/#26. Their diffs already show another agent has migrated them.
- src/renderer/src/components/terminal/backends/XtermBackend.ts: terminal/backends/* explicitly excluded from my ownership (sweep #7); already modified by another agent in this worktree.
- Header.tsx optional refinements: Entry 4's optional sep-glyph between project and branch was not adopted — kept the parenthesized branch to preserve header-project-info/header-connection-info text content asserted by tests; entry 26's optional label-hiding below a width threshold not implemented (behavior change, marked 'consider').

**Concerns (11):**
- Main-process change (HEADER_HEIGHT 36, trafficLightPosition x:12 y:12) needs an app restart to verify; check traffic lights center without clipping on macOS and caption-button height on win32.
- Verify the titlebar left segment seam: the segment width equals leftSidebarWidth, but the 4px ResizeHandle sits after the aside, so the titlebar-main seam leads the content seam by ~4px (matches how the mockup omits the handle) — check it reads as one column while resizing.
- Header center density on narrow windows: QuickActions labels are kept at 12px; with the Fix-conflicts/Review/PR cluster the 36px bar may still collide horizontally — check the flex-1 spacer behavior around 1100px width.
- When the left sidebar is collapsed on macOS the logo/app-name disappear with the segment and a 70px spacer pads the traffic lights inside the main segment — confirm 70px clears the lights at the new x:12 position.
- PR-picker PopoverContent rows now assume the glass surface from the ui-primitives pass (soft black/6//white/8 hover washes, no local glass); if primitives revert to opaque bg-popover these rows will look washy.
- LoginBanner moved from pt-2 to pt-11 so it no longer covers the shorter 36px titlebar — verify placement over the session view.
- Keep-awake armed state changed indigo-400 -> blue-400 (treated as a genuine status per entry 10's allowance); confirm it reads distinctly from the amber streaming state.
- LeftSidebar 'Projects' header shrunk to h-8/12px with h-3.5 icon — the four header action buttons are h-5 (already migrated by the sidebar-content agent) so they fit, but re-check vertical rhythm next to PinnedList section headers.
- focus-visible ring-[3px] on the tiny h-4 terminal rename inputs may clip inside overflow-hidden tab strips (sweep #16 risk); rename is mouse-driven so focus-visible rarely fires, but verify.
- Playwright/vitest selectors keyed on [data-testid=header] geometry (48px assumptions) and any screenshot baselines will shift; all testids and label text were preserved.
- TerminalTabsHorizontal underline is full-bleed (left-0 right-0) per 07-terminal-usage .term-tab while BottomPanel/FileSidebar underlines are inset (left-2 right-2) per .bp-tabs — intentional per mockups, flagging so it isn't 'fixed' into inconsistency later.

## Agent 5

**Completed (21):**
- src/renderer/src/components/worktrees/WorktreeItem.tsx
- src/renderer/src/components/worktrees/BranchPickerDialog.tsx
- src/renderer/src/components/projects/ProjectItem.tsx
- src/renderer/src/components/projects/ProjectList.tsx
- src/renderer/src/components/projects/ProjectFilter.tsx
- src/renderer/src/components/projects/HighlightedText.tsx
- src/renderer/src/components/projects/RecentToggleButton.tsx
- src/renderer/src/components/projects/ColonCommandPopover.tsx
- src/renderer/src/components/projects/FilterChips.tsx
- src/renderer/src/components/projects/AddProjectButton.tsx
- src/renderer/src/components/projects/SortProjectsButton.tsx
- src/renderer/src/components/projects/AddRepositoryDialog.tsx
- src/renderer/src/components/projects/ProjectSettingsDialog.tsx
- src/renderer/src/components/connections/ConnectionItem.tsx
- src/renderer/src/components/connections/ConnectionList.tsx
- src/renderer/src/components/connections/ConnectionsButton.tsx
- src/renderer/src/components/connections/RecentConnectionsDialog.tsx
- src/renderer/src/components/layout/PinnedList.tsx
- src/renderer/src/components/layout/RecentList.tsx
- src/renderer/src/components/layout/UsageIndicator.tsx
- src/renderer/src/components/layout/UsageIndicator.test.tsx

**Skipped (8):**
- src/renderer/src/components/ui/HintBadge.tsx: Inventory item 13 targets ui/* which is outside my ownership; the ui primitives wave already modified it per git diff.
- src/renderer/src/components/worktrees/AddAttachmentDialog.tsx: Item 27 (Figma text-purple-500 / Jira text-blue-500) conflicts with CONVENTIONS.md 'vendor/file-type identity colors: KEEP' and the hardcoded-sweep KEEP classification; vendor colors kept here and at WorktreeItem.tsx:752/873 and PinnedList.tsx:506. CONVENTIONS wins.
- src/renderer/src/components/projects/LanguageIcon.tsx: Item 28: CONVENTIONS keeps language-identity colors; inventory itself says 'may stay'. Kept the colored fallback badges (incl. elixir purple / kotlin violet) rather than desaturating to the neutral proj-glyph.
- src/renderer/src/components/layout/SetupTab.tsx: hardcoded-sweep entry 9 lists SetupTab.tsx:124 (text-primary Working) but the file is outside my ownership globs (layout/* only includes UsageIndicator/PinnedList/RecentList for me).
- src/renderer/src/lib/worktree-status-style.ts: Inventory preamble + item 2 ask to extract a shared status-style module + StatusGlyph/UnreadDot/InlineRenameInput components. That is a structural refactor creating new files outside my ownership globs and beyond the styling-only mandate; instead I applied byte-identical status classes at all five duplicated sites (WorktreeItem, PinnedList x2, RecentList, ConnectionItem).
- src/renderer/src/components/worktrees/WorktreeItem.tsx: Structural halves of items 16/24 skipped: no 20px status-lane replacing pl-8 (tree indent + hint-badge alignment risk) and Folder/GitBranch idle icons kept instead of the neutral idle dot (would lose the default-worktree distinction the inventory itself flags). All color/selection/typography parts applied.
- src/renderer/src/components/projects/ProjectItem.tsx: Structural half of item 17 skipped: no sticky top-0 header (drag-reorder hit-area + multi-sticky stacking risk flagged in items 17/20) and no worktree-count element added (new DOM/behavior). Applied 28px min-height, 13px semibold label, worktree-sidebar surfaces, border-ring drag line, hover-revealed Plus.
- src/renderer/src/components/connections/ConnectionList.tsx: Sticky lifted background from item 20 skipped (same stacking risk); applied 28px height and hover-revealed chevron (kept visible while collapsed so the collapsed state stays discoverable).

**Concerns (11):**
- Spinners use Tailwind's built-in animate-spin (linear) rather than the mockup's `steps(12,end)` timing; adding the stepped timing needs a shared utility/keyframe (globals.css is not mine). Visual difference is subtle.
- Working/planning spinner changed from a Loader2 SVG to a border-ring div — any test querying `svg.animate-spin` in these rows would break (none found in the repo's test files, but external e2e selectors should be checked).
- Row selection/hover now uses bg-worktree-sidebar-accent; verify visually that the lists actually sit on the bg-worktree-sidebar surface (LeftSidebar.tsx is owned by another area) — in light mode the accent (#eaeaea) on a non-migrated background could look wrong.
- UsageIndicator root now sets bg-worktree-sidebar itself per item 12; if the sidebar-area owner also tints the footer container this is redundant (harmless). Also verify Switch/Refresh/Schedule at 10px text don't wrap inside the w-72 popover (inventory item 11 risk).
- Rate-limit chip uses `border-current/20` (currentColor opacity modifier) — valid Tailwind v4, but worth confirming in the built CSS since it's the only such usage in the area.
- ConnectionItem tooltip branch line is now `text-background/70`, which assumes the inverted bg-foreground tooltip from the ui wave; if that pass is reverted the line becomes near-invisible.
- ColonCommandPopover renders inline (not portalled): backdrop-blur-2xl samples the sidebar behind it and could be clipped by an overflow parent — verify visually per inventory item 22 risk.
- Kept amber-500 for answering/permission (CONVENTIONS allows amber where already used) while command_approval stays orange-500; the mockup uses orange for the question state — the amber-vs-orange call the inventory flags as 'worth an explicit team decision' remains open.
- Usage bar: 3px track with the existing `minWidth: 2` fill makes near-0% values a ~2x3px dot (inventory item 9 risk) — kept existing behavior, check visually.
- 'Ready'(completed) status label is now muted like idle; the distinction moved to the emerald status glyph (worktree tree rows) — pinned/recent/connection rows show muted 'Ready' with no emerald glyph of their own, slightly reducing the completed signal there (inventory prescribed dot-in-lane which required the skipped lane restructure).
- ProjectItem's Plus button is hover-revealed now (forced visible while creating); hint-driven programmatic clicks still work but the affordance is hidden until hover — verify the hint overlay flow still reads well.

## Agent 6

**Completed (21):**
- src/renderer/src/components/kanban/KanbanTicketCard.tsx
- src/renderer/src/components/kanban/KanbanColumn.tsx
- src/renderer/src/components/kanban/KanbanBoard.tsx
- src/renderer/src/components/kanban/BoardSearchBar.tsx
- src/renderer/src/components/kanban/BoardChatLauncher.tsx
- src/renderer/src/components/kanban/BoardAssistantView.tsx
- src/renderer/src/components/kanban/FavoriteTicketsPane.tsx
- src/renderer/src/components/kanban/TicketModelBadge.tsx
- src/renderer/src/components/kanban/TicketModelBadge.test.tsx
- src/renderer/src/components/kanban/HighlightedText.tsx
- src/renderer/src/components/kanban/ImportTicketsModal.tsx
- src/renderer/src/components/kanban/JiraImportModal.tsx
- src/renderer/src/components/kanban/TicketPickerModal.tsx
- src/renderer/src/components/kanban/AttachPRPopover.tsx
- src/renderer/src/components/kanban/TicketCreateModal.tsx
- src/renderer/src/components/kanban/FavoriteTicketCreateModal.tsx
- src/renderer/src/components/kanban/MoveToProjectModal.tsx
- src/renderer/src/components/kanban/WorktreePickerModal.tsx
- src/renderer/src/components/kanban/KanbanTicketModal.tsx
- src/renderer/src/components/kanban/CheckeredFlagIcon.tsx
- src/renderer/src/components/kanban/pill.ts (new — shared .t-pill recipe consts, consumed by KanbanTicketCard, TicketModelBadge, FavoriteTicketsPane, BoardAssistantView)

**Skipped (5):**
- src/renderer/src/components/sessions/IndeterminateProgressBar.tsx: Kanban inventory entry 7 (t-progress track/bar recipe) targets a file outside my ownership (components/sessions); its call sites in KanbanTicketCard keep passing className="w-20" unchanged.
- src/renderer/src/components/sessions/SessionTabs.tsx: Inventory notes flag the board toolbar (Import/Export/New ticket row) living here — out of kanban ownership.
- src/renderer/src/styles/globals.css: Inventory note about --font-mono still being 'SF Mono' (mockups spec Geist Mono for .t-pill.p-model/.p-pr) and the board horizontal-scrollbar hover thumb (entry 22) — token/global layer owned by another wave; mono pills will pick up the fix automatically via font-mono.
- src/renderer/src/components/kanban/BoardChatLauncher.tsx (relocation only): Entry 24's optional 'move it into the board toolbar row' is a layout/behavior change beyond styling; launcher restyled in place, so KanbanBoard's pr-[19.5rem] favorites-pane spacer stays valid.
- src/renderer/src/components/kanban/KanbanColumn.tsx (col-act hover fade only): Entry 17's optional mockup fade-in (opacity 0→1 on column hover) skipped: the right-side controls are stateful Switches (archive/flow-mode) whose state must stay visible.

**Concerns (11):**
- Epic mark recolored purple-500 → pink-500 (sweep 23's suggestion; kanban entry 3 offered fuchsia/neutral) and ALL mark rails narrowed border-l-4 → border-l-2 for consistency (entry only named epic's line) — user-learned mark taxonomy, verify visually.
- Mode border cue is now a 2px left rail using !border-l-blue-500/60 / !border-l-violet-500/60 (important, so the new hover:border-muted-foreground/35 doesn't neutralize it; mark rails still override mode via later cn position). Verify rail vs mark precedence and hover in the browser.
- Tinted status pills (remote/subagent/shell/monitor/blocked/error/plan-ready/auto-approve/telegram/markdown) were normalized to the 10px bordered-pill geometry per the task prompt ('badge pills 10px rounded-full bordered tints'); the kanban inventory only listed the neutral pills — colors untouched, but sizes shrank one band.
- AttachPRPopover MERGED is now emerald next to OPEN's green (green-400 vs emerald-400 are close); sweep 24 says keep open=green as-is — labels differ, but verify the two badges read apart.
- TicketPickerModal: merged=emerald filled, done=neutral outline (per task prompt); done chip now sits near To Do's zinc chip in hue — labels distinguish them.
- KanbanColumn is now fixed w-[268px] (was flex-1 min-220/max-300) with no idle border/background, and board padding changed p-3 → px-4 pt-2.5 pb-4 — board layout on wide windows changes; drop-indicator/drag-over visuals moved to ring neutrals (bg-ring / border-ring dashed) per sweep entry 29.
- KanbanColumn titleMode measurement logic kept (behavior preserved) but still budgets the deleted 50px spacer, so it's conservative; at fixed 268px 'In Progress' should always render un-abbreviated — delete the machinery in a follow-up if confirmed.
- CheckeredFlagIcon pole switched stroke black → currentColor because the goal chip moved from bg-white to bg-secondary; black checker cells rely on the white flag body for contrast on dark — eyeball the glyph in dark mode.
- KanbanTicketModal Supercharge buttons dropped brand violet for default/outline Button variants next to the blue Implement button — verify CTA hierarchy still reads (Implement blue solid > Supercharge neutral solid > outline).
- Fix-conflicts changed from a Button component to a native styled button chip (data-testid kanban-ticket-fix-conflicts preserved on both plain and dropdown variants) — hit target is smaller; verify click/drag feel.
- Not run per process rules: builds/typecheck/tests (only per-file esbuild parse checks, all pass). TicketModelBadge.test.tsx assertions updated to border-muted-foreground/50 / text-foreground / border-border in place of border-2 border-violet-500 / border-transparent.

## Agent 7

**Completed (38):**
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/SessionTabs.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/SessionView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ModeToggle.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/SuperToggle.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/CodexFastToggle.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ModelSelector.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/CustomProviderModelSelector.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ContextIndicator.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/IndeterminateProgressBar.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/UserBubble.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/QueuedMessageBubble.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ToolCard.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/PermissionPrompt.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/QuestionPrompt.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/CommandApprovalPrompt.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/PlanReadyImplementFab.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/HandoffSplitButton.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ScrollToBottomFab.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/TaskListWidget.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/GoalStatusWidget.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ClaudeCliSessionView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/SlashCommandPopover.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/FileMentionPopover.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/CodeBlock.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/BashCommandBubble.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/SessionHistory.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/VirtualizedMessageList.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/CopyMessageButton.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/SubtaskCard.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/ToolCallDebugModal.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/AttachmentPreview.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/UserMessageAttachmentCards.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/tools/BashToolView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/tools/EditToolView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/tools/FileChangeToolView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/tools/QuestionToolView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/tools/ReadToolView.tsx
- /Users/mor/.hive-worktrees/hive-electron/hive-electron--redesign/src/renderer/src/components/sessions/tools/todoIcons.tsx

**Skipped (5):**
- src/renderer/src/styles/globals.css (super-sparkle CSS block, lines ~613-650): Outside my ownership; also still consumed by kanban/WorktreePickerModal.tsx:1895, so I only removed the class from SuperToggle.tsx and left the CSS in place.
- src/renderer/src/components/kanban/WorktreePickerModal.tsx (super-sparkle + orange super pill at ~1895): Outside my ownership (kanban area); mirrors SuperToggle's old style and will diverge until that area applies the same neutral treatment.
- src/renderer/src/components/kanban/KanbanTicketModal.tsx:3022,3035 (Supercharge violet buttons): hardcoded-sweep entry 25 lists them alongside PlanReadyImplementFab, but the file belongs to the kanban area.
- src/renderer/src/components/ui/tooltip.tsx / dropdown-menu.tsx (inventory cross-file prerequisites): Owned by the primitives wave; tooltip is ALREADY inverted in this worktree so ContextIndicator's border-background/20 / text-background/70 internals were applied; dropdown/context-menu glass inherited by ModelSelector/SessionTabs menus is that wave's job.
- src/renderer/src/styles/globals.css (highlight.js github-dark-dimmed import, entry 34 risk): Light-mode syntax-highlight theme swap is a styles-area change outside my file list; code surfaces I tokenized (bg-secondary) may show dark-tuned hljs colors in light mode until addressed.

**Concerns (10):**
- ModeToggle now shows super-plan as orange while the SUPER pill itself went neutral (bg-secondary, sparkle removed) — entries 13 and 14 prescribe different treatments for the same state; verify the pairing reads coherently in the composer.
- Composer keeps a 1px mode-tinted border (blue/violet/orange at /25) per the task brief, but bash mode lost its zinc tint and zinc timer — the only bash cues left are the '$' placeholder text and the terminal send icon; verify bash mode is still legible.
- Tab strip tabs are now fixed-basis w-[180px] (orca mockup) instead of content-sized min-w-[100px]; board / Board Assistant / Context tabs get wider than before, and drag-over feedback changed from bg-accent/50 to bg-accent — verify against the active-tab 6% mix.
- ConnectionSessionTab dropped the full-bleed per-connection background for a 6px identity dot (activeBg slot of parseColorQuad); the inactiveText/activeText quad values are now unused at this call site — visual identity is much subtler.
- Light-mode contrast to verify: 2px active-tab underline (color-mix foreground 60% over card), bg-black/6 selected rows in the frosted Slash/FileMention popovers, and the violet-500/10 plan bubble tint.
- backdrop-blur-2xl glass now sits on TaskListWidget, GoalStatusWidget and the claude-cli plan-ready card, all floating over the scrolling message list / terminal — inventory flags possible frame cost; check scroll perf.
- IndeterminateProgressBar shrank from 144x16 to a 3px-high bar (w-14 default, kanban call sites still pass w-20); conflict state moved fuchsia→red and compacting red→amber (matching the isAsking amber, disambiguated only by the 'Compacting' label) — verify kanban card rows still align vertically.
- ContextIndicator gained a visible percentage label (previously tooltip-only) and shrank to a 56x3px track — composer bottom row layout shifts slightly; its tooltip internals now assume the inverted (bg-foreground) tooltip primitive.
- ToolCard removed animate-pulse and the colored left border; running feedback is now only the yellow-500 spinner in StatusIndicator — confirm every tool renderer path shows the header row (it does render StatusIndicator unconditionally, but verify visually).
- Composer/prompt column is now max-w-[808px] (was max-w-4xl=896px) while the message list column width is owned by another area — verify the chat column and composer gutters line up after both waves land.

