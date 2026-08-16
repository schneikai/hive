import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import { SessionTabs } from '../../src/renderer/src/components/sessions/SessionTabs'
import { resetRendererRpcClientForTests, setRendererRpcClient } from '@/api/rpc-client'
import { BOARD_TAB_ID, useSessionStore } from '@/stores/useSessionStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useFileViewerStore } from '@/stores/useFileViewerStore'
import { useKanbanStore } from '@/stores/useKanbanStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useWorktreeStore } from '@/stores/useWorktreeStore'

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick
  }: {
    children: ReactNode
    onClick?: () => void | Promise<void>
  }) => (
    <button type="button" onClick={() => void onClick?.()}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />
}))

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/components/kanban/TicketCreateModal', () => ({
  TicketCreateModal: () => null
}))

vi.mock('@/components/kanban/ImportTicketsModal', () => ({
  ImportTicketsModal: () => null
}))

vi.mock('@/components/kanban/JiraImportModal', () => ({
  JiraImportModal: () => null
}))

vi.mock('@/components/kanban/HiveImportModal', () => ({
  HiveImportModal: () => null
}))

// Mutable settings state so individual tests can flip the org policy on/off.
let mockSettings: Record<string, unknown> = {}

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector(mockSettings),
    {
      getState: () => mockSettings
    }
  )
}))

function baseSettings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    autoStartSession: false,
    availableAgentSdks: { opencode: true, claude: false, codex: false },
    boardMode: 'sticky-tab',
    defaultAgentSdk: 'opencode',
    selectedModel: null,
    hiveAuthToken: null,
    hiveOrganizationId: null,
    hiveOrganizationForceBoardMode: false,
    ...overrides
  }
}

function forcedBoardModeSettings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return baseSettings({
    hiveAuthToken: 'token-1',
    hiveOrganizationId: 'org-1',
    hiveOrganizationForceBoardMode: true,
    ...overrides
  })
}

function setupStores(): void {
  setRendererRpcClient({
    request: vi.fn(() => Promise.resolve(undefined)),
    subscribe: vi.fn()
  })

  useConnectionStore.setState({
    selectedConnectionId: null,
    connections: []
  })
  useFileViewerStore.setState({
    openFiles: new Map(),
    activeFilePath: null,
    activeDiff: null
  })
  useKanbanStore.setState({
    isBoardViewActive: false
  })
  useProjectStore.setState({
    projects: [
      {
        id: 'project-1',
        name: 'Hive',
        path: '/repo/hive',
        description: null,
        tags: null,
        language: null,
        custom_icon: null,
        detected_icon: null,
        setup_script: null,
        run_script: null,
        archive_script: null,
        auto_assign_port: false,
        sort_order: 0,
        created_at: '2026-05-29T00:00:00.000Z',
        last_accessed_at: '2026-05-29T00:00:00.000Z'
      }
    ]
  })
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
  useSessionStore.setState({
    activeSessionId: BOARD_TAB_ID,
    activeWorktreeId: 'worktree-1',
    activeSessionByWorktree: { 'worktree-1': BOARD_TAB_ID },
    activePinnedSessionId: null,
    inlineConnectionSessionId: null,
    orphanedSessions: new Set(),
    pinnedSessionIds: new Set(),
    sessionsByWorktree: new Map(),
    tabOrderByWorktree: new Map(),
    sessionsByConnection: new Map(),
    tabOrderByConnection: new Map(),
    loadSessions: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue({ success: true })
  })
}

describe('SessionTabs under org Force board mode', () => {
  beforeEach(() => {
    mockSettings = baseSettings()
    setupStores()
  })

  afterEach(() => {
    resetRendererRpcClientForTests()
    vi.clearAllMocks()
  })

  test('shows the new-session + button when the policy is off', () => {
    render(<SessionTabs />)

    expect(screen.getByTestId('create-session')).toBeInTheDocument()
  })

  test('hides the new-session + button when the policy is on', () => {
    mockSettings = forcedBoardModeSettings()

    render(<SessionTabs />)

    expect(screen.queryByTestId('create-session')).not.toBeInTheDocument()
  })

  test('keeps the ticket-create + button in toggle-mode board view when the policy is on', () => {
    mockSettings = forcedBoardModeSettings({ boardMode: 'toggle' })
    useKanbanStore.setState({ isBoardViewActive: true })

    render(<SessionTabs />)

    expect(screen.queryByTestId('create-session')).not.toBeInTheDocument()
    expect(screen.getByTestId('kanban-add-ticket-btn')).toBeInTheDocument()
  })

  test('does not honor a stale forced flag after logging out of the organization', () => {
    mockSettings = forcedBoardModeSettings({ hiveAuthToken: null, hiveOrganizationId: null })

    render(<SessionTabs />)

    expect(screen.getByTestId('create-session')).toBeInTheDocument()
  })

  test('suppresses auto-start of a first session when the policy is on', async () => {
    mockSettings = forcedBoardModeSettings({ autoStartSession: true })
    const createSession = vi.fn().mockResolvedValue({ success: true })
    const loadSessions = vi.fn().mockResolvedValue(undefined)
    useSessionStore.setState({ createSession, loadSessions })

    render(<SessionTabs />)

    await waitFor(() => {
      expect(loadSessions).toHaveBeenCalled()
    })
    expect(createSession).not.toHaveBeenCalled()
  })

  test('still auto-starts a first session when the policy is off', async () => {
    mockSettings = baseSettings({ autoStartSession: true })
    const createSession = vi.fn().mockResolvedValue({ success: true })
    const loadSessions = vi.fn().mockResolvedValue(undefined)
    useSessionStore.setState({ createSession, loadSessions })

    render(<SessionTabs />)

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith('worktree-1', 'project-1', undefined, undefined, {
        autoFocus: false
      })
    })
  })

  function enterConnectionMode(): {
    loadConnectionSessions: ReturnType<typeof vi.fn>
    createConnectionSession: ReturnType<typeof vi.fn>
  } {
    const loadConnectionSessions = vi.fn().mockResolvedValue(undefined)
    const createConnectionSession = vi.fn().mockResolvedValue({ success: true })
    useWorktreeStore.setState({ selectedWorktreeId: null })
    useConnectionStore.setState({
      selectedConnectionId: 'connection-1',
      connections: [
        {
          id: 'connection-1',
          name: 'Connection 1',
          created_at: '2026-05-29T00:00:00.000Z',
          members: []
        }
      ]
    })
    useSessionStore.setState({
      activeWorktreeId: null,
      activeConnectionId: 'connection-1',
      setActiveConnection: vi.fn(),
      loadConnectionSessions,
      createConnectionSession
    })
    return { loadConnectionSessions, createConnectionSession }
  }

  test('suppresses auto-start of a first connection session when the policy is on', async () => {
    mockSettings = forcedBoardModeSettings({ autoStartSession: true })
    const { loadConnectionSessions, createConnectionSession } = enterConnectionMode()

    render(<SessionTabs />)

    await waitFor(() => {
      expect(loadConnectionSessions).toHaveBeenCalledWith('connection-1')
    })
    expect(createConnectionSession).not.toHaveBeenCalled()
  })

  test('still auto-starts a first connection session when the policy is off', async () => {
    mockSettings = baseSettings({ autoStartSession: true })
    const { createConnectionSession } = enterConnectionMode()

    render(<SessionTabs />)

    await waitFor(() => {
      expect(createConnectionSession).toHaveBeenCalledWith('connection-1')
    })
  })
})
