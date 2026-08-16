import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@/api/settings-api', () => ({
  settingsApi: {
    onSettingsUpdated: vi.fn(() => vi.fn())
  }
}))

vi.mock('@/api/db-api', () => ({
  dbApi: {
    setting: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined)
    }
  }
}))

vi.mock('@/api/pet-api', () => ({
  petApi: {
    updateSettings: vi.fn().mockResolvedValue(undefined)
  }
}))

const onNewSessionShortcut = vi.fn(() => vi.fn())

vi.mock('@/api/system-api', () => ({
  systemApi: {
    onNewSessionShortcut: (listener: () => void) => onNewSessionShortcut(listener),
    onFileSearchShortcut: vi.fn(() => vi.fn()),
    onCloseSessionShortcut: vi.fn(() => vi.fn()),
    onMenuAction: vi.fn(() => vi.fn()),
    updateMenuState: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

import { useKeyboardShortcuts } from '../../src/renderer/src/hooks/useKeyboardShortcuts'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWorktreeStore } from '@/stores/useWorktreeStore'
import { toast } from '@/lib/toast'
import {
  resetRendererRpcClientForTests,
  setRendererRpcClient
} from '../../src/renderer/src/api/rpc-client'

function ShortcutHarness(): React.JSX.Element {
  useKeyboardShortcuts()
  return <div>shortcut-harness</div>
}

describe('new-session shortcut under org Force board mode', () => {
  let createSession: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    setRendererRpcClient({
      request: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockReturnValue(() => {})
    })

    createSession = vi.fn().mockResolvedValue({ success: true })
    useSessionStore.setState({ createSession })
    useWorktreeStore.setState({
      selectedWorktreeId: 'worktree-1',
      worktreesByProject: new Map([
        [
          'project-1',
          [
            {
              id: 'worktree-1',
              project_id: 'project-1',
              name: 'main',
              branch_name: 'main',
              path: '/repo/hive',
              status: 'active',
              is_default: true,
              branch_renamed: 0,
              last_message_at: null,
              session_titles: '[]',
              last_model_provider_id: null,
              last_model_id: null,
              last_model_variant: null,
              created_at: '2026-05-29T00:00:00.000Z',
              last_accessed_at: '2026-05-29T00:00:00.000Z',
              github_pr_number: null,
              github_pr_url: null
            }
          ]
        ]
      ])
    })
  })

  afterEach(() => {
    resetRendererRpcClientForTests()
  })

  function fireMenuNewSessionShortcut(): void {
    render(<ShortcutHarness />)
    expect(onNewSessionShortcut).toHaveBeenCalled()
    const listener = onNewSessionShortcut.mock.calls[0][0] as unknown as () => void
    listener()
  }

  test('blocks the Cmd+T / File-menu new-session shortcut with an explanation when the policy is on', () => {
    useSettingsStore.setState({
      hiveAuthToken: 'token-1',
      hiveOrganizationId: 'org-1',
      hiveOrganizationForceBoardMode: true
    })

    fireMenuNewSessionShortcut()

    expect(toast.error).toHaveBeenCalledWith(
      'Your organization requires sessions to be started from a board ticket'
    )
    expect(createSession).not.toHaveBeenCalled()
  })

  test('creates a session through the shortcut when the policy is off', () => {
    useSettingsStore.setState({
      hiveAuthToken: null,
      hiveOrganizationId: null,
      hiveOrganizationForceBoardMode: false
    })

    fireMenuNewSessionShortcut()

    expect(createSession).toHaveBeenCalledWith('worktree-1', 'project-1')
  })

  // Source-level check (same style as the phase suites for useCommands): the
  // palette command list is memoized, so the New Session command must be gated
  // at execution too, not just via isVisible.
  test('command palette New Session is gated at both visibility and execution', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/renderer/src/hooks/useCommands.ts'),
      'utf-8'
    )
    const start = source.indexOf("id: 'action:new-session'")
    const end = source.indexOf("id: 'action:close-session'")
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const command = source.slice(start, end)
    expect(command).toContain('isVisible: () => !isForceBoardMode(useSettingsStore.getState())')
    expect(command).toContain(
      "toast.error('Your organization requires sessions to be started from a board ticket')"
    )
  })
})
