# Orca left-sidebar — verbatim visual spec (port target for Hive)

Source: `/Users/mor/Documents/dev/orca` (renderer). Every class string below is
copied verbatim from the orca file named next to it. Reference render:
`docs/assets/readme-hero.jpg` (nav rows → Workspaces header → Pinned/In progress
section headers with count pills → workspace cards with a status-dot lane, title +
micro badge, meta row with repo chip + branch, inline agent rows → footer toolbar).

Kit that implements this in Hive:
- `src/renderer/src/components/sidebar/orca-sidebar.ts` (class-string constants)
- `src/renderer/src/components/sidebar/{SidebarSectionHeader,SidebarCountPill,WorkspaceCardSurface,AgentStateDot,SidebarAgentRow}.tsx`
- `src/renderer/src/styles/globals.css` → "Orca sidebar" block (CSS recipes)

---

## 0. Theme plumbing orca relies on

`main.css:27` — `@custom-variant dark (&:is(.dark *));` (orca toggles `.dark` on
`<html>`; every `dark:` utility keys off it). `main.css:33` —
`@custom-variant can-hover (@media (hover: hover));` (hover-reveal controls hide only on
pointer devices). Radius scale (`main.css:129-135`, `--radius: 0.625rem`):
`--radius-sm: calc(var(--radius) * 0.6)` = 6px, `--radius-md: * 0.8` = 8px,
`--radius-lg: var(--radius)` = 10px. Hive: `rounded-sm = 6px, rounded-md = 8px,
rounded-lg = 10px` (same result via `-4px/-2px/0`).

## 1. Shell (`components/sidebar/index.tsx`)

```
container:  "relative min-h-0 flex-shrink-0 bg-worktree-sidebar flex flex-col overflow-hidden scrollbar-sleek-parent"   (index.tsx:110)
MIN_WIDTH = 220, MAX_WIDTH = 500                                                                                          (index.tsx:27-28)
resize handle: "group absolute -right-1.5 top-0 z-10 flex h-full w-3 cursor-col-resize items-stretch justify-center"      (index.tsx:31-32)
resize line:   "h-full w-px bg-transparent transition-colors group-hover:bg-ring/50 group-active:bg-ring"                 (index.tsx:33-34)
order: <SidebarNav/> <SidebarHeader/> <WorktreeList/> <div class="relative shrink-0"><SetupScriptPromptCard/><SidebarToolbar/></div>
drop affordance: "pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-1.5 rounded-md border bg-worktree-sidebar-accent/95 px-4 text-center text-worktree-sidebar-accent-foreground shadow-xs" (+ 'border-destructive/70' | 'border-worktree-sidebar-ring/70')  (index.tsx:145-148)
```

## 2. Nav rows (`SidebarNav.tsx`, `SidebarTaskNavButton.tsx`, `SetupGuideSidebarEntry.tsx`)

```
list:      "flex flex-col gap-0.5 px-2 pt-2 pb-1"                                                                (SidebarNav.tsx:94)
row:       "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors"   (SidebarNav.tsx:107)
  active:   "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground"                                 (SidebarNav.tsx:109)
  inactive: "text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8"                          (SidebarNav.tsx:110)
  disabled (Tasks w/o repos): "cursor-not-allowed opacity-50 hover:bg-transparent"                               (SidebarTaskNavButton.tsx:203)
icon:      "size-4 shrink-0" + (!active && "text-worktree-sidebar-foreground/30"); strokeWidth={active ? 2.25 : 1.75}   (SidebarNav.tsx:113-118)
label:     "flex-1"   (Mobile: "min-w-0 flex-1 truncate")                                                         (SidebarNav.tsx:120 / 218)
count badge (Agents unread): "rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground"   (SidebarNav.tsx:185)
"New" pill: "shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground"     (SidebarNav.tsx:222)
row-hosted hide button: Button variant=ghost size=icon-xs "mr-1 text-worktree-sidebar-foreground/55 hover:bg-worktree-sidebar-foreground/10 hover:text-worktree-sidebar-foreground" (+active: "text-worktree-sidebar-accent-foreground/70 hover:text-worktree-sidebar-accent-foreground"), icon EyeOff "size-3.5"   (SidebarNav.tsx:235-248)
Tasks hover provider shortcuts: wrapper "hidden items-center gap-1 group-hover:flex group-focus-within:flex"; each "rounded p-0.5 text-muted-foreground/70" (+ "transition-colors hover:text-foreground"), icons "size-3.5"   (SidebarTaskNavButton.tsx:55-58, 208)
```

### Search field (`SidebarNav.tsx:271-291`)

```
button: "group relative flex h-7 w-full items-center rounded-md border border-worktree-sidebar-border/70 bg-worktree-sidebar-foreground/5 pl-7 pr-1.5 text-left text-[12px] font-medium tracking-tight text-worktree-sidebar-foreground/45 transition-colors hover:border-worktree-sidebar-border hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50"
icon:   <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
label:  "min-w-0 flex-1 truncate"
keycap cluster: "pointer-events-none ml-1.5 hidden shrink-0 items-center gap-1.5 group-hover:inline-flex group-focus-within:inline-flex"
  ShortcutKeyCombo className="inline-flex gap-0.5"
  keyCapClassName="min-w-4 border-worktree-sidebar-border/80 bg-worktree-sidebar-foreground/8 px-1 py-px text-[9px] text-worktree-sidebar-foreground/55 shadow-none"
  separatorClassName="text-[9px] text-worktree-sidebar-foreground/45"
  KeyCap base (ShortcutKeyCombo.tsx:9): "inline-flex min-w-6 items-center justify-center rounded border border-border/80 bg-secondary/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm"
```

