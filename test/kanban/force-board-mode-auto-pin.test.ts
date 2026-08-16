import { beforeEach, describe, expect, it, vi } from 'vitest'
import { autoPinBaseWorktree } from '@/lib/auto-pin'
import { isForceBoardMode } from '@/api/hive-enterprise/client'

let mockSettings: Record<string, unknown> = {}

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => (selector ? selector(mockSettings) : mockSettings),
    {
      getState: () => mockSettings
    }
  )
}))

const mockPinWorktree = vi.fn().mockResolvedValue(undefined)
const mockIsWorktreePinned = vi.fn().mockReturnValue(false)

vi.mock('@/stores/usePinnedStore', () => ({
  usePinnedStore: {
    getState: () => ({
      pinWorktree: mockPinWorktree,
      isWorktreePinned: mockIsWorktreePinned
    })
  }
}))

const mockGetDefaultWorktree = vi.fn()

vi.mock('@/stores/useWorktreeStore', () => ({
  useWorktreeStore: {
    getState: () => ({
      getDefaultWorktree: mockGetDefaultWorktree,
      loadWorktrees: vi.fn().mockResolvedValue(undefined)
    })
  }
}))

describe('isForceBoardMode', () => {
  it('is false unless logged in to an org with the policy enabled', () => {
    const enabled = {
      hiveAuthToken: 'token-1',
      hiveOrganizationId: 'org-1',
      hiveOrganizationForceBoardMode: true
    }
    expect(isForceBoardMode(enabled)).toBe(true)
    expect(isForceBoardMode({ ...enabled, hiveAuthToken: null })).toBe(false)
    expect(isForceBoardMode({ ...enabled, hiveOrganizationId: null })).toBe(false)
    expect(isForceBoardMode({ ...enabled, hiveOrganizationForceBoardMode: false })).toBe(false)
  })
})

describe('autoPinBaseWorktree under org Force board mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsWorktreePinned.mockReturnValue(false)
    mockGetDefaultWorktree.mockReturnValue({ id: 'base-worktree-1' })
    mockSettings = {
      autoPinBaseWorktreeOnBoardPrompt: false,
      hiveAuthToken: null,
      hiveOrganizationId: null,
      hiveOrganizationForceBoardMode: false
    }
  })

  it('does not pin when the local setting is off and the policy is off', async () => {
    await autoPinBaseWorktree('project-1')

    expect(mockPinWorktree).not.toHaveBeenCalled()
  })

  it('pins even with the local setting off when the policy is on', async () => {
    mockSettings = {
      autoPinBaseWorktreeOnBoardPrompt: false,
      hiveAuthToken: 'token-1',
      hiveOrganizationId: 'org-1',
      hiveOrganizationForceBoardMode: true
    }

    await autoPinBaseWorktree('project-1')

    expect(mockPinWorktree).toHaveBeenCalledWith('base-worktree-1')
  })

  it('still pins from the local setting alone', async () => {
    mockSettings = {
      autoPinBaseWorktreeOnBoardPrompt: true,
      hiveAuthToken: null,
      hiveOrganizationId: null,
      hiveOrganizationForceBoardMode: false
    }

    await autoPinBaseWorktree('project-1')

    expect(mockPinWorktree).toHaveBeenCalledWith('base-worktree-1')
  })
})
