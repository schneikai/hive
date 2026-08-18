import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TicketCreateModal } from './TicketCreateModal'
import { useProjectStore } from '@/stores/useProjectStore'
import { usePinnedStore } from '@/stores/usePinnedStore'
import { useKanbanStore } from '@/stores/useKanbanStore'
import type { Project } from '@shared/types/project'

vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const now = '2026-01-01T00:00:00.000Z'
const makeProject = (id: string, name: string): Project => ({
  id,
  name,
  path: `/tmp/${id}`,
  description: null,
  tags: null,
  language: 'typescript',
  custom_icon: null,
  detected_icon: null,
  setup_script: null,
  run_script: null,
  archive_script: null,
  worktree_create_script: null,
  custom_commands: null,
  auto_assign_port: false,
  sort_order: 0,
  created_at: now,
  last_accessed_at: now
})

const getSelect = (): HTMLSelectElement =>
  screen.getByTestId('ticket-create-modal').querySelector('select') as HTMLSelectElement

describe('TicketCreateModal pinned board default project', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [makeProject('project-1', 'Alpha'), makeProject('project-2', 'Beta')]
    })
    usePinnedStore.setState({ pinnedProjectIds: new Set(['project-1', 'project-2']) })
    useKanbanStore.setState({ pinnedBoardLastCreateProjectId: null })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useProjectStore.setState({ projects: [] })
    usePinnedStore.setState({ pinnedProjectIds: new Set() })
    useKanbanStore.setState({ pinnedBoardLastCreateProjectId: null })
  })

  it('defaults to the first pinned project when nothing was created before', () => {
    render(<TicketCreateModal open onOpenChange={() => {}} projectId="" isPinnedMode />)
    expect(getSelect().value).toBe('project-1')
  })

  it('defaults to the project used for the last created ticket', () => {
    useKanbanStore.setState({ pinnedBoardLastCreateProjectId: 'project-2' })
    render(<TicketCreateModal open onOpenChange={() => {}} projectId="" isPinnedMode />)
    expect(getSelect().value).toBe('project-2')
  })

  it('falls back to the first project when the remembered one is no longer pinned', () => {
    useKanbanStore.setState({ pinnedBoardLastCreateProjectId: 'project-gone' })
    render(<TicketCreateModal open onOpenChange={() => {}} projectId="" isPinnedMode />)
    expect(getSelect().value).toBe('project-1')
  })

  it('remembers the selected project after a successful create', async () => {
    const createTicket = vi.fn().mockResolvedValue({ id: 't1' })
    useKanbanStore.setState({ createTicket } as never)
    render(<TicketCreateModal open onOpenChange={() => {}} projectId="" isPinnedMode />)

    fireEvent.change(getSelect(), { target: { value: 'project-2' } })
    fireEvent.change(screen.getByTestId('ticket-title-input'), { target: { value: 'New' } })
    fireEvent.click(screen.getByTestId('ticket-create-btn'))

    await waitFor(() => expect(createTicket).toHaveBeenCalled())
    expect(createTicket.mock.calls[0][0]).toBe('project-2')
    expect(useKanbanStore.getState().pinnedBoardLastCreateProjectId).toBe('project-2')
  })
})