## 3. Workspaces header (`SidebarHeader.tsx:25-38`)

```
row:    "mt-2 flex h-8 items-center justify-between px-2 gap-2"
left:   "flex min-w-0 items-center gap-1"
label:  "pl-2 pr-0.5 text-xs font-semibold text-muted-foreground/80 select-none"   text = 'Projects' | 'Workspaces'
right:  "flex items-center gap-1.5 shrink-0"
buttons: <Button variant="ghost" size="icon-xs" className="text-muted-foreground"> icon "size-3.5" strokeWidth={2.25}
  options: SlidersHorizontal (className="relative text-muted-foreground"; active-filter dot: "absolute -top-0.5 -right-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium leading-none text-primary-foreground")  (SidebarWorkspaceOptionsMenu.tsx:92-118)
  add project: FolderPlus;  new workspace: Plus (no className)
orca Button icon-xs (ui/button.tsx): "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3"; ghost = "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
```

## 4. Section headers (`worktree-list/rows/SectionHeader.tsx`, `ProjectHeaderActions.tsx`, `rows/indentation.ts`)

```
virtual row wrapper (SectionHeader.tsx:182-193):
  "left-0 right-0" + (hasHeaderTopSpacing && !isActiveStickyHeader && 'pt-1')
  + isActiveStickyHeader ? cn('sticky z-20 bg-worktree-sidebar', hasStickyHost ? 'top-[35px]' : '-top-px') : 'absolute top-0'
header row (SectionHeader.tsx:227-239):
  "group relative flex h-7 w-full items-center gap-1.5 pr-2 text-left transition-all"
  + !(draggable) && 'cursor-pointer'
  + reveal highlight: 'rounded-md bg-worktree-sidebar-accent ring-1 ring-worktree-sidebar-ring/50'
  + dragging: 'bg-accent/80 ring-1 ring-ring/40 shadow-md rounded-md scale-[1.01]'
  + status/pin drag-over: 'rounded-md bg-worktree-sidebar-accent ring-1 ring-worktree-sidebar-ring/40'
  + row.repo && 'overflow-hidden'
  style.paddingLeft: repo/project-group → getProjectGroupHeaderPaddingLeft(depth) = 10 + min(depth,6)*10 ; else WORKTREE_SECTION_HEADER_PADDING_LEFT = 10   (indentation.ts:20-35)
title surface (SectionHeader.tsx:297-301): "flex min-w-0 flex-1 items-center gap-1.5 self-stretch" (+ draggable: 'cursor-grab active:cursor-grabbing')
icon box (SectionHeader.tsx:305-308): "flex size-4 shrink-0 items-center justify-center rounded-[4px]" + (repoHeaderColor ? 'text-muted-foreground' : row.tone)
  repo:   <RepoIconGlyph className="size-4" iconClassName="size-3.5" />
  other:  <row.icon className="size-3" />
label wrap (SectionHeader.tsx:323-324): "min-w-0 flex-1" > "flex min-w-0 items-center gap-1.5"
label (SectionHeader.tsx:325): "min-w-0 truncate text-[13px] font-semibold leading-none"
hover-actions cluster = ProjectHeaderActions (ProjectHeaderActions.tsx:10-18):
  'flex shrink-0 cursor-pointer items-center gap-0.5 self-stretch',
  'can-hover:absolute can-hover:right-1 can-hover:top-1/2 can-hover:z-10 can-hover:-translate-y-1/2',
  'can-hover:rounded-md can-hover:bg-worktree-sidebar can-hover:pl-1',
  'can-hover:pointer-events-none can-hover:opacity-0 can-hover:transition-opacity',
  'group-hover:pointer-events-auto group-hover:opacity-100',
  'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100',
  'has-[button[data-state=open]]:pointer-events-auto has-[button[data-state=open]]:opacity-100'
chevron box (SectionHeader.tsx:337): "flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
chevron (SectionHeader.tsx:348): <ChevronDown className={cn('size-3.5 transition-transform', collapsed && '-rotate-90')} />
header action buttons (repo-header-action-button-class.ts):
  REPO_HEADER_ACTION_REVEAL_CLASS = 'min-w-0 max-w-0 -ml-1.5 overflow-hidden opacity-0 focus:ml-0 focus:max-w-5 focus:opacity-100 group-hover:ml-0 group-hover:max-w-5 group-hover:opacity-100'
  REPO_HEADER_ACTION_BUTTON_CLASS = `size-5 shrink-0 ${REVEAL} rounded-md text-muted-foreground transition-[margin,max-width,opacity,background-color,color] hover:bg-accent/70 hover:text-foreground data-[state=open]:ml-0 data-[state=open]:max-w-5 data-[state=open]:opacity-100`
group icon/tone (grouping/group-keys.ts, workspace-status.ts, workspace-status-icons.tsx):
  Pinned:  icon Pin,   tone 'text-foreground'
  All:     icon List,  tone 'text-foreground'
  Project: icon FolderTree, tone 'text-foreground'
  In progress: ConductorProgressIcon (12x12 svg: circle r=4.9 fill var(--background) stroke currentColor 1.45 + tick 'M6 3.75v2.7'), tone 'text-[#d4a300]'
  In review:   ConductorReviewIcon  (circle r=4.9 fill var(--background) stroke currentColor 1.45 + check 'M4.15 6.05 5.25 7.05 7.7 4.75'), tone 'text-[#16a34a]'
  Done:        ConductorDoneIcon    (circle r=5.1 fill currentColor + white check), tone 'text-[#c7a594]'
  Todo:        CircleDot, tone 'text-muted-foreground'
```

