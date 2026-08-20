/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn()
}))
vi.mock('../../../src/main/services/claude-sdk-loader', () => ({
  loadClaudeSDK: vi.fn().mockResolvedValue({ query: mockQuery })
}))

vi.mock('../../../src/main/services/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}))

vi.mock('../../../src/main/services/agent-event-bus', () => ({
  agentEventBus: { publish: vi.fn() }
}))

vi.mock('../../../src/main/desktop/backend-event-publisher', () => ({
  publishDesktopBackendEvent: vi.fn()
}))

import { ClaudeCodeImplementer } from '../../../src/main/services/claude-code-implementer'
import { agentEventBus } from '../../../src/main/services/agent-event-bus'

/**
 * Query stub whose output stream stays open until endStream() is called, so a
 * test can keep feeding messages after a `result` the way the CLI does while
 * background subagents are still running.
 */
function createOpenQueryIterator() {
  const pending: Array<Record<string, unknown>> = []
  let deliver: (() => void) | null = null
  let ended = false

  const iterator = {
    interrupt: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    async next(): Promise<IteratorResult<Record<string, unknown>>> {
      while (pending.length === 0 && !ended) {
        await new Promise<void>((resolve) => {
          deliver = resolve
        })
      }
      if (pending.length > 0) return { done: false, value: pending.shift()! }
      return { done: true, value: undefined }
    },
    return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
    [Symbol.asyncIterator]() {
      return iterator
    }
  }

  return {
    iterator,
    emit(message: Record<string, unknown>) {
      pending.push(message)
      deliver?.()
      deliver = null
    },
    endStream() {
      ended = true
      deliver?.()
      deliver = null
    }
  }
}

/** Reads the prompt AsyncIterable the implementer handed to sdk.query(). */
function readPromptInput() {
  const prompt = mockQuery.mock.calls[0][0].prompt as AsyncIterable<Record<string, unknown>>
  const iterator = prompt[Symbol.asyncIterator]()
  let closed = false
  const first = iterator.next()
  const drained = first
    .then(() => iterator.next())
    .then(() => {
      closed = true
    })
  return { first, isClosed: () => closed, drained }
}

const backgroundTasks = (...ids: string[]) => ({
  type: 'system',
  subtype: 'background_tasks_changed',
  session_id: 'sdk-1',
  tasks: ids.map((id) => ({ task_id: id }))
})

const result = () => ({ type: 'result', subtype: 'success', session_id: 'sdk-1', result: 'done' })

/** The CLI announcing a follow-up turn it queued while the last one ran. */
const followUpTurn = () => ({ type: 'system', subtype: 'init', session_id: 'sdk-1', tools: [] })

/** stdin closes a moment after the result, so give the grace period room. */
const expectClosed = (input: { isClosed: () => boolean }) =>
  vi.waitFor(() => expect(input.isClosed()).toBe(true), { timeout: 5000, interval: 25 })

const publishedEvents = (): Array<Record<string, any>> =>
  (agentEventBus.publish as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0])

