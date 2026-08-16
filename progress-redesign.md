# Orca Design-System Migration — Progress

Goal: migrate the entire Hive renderer to the orca design system (the faithful
"Orca" direction from the original HTML mockups — since removed at the user's
request; the working notes live in `design/redesign/inventory/`), verified end
to end.

Target system (canonical values):

- **Dark tokens**: background `#0a0a0a`, card/popover `#171717`, secondary/muted
  `#262626`, accent `#404040`, muted-foreground `#a1a1a1`, foreground `#fafafa`,
  primary `#e5e5e5` (fg `#171717`), border `rgb(255 255 255 / 0.07)`, input
  `rgb(255 255 255 / 0.15)`, ring `#737373`, sidebar `#171717`, left/worktree
  sidebar lifted `#2a2a2a` (accent `#353535`).
- **Light tokens**: background `#fff`, secondary/muted/accent `#f5f5f5`,
  muted-fg `#737373`, primary `#171717`, border `#e5e5e5`, sidebar `#fafafa`,
  left sidebar `#f5f5f5` (accent `#eaeaea`).
- **Color = status only**: working yellow-500 spinner ring (12-step), done
  emerald, question/permission orange, plan violet/blue semantics stay, build
  blue stays, destructive red. No purple brand chrome.
- **Type**: Geist (variable) UI font, `letter-spacing: 0.01em`, dense 13/11/10px
  chrome, 11px uppercase section headers. Mono stack: SF Mono → Cascadia.
- **Geometry**: radius base 0.625rem; hairline borders; near-zero chrome
  shadows; focus ring `focus-visible:ring-[3px] ring-ring/50`.
- **Overlays**: frosted glass (menus `rounded-[11px]` translucent +
  `backdrop-blur-2xl` + dual shadow; dialogs `bg/96` glass; tooltip inverted).
- **Chrome**: 36px titlebar; 32px tab strip; active tab = 6% fg wash + 2px
  60%-fg underline; sleek 12px square scrollbars (3px transparent inset).

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[v]` visually verified

---

## Wave 0 — Assets & foundation

- [x] Copy `Geist-Variable.woff2` (+ OFL note) into `src/renderer/src/assets/fonts/`
- [x] `src/renderer/src/styles/globals.css` — `@font-face` DM Sans → Geist;
      `--font-sans` Geist stack; `--font-mono` gains ui-monospace/Cascadia;
      JetBrains Mono kept for terminal
- [x] `globals.css` `:root` — orca light tokens (was glass-light purple)
- [x] `globals.css` `.dark` — orca dark tokens; `--worktree-sidebar{,-foreground,
      -accent,-accent-foreground,-border,-ring}` tokens + `@theme inline` aliases
      (note: kept dark `--destructive-foreground: #fff` — hive uses white-on-red;
      kept `--sidebar-foreground` muted-tier to preserve existing usage)
- [x] `globals.css` base layer — body `letter-spacing: 0.01em` + antialiasing;
      removed `font-size: 18px` (16px default, orca parity)
- [x] `globals.css` — removed grain overlay (`body::after`)
- [x] `globals.css` — scrollbars → orca sleek recipe (12px, 3px transparent
      inset, square, muted-fg color-mix; single recipe both modes)
- [x] `src/renderer/src/lib/themes.ts` — glass presets renamed "Orca Dark" /
      "Orca Light" (ids unchanged → saved settings keep working), orca preview
      swatches; other presets untouched; DEFAULT stays `glass-dark` id
- [x] `useThemeStore.ts` reviewed — no change needed: worktree-sidebar vars are
      not in THEME_CSS_PROPERTIES, so non-native presets fall back to neutral
      orca left-sidebar values (intended)
- [x] Removed `DMSans-Variable.woff2` asset (no references remained)

## Wave 0.5 — Residual layer (owned by orchestrator)

Full per-area inventories live in `design/redesign/inventory/*.md` (7 files,
226 entries) plus `CONVENTIONS.md` (canonical recipes given to every
implementation agent). Typecheck baselines captured: node 398 / web 121
pre-existing errors (scratchpad tsc-*-baseline.txt).

- [x] `terminal/backends/XtermBackend.ts` — default theme rebased from
      Catppuccin Mocha to neutral Ghostty-default-dark palette; selection no
      longer opaque `--accent` (was a live regression) → translucent `#7373734d`