### Count pill (`WorktreeList.tsx@18bdef9ed0^:526-545`, still live in `rows/HostSectionHeader.tsx:13-32`)

Orca removed the pill from group headers in PR #4761 (Jun 2026) but the hero image and
host headers still use it; recipe verbatim:

```
outer: "inline-flex h-4 shrink-0 overflow-hidden rounded-full border border-worktree-sidebar-border bg-worktree-sidebar-accent text-[9px] font-medium leading-none text-muted-foreground/90"
inner: "inline-flex h-full min-w-4 items-center justify-center px-1.5"
placement: last child of the label's "flex min-w-0 items-center gap-1.5" row (after RepoForkIndicator/FolderPathStatusIndicator)
tooltip: `${count} workspace${count===1?'':'s'}` side="bottom" sideOffset={6}
```

### Host header (tier-1 sticky, `rows/HostSectionHeader.tsx:99-160`) — for completeness

```
wrapper "px-2 pt-1"; card "group/host-header flex h-8 w-full cursor-pointer items-center gap-2 rounded-md border px-2 text-left transition-all"
  healthy 'border-worktree-sidebar-border bg-worktree-sidebar-accent/70' | disconnected 'border-worktree-sidebar-border/70 bg-worktree-sidebar-accent/35 text-muted-foreground' | blocked 'border-destructive/40 bg-destructive/10'
label "min-w-0 truncate text-[12px] font-semibold leading-none"; detail "shrink-0 truncate text-[10px] leading-none"; chevron box "flex size-4 shrink-0 items-center justify-center text-muted-foreground/60 can-hover:opacity-0 transition-opacity group-hover/host-header:opacity-100"
sticky: 'sticky -top-px z-30 bg-worktree-sidebar'; HOST_STICKY_PINNED_HEIGHT = 36
```

## 5. List viewport (`viewport/VirtualizedWorktreeViewport.tsx:321-358`, `viewport/virtual-rows.ts`)

```
outer:  "relative min-h-0 flex-1"    (data-worktree-sidebar-container)
scroll: "worktree-sidebar-scrollbar h-full overflow-y-auto overflow-x-hidden pl-1 scrollbar-sleek outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset pt-px"  style overflowAnchor:'none'
inner:  "relative w-full" (height = virtualizer total)
item virtual row: "absolute left-0 right-0 top-0" (+ dragging: 'transition-transform duration-150 ease-out will-change-transform'); item wrapper (item-row.tsx:154-159): 'relative transition-[opacity,filter] duration-150 ease-out' (+ 'pointer-events-none opacity-0' when dragged) ; style.paddingLeft = surfaceInset px
constants (virtual-rows.ts:7-14):
  GROUP_HEADER_ROW_HEIGHT = 28
  HOST_HEADER_ROW_HEIGHT = 32
  WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP = 6      (virtualizer gap between EVERY row, incl. headers)
  SECONDARY_GROUP_HEADER_TOP_MARGIN = 4     ('pt-1' on non-first headers)
  IMPORTED_WORKTREES_LINE_ROW_HEIGHT = 36, PENDING_CREATION_ROW_HEIGHT = 56, FOLDER_WORKSPACE_ROW_HEIGHT = 64, card estimate 116
  WORKTREE_SIDEBAR_REVEAL_TOP_INSET = 28 + 6 = 34   (worktree-sidebar-reveal.ts:3-5)
```

### Consecutive collapsed group headers (spacing rule) — `virtual-rows.ts:52-61`

```
shouldUseHeaderTopSpacing = index !== firstHeaderIndex && !(previous row is the Pinned header)
```
Every header except the very first gets `pt-1` (4px) inside its measured row (28px → 32px)
**unless** the previous render row is the Pinned header (only possible when Pinned is
collapsed). Between any two rows the virtualizer adds 6px. So a stack of collapsed headers
reads: first header 28px, then per header 6 (gap) + 4 (pt-1) + 28 = 38px pitch; a header
directly under a collapsed Pinned header is 6 + 28 = 34px. When a header becomes the active
sticky header its `pt-1` is dropped so it pins flush (`-top-px`, or `top-[35px]` under a
pinned host card).

## 6. Card surface (`worktree-card-surface.tsx:119-156`) + states