describe('ClaudeCodeImplementer – prompt stdin lifetime', () => {
  let impl: ClaudeCodeImplementer

  beforeEach(() => {
    vi.clearAllMocks()
    impl = new ClaudeCodeImplementer()
  })

  it('sends the prompt as an AsyncIterable, never as a plain string', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'hello there')

    const prompt = mockQuery.mock.calls[0][0].prompt
    expect(typeof prompt).not.toBe('string')

    const { first } = readPromptInput()
    expect((await first).value).toMatchObject({
      type: 'user',
      parent_tool_use_id: null,
      message: { role: 'user', content: [{ type: 'text', text: 'hello there' }] }
    })

    stream.endStream()
  })

  it('closes stdin on a result that leaves no background work', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'hi')
    const input = readPromptInput()

    stream.emit(result())
    await expectClosed(input)

    stream.endStream()
  })

  it('keeps stdin open when the CLI starts a follow-up turn after the result', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'hi')
    const input = readPromptInput()

    // A background task finished mid-turn, so the set is already empty here.
    stream.emit(result())
    stream.emit(followUpTurn())

    await new Promise((resolve) => setTimeout(resolve, 2500))
    expect(input.isClosed()).toBe(false)

    stream.emit(result())
    await expectClosed(input)

    stream.endStream()
  })

  it('keeps stdin open while background work runs, and closes on the result after it ends', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'launch a background agent')
    const input = readPromptInput()

    stream.emit(backgroundTasks('task-1'))
    stream.emit(result())
    await vi.waitFor(() => {
      expect((impl as any).getSession('/proj', 'sdk-1')?.liveBackgroundTasks.size).toBe(1)
    })
    expect(input.isClosed()).toBe(false)

    // The background agent finishes and wakes the CLI for one more turn.
    stream.emit(backgroundTasks())
    stream.emit(result())
    await expectClosed(input)

    stream.endStream()
  })

  it('reports background work as gone when the turn is torn down with work still live', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'launch a background agent')
    readPromptInput()

    stream.emit(backgroundTasks('task-1'))
    await vi.waitFor(() => {
      expect((impl as any).getSession('/proj', 'sdk-1')?.liveBackgroundTasks.size).toBe(1)
    })

    // Stop kills the CLI process, so nothing it reported is running any more.
    // Without a terminal zero the renderer keeps the indicator and the kanban
    // badges forever: the store only drops the entry on all-zero counts.
    await impl.abort('/proj', 'sdk-1')

    const last = publishedEvents()
      .filter((e) => e.type === 'session.background_work')
      .pop()
    expect(last.data).toEqual({
      runningSubagents: 0,
      runningShells: 0,
      runningMonitors: 0
    })
    expect((impl as any).getSession('/proj', 'sdk-1')?.liveBackgroundTasks.size).toBe(0)

    stream.endStream()
  })

  it('does not let a retired turn report idle over the prompt that replaced it', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const first = createOpenQueryIterator()
    mockQuery.mockReturnValue(first.iterator)

    await impl.prompt('/proj', sessionId, 'launch a background agent')
    first.emit(backgroundTasks('task-1'))
    first.emit(result())
    await vi.waitFor(() => {
      expect((impl as any).getSession('/proj', 'sdk-1')?.liveBackgroundTasks.size).toBe(1)
    })

    // Ownership has to change hands before the old stream is torn down. If it
    // does not, the retired finisher wakes from the interrupt still owning the
    // session and reports idle over the turn that is starting. Record what the
    // session held at the moment of teardown, which is when the finisher wakes.
    const session = (impl as any).getSession('/proj', 'sdk-1')
    const retiredController = session.abortController
    let stillOwnedAtTeardown: boolean | null = null
    first.iterator.return = vi.fn(async () => {
      stillOwnedAtTeardown = session.abortController === retiredController
      return { done: true, value: undefined }
    })

    const second = createOpenQueryIterator()
    mockQuery.mockReturnValue(second.iterator)
    await impl.prompt('/proj', 'sdk-1', 'a new prompt while it runs')
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(stillOwnedAtTeardown).toBe(false)
    expect(retiredController.signal.aborted).toBe(true)

    const statuses = publishedEvents()
      .filter((e) => e.type === 'session.status')
      .map((e) => e.statusPayload?.type)
    expect(statuses[statuses.length - 1]).toBe('busy')

    first.endStream()
    second.endStream()
  })

  it('reports live background work to the renderer, split by kind', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'launch a background agent')
    const input = readPromptInput()

    stream.emit({
      type: 'system',
      subtype: 'background_tasks_changed',
      session_id: 'sdk-1',
      tasks: [
        { task_id: 'agent-1', task_type: 'local_agent' },
        { task_id: 'shell-1', task_type: 'local_bash' }
      ]
    })

    await vi.waitFor(() => {
      expect(
        publishedEvents().find((event) => event.type === 'session.background_work')
      ).toBeDefined()
    })

    const event = publishedEvents().find((e) => e.type === 'session.background_work')!
    expect(event.sessionId).toBe('hive-1')
    expect(event.data).toEqual({
      runningSubagents: 1,
      runningShells: 1,
      runningMonitors: 0
    })

    // Draining reports zeros, which is what clears the renderer's indicator.
    stream.emit(backgroundTasks())
    await vi.waitFor(() => {
      const all = publishedEvents().filter((e) => e.type === 'session.background_work')
      expect(all[all.length - 1].data).toEqual({
        runningSubagents: 0,
        runningShells: 0,
        runningMonitors: 0
      })
    })

    stream.emit(result())
    await expectClosed(input)
    stream.endStream()
  })

  it('stays silent for CLI builds that never report background work', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'hi')
    const input = readPromptInput()

    stream.emit(result())
    await expectClosed(input)

    expect(publishedEvents().some((e) => e.type === 'session.background_work')).toBe(false)

    stream.endStream()
  })

  it('closes stdin when the session is aborted mid background work', async () => {
    const { sessionId } = await impl.connect('/proj', 'hive-1')
    const stream = createOpenQueryIterator()
    mockQuery.mockReturnValue(stream.iterator)

    await impl.prompt('/proj', sessionId, 'hi')
    const input = readPromptInput()

    stream.emit(backgroundTasks('task-1'))
    stream.emit(result())
    await vi.waitFor(() => {
      expect((impl as any).getSession('/proj', 'sdk-1')?.liveBackgroundTasks.size).toBe(1)
    })
    expect(input.isClosed()).toBe(false)

    await impl.abort('/proj', 'sdk-1')
    await expectClosed(input)

    stream.endStream()
  })
})
