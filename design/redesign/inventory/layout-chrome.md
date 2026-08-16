# Inventory — Layout chrome (src/renderer/src/components/layout/* + App shell + titlebar host config)

**Notes:** Key structural finding: the orca titlebar is NOT the current single flat bar. It is 36px AND split — a left segment whose width tracks `leftSidebarWidth` painted with the LIFTED worktree-sidebar surface (so titlebar-left and left-sidebar read as one continuous column), and a main segment painted `--card`. Header.tsx currently has no knowledge of `leftSidebarWidth`, so this is the one entry in this area that changes component data flow, not just classes. It also has a main-process dependency: `src/main/window-chrome.ts` HEADER_HEIGHT=48 and trafficLightPosition are calibrated to h-12 and must move together or native caption buttons will not line up.

Second cross-cutting finding: `--primary` is `oklch(0.588 0.217 270)` (purple) today, and layout chrome leans on it as a BRAND accent in ~15 places — UpdatePill (entire surface), ResizeHandle (all four splitters), BottomPanel active-tab underline + vim keybind letter, HeaderDiscordToggle enabled state, Header vim pill and vim hint letters, Header branch-name text, LeftSidebar connection-mode icon, SpacesTabBar drag ring. Every one of these silently becomes near-white (#e5e5e5) when primary flips, and several invert their intended hierarchy (branch name brighter than project name; update pill louder than everything). None of them are status semantics — all should go neutral (`foreground`/`muted-foreground`/`accent`/`ring`). RecentList.tsx and PinnedList.tsx have the same pattern (`text-primary` "Working" label, `bg-primary` unread dot, `text-primary` spinners) but those files belong to the sidebar-lists area, not layout chrome — flagged here only so they are not missed.

Third: icon-button sizing is systemically wrong for a 36px bar. `Button size="icon"` is `size-9` (36px) and is used unmodified in Header (6x), HeaderTelegramToggle, HeaderDiscordToggle and WindowChromeControls — nine buttons that will each occupy the full titlebar height. A single shared 24px `tb-icon-btn` class constant is the cleanest fix.

Not flagged as violations (deliberately left alone): emerald merge button (Header:427), destructive Fix-conflicts / Detach-PR (Header:317/345/616/638), amber streaming coffee + amber/red telegram health dots, blue/amber DropOverlay states, green copy-confirmation ticks in QuickActions, `--mode-plan` violet. Also not flagged: `ui/button.tsx`'s `focus-visible:ring-ring/24` (orca wants `ring-ring/50`) and `ui/popover.tsx`/`ui/dropdown-menu.tsx` opacity — those live in the ui-primitives area, but nearly every control inventoried above inherits from them, so the layout entries above assume the primitives pass lands first (otherwise the PopoverContent glass overrides in Header.tsx will double-apply).

## 1. src/renderer/src/components/layout/Header.tsx (222-227)
- **What:** Header is a single flat 48px bar: `h-12 border-b bg-background flex items-center justify-between px-4`. Orca's titlebar is 36px AND split into two segments — a left segment the width of the left sidebar painted with the lifted worktree-sidebar surface (inset bottom border, traffic-light pad), and a main segment painted `--card` (#171717) with a 1px bottom border. Current code has neither the height nor the split.
- **Change:** Restructure <header> into two children: (a) left segment `flex-shrink-0` with width = `useLayoutStore().leftSidebarWidth` (hidden when `leftSidebarCollapsed`), `bg-[var(--worktree-sidebar)]` + `shadow-[inset_0_-1px_0_var(--border)]`, containing the traffic-light pad + logo + app name; (b) main segment `flex-1 bg-card border-b border-border px-2.5`. Change the outer bar to `h-9 min-h-9` (36px) and drop `px-4`/`justify-between` in favor of per-segment padding. Keep `WebkitAppRegion: 'drag'` on the outer element.
- **Risk:** Header must now subscribe to `leftSidebarWidth`/`leftSidebarCollapsed`; every child control is currently sized for a 48px bar and will overflow 36px until the button entries below are also applied. Playwright/vitest selectors keyed on `[data-testid="header"]` geometry may need updating.

## 2. src/main/window-chrome.ts (7, 98-109, 154)
- **What:** `HEADER_HEIGHT = 48` drives the Windows `titleBarOverlay.height`, and macOS uses `trafficLightPosition: { x: 15, y: 10 }` — both calibrated to the old h-12 header. With a 36px titlebar the native caption buttons and traffic lights will be vertically mis-centered / taller than the bar.
- **Change:** Set `HEADER_HEIGHT = 36`, and change `trafficLightPosition` to `{ x: 12, y: 12 }` so 12px dots center in a 36px bar (orca mockup: `.traffic { left: 12px; top: 11px }`). Keep both call sites (constructor options and the runtime `setTitleBarOverlay` at :154) reading the single constant.
- **Risk:** Main-process change — requires an app restart to verify; wrong y makes traffic lights clip on macOS. Verify on both win32 and darwin.

## 3. src/renderer/src/components/layout/Header.tsx (229, 231)
- **What:** macOS traffic-light spacer is `w-16` (64px) and the Hive logo is `h-5 w-5` (20px) at full opacity — sized for the 48px bar. Orca uses a 78px left pad and a 16px logo at `opacity: 0.75`, both inside the lifted left segment.
- **Change:** Move the mac spacer + logo into the new left segment; change the spacer to `w-[78px]` (or `pl-[78px]` on the segment) and the logo to `h-4 w-4 opacity-75`. Add the orca app-name label `text-[12px] font-semibold text-muted-foreground` next to it.
- **Risk:** Non-mac platforms must not get the 78px pad — keep it behind `isMac()`.

## 4. src/renderer/src/components/layout/Header.tsx (233, 235-238, 241, 244, 248)
- **What:** Project/connection title is `text-sm font-medium` (14px) and the branch/member suffix uses `text-primary font-normal`. `--primary` is currently `oklch(0.588 0.217 270)` (purple) — this is brand-tinted chrome text, and when primary flips to #e5e5e5 the branch name becomes *brighter* than the project name, inverting the intended hierarchy.
- **Change:** Title → `text-[12px] font-medium text-foreground`; branch/member suffix → `text-[12px] font-normal text-muted-foreground` (orca `.titlebar-title .branch`). Add an orca `sep` glyph (`text-muted-foreground opacity-50`) between project and branch instead of parentheses if matching the mockup exactly.
- **Risk:** `data-testid="header-project-info"` / `header-connection-info` text content must be preserved for tests.

## 5. src/renderer/src/components/layout/Header.tsx (291-303)
- **What:** Vim mode pill INSERT state is `text-primary bg-primary/10 border-primary/30` — a purple brand tint. Under orca primary this becomes a near-white fill/border pill that reads as a selected primary CTA, not a mode indicator. NORMAL state `bg-muted/50 border-border/50` is close but uses `rounded` (4px) not the orca chrome radius.
- **Change:** INSERT → `text-foreground bg-secondary border-border` (neutral), NORMAL → `text-muted-foreground bg-secondary/60 border-border`. Change `rounded` → `rounded-md`, keep `text-[10px] font-mono`.
- **Risk:** Low; `data-testid="vim-mode-pill"` unaffected.

## 6. src/renderer/src/components/layout/Header.tsx (411, 442, 468, 604, 677)
- **What:** Vim keyboard-hint letters and the selected-PR row all use `text-primary font-bold` as an attention accent (currently purple). Under orca these become near-white-on-near-white inside already-light buttons and lose all contrast against the sibling label text.
- **Change:** Replace `text-primary font-bold` with `text-foreground font-bold underline underline-offset-2 decoration-ring` (or `text-foreground` + `opacity-100` while the surrounding label is `text-muted-foreground`) so the hint reads by contrast rather than hue. For the PR row at :604 use `text-foreground font-semibold` and rely on the `bg-accent/50` row highlight at :597.
- **Risk:** Vim-hint spans are asserted in Header tests by text, not class — safe.

## 7. src/renderer/src/components/layout/Header.tsx (755-813)
- **What:** All right-side icon buttons (kanban toggle, session history, telegram, discord, settings, right-sidebar toggle) use `<Button size="icon">` = `size-9` (36px). In a 36px titlebar they consume the full bar height edge-to-edge with zero breathing room; orca's `.tb-icon-btn` is 24px (4px pad + 16px icon) with `rounded-md`.
- **Change:** Add `className="size-6 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"` to each `size="icon"` header Button (or introduce a shared `tbIconButton` class constant in Header.tsx and apply it to all six). Keep icons at `h-4 w-4`.
- **Risk:** The kanban toggle's active state at :771-773 (`bg-accent text-accent-foreground`) must be merged with the new className via `cn()` and not clobbered.

## 8. src/renderer/src/components/layout/Header.tsx (317, 345, 375, 396, 455, 479, 547, 653, 725)
- **What:** Header action buttons are `h-7 text-xs` (28px / 12px) and the ghost target-branch triggers are `text-xs px-2 h-7`. At 36px bar height 28px buttons leave 4px of clearance and read heavy; orca `.tb-btn` is ~24px tall, `padding: 4px 8px`, `border-radius: 4px`, `font-size: 12px`, `font-weight: 500` with `hover:bg-accent hover:text-foreground`.
- **Change:** Change all header action Buttons to `h-6 px-2 text-[12px] font-medium rounded-md`; ghost branch-pickers to `h-6 px-2 text-[12px] text-muted-foreground rounded-md`. Keep the split Review button's `rounded-r-none border-r-0` / `rounded-l-none` pairing (:455/:479) but on the new 6px radius.
- **Risk:** Buttons with `font-semibold` (Fix conflicts :317/:345) will lose weight — keep semibold only there if the destructive CTA needs to stay loud. Emerald merge button at :427 is a semantic status color and must be left alone apart from the height/radius change.

## 9. src/renderer/src/components/layout/Header.tsx (562-624, 684-719)
- **What:** The two PR-picker `PopoverContent`s are `w-80 p-0` with hand-rolled rows (`px-3 py-2 text-sm hover:bg-accent`) and section dividers `border-b`/`border-t`. They render on the default opaque `bg-popover` surface with square-cornered full-bleed rows — no frosted glass, no inset row radius, 14px type inside a 13px-dense chrome system.
- **Change:** Give both PopoverContent the orca overlay recipe: `rounded-[11px] border-white/14 dark:border-white/14 border-black/14 bg-[rgba(0,0,0,0.72)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] p-1`. Convert rows from full-bleed to `mx-0 rounded-md px-2 py-1.5 text-[13px]` and shrink the meta lines to `text-[11px]`. Replace `border-b`/`border-t` dividers with `h-px bg-border my-1` separators so they don't touch the rounded edge.
- **Risk:** If `ui/popover.tsx` is being reworked to the glass recipe globally by the overlays pass, these local overrides should be dropped instead of duplicated — coordinate to avoid double-blur.

## 10. src/renderer/src/components/layout/Header.tsx (260-268)
- **What:** Keep-awake coffee indicator uses `text-indigo-400` for the `sleepWhenIdleArmed` state — an indigo/violet-family chrome accent that is not one of the sanctioned semantic statuses (the `text-amber-500` streaming state is fine).
- **Change:** Map the armed state to a neutral or sanctioned hue: `text-muted-foreground` with a filled/outlined icon swap, or reuse `text-blue-400` only if this is genuinely a status. Remove `text-indigo-400`.
- **Risk:** Purely visual; `data-testid="keep-awake-indicator"` unaffected.

## 11. src/renderer/src/components/layout/LeftSidebar.tsx (108-115)
- **What:** The left (projects/worktrees) sidebar uses `bg-sidebar text-sidebar-foreground border-r`, i.e. the SAME surface token as the right sidebar. Orca deliberately splits these: the left sidebar is LIFTED `--worktree-sidebar` #2a2a2a (accent #353535, light #f5f5f5) while the right sidebar stays `--sidebar` #171717.
- **Change:** Switch the aside to a new lifted token: `bg-[var(--worktree-sidebar)] text-[var(--worktree-sidebar-foreground)] border-r border-[var(--worktree-sidebar-border)]` (or a Tailwind `bg-worktree-sidebar` alias registered in globals.css `@theme`). Leave RightSidebar on `bg-sidebar`.
- **Risk:** Requires the new `--worktree-sidebar*` tokens to exist in globals.css first (theme-tokens area). Every descendant that hardcodes `bg-muted`/`bg-accent` (PinnedList, RecentList, ProjectList, SpacesTabBar, UsageIndicator, UpdatePill) will now sit on a lighter base and needs re-checking for contrast.

## 12. src/renderer/src/components/layout/LeftSidebar.tsx (117, 119)
- **What:** Connection-mode banner is `p-3 border-b flex ... bg-muted/50` and the Link icon is `text-primary` (purple brand accent). On the lifted #2a2a2a sidebar `bg-muted/50` (#262626 @ 50%) resolves DARKER than the sidebar base, so the banner recesses instead of lifting; `text-primary` becomes near-white and reads as an error/CTA.
- **Change:** Banner → `bg-white/[0.06] dark:bg-white/[0.06]` (orca's `color-mix(worktree-sidebar-foreground 8%)` lift) with `border-b border-[var(--worktree-sidebar-border)]`. Icon → `text-muted-foreground` (or `text-foreground` if it must stay prominent).
- **Risk:** Light-theme equivalent needs the inverse (`bg-black/[0.04]`) — don't hardcode the dark value only.

## 13. src/renderer/src/components/layout/LeftSidebar.tsx (153-157, 167, 172)
- **What:** Sidebar section header is `p-3` with `text-sm font-medium` (14px) plus a `FolderGit2` icon; filter/chip strips are `px-3 py-2` / `px-3 py-1.5`. Orca's `.sidebar-header` is a fixed 32px row, `padding: 0 8px 0 12px`, label `font-size: 12px; font-weight: 600` at 80% muted-foreground — denser and taller-consistent, with uppercase 11px used for sub-section heads.
- **Change:** Header row → `h-8 px-3 pr-2 flex items-center justify-between` (drop `p-3`), label → `text-[12px] font-semibold text-muted-foreground/80`, and drop or shrink the leading icon to `h-3.5 w-3.5`. Filter strip → `px-2 py-1.5`, chips strip → `px-2 py-1`. Add `border-b border-[var(--worktree-sidebar-border)]` (hairline) rather than the default `border-b`.
- **Risk:** Reducing to h-8 truncates the 4 action buttons (Connections/Recent/Sort/Add) unless they are also shrunk to 24px `icon-xs-btn` size.

## 14. src/renderer/src/components/layout/UpdatePill.tsx (38-75)
- **What:** The entire pill is primary-tinted brand chrome: `border-primary/20 bg-primary/10 text-primary`, progress fill `bg-primary/15`, hover `bg-primary/10`, dismiss `text-primary/60 hover:bg-primary/15`. Today that's a purple pill; under orca primary (#e5e5e5) it becomes a glaring white-on-white block at the bottom of the lifted sidebar — the single loudest element in the chrome.
- **Change:** Re-skin neutral: container `border border-border bg-secondary text-foreground` (on the lifted sidebar use `bg-white/[0.06]`), progress fill `bg-white/10`, hover `hover:bg-accent`, dismiss `text-muted-foreground hover:bg-accent hover:text-foreground`. Keep `h-7 rounded-md text-[11px]`. If the pill must signal availability, use the sanctioned build-blue (`text-blue-500`) for the icon only, not the whole surface.
- **Risk:** `update-pill-progress-fill` width test asserts style only; class change safe. Check the light theme too — `bg-secondary` (#f5f5f5) on a #f5f5f5 left sidebar disappears, so the light variant needs `bg-black/[0.04]` + border.

## 15. src/renderer/src/components/layout/BottomPanel.tsx (110-136)
- **What:** Tab strip has no fixed height (`text-xs px-3 py-1.5`), and the active indicator is `bg-primary` at full strength (purple today, pure #e5e5e5 under orca). The vim keybind letter is `text-primary`. Orca `.bp-tabs` is a 30px row, `padding: 0 4px`, tabs `padding: 0 10px; font-size: 11px; font-weight: 500`, active underline `inset: auto 8px 0; height: 2px; background: color-mix(foreground 60%)` — inset, not full-bleed, and at 60% strength.
- **Change:** Strip → `flex items-center h-[30px] px-1 border-b border-border`. Tab → `h-full px-2.5 text-[11px] font-medium rounded-none`. Active underline → `absolute bottom-0 left-2 right-2 h-0.5 bg-foreground/60` (replace `left-0 right-0 bg-primary`). Vim keybind letter → `text-foreground` instead of `text-primary`.
- **Risk:** `data-active` attribute and `bottom-panel-tab-*` testids must stay; TerminalTabsHorizontal renders in the same strip and must be re-checked against the 30px height.

## 16. src/renderer/src/components/layout/BottomPanel.tsx (168-206)
- **What:** The Chrome-command config popover is hand-rolled and fully opaque: `absolute ... bg-popover border rounded-md shadow-md p-3 w-80` with an `input` styled `bg-background border rounded` and buttons `rounded hover:bg-accent` / `bg-primary text-primary-foreground`. No frosted glass, `shadow-md` (too heavy for orca chrome), 4px radii.
- **Change:** Apply the orca overlay recipe to the container: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]`. Input → `rounded-md border-input bg-input/30 text-[12px]` with `focus-visible:ring-[3px] focus-visible:ring-ring/50`. Cancel → `rounded-md hover:bg-accent`; Save keeps `bg-primary text-primary-foreground` (correct orca primary CTA) but gets `rounded-md`.
- **Risk:** Note the Save button visually flips from purple to near-white — that IS the orca primary, so it is intended, but it becomes the brightest thing in the panel; verify against 01-orca `.send-btn`.

## 17. src/renderer/src/components/layout/ResizeHandle.tsx (52-65)
- **What:** Every pane splitter hovers/actives with `hover:bg-primary/20 active:bg-primary/30` and drag state `bg-primary/30` — a purple brand wash on all four sidebar/panel edges. Under orca primary this becomes a white bar flash. The vertical handle is also `h-[3px]` with `border-t border-border` (a 3px hit target that paints a visible line).
- **Change:** Swap the primary washes for the neutral ring/accent: `hover:bg-ring/40 active:bg-ring/60`, dragging `bg-ring/60`. Keep the hairline as `border-t border-border` (7% white) and consider widening the invisible hit area (`w-1` → `w-1` with `after:` overlay) rather than the painted band.
- **Risk:** Used by LeftSidebar, RightSidebar (x2) and MainPaneTerminalPanel — one change covers all four; verify the drag affordance is still discoverable at ring/40.

## 18. src/renderer/src/components/layout/HeaderDiscordToggle.tsx (16-32)
- **What:** The enabled state is `bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary` — brand-purple chrome tint on a titlebar icon button. Under orca primary it becomes a white-on-white pill. Also inherits the default `size="icon"` = `size-9`, too tall for the 36px bar.
- **Change:** Enabled state → `bg-accent text-foreground hover:bg-accent` (neutral toggled-on recipe, matching Header's kanban toggle). Add `size-6 rounded-md text-muted-foreground` to the base className.
- **Risk:** Keep the disabled/unconfigured tooltip path intact.

## 19. src/renderer/src/components/layout/HeaderTelegramToggle.tsx (84-118)
- **What:** Uses default `size="icon"` (36px) which fills the whole 36px titlebar, and paints the active state with the Telegram brand hex `bg-[#229ED9]/10 text-[#229ED9]` plus a `bg-[#229ED9]` badge. Brand-colored chrome is exactly what orca removes — color in chrome is reserved for status.
- **Change:** Add `size-6 rounded-md text-muted-foreground` to the button. Replace the `#229ED9` active tint with the neutral toggled-on recipe `bg-accent text-foreground`; keep a small `#229ED9` dot ONLY inside the mode badge if brand identification is required, or drop it for `bg-foreground text-background`. Leave the amber (`isElsewhere`) and red (`health === 'error'`) dots — those are sanctioned status colors.
- **Risk:** Users may rely on the blue tint to see forwarding is on here vs elsewhere; the accent fill plus the Q/A badge must remain distinguishable.

## 20. src/renderer/src/components/layout/WindowChromeControls.tsx (22-54)
- **What:** Linux window controls are three `size="icon"` (36px) ghost Buttons with `gap-2`. In a 36px titlebar they exactly fill the bar height with no padding, and 8px gaps between caption buttons is not the OS convention.
- **Change:** Give each button `size-6 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground` and tighten the wrapper to `gap-0.5`. Give the close button a `hover:bg-red-600 hover:text-white` treatment consistent with DesktopWindowEscapeChrome.
- **Risk:** Linux-only path — will not be exercised on the dev machine; verify icon glyph sizes (`h-4`/`h-3.5` mix at :34/:43/:52) look even at 24px.

## 21. src/renderer/src/components/layout/DesktopWindowEscapeChrome.tsx (17, 49)
- **What:** Boot/error drag strip is `h-12` — it must match the real header so the app doesn't visibly jump height on boot or when the Header error boundary trips. The Linux close button is `h-12 w-12 rounded-none`.
- **Change:** `h-12` → `h-9` in `barClass`; close button → `h-9 w-9 rounded-none`. Change `muted ? 'bg-muted'` to the orca card surface (`bg-card`) so the fallback strip matches the new titlebar-main segment rather than the muted grey.
- **Risk:** This component is the pre-`ready` shell in App.tsx:40 — a mismatch here is the first frame the user sees.

## 22. src/renderer/src/components/layout/AppLayout.tsx (281, 293)
- **What:** The LeftSidebar and RightSidebar error-boundary fallbacks use `w-60 border-r bg-muted/50` and `border-l bg-muted/50`. `bg-muted/50` matches neither orca sidebar surface (left #2a2a2a, right #171717) and the left fallback hardcodes 240px instead of the stored `leftSidebarWidth`.
- **Change:** Left fallback → `bg-[var(--worktree-sidebar)] border-r border-[var(--worktree-sidebar-border)]` with the width read from `useLayoutStore`; right fallback → `bg-sidebar border-l border-border`.
- **Risk:** Low — only visible when a sidebar crashes, but it is the visual proof the surface tokens are wired correctly.

## 23. src/renderer/src/components/layout/MainPaneTerminalPanel.tsx (51, 56-73)
- **What:** Toggle bar is `h-[30px] ... text-xs` with `hover:bg-accent/50` and the panel is wrapped in `border-t border-border`. The 30px height matches orca `.bp-tabs`, but the 12px type does not (orca bottom-panel chrome is 11px) and `hover:bg-accent/50` is a half-strength accent rather than the orca chrome-row hover.
- **Change:** Type → `text-[11px] font-medium`; hover → `hover:bg-accent hover:text-foreground`; add `px-2.5` to match `.bp-tabs` padding and give the row `rounded-none`. Keep the `border-t`/`border-b` hairlines but ensure they resolve to the 7%-white `--border`.
- **Risk:** Low; `bottom-terminal-toggle` testid and the height-fraction resize math are untouched.

## 24. src/renderer/src/components/spaces/SpacesTabBar.tsx (127-208)
- **What:** Rendered as the footer of the left sidebar (LeftSidebar.tsx:187) but styled against the old flat sidebar: bare `border-t`, tabs `bg-accent text-accent-foreground` when active and `hover:bg-accent/50` otherwise, and the drag-over ring is `ring-1 ring-primary` (purple brand ring → near-white under orca). On the LIFTED #2a2a2a sidebar, `--accent` (#404040) is the wrong accent — orca uses `--worktree-sidebar-accent` #353535 there.
- **Change:** Active tab → `bg-[var(--worktree-sidebar-accent)] text-[var(--worktree-sidebar-foreground)]`; idle hover → `hover:bg-white/[0.08] hover:text-foreground` (orca `.icon-xs-btn:hover`); drag-over ring → `ring-1 ring-ring` (never `ring-primary`). Add `border-t border-[var(--worktree-sidebar-border)]` and bump the tabs to `h-6 w-6 rounded-md` (already correct) with `[&_svg]:h-3.5`.
- **Risk:** The same component is only mounted inside the left sidebar today, so hardcoding worktree-sidebar tokens is safe — but if it is ever reused elsewhere the tokens must become props/CSS-inherited.

## 25. src/renderer/src/styles/globals.css (243-256)
- **What:** A global `body::after` grain/noise overlay (`opacity: 0.035`, fractalNoise SVG, `z-index: 9999`) sits on top of ALL layout chrome. Orca explicitly has NO grain overlay — it muddies the flat neutral surfaces and the frosted-glass overlays sit under it.
- **Change:** Delete the `body::after` grain block entirely (nothing else references `grain` in the codebase — verified by grep).
- **Risk:** Cross-cutting: removing it slightly raises perceived contrast everywhere; if any screenshot tests baseline the noise they will need re-baselining. Belongs to the theme-tokens pass but is listed here because it visually overlays every chrome surface in this area.

## 26. src/renderer/src/components/layout/QuickActions.tsx (448, 453, 469, 485, 501, 513, 529, 542)
- **What:** Six/eight ghost buttons at `h-7 px-2 gap-1.5 text-xs` separated by `gap-3` in the header center. At 36px bar height 28px buttons plus 12px gaps make the titlebar center visually crowded and taller than orca's `.tb-btn` (~24px, `padding: 4px 8px`, 12px/500, `gap: 5px`). `text-green-500` copy-confirmation ticks (:520, :548) are fine as status.
- **Change:** Change every QuickActions Button to `h-6 px-2 gap-1.5 text-[12px] font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-foreground`, and tighten the container to `gap-1`. Consider hiding the text labels below a width threshold (orca's titlebar-main shows icon+label only for the top 2-3 actions).
- **Risk:** These are the widest header elements; if labels are kept at 12px the center may still collide with the right action cluster on narrow windows — check the `flex-1` spacer at Header.tsx:360.

## 27. src/renderer/src/components/layout/LoginBanner.tsx (23-25)
- **What:** Floating banner is `rounded-full border-border bg-background/95 shadow-lg backdrop-blur` — `shadow-lg` is far heavier than orca's near-zero chrome shadows, `backdrop-blur` (8px) is weaker than the orca 2xl blur, and `bg-background/95` is the dialog recipe, not the frosted-menu recipe.
- **Change:** Move to the orca floating-overlay recipe: `rounded-[11px] border border-black/14 dark:border-white/14 bg-[rgba(255,255,255,0.82)] dark:bg-[rgba(0,0,0,0.72)] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] text-[11px]`. Cancel button → `h-6 px-2 text-[11px] rounded-md`.
- **Risk:** It is `fixed top-0` and overlaps the new 36px titlebar — the `pt-2` offset should be re-checked so it clears the bar.

## 28. src/renderer/src/components/layout/QuitConfirmationOverlay.tsx (46-50)
- **What:** Quit toast is `rounded-xl ... bg-background/95 shadow-2xl backdrop-blur-md` with `text-base` copy and a `bg-muted rounded` kbd. `shadow-2xl` is the heaviest shadow in the chrome and `rounded-xl` (12px) is off the orca dialog geometry; type is 16px in a 13px-dense system.
- **Change:** → `rounded-[11px] border border-black/14 dark:border-white/14 bg-background/96 backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.24)]`, copy → `text-[13px]`, kbd → `rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px]`.
- **Risk:** Low; purely a transient overlay.