```
body: 'relative flex cursor-pointer flex-col pr-1.5 transition-[background-color,border-color,opacity,box-shadow] duration-200 outline-none select-none'
  + titleOnlyCard ? 'py-2' : 'pt-1.25 pb-1.5'
  + flushSurface ? 'ml-1 w-[calc(100%-0.25rem)]' : 'ml-1'
  + 'rounded-lg'
  + isLineageDropTarget ? 'border border-accent-foreground/20 bg-accent/80'
    : isActiveSurface  ? 'border border-transparent'
    : isMultiSelected  ? 'border border-worktree-sidebar-ring/35 bg-worktree-sidebar-accent/70 ring-1 ring-worktree-sidebar-ring/30'
    :                    'border border-transparent worktree-sidebar-card-hover'
  + isActiveSurface && isMultiSelected && 'ring-1 ring-worktree-sidebar-ring/35'
  + revealHighlight && ['scroll-to-current-workspace-reveal-highlight', tone==='ai' && 'scroll-to-current-workspace-reveal-highlight--ai']
  + titleRenaming && '!border-transparent !bg-transparent !shadow-none !ring-0'
  + isDeleting && 'opacity-50 grayscale cursor-not-allowed'
  + isRuntimeDisconnected && !isDeleting && 'opacity-60'
attrs: data-worktree-card-surface="true"  data-worktree-card-active={isActiveSurface ? activeSurfaceVariant : undefined}   ('primary' | 'secondary')
style.paddingLeft (worktree-card-presentation.tsx:190-199, indentation.ts:186-197):
  flush: contentIndent > 0 ? `max(2px, calc(${contentIndent}px - ${4 + (statusLane ? 6 : 0)}px))` : '2px'
  non-flush: contentIndent > 0 ? `calc(0.125rem + ${contentIndent}px)` : none
deleting overlay: "absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/50 backdrop-blur-[1px]" > "inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-medium text-foreground shadow-sm border border-border/50" (+ LoaderCircle "size-3.5 animate-spin text-muted-foreground")
hover trigger body: "group/worktree-card w-full min-w-0"  data-worktree-card-hover-trigger=""
lineage children (new card style): "mt-1.5 space-y-1"  data-worktree-lineage-children=""
```

CSS states (`main.css:1202-1240`) — verbatim:

```css
.worktree-sidebar-card-hover:hover { background: color-mix(in srgb, var(--sidebar-foreground) 4%, transparent); }
.dark .worktree-sidebar-card-hover:hover { background: color-mix(in srgb, var(--sidebar-accent) 40%, transparent); }
[data-worktree-card-surface][data-worktree-card-active='primary'] {
  border-color: color-mix(in srgb, var(--worktree-sidebar-border) 40%, transparent);
  background: color-mix(in srgb, var(--worktree-sidebar-foreground) 8%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--worktree-sidebar-foreground) 4%, transparent);
}
.dark [data-worktree-card-surface][data-worktree-card-active='primary'] {
  border-color: color-mix(in srgb, var(--worktree-sidebar-foreground) 18%, var(--worktree-sidebar-border));
  background: color-mix(in srgb, var(--worktree-sidebar-foreground) 10%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--worktree-sidebar-foreground) 3%, transparent);
}
[data-worktree-card-surface][data-worktree-card-active='secondary'] {
  border-color: color-mix(in srgb, var(--sidebar-ring) 25%, transparent);
  background: color-mix(in srgb, var(--sidebar-accent) 45%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--sidebar-ring) 15%, transparent);
}
.dark [data-worktree-card-surface][data-worktree-card-active='secondary'] {
  border-color: color-mix(in srgb, var(--sidebar-ring) 28%, transparent);
  background: color-mix(in srgb, var(--sidebar-accent) 34%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--sidebar-ring) 18%, transparent);
}
```

Reveal glow (`main.css:1619-1673`): `.scroll-to-current-workspace-reveal-highlight { position:relative; isolation:isolate; overflow:visible }` with a `::before` 1.5px border `color-mix(in srgb, var(--terminal-pane-locate) 68%, transparent)`, ring `0 0 0 1px …34%` + `0 0 14px …36%`, animation `scroll-to-current-workspace-reveal-glow 1.5s ease-out forwards` (0%: opacity 1 scale .992 → 24%: .72/1 → 60%: .28/1.006 → 100%: 0/1.006); `--ai` variant swaps in `var(--ai-action-accent)`; reduced-motion: no animation, opacity 1. (`--terminal-pane-locate` = blue-600 light / blue-400 dark; `--ai-action-accent` = violet-500 / violet-400.)

## 7. Card parent content (`worktree-card-parent-content.tsx:35-82`)

```
row:    'flex w-full min-w-0 gap-0.5 pl-0' + (titleOnlyCard ? 'items-center' : 'items-start')   data-worktree-card-parent-content=""
        style.marginLeft = parentContentMarginLeft (≤0, from getNewCardStyleParentContentMarginLeft)
status lane: 'flex shrink-0 justify-center' + (newCardStyle ? 'mr-1 w-5 items-center' : 'items-start pt-[2px]') (+ affiliate 'px-1')   data-worktree-card-status-slot=""
  glyph slot (WorktreeCardStatusSlot.tsx): "inline-flex size-5 items-center justify-center" > <StatusIndicator/>
  StatusIndicator (StatusIndicator.tsx): box "inline-flex h-3 w-3 shrink-0 items-center justify-center"
     working  → <AgentWorkingSpinner className="size-2" />   (ring: 'agent-working-spinner block rounded-full border-2 border-yellow-500 border-t-transparent motion-reduce:border-t-yellow-500')
     permission → <AgentQuestionIcon className="size-3" />   (MessageCircleQuestion, 'text-agent-question' = orange-600 light / orange-500 dark)
     done|active → "block size-2 rounded-full bg-emerald-500" ; else "block size-2 rounded-full bg-neutral-500/40"
  unread overlay (new card): wrapper "relative inline-flex size-5 shrink-0 items-center justify-center", dot 'pointer-events-none absolute left-0 top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-sidebar'
  review/branch passive icons: "inline-flex size-5 items-center justify-center p-0.5" > icon 'size-[13px] translate-x-px' (+ 'text-muted-foreground/70' for GitBranch)
content column: 'flex min-w-0 flex-1 flex-col gap-1.5' + (showInlineAgentList || legacy lineage ? 'overflow-visible' : 'overflow-hidden')
```