- [x] `styles/xterm.css` — search decorations: purple fallbacks → ring grey;
      active match → amber outline + 25% amber fill (semantic search color)
- [x] `lib/monaco-theme.ts` — fallback hexes → orca values; selection →
      neutral white washes (was VS Code blue `#264f78`)
- [x] `styles/globals.css` — `.pr-comment-html a` → blue-600/blue-400 links;
      Monaco diff-comment decorations violet → neutral tint + blue jump flash
- [x] `index.html` — inline first-paint background (`#0a0a0a` dark / `#fff`)
      keyed off the `.dark` class to kill the white flash
- [x] `pet.html` / pet window — intentionally untouched: transparent window,
      does not import globals.css, theme-independent
- [x] `lib/themes.ts` — Amethyst + Daylight surfaces de-purpled to neutral
      greys (keep violet accents); other presets keep their deliberate hues

## Waves 1–7 — Component migration (implemented by 7-agent workflow)

Detailed per-agent reports: `design/redesign/inventory/IMPLEMENTATION-REPORTS.md`.
158 files changed. All inventory entries executed or explicitly skipped with
reasons (structural refactors beyond styling mandate, vendor-identity colors
kept per conventions, optional mockup niceties deferred).

- [x] **UI primitives** (20 files): glass menus/popovers/dialogs, inverted
      tooltip, orca focus rings (`ring-[3px] ring-ring/50`), flat shadow-free
      chrome, retuned button/input scale (h-9→h-8 etc.), `icon-xs`/`icon-sm`
      variants, shared `menu-classes.ts`, sonner theme from theme store,
      checkbox `border-primary`→`border-input`
- [x] **Layout chrome** (23 files + `src/main/window-chrome.ts`): 36px split
      titlebar (left segment on worktree-sidebar surface at sidebar width,
      78px traffic pad, 16px logo), HEADER_HEIGHT 48→36 +
      trafficLightPosition {12,12}, 24px titlebar buttons, LeftSidebar on
      worktree-sidebar tokens, BottomPanel/tab underlines per conventions,
      neutral UpdatePill, ResizeHandle ring washes
- [x] **Sidebar content** (21 files): WorktreeItem/PinnedList/RecentList/
      ConnectionItem status vocabulary (working yellow, ready emerald,
      question orange, unread blue dots), UsageIndicator neutral active ring
      (+test), worktree-sidebar-accent selection washes, density pass
- [x] **Session view** (38 files): orca tab strip, composer 1px mode-tinted
      borders, UserBubble plan violet ramp + bg-secondary default bubbles,
      ModelSelector ultra de-violeted, IndeterminateProgressBar fuchsia→
      semantic, ToolCard/tool views neutralized, SessionHistory/
      ClaudeCliSessionView glass
- [x] **Kanban** (21 files): orca board card/column recipes, merged purple→
      emerald, epic mark recolored, drop-zone ring neutrals, shared `pill.ts`,
      TicketModelBadge (+test)
- [x] **Settings** (17 files): toggles/segmented controls neutralized (DOM
      preserved for tests), SpacesTabBar worktree-sidebar tokens, ThemeCard
      renders new preview swatches
- [x] **Overlays/diff** (13 files): CommandPalette + FileSearchDialog glass,
      diff/PR comment violet chrome → neutral (yellow outdated kept),
      PRNotificationStack aligned to orca glass recipe
- [x] **Orphan file**: setup/AgentPickerDialog.tsx (hairline cards, shared const)

Known deferred items (deliberate):
- WorktreePickerModal super-sparkle orange pill kept (super-plan is an orange
  semantic; sparkle CSS retained in globals.css — still consumed there)
- highlight.js `github-dark-dimmed` is dark-tuned in light mode (pre-existing)
- icon-size call-site sweep to new `icon-xs`/`icon-sm` variants (cosmetic;
  existing overrides win via cn())
- `--font-mono` stays SF Mono-first (Geist Mono not bundled; acceptable)

## Wave 8 — Verification (complete)

- [x] Typecheck: node 398 / web 121 errors — **identical to baseline, 0 new**
      (two apparent diffs were a line-shift and a tsc suggestion-code change on
      pre-existing errors)
- [x] Tests: full vitest run vs stashed-HEAD baseline — 43 failed files before,
      43 after, **0 new failures**. 11 test files broken by the migration were
      all stale class-string assertions (no component regressions); each was
      updated to assert the new orca styling meaningfully (fix reports in the
      test-fix workflow journal)
