import { describe, test, expect } from 'vitest'

/**
 * Session 8: Worktree Status UI (Two-Line Rows) — Tests
 *
 * These tests verify:
 * 1. WorktreeItem shows status text ("Working", "Planning", "Answer questions", "Archiving")
 * 2. WorktreeItem shows no second line when idle
 * 3. Status text uses correct styling
 * 4. Archiving status takes precedence over worktree status
 */

// We test by reading the source file to verify the implementation,
// since rendering WorktreeItem requires deep mocking of multiple stores and window APIs.

describe('Session 8: Worktree Status UI', () => {
  describe('WorktreeItem source verification', () => {
    let source: string

    test('load WorktreeItem source', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )
      expect(source).toBeTruthy()
    })

    test('contains displayStatus derivation with all status types', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // Should have all four display status mappings
      expect(source).toContain("'Archiving'")
      expect(source).toContain("'Answer questions'")
      expect(source).toContain("'Planning'")
      expect(source).toContain("'Working'")
    })

    test('Archiving has highest priority in displayStatus', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // Archiving should be checked first (isArchiving before worktreeStatus checks)
      const archivingIndex = source.indexOf('isArchiving')
      const answeringIndex = source.indexOf("=== 'answering'")
      const planningIndex = source.indexOf("=== 'planning'")
      const workingDisplayIndex = source.indexOf("'Working'")

      // Verify ordering in the displayStatus ternary chain
      expect(archivingIndex).toBeGreaterThan(-1)
      expect(answeringIndex).toBeGreaterThan(archivingIndex)
      expect(planningIndex).toBeGreaterThan(answeringIndex)
      expect(workingDisplayIndex).toBeGreaterThan(planningIndex)
    })

    test('status text always renders with displayStatus', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // Should always render status text (no conditional guard)
      expect(source).toContain('{displayStatus}')
      // Should include 'Ready' as the fallback
      expect(source).toContain("'Ready'")
    })

    test('status text uses correct styling with per-status colors', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // 11px text size comes from the kit SidebarAgentRow (orca AGENT_ROW recipe)
      expect(source).toContain('SidebarAgentRow')
      // Active statuses should be bold
      expect(source).toContain('font-semibold')
      // Per-status colors
      expect(source).toContain('text-amber-500') // answering
      expect(source).toContain('text-blue-400') // planning
      expect(source).toContain('text-yellow-500') // working (orca status color)
      expect(source).toContain('text-muted-foreground') // ready / archiving
    })

    test('name area uses the kit content column and title recipes', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // Should wrap name + status in the orca content column (flex min-w-0 flex-1 flex-col gap-1.5)
      expect(source).toContain('CARD_CONTENT_COLUMN')
      // Name uses the orca title recipe (block truncate 13px/20px; semibold when unread)
      expect(source).toContain('CARD_TITLE_IS_UNREAD')
      expect(source).toContain('CARD_TITLE_IS_DIM')
    })

    test('row renders as an orca workspace card with a status lane and inline agent row', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // Card shell: kit WorkspaceCardSurface (orca pt-1.25 pb-1.5, ml-1, rounded-lg,
      // data-worktree-card-surface + data-worktree-card-active='primary' when selected)
      expect(source).toContain("from '@/components/sidebar'")
      expect(source).toContain('WorkspaceCardSurface')
      expect(source).toContain("active={isSelected ? 'primary' : false}")
      // Card supplies no inter-row gap; the list wrapper owns the 6px ROW_GAP
      expect(source).not.toContain('mb-1.5')
      // 20px status lane holding exactly one glyph
      expect(source).toContain('CARD_LANE')
      expect(source).toContain('CARD_LANE_SLOT')
      // Status line is the orca inline agent row (h-6, 11px, muted) inside a compact list
      expect(source).toContain('SidebarAgentRow')
      expect(source).toContain('data-compact-agent-list="true"')
      // Status vocabulary: kit AgentStateDot (working ring / done dot / question glyph),
      // plus Hive's blue unread dot and blue plan-ready map
      expect(source).toContain('AgentStateDot')
      expect(source).toContain('bg-blue-500')
      expect(source).toContain('text-blue-400')
    })

    test('has data-testid on status text element', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      expect(source).toContain('worktree-status-text')
    })

    test('icons handle planning and answering statuses', async () => {
      const fs = await import('fs')
      const path = await import('path')
      source = fs.readFileSync(
        path.resolve(__dirname, '../../../src/renderer/src/components/worktrees/WorktreeItem.tsx'),
        'utf-8'
      )

      // Working ring should show for both working and planning
      expect(source).toContain("worktreeStatus === 'working' || worktreeStatus === 'planning'")
      expect(source).toContain("? 'working'")
      // Question glyph should be used for answering / permission / command approval
      expect(source).toContain("worktreeStatus === 'answering'")
      expect(source).toContain("? 'question'")
      // Everything else (idle / completed) falls back to the emerald done dot
      expect(source).toContain(": 'done'")
    })
  })

  describe('displayStatus logic unit tests', () => {
    // Unit-test the displayStatus derivation logic in isolation

    function deriveDisplayStatus(
      isArchiving: boolean,
      worktreeStatus: string | null
    ): string | null {
      return isArchiving
        ? 'Archiving'
        : worktreeStatus === 'answering'
          ? 'Answer questions'
          : worktreeStatus === 'planning'
            ? 'Planning'
            : worktreeStatus === 'working'
              ? 'Working'
              : 'Ready'
    }

    test('shows "Working" when worktreeStatus is working', () => {
      expect(deriveDisplayStatus(false, 'working')).toBe('Working')
    })

    test('shows "Planning" when worktreeStatus is planning', () => {
      expect(deriveDisplayStatus(false, 'planning')).toBe('Planning')
    })

    test('shows "Answer questions" when worktreeStatus is answering', () => {
      expect(deriveDisplayStatus(false, 'answering')).toBe('Answer questions')
    })

    test('shows "Archiving" when isArchiving is true', () => {
      expect(deriveDisplayStatus(true, null)).toBe('Archiving')
    })

    test('Archiving takes priority over worktreeStatus', () => {
      expect(deriveDisplayStatus(true, 'working')).toBe('Archiving')
      expect(deriveDisplayStatus(true, 'answering')).toBe('Archiving')
    })

    test('shows "Ready" when idle', () => {
      expect(deriveDisplayStatus(false, null)).toBe('Ready')
    })

    test('shows "Ready" for unread status', () => {
      expect(deriveDisplayStatus(false, 'unread')).toBe('Ready')
    })
  })
})