## 8. Title row + micro badges (`worktree-card-header.tsx`, `WorktreeTitleInlineRename.tsx`, `ui/badge.tsx`)

```
title row:  "flex min-w-0 items-center justify-between gap-2"                          (header.tsx:98)
left group: "flex min-w-0 flex-1 items-center gap-1.5"                                 (header.tsx:99)
identity chip (RepoIdentityChip, header.tsx:30): "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-worktree-sidebar-border bg-worktree-sidebar-accent/55" > <RepoIconGlyph className="size-full" iconClassName="size-3" />; tooltip side="right" sideOffset={8}
title (WorktreeTitleInlineRename.tsx:381-395): 'block min-w-0 leading-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring' + 'truncate' + emphasis + className "text-[13px] leading-5"
  emphasis: unread 'font-semibold text-foreground' | dimReadTitle(newCardStyle) 'font-normal text-foreground/80' | 'font-normal text-foreground'
  editing (text mode): root 'relative grid min-w-0 truncate leading-tight text-foreground' (+ 'font-semibold'|'font-normal'); ghost 'invisible col-start-1 row-start-1 min-w-0 truncate whitespace-pre'; input 'col-start-1 row-start-1 min-w-0 select-text truncate text-foreground outline-none' + 'h-[1lh] rounded-none border-0 !border-transparent !bg-transparent p-0 !shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:!bg-transparent'; card gets '!border-transparent !bg-transparent !shadow-none !ring-0' while renaming
runtime host glyph: <Server className="size-3 text-muted-foreground" /> | <ServerOff className="size-3 text-destructive" />  in "shrink-0 inline-flex items-center"
rename-failed pill: Button ghost "h-4 shrink-0 gap-0.5 rounded !px-0.5 text-[10px] font-medium leading-none text-destructive border border-destructive/40 bg-destructive/10 hover:bg-destructive/15 hover:text-destructive has-[>svg]:!px-0.5" + AlertCircle "size-2.5"
primary badge (header.tsx:225): Badge variant="outline" className="h-[16px] px-1.5 text-[10px] font-medium rounded shrink-0 leading-none text-foreground/70 border-foreground/20 bg-foreground/[0.06]"
sparse badge  (header.tsx:245): Badge variant="outline" className="h-[16px] px-1.5 text-[10px] font-medium rounded shrink-0 leading-none text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/5"
  Badge base (badge.tsx:8): 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] … [&>svg]:size-3'; outline: 'border-border text-foreground'
  → resolved primary badge: "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border px-1.5 py-0.5 h-[16px] text-[10px] font-medium leading-none whitespace-nowrap text-foreground/70 border-foreground/20 bg-foreground/[0.06]"
compact primary star (header.tsx:274): <Star className="size-3 fill-amber-400 text-amber-400" />
title-row indicators (presentation.tsx:253): "ml-auto flex shrink-0 items-center gap-1 pr-1.5"
header actions (header.tsx:262): "ml-auto flex shrink-0 items-center justify-center gap-1 pr-1.5"
delete quick action (header.tsx:294-297): 'inline-flex size-4 items-center justify-center rounded bg-transparent opacity-0 transition-colors transition-opacity', 'group-hover/worktree-card:opacity-100 group-focus-within/worktree-card:opacity-100 focus-visible:opacity-100', 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive'; Trash2 "size-3.5"
```

## 9. Meta row + repo chip (`worktree-card-meta-row.tsx`, `repo/RepoBadgeLabel.tsx`, `truncated-sidebar-label.tsx`)

```
row:   "flex items-center gap-1.5 min-w-0"    data-worktree-card-meta-row=""             (meta-row.tsx:47)
left:  "flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"                        (meta-row.tsx:48)
repo chip (meta-row.tsx:50): "flex items-center gap-1.5 shrink-0 px-1.5 py-0.5 rounded-[4px] bg-accent border border-border dark:bg-accent/50 dark:border-border/60"
  mark (RepoBadgeMark): 'block size-1.5 shrink-0' style backgroundColor=repo.badgeColor
  text: "text-[10px] font-semibold text-foreground truncate max-w-[6rem] leading-none lowercase"
host badge (meta-row.tsx:59): Badge secondary "h-[16px] max-w-[7rem] shrink-0 rounded border border-border bg-accent px-1.5 text-[10px] font-medium leading-none text-muted-foreground dark:bg-accent/80 dark:border-border/50" > "truncate"
branch / identity (TruncatedSidebarLabel): 'block min-w-0 truncate' + "text-[11px] text-muted-foreground leading-none"; tooltip side right offset 8, content "max-w-80 whitespace-normal break-all text-left"
folder path (legacy): "min-w-0 truncate font-mono text-[11px] leading-none text-muted-foreground"
conflict badge: Badge outline "h-[16px] px-1.5 text-[10px] font-medium rounded shrink-0 gap-1 text-amber-600 border-amber-500/30 bg-amber-500/5 dark:text-amber-400 dark:border-amber-400/30 dark:bg-amber-400/5 leading-none" + GitMerge "size-2.5"
details/ports cluster: "ml-auto flex shrink-0 items-center gap-1 pr-1.5"
```

## 10. Secondary rows (`worktree-card-secondary-rows.tsx`)

