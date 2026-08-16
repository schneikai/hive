# Inventory — Settings + overlays (SettingsModal & sections, theme apply pipeline, CommandPalette, FileSearchDialog, HelpOverlay, CreatePRModal, WorktreePickerModal, AgentSetupGuard dialogs, quit dialog, handoff popovers, shared overlay primitives)

**Notes:** STATE OF PLAY: `src/renderer/src/styles/globals.css` and `src/renderer/src/lib/themes.ts` are ALREADY partly migrated by a concurrent pass (git status shows both modified). globals.css now ships full orca tokens (`--primary:#e5e5e5`/`#171717`, `--accent:#404040`, `--border:rgb(255 255 255/.07)`, `--ring:#737373`, Geist `--font-sans`, `letter-spacing:0.01em`, grain overlay and the 18px body size removed) plus SIX NEW vars `--worktree-sidebar{,-foreground,-accent,-accent-foreground,-border,-ring}`. themes.ts glass presets are renamed "Orca Dark"/"Orca Light" with neutral previewColors. So do NOT re-do those; the remaining work in my area is (a) the theme-apply plumbing that has not caught up with those new vars, (b) every overlay still using opaque `bg-popover`/`bg-background` with no frost, and (c) the very large number of `bg-primary`/`text-primary`/`border-primary`/`ring-primary` "selected/brand" affordances that were legible when primary was purple and become near-white-on-near-white (dark) or near-black (light) once primary is neutral.

