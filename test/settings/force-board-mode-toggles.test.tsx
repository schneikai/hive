import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdateSetting = vi.fn()
let mockSettingsState: Record<string, unknown> = {}

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      return selector ? selector(mockSettingsState) : mockSettingsState
    },
    {
      getState: () => mockSettingsState
    }
  )
}))

vi.mock('@/stores/useThemeStore', () => ({
  useThemeStore: () => ({ setTheme: vi.fn() })
}))

vi.mock('@/stores/useShortcutStore', () => ({
  useShortcutStore: () => ({ resetToDefaults: vi.fn() })
}))

vi.mock('@/lib/themes', () => ({
  DEFAULT_THEME_ID: 'default'
}))

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

function baseState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    autoStartSession: true,
    autoPullBeforeWorktree: true,
    boardMode: 'sticky-tab',
    followUpTriggerColumn: 'done',
    autoPinBaseWorktreeOnBoardPrompt: false,
    automaticallyCreateTicket: false,
    showMergedColumn: false,
    vimModeEnabled: false,
    keepAwakeEnabled: false,
    mergeConflictMode: 'always-ask',
    tipsEnabled: true,
    warnBeforeQuitting: true,
    breedType: 'dogs',
    showModelIcons: false,
    showModelProvider: false,
    usageIndicatorMode: 'current-agent',
    usageIndicatorProviders: [],
    defaultAgentSdk: 'opencode',
    availableAgentSdks: null,
    stripAtMentions: true,
    hiveAuthToken: null,
    hiveOrganizationId: null,
    hiveOrganizationForceBoardMode: false,
    updateSetting: mockUpdateSetting,
    resetToDefaults: vi.fn(),
    ...overrides
  }
}

describe('SettingsGeneral under org Force board mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettingsState = baseState()
  })

  it('keeps both toggles interactive when the policy is off', async () => {
    const { SettingsGeneral } = await import('@/components/settings/SettingsGeneral')
    render(<SettingsGeneral />)

    const autoStart = screen.getByTestId('auto-start-session-toggle')
    const autoPin = screen.getByTestId('auto-pin-base-worktree-toggle')

    expect(autoStart).toHaveAttribute('aria-checked', 'true')
    expect(autoStart).not.toBeDisabled()
    expect(autoPin).toHaveAttribute('aria-checked', 'false')
    expect(autoPin).not.toBeDisabled()

    await userEvent.click(autoPin)
    expect(mockUpdateSetting).toHaveBeenCalledWith('autoPinBaseWorktreeOnBoardPrompt', true)
  })

  it('locks auto-start off and auto-pin on when the policy is on', async () => {
    mockSettingsState = baseState({
      hiveAuthToken: 'token-1',
      hiveOrganizationId: 'org-1',
      hiveOrganizationForceBoardMode: true
    })
    const { SettingsGeneral } = await import('@/components/settings/SettingsGeneral')
    render(<SettingsGeneral />)

    const autoStart = screen.getByTestId('auto-start-session-toggle')
    const autoPin = screen.getByTestId('auto-pin-base-worktree-toggle')

    expect(autoStart).toHaveAttribute('aria-checked', 'false')
    expect(autoStart).toBeDisabled()
    expect(autoPin).toHaveAttribute('aria-checked', 'true')
    expect(autoPin).toBeDisabled()

    expect(screen.getByText('Disabled by your organization (Force board mode)')).toBeInTheDocument()
    expect(screen.getByText('Enabled by your organization (Force board mode)')).toBeInTheDocument()

    await userEvent.click(autoStart)
    await userEvent.click(autoPin)
    expect(mockUpdateSetting).not.toHaveBeenCalled()
  })
})