```
remote branch conflict: "mt-0.5 flex items-start gap-1.5 rounded border border-amber-500/25 bg-amber-500/5 px-1.5 py-1 text-[10.5px] leading-snug text-amber-700 dark:text-amber-300" + AlertTriangle "mt-[1px] size-3 shrink-0"
agents list: <WorktreeCardAgents className={hasMetaRow || conflict ? 'mt-0' : '-mt-1'} />
lineage child chip: wrapper 'relative mt-1 flex min-w-0 justify-start' (+ legacy '-ml-1'), color: color-mix(in srgb, var(--muted-foreground) 42%, var(--worktree-sidebar));
  Button ghost xs "relative z-10 h-[18px] max-w-[8rem] gap-1 rounded-md border border-worktree-sidebar-border bg-worktree-sidebar px-1.5 text-[10px] font-medium leading-none text-muted-foreground shadow-none hover:bg-worktree-sidebar-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring" + Workflow "size-2.5" + ChevronDown 'size-2.5 transition-transform' (+ '-rotate-90')
legacy lineage children: "-ml-[1.125rem] mt-1.5 w-[calc(100%+1.125rem)] space-y-1"
```

## 11. Agent rows (`worktree-card-compact-agent-row.tsx`, `worktree-card-compact-agents.tsx`, `WorktreeCardAgents.tsx`, `AgentStateDot.tsx`, `AgentWorkingSpinner.tsx`)

```
compact list root (WorktreeCardAgents.tsx:366): 'flex flex-col mt-1 gap-0.5' + className   data-compact-agent-list="true"  role tree|group
  CSS: [data-compact-agent-list='true'] { margin-inline-start: -0.5rem; width: calc(100% + 0.5rem); }
row (compact-agent-row.tsx:250-259):
  'compact-agent-row group/compact-agent-row min-w-0 overflow-hidden cursor-pointer rounded-sm px-1 text-[11px] leading-none',
  'text-muted-foreground worktree-agent-row-hover',
  hasChildDisclosure && 'worktree-agent-lineage-parent-row',
  isLineageChild && 'worktree-agent-lineage-child-row',
  'flex h-6 items-center gap-1',
  isFocusedPane && 'bg-worktree-sidebar-accent',
  sending && 'cursor-progress opacity-75', disabled && 'cursor-default opacity-60'
  attrs: data-focused-agent-pane="true" | data-agent-send-target
disclosure button (row.tsx:169): "compact-agent-child-disclosure-button flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring" + ChevronRight 'size-3 transition-transform duration-150' (+ 'rotate-90'); gutter spacer "size-4 shrink-0"
state dot: <AgentStateDot state size="sm" />
identity icon: "inline-flex shrink-0" > <AgentIcon size={13} />
label (row.tsx:203-213): "min-w-0 flex-1 truncate" > primary (focused ? 'text-foreground' : 'text-muted-foreground/90') + secondary (focused ? 'text-foreground/70' : 'text-muted-foreground/65') rendered as `{' '}- {secondary}`
model chip (row.tsx:216-223): 'min-w-0 max-w-24 truncate font-mono text-[10px]' + (focused ? 'text-foreground/70' : 'text-muted-foreground/70')
+N (row.tsx:226-232): 'shrink-0 text-[10px] tabular-nums' + (focused ? 'text-foreground/70' : 'text-muted-foreground/70')
time (row.tsx:236-243): 'shrink-0 text-[10px] tabular-nums' + (focused ? 'text-foreground/70' : 'text-muted-foreground/60')   (formatShortTimeAgo: 'now' | Nm | Nh | Nd)
children indent: <CompactAgentExpansion> > "worktree-agent-lineage-children flex flex-col gap-0.5"
  CSS: .worktree-agent-lineage-children { margin-left: 0.75rem; padding-left: 0.25rem; border-left: 1px solid color-mix(in srgb, var(--sidebar-foreground) 22%, transparent) } .dark → color-mix(in srgb, var(--accent) 28%, transparent); inside compact list → 16% / 20%
expansion (compact-agents.tsx:53-70): 'compact-agent-expansion-grid' (+ '-expanded'), inner "min-h-0 overflow-hidden", content 'compact-agent-expansion-content flex flex-col gap-0.5 pt-0.5'
summary pill (compact-agents.tsx:104-115): 'compact-agent-summary-button group/agent-summary flex h-6 w-full min-w-0 items-center gap-1 rounded-sm', 'px-1 text-left text-[11px] leading-none text-muted-foreground', 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring', 'hover:bg-worktree-sidebar-accent/55 dark:hover:bg-worktree-sidebar-foreground/[0.035]', expanded ? 'compact-agent-summary-button-expanded' : 'border border-worktree-sidebar-border/70 bg-worktree-sidebar-accent/35'
  group cluster "inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-sm bg-worktree-sidebar/70 px-1 py-0.5"; avatars "inline-flex shrink-0 items-center -space-x-0.5 pl-0.5" > "inline-flex size-4 items-center justify-center rounded-full border border-worktree-sidebar-border/70 bg-worktree-sidebar"; chevron 'size-3 shrink-0 transition-transform duration-150' (+ '-rotate-90')
AgentStateDot (AgentStateDot.tsx:70-125): box md 'h-3 w-3' / sm 'h-2.5 w-2.5'; inner md 'size-2' / sm 'size-1.5'; icon md 'size-3' / sm 'size-2.5'
  wrapper always 'inline-flex shrink-0 items-center justify-center' + box
  working → <AgentWorkingSpinner className={inner} />
  done    → <CircleCheck className={cn('text-emerald-500', icon)} />
  permission|waiting → <AgentQuestionIcon className={icon} />   (MessageCircleQuestion text-agent-question)
  blocked|interrupted|failed → 'block rounded-full' + inner + 'bg-red-500' ; idle → 'bg-neutral-500/40'
AgentWorkingSpinner (AgentWorkingSpinner.tsx:36-47): 'agent-working-spinner block rounded-full border-2 border-yellow-500 border-t-transparent motion-reduce:border-t-yellow-500'
  CSS: @keyframes agent-spinner-rotate { to { transform: rotate(360deg) } } .agent-working-spinner { animation: agent-spinner-rotate 1s steps(12, end) infinite } reduced-motion → none
```