CROSS-CUTTING #1 — PRIMARY FLIP: I counted ~60 `*-primary` occurrences across `src/renderer/src/components/settings/*.tsx` alone (SettingsGeneral 31, SettingsTerminal 6, SettingsSecurity 5, SettingsAppearance 3, SettingsAdvanced 3, SettingsPet 3, SettingsShortcuts 3, SettingsEditor 2, SettingsUpdates 2, SettingsAccounts 1, SettingsHiveEnterprise 1, SettingsPrivacy 1). They fall into exactly three repeated recipes, so this is a mechanical sweep, not 60 bespoke fixes:
  R1 selected pill/segmented chip: `bg-primary text-primary-foreground border-primary` → keep only for the ONE true default-action button per screen; everywhere else use `bg-secondary text-secondary-foreground border-transparent` (or `bg-accent text-accent-foreground`) so a "selected segment" is a grey lift, not a white slab.
  R2 hand-rolled switch track: `h-5 w-9 rounded-full border-2 border-transparent` + `checked ? 'bg-primary' : 'bg-muted'` + knob `bg-background shadow-lg` → replace the whole hand-rolled control with the existing `@/components/ui/switch` (there IS one at src/renderer/src/components/ui/switch.tsx and these files don't use it), drop `shadow-lg` on the knob (orca is near-zero shadow in chrome), and use `data-[state=checked]:bg-primary` from the primitive so there is one source of truth.
  R3 selected-card tint + tick: `bg-primary/10 border border-primary/30` + `<Check className="text-primary">` → `bg-accent border-border` + `text-foreground`.
Concrete R2/R1 sites for the sweep: SettingsGeneral.tsx 84/90, 111/117, 138/144, 161, 173, 195, 207, 234/240, 263/269, 292/298, 319/325, 347/353, 372, 384, 396, 420/426, 447/453, 474/480, 500, 512, 529, 544, 564, 586, 600; SettingsAdvanced.tsx 116/121, 142/147, 174/179; SettingsPrivacy.tsx 56; SettingsPet.tsx 46, 87, 96; SettingsSecurity.tsx 207, 220, 233, 298, 310; SettingsUpdates.tsx 56, 68; SettingsTerminal.tsx 190/201, 232/250, 349/361; SettingsEditor.tsx 82, 94; SettingsAccounts.tsx 159; SettingsHiveEnterprise.tsx 96; SettingsShortcuts.tsx 198-201. I filed the highest-signal ones as individual entries below.

CROSS-CUTTING #2 — NO FROSTED GLASS ANYWHERE: not one overlay in my area has `backdrop-blur` on its own surface. Every menu/popover/hover-card/dropdown is flat `bg-popover` (now solid #171717/#ffffff), every scrim is flat `bg-black/50` or `bg-black/60`. Fixing the four primitives (dialog/popover/hover-card/dropdown-menu) + tooltip inversion buys ~90% of the overlay look; the four hand-rolled overlays (CommandPalette, FileSearchDialog, HelpOverlay, QuitConfirmationOverlay) bypass the primitives entirely and need the recipe pasted in by hand. Recommend extracting the recipe once as a `glass-surface` utility in globals.css (`@utility glass-surface { @apply rounded-[11px] border border-black/14 dark:border-white/14 bg-white/82 dark:bg-black/72 backdrop-blur-2xl shadow-[0_1px_2px_rgba(0,0,0,.06),0_12px_32px_-8px_rgba(0,0,0,.28)] }`) so the four hand-rolled overlays and the four primitives can't drift again.

CROSS-CUTTING #3 — FOCUS RINGS: nothing in my area uses the orca recipe. Live variants found: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (SettingsAppearance:29), `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` (dialog.tsx:46 close button), `focus-visible:ring-red-500|yellow-500` (CreatePRModal:396,399 — these are semantic length-warnings and should KEEP their hue, just move to the `ring-[3px] ring-<hue>/50` shape). Target everywhere: `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`.

CROSS-CUTTING #4 — TYPE SCALE: overlays are still on the pre-orca `text-sm`(14px)/`text-xs`(12px) ladder rather than orca's 13/11/10 dense chrome. Densest offenders: both cmdk inputs are `h-12` (48px) which is enormous next to a 36px titlebar; settings nav rows and all cmdk rows are `text-sm`. Section labels are close but inconsistent — HelpOverlay already uses `text-[11px] uppercase tracking-wider` (correct shape), SettingsAppearance uses `text-xs uppercase tracking-wider`, WorktreePickerModal uses `text-xs font-medium uppercase tracking-wider`. Normalize all three to `text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground`.

WHAT IS CORRECTLY LEFT ALONE (verified, do not touch): WorktreePickerModal:1866 + 2427 violet Build/Plan chip and send button (plan-mode semantic), :1865 + 2426 blue-500/600 build variants, CreatePRModal:373-379 file-status yellow/green/red and :396-407 commit-summary length yellow/red warnings, AgentNotFoundDialog:19 `text-destructive`. No hardcoded purple/violet used as BRAND survives anywhere in my area — the purple identity now lives purely in the `--primary` token indirection and in the `amethyst`/`daylight` HSL presets, which is why the primary-flip sweep above is the whole story rather than a hex hunt.

RISK CALLOUT: the theme-preset entries (themes.ts / useThemeStore.ts) are the only ones in my area that can produce an outright broken screen rather than an off-brand one — a user on any non-cssNative preset today gets orca's lifted #2a2a2a left rail welded onto a purple/blue/green app, and it does not reset when they switch presets. I'd land those two first.

## 1. src/renderer/src/lib/themes.ts (10-38)
- **What:** THEME_CSS_PROPERTIES lists 27 vars and does NOT include the six new orca `--worktree-sidebar*` vars that globals.css now defines (globals.css:135-140 light, :177-182 dark).
- **Change:** Append 'worktree-sidebar', 'worktree-sidebar-foreground', 'worktree-sidebar-accent', 'worktree-sidebar-accent-foreground', 'worktree-sidebar-border', 'worktree-sidebar-ring' to THEME_CSS_PROPERTIES, and add matching values to the `colors` map of all 9 cssNative:false presets (amethyst/obsidian/midnight-blue/emerald-night/crimson/sunset/daylight/cloud/mint/rose). Update the interface comment on line 6 from '27 HSL values' to the new count.
- **Risk:** Until this lands, applyThemePreset cannot clear or set the lifted left rail, so it is permanently stuck at orca's #2a2a2a/#f5f5f5 regardless of preset.

## 2. src/renderer/src/stores/useThemeStore.ts (15-35)
- **What:** applyThemePreset clears and writes only the THEME_CSS_PROPERTIES keys, so any var added to globals.css outside that list is never reset between preset switches.
- **Change:** After extending THEME_CSS_PROPERTIES (see themes.ts entry), no code change is strictly needed here — but bump the persist `version` from 2 to 3 (line 153) with a migrate branch so already-persisted 'glass-dark'/'glass-light' localStorage + DB values are re-applied through the new var set on first launch, otherwise the early-init path at lines 194-224 re-applies a stale 27-var payload before React mounts.
- **Risk:** Skipping the version bump means existing users see the orca left rail bleed through non-orca presets until they manually re-pick a theme.

## 3. src/renderer/src/components/ui/popover.tsx (28-30)
- **What:** PopoverContent is opaque `rounded-md border bg-popover p-4 shadow-lg/5` with a `before:` hairline shadow and no backdrop-blur — not the orca frosted overlay.
- **Change:** Replace with the orca glass recipe: `rounded-[11px] border border-black/14 dark:border-white/14 bg-white/82 dark:bg-black/72 backdrop-blur-2xl` plus the dual shadow `shadow-[0_1px_2px_rgba(0,0,0,.06),0_12px_32px_-8px_rgba(0,0,0,.28)]`; drop the `before:shadow-[0_1px_...]`/`dark:before:shadow-[0_-1px_...]` pseudo-hairline since the 14% border replaces it. Keep `relative overflow-hidden` for clipping.
- **Risk:** Every popover in the app inherits this (CreatePRModal branch dropdown, HandoffModelPicker, WorktreePickerModal branch picker) — verify text contrast on the 72%-black surface in dark.

## 4. src/renderer/src/components/ui/dropdown-menu.tsx (49, 68)
- **What:** DropdownMenuContent and DropdownMenuSubContent are opaque `rounded-md border bg-popover p-1 shadow-lg/5` with the same `before:` pseudo-hairline; menus are the most-seen overlay and read as flat cards.
- **Change:** Apply the identical orca frosted-menu recipe as popover.tsx to both lines; also raise item radius on lines 29/88/104/127 from `rounded-sm` to `rounded-md` (6px) to match orca chrome rows.
- **Risk:** Used by HandoffModelPicker SDK/model menus and context menus app-wide.

## 5. src/renderer/src/components/ui/tooltip.tsx (38-45)
- **What:** Tooltip uses `bg-popover text-popover-foreground border border-border ... shadow-md/5`, and the arrow is `bg-popover fill-popover ... border border-border` — a normal-polarity card, not orca's inverted tooltip.
- **Change:** Invert: `bg-foreground text-background` with no border, `rounded-md px-2 py-1 text-[11px]`; change the Arrow on line 45 to `bg-foreground fill-foreground` and remove its `border border-border`.
- **Risk:** Any caller passing a custom `className` with a bg (grep before landing) will now fight the inversion.

## 6. src/renderer/src/components/ui/dialog.tsx (21-23, 39-41, 46)
- **What:** Overlay is `bg-black/32 backdrop-blur-sm`; DialogContent is fully opaque `bg-background ... shadow-lg/5 sm:rounded-lg` with a `before:` pseudo-hairline; the close button uses the old `focus:ring-2 focus:ring-ring focus:ring-offset-2` recipe.
- **Change:** Overlay → `bg-black/40 backdrop-blur-[2px]`. Content → `bg-background/96 backdrop-blur-xl rounded-[11px] border-black/14 dark:border-white/14` and drop the `before:` shadow pair. Close button → `rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` (drop ring-offset).
- **Risk:** This is the base for SettingsModal, CreatePRModal, WorktreePickerModal and both AgentSetup dialogs — one change, five screens to eyeball.

## 7. src/renderer/src/components/ui/hover-card.tsx (39-41, 54)
- **What:** HoverCardContent is opaque `rounded-md border bg-popover p-4 shadow-lg/5` + `before:` hairline; arrow is `bg-popover fill-popover`.
- **Change:** Same orca frosted recipe as popover.tsx (rounded-[11px], 14% border, 82%/72% bg, backdrop-blur-2xl, dual shadow, no `before:`); arrow follows the surface colour.
- **Risk:** Plan-card hover previews render through this.

## 8. src/renderer/src/components/command-palette/CommandPalette.tsx (159, 173, 198, 259-274)
- **What:** Hand-rolled overlay bypassing the dialog primitive: scrim `bg-black/50` (no blur), shell `rounded-lg border border-border bg-popover shadow-xl` (opaque, heavy shadow), search input `h-12` (48px, taller than the 36px titlebar), kbd chips `rounded bg-muted text-[10px]`.
- **Change:** Scrim → `bg-black/40 backdrop-blur-[2px]`. Shell → orca glass: `rounded-[11px] border-black/14 dark:border-white/14 bg-white/82 dark:bg-black/72 backdrop-blur-2xl` + dual shadow, replacing `shadow-xl`. Input → `h-10 text-[13px]`. Section/kbd text → `text-[11px]`, kbd `rounded-md border border-border/60 bg-muted/40`.
- **Risk:** `data-testid="command-palette-overlay"` and `command-palette-input` are asserted in tests — keep the testids.

## 9. src/renderer/src/components/file-search/FileSearchDialog.tsx (136, 150, 162, 184, 211-219)
- **What:** Same hand-rolled shell as CommandPalette and drifts identically: `bg-black/50` scrim, `rounded-lg border border-border bg-popover shadow-xl`, `h-12` input, rows `px-3 py-2 rounded-md text-sm`, kbd `bg-muted text-[10px]`.
- **Change:** Apply the exact same orca glass + density changes as CommandPalette so the two palettes stay visually identical; row text `text-[13px]`, secondary path line `text-[11px]`. Best done by extracting a shared `<PaletteShell>` (or the `glass-surface` utility) used by both files.
- **Risk:** Keep `data-testid="file-search-overlay"`/`file-search-item` intact.

## 10. src/renderer/src/components/ui/HelpOverlay.tsx (187, 196)
- **What:** Scrim `bg-black/60` with no blur; card `rounded-lg border border-border bg-background shadow-2xl p-5` — `shadow-2xl` is the heaviest shadow in my area and fights orca's near-zero-shadow chrome.
- **Change:** Scrim → `bg-black/40 backdrop-blur-[2px]`. Card → `rounded-[11px] border-black/14 dark:border-white/14 bg-background/96 backdrop-blur-2xl` with the orca dual shadow replacing `shadow-2xl`.
- **Risk:** None; vim-mode-only surface.

## 11. src/renderer/src/components/ui/HelpOverlay.tsx (23)
- **What:** MnemonicLabel highlights the trigger letter with `text-primary font-bold bg-primary/15 ... decoration-primary` — a brand-purple treatment that becomes near-white text on a near-white wash in orca dark, destroying the mnemonic affordance.
- **Change:** Switch to a neutral-but-legible treatment: `text-foreground font-semibold bg-accent px-0.5 rounded-sm underline underline-offset-2 decoration-ring decoration-2`.
- **Risk:** MnemonicLabel is re-exported/reused (HandoffSplitButton:193 imports a MnemonicLabel) — check both call sites render acceptably.

## 12. src/renderer/src/components/ui/HelpOverlay.tsx (200-209)
- **What:** The NORMAL/INSERT vim-mode pill uses `text-primary bg-primary/10 border-primary/30` for INSERT — brand-primary as a state indicator, which goes near-white and stops contrasting with the NORMAL variant (`text-muted-foreground bg-muted/50`).
- **Change:** Give INSERT a real status hue per the orca status palette (e.g. `text-blue-400 bg-blue-500/10 border-blue-500/30`) so the two modes stay distinguishable, or invert it (`bg-foreground text-background`). Keep NORMAL neutral.
- **Risk:** Pick a hue not already claimed by build-blue if that ambiguity matters in context.

## 13. src/renderer/src/components/layout/QuitConfirmationOverlay.tsx (46)
- **What:** `rounded-xl border bg-background/95 shadow-2xl backdrop-blur-md` — right idea, wrong numbers: radius, shadow weight and blur strength all predate orca.
- **Change:** → `rounded-[11px] border border-black/14 dark:border-white/14 bg-background/96 backdrop-blur-2xl` + orca dual shadow instead of `shadow-2xl`. Bump the kbd on line 48 to `rounded-md border border-border/60 bg-muted/40 text-[13px]`.
- **Risk:** None; transient 2s toast.

## 14. src/renderer/src/components/settings/SettingsAppearance.tsx (29-33, 69, 79)
- **What:** ThemeCard active state is `border-primary ring-2 ring-primary/30 bg-primary/5`, the check badge is `bg-primary text-primary-foreground shadow-sm`, the label is `text-primary`, and focus is the old `focus-visible:ring-2 focus-visible:ring-ring`.
- **Change:** Active → `border-ring/60 ring-[3px] ring-ring/40 bg-accent`; check badge → `bg-foreground text-background` (drop `shadow-sm`); active label → `text-foreground font-medium` (inactive stays `text-muted-foreground`); focus → `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`.
- **Risk:** This is the one screen where a near-white `bg-primary/5` selection wash sits directly next to 11 colour swatches, so the regression is most visible here — worth a screenshot check in both light and dark.

## 15. src/renderer/src/components/settings/SettingsAppearance.tsx (21, 39-65, 108, 127)
- **What:** The swatch reads `previewColors.sidebar` into a single left stripe, but that key now means different things per preset — for the orca presets it holds the LIFTED worktree rail (#2a2a2a/#f5f5f5) while every HSL preset still holds the nav `--sidebar`. Section headers are `text-xs font-semibold uppercase tracking-wider`.
- **Change:** Add a fifth previewColors key (e.g. `worktree-sidebar`) and render two stripes — lifted rail then nav sidebar — so the orca lift is actually previewed and the key semantics stop overloading; populate it for all 11 presets. Section headers → `text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground`.
- **Risk:** previewColors is typed `Record<string,string>` so adding a key is non-breaking, but `data-testid="theme-card-*"` assertions exist in tests.

## 16. src/renderer/src/components/settings/SettingsModal.tsx (96, 101, 114-118)
- **What:** DialogContent `max-w-3xl h-[70vh] p-0 gap-0` inherits the opaque dialog surface; the left nav is `w-48 border-r bg-muted/30` (a translucent grey wash, not a real sidebar surface); nav rows are `px-2 py-1.5 rounded-md text-sm`.
- **Change:** Nav → `bg-sidebar border-r border-border` so the settings rail matches the app sidebar (#171717 dark / #fafafa light) instead of a muted wash. Rows → `text-[13px] tracking-[0.01em]`, active `bg-accent text-accent-foreground`, hover `hover:bg-accent/50`. Title row (line 104) → `text-[13px] font-semibold`.
- **Risk:** `data-testid="settings-nav-*"` assertions exist; keep them.

## 17. src/renderer/src/components/kanban/WorktreePickerModal.tsx (1926, 2030, 1932, 1999)
- **What:** Worktree row selection is `bg-primary/8 ring-1 ring-inset ring-primary/20` (both the New-worktree row and each existing row), the New-worktree plus icon is `bg-primary/10 text-primary`, and the checked-out branch tag is `text-[10px] text-primary`.
- **Change:** Selection → `bg-accent ring-1 ring-inset ring-white/10 dark:ring-white/10` (or simply `bg-accent` + `border-l-2 border-ring`); plus-icon chip → `bg-muted text-muted-foreground` to match the sibling GitBranch chip on line 2033; `active` tag → `text-emerald-500` (checked-out is a real status) or `text-foreground`.
- **Risk:** The `bg-primary/8` selection is what distinguishes the chosen worktree — whatever replaces it must stay distinguishable from the `hover:bg-muted/30` on the same rows.

## 18. src/renderer/src/components/kanban/WorktreePickerModal.tsx (347-353)
- **What:** The shared `buttonClass` helper for the SDK segmented control returns `bg-primary text-primary-foreground border-primary` when active — a near-white slab in orca dark for what is only a segment selection.
- **Change:** Active → `bg-secondary text-secondary-foreground border-transparent` (grey lift) so the true primary CTA (the Send button at 2420-2428) stays the only white/­coloured element in the footer. Inactive branch is already correct.
- **Risk:** Single helper, so one edit fixes all SDK buttons — but confirm the active/inactive contrast is still obvious at `text-xs`.

## 19. src/renderer/src/components/kanban/WorktreePickerModal.tsx (1909, 1915)
- **What:** Worktree list container is `rounded-lg border border-border/60` with rows separated by `border-b border-border/40`; the section label is `text-xs font-medium uppercase tracking-wider`.
- **Change:** Container → `rounded-md border border-border`; row dividers → `border-border` (the token is already a 7% hairline in orca dark, so the extra /40 and /60 opacity multipliers make them invisible). Label → `text-[11px] font-medium uppercase tracking-[0.08em]`.
- **Risk:** border-border/40 at 7% base = ~2.8% effective — dividers will currently be near-invisible in dark; removing the multiplier is a visible (intended) change.

## 20. src/renderer/src/components/sessions/HandoffSplitButton.tsx (157-159, 169)
- **What:** The split button is `rounded-full ... shadow-md` and its goal-mode state is `border-primary/40 bg-primary/15` / `hover:bg-primary/20` with a `text-primary` 'Goal mode' caption — brand-primary as a mode indicator plus a shadow orca doesn't use in chrome.
- **Change:** Drop `shadow-md`. Goal-mode active → a status hue or a neutral inversion (`border-ring/40 bg-accent` + caption `text-foreground`), so the state stays readable once primary is near-white; keep the inactive `border-border bg-muted/80` branch.
- **Risk:** Goal mode is toggled by right-click with no other affordance, so the active state must remain unmistakable.

## 21. src/renderer/src/components/sessions/HandoffModelPicker.tsx (251, 260, 310, 322, 379-382, 395)
- **What:** PopoverContent `w-[360px] p-3` rides on the un-migrated opaque popover surface; every control inside is `rounded-full` (`h-8 ... rounded-full border border-border bg-muted/50 px-3`, variant chips, and the confirm Button) — pill geometry that fights orca's 6px chrome rows.
- **Change:** After popover.tsx is frosted, change the pills on 260/310/322 and the confirm Button on 395 from `rounded-full` to `rounded-md`, and the variant chips on 379 to `rounded-md text-[10px]`. The active variant chip's `border-foreground bg-foreground text-background` inversion (line 381) is already orca-correct — keep it as the model for the other selected states.
- **Risk:** Popover is `modal` and portalled into the ticket modal; purely visual changes, but re-check it still layers above the Dialog.

## 22. src/renderer/src/components/pr/CreatePRModal.tsx (484, 512, 468-469)
- **What:** The base-branch dropdown renders into the un-frosted PopoverContent, its selected-branch tick is `text-primary` (near-white, no longer reads as 'selected' against `bg-accent` on the same row, line 505), and the trigger is `px-3 py-2 text-sm border rounded-md bg-background hover:bg-accent/50`.
- **Change:** Tick → `text-foreground` and rely on the row's `bg-accent` for the selected signal; trigger → `text-[13px]` and `hover:bg-accent`. Rows on 501-506 → `text-[13px]`.
- **Risk:** Low. Note the yellow/red commit-summary warnings at 396-407 are semantic and must survive — only reshape their focus ring to `focus-visible:ring-[3px] ring-<hue>/50`.

## 23. src/renderer/src/components/setup/AgentPickerDialog.tsx (37-42, 50-55, 65-70)
- **What:** All three SDK choice cards repeat `flex-1 px-4 py-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50` — a 2px border (orca is hairline) and a hover that turns the border near-white.
- **Change:** → `rounded-md border border-border hover:border-ring/50 hover:bg-accent`; label `text-[13px]`, sublabel `text-[11px]`. Factor the triplicated className into one local const while you're in there.
- **Risk:** This is the very first screen a new user sees (rendered via AgentSetupGuard when 2+ SDKs are detected), so it should look unmistakably orca.

## 24. src/renderer/src/components/command-palette/CommandItem.tsx (77-81, 121-125)
- **What:** Rows are `px-3 py-2 rounded-md text-sm`; the shortcut chip on a selected row is `bg-accent-foreground/20 text-accent-foreground`, which in orca dark is white-at-20% on the `#404040` accent — a bright block, and `text-accent-foreground` (#fafafa) for label/description/icons collapses to the same value as `text-foreground`, so the selected row loses its emphasis delta.
- **Change:** Row → `text-[13px] tracking-[0.01em]`. Keep `isSelected && 'bg-accent'` as the only selection signal and drop the per-element `text-accent-foreground` swaps on 89, 99, 108, 123, 135 in favour of the inherited `text-foreground`/`text-muted-foreground`. Selected shortcut chip → `bg-background/40 text-foreground`.
- **Risk:** Description line on 108 uses `text-accent-foreground/70` — make sure the replacement keeps a visible hierarchy between label and description.

## 25. src/renderer/src/components/settings/SettingsGeneral.tsx (84-95, 111-122, 138-149, 234-245, 263-274, 292-303, 319-330, 347-358, 420-431, 447-458, 474-485)
- **What:** Eleven hand-rolled switches, each duplicating `relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent` + `checked ? 'bg-primary' : 'bg-muted'` + knob `bg-background shadow-lg`, while an unused `@/components/ui/switch` primitive exists.
- **Change:** Replace all eleven with `<Switch checked={...} onCheckedChange={...} data-testid={...} />` from src/renderer/src/components/ui/switch.tsx; if the primitive itself needs orca alignment, fix it once there (drop the knob's `shadow-lg` — orca chrome is near-zero shadow — and keep the track on `data-[state=checked]:bg-primary`).
- **Risk:** Each toggle has a `data-testid` and `role="switch"`/`aria-checked` asserted by tests — the primitive must preserve both. Same pattern also appears in SettingsAdvanced (3), SettingsPet (1), SettingsPrivacy (1).

## 26. src/renderer/src/components/settings/SettingsGeneral.tsx (161, 173, 195, 207, 372, 384, 396, 500, 512, 529, 544, 586, 600)
- **What:** Thirteen segmented-control buttons all repeat `px-3 py-1.5 rounded-md text-sm border` + `bg-primary text-primary-foreground border-primary` when active — thirteen near-white slabs on one scrolling settings pane in orca dark.
- **Change:** Active → `bg-secondary text-secondary-foreground border-transparent`; size → `text-[13px]`. Extract the repeated ternary into a local `segmentClass(active: boolean)` helper (mirroring WorktreePickerModal's `buttonClass`) so all thirteen move together. Same recipe at SettingsSecurity 207/220/233 and SettingsUpdates 56/68.
- **Risk:** Selected-vs-unselected must stay obvious — `bg-secondary` (#262626) against the `bg-muted/50` inactive is a smaller delta than white-vs-grey, so consider adding `ring-1 ring-inset ring-white/10` to the active state.

## 27. src/renderer/src/components/settings/SettingsTerminal.tsx (190, 201, 232, 250, 349, 361)
- **What:** Three selectable-card lists repeat `bg-primary/10 border border-primary/30` for the selected card plus a `text-primary` Check icon — the R3 recipe, which turns into a white wash with a white tick in orca dark.
- **Change:** Selected card → `bg-accent border-border`; Check → `text-foreground`. Identical fix at SettingsEditor.tsx 82/94 and SettingsPet.tsx 87/96.
- **Risk:** The tick is the only selection signal on some of these rows once the tint goes neutral — verify the `bg-accent` lift is visible against the card background.

## 28. src/renderer/src/components/settings/SettingsShortcuts.tsx (198-201)
- **What:** The keybinding capture control encodes three states purely in primary opacity — recording `border-primary bg-primary/10 text-primary animate-pulse`, customized `border-primary/50 bg-primary/5`, default `border-border hover:border-primary/50` — so all three collapse toward the same near-white once primary is neutral.
- **Change:** Give recording a real status hue (`border-orange-500 bg-orange-500/10 text-orange-500 animate-pulse` — it is an attention/awaiting-input state), customized a neutral lift (`border-ring/50 bg-accent text-foreground`), and default `border-border hover:border-ring/50`.
- **Risk:** Recording state must be unmistakable — it's a modal keyboard capture the user has to escape from.

## 29. src/renderer/src/components/settings/SettingsAccounts.tsx (159)
- **What:** Active-account badge is `rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary` — brand-tinted pill that loses contrast at near-white primary.
- **Change:** → `rounded-md bg-emerald-500/15 text-emerald-500` if it marks the live/active account (a status), otherwise `bg-secondary text-secondary-foreground`.
- **Risk:** Confirm the badge's meaning before picking status-green over neutral.

## 30. src/renderer/src/components/settings/SettingsHiveEnterprise.tsx (96)
- **What:** `inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground` — a hand-rolled primary button instead of the shared Button component.
- **Change:** Replace with `<Button size="sm">`. This is a legitimate primary CTA so `bg-primary` is correct here; the issue is that it bypasses the Button primitive and so will miss the orca focus-ring/radius/height recipe when that lands.
- **Risk:** Low — check the disabled styling (`disabled:opacity-60`) is preserved by the primitive.

