import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useKanbanStore } from './useKanbanStore'

const moveTicketMock = vi.fn().mockResolvedValue(undefined)

describe('completeDoneMove — connection merge queue', () => {
  beforeEach(() => {
    moveTicketMock.mockClear()
    useKanbanStore.setState({
      moveTicket: moveTicketMock,
      pendingDoneMove: {
        ticketId: 'ticket-1',
        projectId: 'proj-a',
        sortOrder: 5,
        targetColumn: 'merged',
        worktreeId: 'wt-a',
        worktreeProjectId: 'proj-a',
        remainingWorktrees: [
          { worktreeId: 'wt-b', projectId: 'proj-b' },
          { worktreeId: 'wt-c', projectId: 'proj-c' }
        ]
      }
    })
  })

  it('advances to the next member worktree without moving the ticket', async () => {
    await useKanbanStore.getState().completeDoneMove()

    expect(moveTicketMock).not.toHaveBeenCalled()
    expect(useKanbanStore.getState().pendingDoneMove).toEqual({
      ticketId: 'ticket-1',
      projectId: 'proj-a',
      sortOrder: 5,
      targetColumn: 'merged',
      worktreeId: 'wt-b',
      worktreeProjectId: 'proj-b',
      remainingWorktrees: [{ worktreeId: 'wt-c', projectId: 'proj-c' }]
    })
  })

  it('moves the ticket only after the last worktree completes', async () => {
    await useKanbanStore.getState().completeDoneMove() // wt-a → wt-b
    await useKanbanStore.getState().completeDoneMove() // wt-b → wt-c
    expect(moveTicketMock).not.toHaveBeenCalled()

    await useKanbanStore.getState().completeDoneMove() // wt-c done → move
    expect(moveTicketMock).toHaveBeenCalledExactlyOnceWith('ticket-1', 'proj-a', 'merged', 5)
    expect(useKanbanStore.getState().pendingDoneMove).toBeNull()
  })

  it('clearPendingDoneMove cancels the whole queue', () => {
    useKanbanStore.getState().clearPendingDoneMove()
    expect(useKanbanStore.getState().pendingDoneMove).toBeNull()
    expect(moveTicketMock).not.toHaveBeenCalled()
  })

  it('moves the ticket directly when no queue is present (single-project flow)', async () => {
    useKanbanStore.setState({
      pendingDoneMove: {
        ticketId: 'ticket-2',
        projectId: 'proj-x',
        sortOrder: 1,
        targetColumn: 'done'
      }
    })

    await useKanbanStore.getState().completeDoneMove()
    expect(moveTicketMock).toHaveBeenCalledExactlyOnceWith('ticket-2', 'proj-x', 'done', 1)
    expect(useKanbanStore.getState().pendingDoneMove).toBeNull()
  })
})