Agent-row CSS (`main.css:1243-1260, 1400-1464, 1489-1616`) — verbatim in the globals.css block:
`.worktree-agent-row-hover:hover` 1.25% sidebar-foreground (dark: 18% accent);
`[data-focused-agent-pane='true']` `color-mix(in srgb, var(--sidebar-foreground) 12%, var(--sidebar-accent))` (dark: 70% accent);
lineage parent/child row fills, `.worktree-agent-lineage-children` border-left, expansion grid
(`grid-template-rows: 0fr → 1fr`, 180ms cubic-bezier(0.16,1,0.3,1)), reveal keyframes
(`compact-agent-expansion-reveal` opacity 0/translateY(-2px) → 1/0), summary panel padding 2px, and the
`[data-compact-agent-list='true']` overrides that flatten row cards inside the worktree card.

## 12. Footer toolbar (`SidebarToolbar.tsx:71-124`, `SidebarSettingsHelpMenu.tsx`, `ScrollToCurrentWorkspaceToolbarButton.tsx`)

```
outer: "mt-auto shrink-0"
bar:   "flex items-center justify-between border-t border-worktree-sidebar-border px-2 py-1.5"
left:  "flex min-w-0 items-center gap-1"   → SidebarSettingsHelpMenu: "flex items-center gap-1" > Settings, CircleHelp
right: "flex items-center gap-1"           → Crosshair (reveal active), Kanban (board; variant 'secondary' when open, else 'ghost')
button: <Button variant="ghost" size="icon-xs" type="button" className="text-muted-foreground"> icon "size-3.5"
tooltips: side="top" sideOffset={4}; help menu DropdownMenuContent side="top" align="start" sideOffset={8} className="w-52"
```

## 13. Scrollbar (`main.css:504-591`)

`.scrollbar-sleek` (12px track, thumb `color-mix(in srgb, var(--muted-foreground, #737373) 28%, transparent)` with 3px transparent border, radius 0, min-height 28px; hover 48%, active `color-mix(in srgb, var(--foreground, #171717) 36%, transparent)`).
`.worktree-sidebar-scrollbar` (padding-right 4px; `scrollbar-color: transparent transparent`; `::-webkit-scrollbar { width: 8px }`; thumb transparent with `border-width: 3px 0 3px 0`), revealed on `.scrollbar-sleek-parent:hover` / self hover (28% / hover 48% / active 36% fg).

## 14. Vertical rhythm table (top → bottom, resolved px)

