import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { resetRendererRpcClientForTests, setRendererRpcClient } from '../../../api/rpc-client'
import { usePRNotificationStore } from '@/stores/usePRNotificationStore'
import { useWorktreeStore } from '@/stores/useWorktreeStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useGitStore } from '@/stores/useGitStore'
import { CreatePRModal } from '../CreatePRModal'

vi.mock('@/lib/pr-pipeline', () => ({
  runCreatePRPipeline: vi.fn().mockResolvedValue(undefined)
}))

let request: ReturnType<typeof vi.fn>

function mockResponses(spec: { hasUncommitted?: boolean; files?: unknown[] }): void {
  request.mockImplementation((method: string) => {
    switch (method) {
      case 'gitOps.hasUncommittedChanges':
        return Promise.resolve(spec.hasUncommitted ?? false)
      case 'gitOps.getRangeDiff':
        return Promise.resolve({
          commitSummary: '',
          diffSummary: '',
          diffPatch: '',
          commitCount: 1
        })
      case 'gitOps.getBranchInfo':
        return Promise.resolve({
          success: true,
          branch: { name: 'feat', tracking: null, ahead: 0, behind: 0 }
        })
      case 'gitOps.getFileStatuses':
        return Promise.resolve({ success: true, files: spec.files ?? [] })
      case 'gitOps.listBranchesWithStatus':
        return Promise.resolve({
          success: true,
          branches: [{ name: 'origin/main', isRemote: true }]
        })
      case 'gitOps.commit':
        return Promise.resolve({ success: true, commitHash: 'abcdef1234' })
      default:
        return Promise.resolve([])
    }
  })
}

describe('CreatePRModal Cmd+Enter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request = vi.fn().mockResolvedValue([])
    setRendererRpcClient({ request, subscribe: vi.fn() })
    useWorktreeStore.setState({
      worktreesByProject: new Map([
        [
          'proj-a',
          [
            { id: 'wt-default', path: '/proj/a', branch_name: 'main', is_default: true },
            { id: 'wt-a', path: '/repo/a', branch_name: 'feat', is_default: false }
          ]
        ]
      ])
    } as never)
    useProjectStore.setState({ projects: [{ id: 'proj-a', path: '/proj/a' }] } as never)
    useGitStore.setState({
      fileStatusesByWorktree: new Map(),
      branchInfoByWorktree: new Map(),
      prTargetBranch: new Map(),
      reviewTargetBranch: new Map(),
      isCommitting: false,
      createPRModalOpen: true
    })
    usePRNotificationStore.setState({ notifications: [] })
  })

  afterEach(() => {
    resetRendererRpcClientForTests()
  })

  it('creates the PR from the form phase with Cmd+Enter', async () => {
    mockResponses({})

    render(<CreatePRModal worktreeId="wt-a" worktreePath="/repo/a" />)

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create pull request/i })).toBeEnabled()
    })

    fireEvent.keyDown(dialog, { key: 'Enter', metaKey: true })

    await waitFor(() => {
      expect(useGitStore.getState().createPRModalOpen).toBe(false)
    })
    expect(useGitStore.getState().prTargetBranch.get('wt-a')).toBe('origin/main')
  })

  it('commits from the commit phase with Cmd+Enter and advances to the form', async () => {
    mockResponses({ hasUncommitted: true })
    // Seed staged files directly — loadFileStatuses is TTL-cached across tests
    useGitStore.setState({
      fileStatusesByWorktree: new Map([
        ['/repo/a', [{ path: '/repo/a/x.ts', relativePath: 'x.ts', status: 'M', staged: true }]]
      ])
    } as never)

    render(<CreatePRModal worktreeId="wt-a" worktreePath="/repo/a" />)

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /commit & continue/i })).toBeInTheDocument()
    })

    // Empty summary → Cmd+Enter is a no-op
    fireEvent.keyDown(dialog, { key: 'Enter', metaKey: true })
    expect(request).not.toHaveBeenCalledWith('gitOps.commit', expect.anything())

    fireEvent.change(screen.getByPlaceholderText(/summary/i), { target: { value: 'Fix thing' } })
    fireEvent.keyDown(dialog, { key: 'Enter', metaKey: true })

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        'gitOps.commit',
        expect.objectContaining({ worktreePath: '/repo/a', message: 'Fix thing' })
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create pull request/i })).toBeInTheDocument()
    })
    expect(useGitStore.getState().createPRModalOpen).toBe(true)
  })
})
