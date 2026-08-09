import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdatePill } from '@/components/layout/UpdatePill'
import { useUpdateStore } from '@/stores/useUpdateStore'
import { updaterApi } from '@/api/updater-api'

vi.mock('@/api/updater-api', () => ({
  updaterApi: {
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('@/lib/toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('UpdatePill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUpdateStore.setState({
      status: 'idle',
      version: null,
      percent: 0,
      downloadFailed: false,
      dismissedVersion: null
    })
  })

  it('renders nothing while no update is known', () => {
    render(<UpdatePill />)
    expect(screen.queryByTestId('update-pill')).not.toBeInTheDocument()
  })

  it('shows the available state and starts the download on click', async () => {
    render(<UpdatePill />)
    act(() => {
      useUpdateStore.getState().setAvailable('1.3.0')
    })

    expect(screen.getByText('Update available')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('update-pill-action'))

    expect(updaterApi.downloadUpdate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Downloading')).toBeInTheDocument()
    expect(screen.getByTestId('update-pill-action')).toBeDisabled()
  })

  it('shows download progress inside the pill', () => {
    render(<UpdatePill />)
    act(() => {
      useUpdateStore.getState().setAvailable('1.3.0')
      useUpdateStore.getState().startDownload()
      useUpdateStore.getState().setProgress(42.4)
    })

    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByTestId('update-pill-progress-fill').style.width).toBe('42.4%')
  })

  it('clamps the progress fill and label at 100%', () => {
    render(<UpdatePill />)
    act(() => {
      useUpdateStore.getState().setAvailable('1.3.0')
      useUpdateStore.getState().startDownload()
      useUpdateStore.getState().setProgress(150)
    })

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByTestId('update-pill-progress-fill').style.width).toBe('100%')
  })

  it('switches to restart and installs on click once downloaded', async () => {
    render(<UpdatePill />)
    act(() => {
      useUpdateStore.getState().setDownloaded('1.3.0')
    })

    expect(screen.getByText('Restart to update')).toBeInTheDocument()
    expect(screen.queryByTestId('update-pill-dismiss')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('update-pill-action'))

    expect(updaterApi.installUpdate).toHaveBeenCalledTimes(1)
  })

  it('hides for the session when dismissed', async () => {
    render(<UpdatePill />)
    act(() => {
      useUpdateStore.getState().setAvailable('1.3.0')
    })

    await userEvent.click(screen.getByTestId('update-pill-dismiss'))

    expect(screen.queryByTestId('update-pill')).not.toBeInTheDocument()
  })
})