| Element | Classes | Resolved |
|---|---|---|
| Sidebar top padding | nav list `pt-2` | 8px |
| Nav row | `px-2 py-1.5 text-[13px]` (line-height inherits 1.5 → 19.5px) | ≈31.5px tall, 8px horizontal pad |
| Nav row gap | list `gap-0.5` | 2px (33.5px pitch) |
| Search field | `h-7`, gap-0.5 above | 28px, 2px above |
| Nav list bottom pad | `pb-1` | 4px |
| Workspaces header | `mt-2 h-8` | 8px margin + 32px |
| Header label | `pl-2 text-xs font-semibold text-muted-foreground/80` | 12px text, x = 8 + 8 = 16px |
| Header buttons | `icon-xs` `gap-1.5` | 24px squares, 6px apart |
| List viewport | `pl-1 pt-px` + scrollbar `padding-right: 4px` | 4px left, 1px top, 4px right |
| First section header | `h-7` | 28px (no top spacer) |
| Later section headers | `pt-1` + `h-7` | 4 + 28 = 32px (row) |
| Header padding-left | 10px (`WORKTREE_SECTION_HEADER_PADDING_LEFT`) / 10 + depth×10 for project groups | 10px |
| Header icon box | `size-4 rounded-[4px]`, glyph `size-3` | 16px box, 12px glyph, `gap-1.5` (6px) to label |
| Header label | `text-[13px] font-semibold leading-none` | 13px |
| Count pill | `h-4 min-w-4 px-1.5 text-[9px]` | 16px tall, 6px pad, `gap-1.5` after label |
| Chevron | `size-5` box, `size-3.5` icon, cluster `right-1` | 20px box, 14px icon, hover-reveal |
| Inter-row gap (all rows) | virtualizer `gap: 6` | 6px |
| Card outer inset | `ml-1 w-[calc(100%-0.25rem)]` + 1px border | 4px left, 1px border |
| Card padding | `pt-1.25 pb-1.5 pr-1.5` (title-only `py-2`) | top 5 / bottom 6 / right 6 (title-only 8/8) |
| Card padding-left | flush: `max(2px, calc(indent - 10px))`; ungrouped indent 0 → 2px; status/PR grouped indent 20 → 10px; project-grouped depth d → 20 + 18d − 10 | 2px / 10px |
| Status lane | `mr-1 w-5` → glyph box `size-5` → `h-3 w-3` → 8px dot / `size-2` ring | 20px lane + 4px gap; 8px dot |
| Content column gap | `gap-1.5` | 6px between title / meta / agents |
| Title row | `text-[13px] leading-5` | 20px line |
| Micro badge | `h-[16px] px-1.5 text-[10px] rounded` | 16px, 4px radius |
| Identity chip | `size-4 rounded-[4px]` icon `size-3` | 16px |
| Meta row | `text-[11px] leading-none` (branch), repo chip `py-0.5 text-[10px] leading-none` | 11px line; chip 14px |
| Agent list | `mt-1 gap-0.5` (mt-0 when meta row exists, -mt-1 without) outdented `-0.5rem` | 24px rows, 2px apart |
| Agent row | `h-6 px-1 gap-1 text-[11px] leading-none rounded-sm` | 24px, 4px pad |
| Agent children indent | `margin-left: 0.75rem; padding-left: 0.25rem; border-left: 1px` | 12 + 1 + 4 = 17px |
| Card total (title+meta+1 agent) | 5+20+6+11+6+24+6+2 | ≈80px |
| Card total (title+meta) | 5+20+6+11+6+2 | ≈50px |
| Card total (title only) | 8+20+8+2 | ≈38px |
| Footer toolbar | `border-t px-2 py-1.5` + `icon-xs` | 1 + 6 + 24 + 6 = 37px |
| Indent ladder (indentation.ts) | `SIDEBAR_TREE_INDENT = 18`, `PROJECT_WORKTREE_CARD_EXTRA_INDENT = 2`, `FLUSH_CARD_CONTENT_PULLBACK = 4`, `NEW_CARD_STYLE_STATUS_LANE_EXTRA_PULLBACK = 6`, `FLUSH_CARD_MIN_CONTENT_INSET = 2`, `WORKTREE_CARD_SURFACE_MARGIN = 4`, `GROUPED_WORKTREE_CARD_SURFACE_INDENT = 14` (per group depth), `PROJECT_GROUP_HEADER_BASE_PADDING = 10`, `PROJECT_GROUP_HEADER_INDENT = 10`, `MAX_PROJECT_GROUP_HEADER_DEPTH = 6`, `LINEAGE_IMMEDIATE_PARENT_STEP = 20`, `LINEAGE_CHILDREN_INLINE_OFFSET = 14` | |

## 15. Color token table (`main.css` `:root` / `.dark`)

| Token | Light | Dark |
|---|---|---|
| `--background` / `--foreground` | `#fff` / `#0a0a0a` | `#0a0a0a` / `#fafafa` |
| `--card` | `#fff` | `#171717` |
| `--primary` / `--primary-foreground` | `#171717` / `#fafafa` | `#e5e5e5` / `#171717` |
| `--secondary` / `--muted` | `#f5f5f5` | `#262626` |
| `--muted-foreground` | `#737373` | `#a1a1a1` |
| `--accent` / `--accent-foreground` | `#f5f5f5` / `#171717` | `#404040` / `#fafafa` |
| `--destructive` | `#e40014` | `#ff6568` |
| `--border` / `--input` | `#e5e5e5` | `rgb(255 255 255 / 0.07)` / `rgb(255 255 255 / 0.15)` |
| `--ring` | `#a1a1a1` | `#737373` |
| `--worktree-sidebar` | `#f5f5f5` | `#2a2a2a` (Hive keeps `#1a1a1a` by user choice) |
| `--worktree-sidebar-foreground` | `#0a0a0a` | `#fafafa` |
| `--worktree-sidebar-accent` | `#eaeaea` | `#353535` (Hive keeps `#262626`) |
| `--worktree-sidebar-accent-foreground` | `#171717` | `#fafafa` |
| `--worktree-sidebar-border` | `#e5e5e5` | `rgb(255 255 255 / 0.07)` |
| `--worktree-sidebar-ring` | `#a1a1a1` | `#737373` |
| `--sidebar` / `--sidebar-foreground` | `#fafafa` / `#0a0a0a` | `#171717` / `#fafafa` (Hive: fg `#737373` / `#a1a1a1`) |
| `--sidebar-accent` / `--sidebar-accent-foreground` | `#f5f5f5` / `#171717` | `#262626` / `#fafafa` |
| `--sidebar-border` | `#e5e5e5` | `rgb(255 255 255 / 0.07)` |
| `--sidebar-ring` | `#a1a1a1` | `#525252` |
| `--agent-question` / `--agent-question-text` | orange-600 / orange-700 | orange-500 / orange-300 |
| `--terminal-pane-locate` (reveal glow) | blue-600 | blue-400 |
| `--ai-action-accent` | violet-500 | violet-400 |
| `--workspace-status-done/review/progress` | `#c7a594` / `#16a34a` / `#d4a300` | same |
| working ring / done dot / blocked / idle | `yellow-500` / `emerald-500` / `red-500` / `neutral-500/40` | same |
| unread lane dot | `amber-500` (ring-2 ring-sidebar) | same |

Custom left-sidebar appearance (`lib/left-sidebar-appearance.ts:47-55`) derives
`accent = color-mix(in srgb, fg 9%, bg)`, `border = … 7% …`, `ring = … 44% …` — informative only.