- [x] Build: `electron-vite build` + `build:server` clean
- [v] Live CDP verification (built app, port 9223, playwright-cli):
      - Welcome shell: 36px split titlebar (lifted left segment + logo), lifted
        worktree sidebar with dense status rows, right sidebar, usage bars
      - Kanban board: uppercase column headers + count pills, hairline ticket
        cards, model/PR pills, violet Plan-ready, Board tab underline
      - claude-cli terminal session renders (neutral surface); NOTE: driving
        Escape into the PTY closed a stale test session's trust prompt
      - SDK chat session: "Start a conversation" empty state + composer with
        blue Build pill, model selector, send button
      - Session History panel: filters, amber Archived pill, orca input ring
      - Glass surfaces: settings dialog, project context menu, session-type
        menu — all rounded-[11px] translucent + blur
      - Themes: app was on persisted **amethyst** (now neutral surfaces +
        violet accent — renders correctly); previewed Orca Dark; selected Orca
        Light for a full light-shell check (white canvas, #f5f5f5 sidebar,
        live terminal re-theme) then restored amethyst (DB verified)
- [x] Cleanup: dev app quit; user's theme + data untouched (one empty
      "Session" tab may remain on test-python/main from composer verification)

**Goal met**: the renderer is fully migrated to the orca design system and
verified end to end (typecheck, tests, live visual pass in dark + light).

## Wave 9 — Left sidebar: mimic orca exactly (feedback: "too clamped up")

Reference: `/Users/mor/Documents/dev/orca/docs/assets/readme-hero.jpg` +
orca sidebar sources (`components/sidebar/*`, `main.css` sidebar rules).
Three owners re-derived orca's recipe verbatim; orchestrator closed the gaps.

- [x] Shell (`LeftSidebar.tsx`): orca nav rhythm, search field recipe
      (h-7 rounded-md border/70 fg/5, hover keycap), "Projects" header
      (`mt-2 h-8`, `text-xs font-semibold text-muted-foreground/80`, icon-xs
      actions), footer toolbar `border-t px-2 py-1.5`; `UpdatePill`,
      `SpacesTabBar`, `ProjectFilter`, `FilterChips` on worktree-sidebar tokens
- [x] Project group rows (`ProjectItem.tsx`, `ProjectList.tsx`): orca
      SectionHeader — `h-7 gap-1.5 pl-[10px] pr-2`, 16px icon slot keeping
      LanguageIcon, `text-[13px] font-semibold leading-none`, count pill
      (`h-4 rounded-full border bg-worktree-sidebar-accent text-[9px]`),
      sticky `bg-worktree-sidebar`, 6px gap between groups
- [x] Worktree cards (`WorktreeItem.tsx`): orca WorktreeCardSurface —
      `ml-1 rounded-lg border pt-1.25 pb-1.5 mb-1.5`, 20px status lane with
      one glyph, title `text-[13px] leading-5`, `primary` micro badge, meta
      row, inline agent row `h-6 text-[11px]`, hover/active color-mix washes
- [x] Pinned / Recent / Connections (`PinnedList`, `RecentList`,
      `ConnectionList/Item`): orca section headers with icon slot + count pill;
      rows as orca cards — title = worktree/branch (default worktree → project
      name + `primary` badge), META ROW = project chip (LanguageIcon + name/
      branch, orca repo-chip recipe), agent row with model icon + status + time
- [x] `LanguageIcon.tsx` now honors `className` on every branch (chip-size icons)
- [x] Status dots: idle "Ready" now emerald like `completed` (orca hero shows
      emerald for every ready card; both states read "Ready")
- [x] `WorktreeList.tsx` indent `pl-4` → `pl-1` (card dot lands 28px from the
      list edge, ~10px in from the project icon like orca)
- [x] `useLayoutStore.ts`: sidebar default 240 → 280, min 200 → 220, max 400 →
      500 (orca envelope; persisted widths untouched)
- [v] Verified live at 3× zoom against the orca hero crop: nav/search/header,
      section headers + pills, card rhythm, primary badge + project chip,
      emerald dots, selected-card lift, nested indent. Sidebar-related test
      files: 25/25 pass (only pre-existing baseline failures remain).

