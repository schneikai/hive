import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ForceUpdateModal } from '@/components/update/ForceUpdateModal'
import { useForceUpdateStore } from '@/stores/useForceUpdateStore'
import { useUpdateStore } from '@/stores/useUpdateStore'

const checkForUpdateMock = vi.fn(() => Promise.resolve())
const downloadUpdateMock = vi.fn(() => Promise.resolve())
const installUpdateMock = vi.fn(() => Promise.resolve())

vi.mock('@/api/updater-api', () => ({
  updaterApi: {
    checkForUpdate: (options?: { manual?: boolean }): Promise<void> => checkForUpdateMock(options),
    downloadUpdate: (): Promise<void> => downloadUpdateMock(),
    installUpdate: (): Promise<void> => installUpdateMock()
  }
}))

const mockSettings: Record<string, unknown> = { hiveOrganizationName: 'Acme' }

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => (selector ? selector(mockSettings) : mockSettings),
    {
      getState: () => mockSettings
    }
  )
}))

function openModal(overrides: Partial<ReturnType<typeof useForceUpdateStore.getState>> = {}): void {
  useForceUpdateStore.setState({
    currentVersion: '1.0.0',
    modalOpen: true,
    modalOpenedAt: Date.now(),
    requiredVersion: '2.0.0',
    snoozeCount: 0,
    snoozedUntil: null,
    lastCheckAt: null,
    ...overrides
  })
}

describe('ForceUpdateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useForceUpdateStore.setState({
      currentVersion: '1.0.0',
      modalOpen: false,
      modalOpenedAt: null,
      requiredVersion: null,
      snoozeCount: 0,
      snoozedUntil: null,
      lastCheckAt: null
    })
    useUpdateStore.setState({
      status: 'idle',
      version: null,
      percent: 0,
      downloadFailed: false,
      dismissedVersion: null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing while enforcement is not active', () => {
    render(<ForceUpdateModal />)
    expect(screen.queryByTestId('force-update-modal')).not.toBeInTheDocument()
  })

  it('shows the org requirement and auto-checks for an update when none is known', () => {
    openModal()
    render(<ForceUpdateModal />)
    expect(screen.getByTestId('force-update-modal')).toBeInTheDocument()
    expect(screen.getByText(/Acme requires Hive 2\.0\.0 or newer/)).toBeInTheDocument()
    expect(screen.getByText(/currently on 1\.0\.0/)).toBeInTheDocument()
    expect(checkForUpdateMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('force-update-primary')).toBeDisabled()
    expect(screen.getByTestId('force-update-primary')).toHaveTextContent('Checking…')
  })

  it('snooze is instantly available before any snooze and hides the modal for 2 minutes', () => {
    openModal()
    render(<ForceUpdateModal />)
    const snooze = screen.getByTestId('force-update-snooze')
    expect(snooze).toBeEnabled()
    fireEvent.click(snooze)
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(false)
    expect(state.snoozeCount).toBe(1)
    expect(state.snoozedUntil).toBeGreaterThan(Date.now())
  })

  it('after one snooze the button reopens locked for 10s, counting down', () => {
    vi.useFakeTimers()
    openModal({ snoozeCount: 1, modalOpenedAt: Date.now() })
    render(<ForceUpdateModal />)
    const snooze = screen.getByTestId('force-update-snooze')
    expect(snooze).toBeDisabled()
    expect(snooze).toHaveTextContent('Snooze (10s)')

    act(() => {
      vi.advanceTimersByTime(10_500)
    })
    expect(screen.getByTestId('force-update-snooze')).toBeEnabled()
    expect(screen.getByTestId('force-update-snooze')).toHaveTextContent('Snooze')
  })

  it('locks snooze for the full 2 minutes once the backoff is pinned', () => {
    vi.useFakeTimers()
    openModal({ snoozeCount: 9, modalOpenedAt: Date.now() })
    render(<ForceUpdateModal />)
    expect(screen.getByTestId('force-update-snooze')).toBeDisabled()
    expect(screen.getByTestId('force-update-snooze')).toHaveTextContent('Snooze (120s)')
  })

  it('offers the download when an update is available and starts it on click', () => {
    useUpdateStore.setState({ status: 'available', version: '2.1.0' })
    openModal()
    render(<ForceUpdateModal />)
    expect(checkForUpdateMock).not.toHaveBeenCalled()
    const primary = screen.getByTestId('force-update-primary')
    expect(primary).toHaveTextContent('Download update')
    fireEvent.click(primary)
    expect(downloadUpdateMock).toHaveBeenCalledTimes(1)
    expect(useUpdateStore.getState().status).toBe('downloading')
  })

  it('shows download progress and installs once downloaded', () => {
    useUpdateStore.setState({ status: 'downloading', percent: 40 })
    openModal()
    render(<ForceUpdateModal />)
    expect(screen.getByTestId('force-update-primary')).toBeDisabled()
    expect(screen.getByTestId('force-update-primary')).toHaveTextContent('Downloading… 40%')
    expect(screen.getByTestId('force-update-progress-fill')).toBeInTheDocument()

    act(() => {
      useUpdateStore.getState().setDownloaded('2.1.0')
    })
    const primary = screen.getByTestId('force-update-primary')
    expect(primary).toHaveTextContent('Restart to update')
    fireEvent.click(primary)
    expect(installUpdateMock).toHaveBeenCalledTimes(1)
  })
})
