import { beforeEach, describe, expect, test, vi } from 'vitest'
import { XtermBackend } from '../../src/renderer/src/components/terminal/backends/XtermBackend'

const mocks = vi.hoisted(() => ({
  write: vi.fn(),
  create: vi.fn(),
  onData: vi.fn(),
  onExit: vi.fn(),
  resize: vi.fn(),
  dataCallback: undefined as ((data: string) => void) | undefined,
  exitCallback: undefined as ((code: number) => void) | undefined
}))

vi.mock('@/api/terminal-api', () => ({
  terminalApi: {
    write: mocks.write,
    create: mocks.create,
    onData: mocks.onData,
    onExit: mocks.onExit,
    resize: mocks.resize,
    logClientDiagnostics: vi.fn()
  }
}))

vi.mock('@/api/project-api', () => ({
  projectApi: {
    openPath: vi.fn().mockResolvedValue({ success: true }),
    readFromClipboard: vi.fn().mockResolvedValue('')
  }
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: class MockTerminal {
    options: Record<string, unknown> = {}

    attachCustomKeyEventHandler(): void {}
    loadAddon(): void {}
    open(): void {}
    write(): void {}
    input(): void {}
    clear(): void {}
    hasSelection(): boolean {
      return false
    }
    getSelection(): string {
      return ''
    }
    clearSelection(): void {}
    focus(): void {}
    dispose(): void {}
    onData(): { dispose: () => void } {
      return { dispose: vi.fn() }
    }
  }
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class MockFitAddon {
    fit(): void {}
    proposeDimensions(): { cols: number; rows: number } {
      return { cols: 80, rows: 24 }
    }
  }
}))

vi.mock('@xterm/addon-search', () => ({
  SearchAddon: class MockSearchAddon {
    clearDecorations(): void {}
    findNext(): void {}
    findPrevious(): void {}
  }
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: class MockWebLinksAddon {}
}))

vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: class MockWebglAddon {
    onContextLoss(): void {}
    dispose(): void {}
  }
}))

class MockResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

function mountBackend(onStatusChange: ReturnType<typeof vi.fn>): XtermBackend {
  const backend = new XtermBackend()
  const container = document.createElement('div')
  backend.mount(container, { terminalId: 'session-1', cwd: '/tmp/project' }, { onStatusChange })
  return backend
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('XtermBackend status after out-of-band PTY respawn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.dataCallback = undefined
    mocks.exitCallback = undefined
    mocks.create.mockResolvedValue({ success: true })
    mocks.onData.mockImplementation((_id: string, cb: (data: string) => void) => {
      mocks.dataCallback = cb
      return vi.fn()
    })
    mocks.onExit.mockImplementation((_id: string, cb: (code: number) => void) => {
      mocks.exitCallback = cb
      return vi.fn()
    })
    mocks.resize.mockResolvedValue({ success: true })

    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: MockResizeObserver
    })
  })

  test('reports running again when data arrives after exit (bridge respawned the PTY)', async () => {
    const onStatusChange = vi.fn()
    mountBackend(onStatusChange)
    await flushMicrotasks()
    expect(onStatusChange).toHaveBeenCalledWith('running', undefined)

    // PTY dies (ticket done-close, crash, modal-release destroy...)
    mocks.exitCallback?.(0)
    expect(onStatusChange).toHaveBeenCalledWith('exited', 0)

    // A followup prompt respawns the PTY through createClaudeCliTerminal in
    // the main process — no status callback fires, but output starts flowing.
    onStatusChange.mockClear()
    mocks.dataCallback?.('claude booting...')

    expect(onStatusChange).toHaveBeenCalledWith('running', undefined)
  })

  test('does not re-report running for data while already running', async () => {
    const onStatusChange = vi.fn()
    mountBackend(onStatusChange)
    await flushMicrotasks()

    onStatusChange.mockClear()
    mocks.dataCallback?.('regular output')
    mocks.dataCallback?.('more output')

    expect(onStatusChange).not.toHaveBeenCalled()
  })

  test('recovers even when the initial create failed and a later respawn delivers data', async () => {
    mocks.create.mockResolvedValue({ success: false, error: 'spawn failed' })
    const onStatusChange = vi.fn()
    mountBackend(onStatusChange)
    await flushMicrotasks()
    expect(onStatusChange).toHaveBeenCalledWith('exited', undefined)

    onStatusChange.mockClear()
    mocks.dataCallback?.('respawned output')

    expect(onStatusChange).toHaveBeenCalledWith('running', undefined)
  })
})