Follow-up feedback (darker + single-line worktree rows):
- [x] `--worktree-sidebar` #2a2a2a → **#1a1a1a**, accent #353535 → #262626
      (darker than orca's own #2a2a2a — sampled from its hero — while still
      lifted off the #0a0a0a canvas); Orca Dark preview swatch updated
- [x] Pinned / Recent rows back to the original single title line:
      `[project icon] project › worktree` (primary worktree shows its real
      branch instead of the "(no-worktree)" placeholder), status row kept;
      project-chip meta row + primary badge removed from these lists
- [v] Verified live (bg sampled #1a1a1a; rows single-line)

Follow-up feedback ("copy orca's sidebar, adjust to our needs, look the same"):
- [x] **Orca sidebar KIT ported verbatim** into `src/renderer/src/components/sidebar/`:
      `orca-sidebar.ts` (every orca class string + numeric constants, each
      annotated with its orca source), `AgentStateDot`, `SidebarCountPill`,
      `SidebarSectionHeader`, `WorkspaceCardSurface`, `SidebarAgentRow`,
      barrel `index.ts`; orca's sidebar CSS block appended to `globals.css`
      (card hover/active recipes, agent-row hover, hover-reveal scrollbar,
      sticky headers, children rails, working-spinner keyframes); spec at
      `design/redesign/inventory/ORCA-SIDEBAR-SPEC.md`
- [x] `globals.css`: added `@custom-variant dark (&:is(.dark *))` (orca has
      it; Hive's 74 `dark:` utilities previously followed the OS scheme, not
      the app theme — now class-based like orca)
- [x] All sidebar files rewired onto the kit (no local recipes left):
      LeftSidebar (orca shell + NEW nav rows "Board" / "Session History"
      reusing Header actions, orca search field, Workspaces-style header,
      SidebarToolbar footer), ProjectItem/ProjectList/WorktreeList (section
      headers with LanguageIcon in the icon slot, count pill, sticky, hover
      chevron; ROW_GAP 6px; orca indent ladder), WorktreeItem (card surface
      pt-1.25 pb-1.5, 20px lane + AgentStateDot, primary badge, agent row h-6),
      PinnedList/RecentList (single-line `project › worktree` title kept),
      ConnectionList/Item/ConnectionsButton
- [v] Verified live at 3× zoom vs orca hero: nav rows, search, header, section
      headers + pills, card rhythm (title→agent→next-title proportions match
      orca's exactly), selected-card lift, nested indent, footer. Sidebar test
      files 25/25 pass; typecheck unchanged (121 pre-existing).

Follow-up feedback (nav rows + usage colors):
- [x] Nav: removed "Session History"; "Board" → **"Pinned Board"** toggle
      (mirrors the PinnedList header button: clears file/diff overlays, then
      `togglePinnedBoard`; active when `isPinnedBoardActive`)
- [x] Usage bars: restored the usage ladder — emerald <60%, yellow ≥60%,
      orange ≥80%, red ≥90% (rate-limit rejected/warning still red/orange)
- [v] Verified live: nav row opens/closes the Pinned Projects board; bars green

Regression fix — kanban ticket drag-and-drop:
- [x] Root cause: `KanbanTicketCard` hides the drag source (`isDragging &&
      'invisible'` = visibility:hidden) via setState inside `dragstart`. This
      only ever worked because the old card had `transition-all duration-200`,
      which delayed the visibility change 200ms; the redesign narrowed the
      transition to border/background, so the source went hidden synchronously
      and Chromium aborted the drag (dragstart→dragend, no drop). Fix: defer
      `setIsDragging(true)` by a macrotask guarded by `dragActiveRef` so the OS
      drag session starts before the source is hidden.
- [v] Verified with real OS-level CGEvent drags (CDP can't drive native DnD):
      before fix dragstart→dragend only; after fix dragstart→drag…→drop and the
      ticket moves. Sidebar row drags were unaffected throughout.

Follow-up feedback — restore ultra/ultracode violet:
- [x] `ModelSelector.tsx`: accent variant chips back to the original recipe
      (active `bg-violet-600 text-white`, inactive `bg-violet-500/15
      text-violet-600 dark:text-violet-300`), trigger's variant label
      `text-violet-600 dark:text-violet-300` for ultra variants
- [x] `TicketModelBadge.tsx`: ultra/ultracode → `border-2 border-violet-500`
      (+ test assertions restored). Plan-mode violet and Supercharge buttons
      untouched (Supercharge remains neutral per the sweep — flag if wanted back)
