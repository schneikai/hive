import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { ptyService } from '../pty-service'

const nodePtyMocks = vi.hoisted(() => ({
  spawn: vi.fn()
}))

vi.mock('node-pty', () => ({
  spawn: nodePtyMocks.spawn
}))

vi.mock('../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

function makeFakePty(pid = 4242): Record<string, unknown> {
  return {
    pid,
    cols: 80,
    rows: 24,
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn()
  }
}

function spawnedEnv(): Record<string, string> {
  const call = nodePtyMocks.spawn.mock.calls.at(-1)
  return call?.[2].env as Record<string, string>
}

describe('ptyService.create spawn environment', () => {
  const savedEnv: Record<string, string | undefined> = {}
  const touchedKeys = ['COLUMNS', 'LINES', 'TERM', 'COLORTERM'] as const
  let nextId = 0

  beforeEach(() => {
    for (const key of touchedKeys) savedEnv[key] = process.env[key]
    nodePtyMocks.spawn.mockImplementation(() => makeFakePty())
  })

  afterEach(() => {
    for (const key of touchedKeys) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
    vi.clearAllMocks()
  })

  function create(opts: Record<string, unknown> = {}): void {
    ptyService.create(`pty-env-test-${nextId++}`, { cwd: '/tmp', ...opts })
  }

  it('strips COLUMNS and LINES inherited from the login shell env', () => {
    process.env.COLUMNS = '80'
    process.env.LINES = '24'

    create()

    expect(spawnedEnv().COLUMNS).toBeUndefined()
    expect(spawnedEnv().LINES).toBeUndefined()
  })

  it('forces TERM and COLORTERM regardless of the inherited values', () => {
    process.env.TERM = 'dumb'
    process.env.COLORTERM = ''

    create()

    expect(spawnedEnv().TERM).toBe('xterm-256color')
    expect(spawnedEnv().COLORTERM).toBe('truecolor')
  })

  it('keeps explicit caller env overrides, including COLUMNS', () => {
    process.env.COLUMNS = '80'

    create({ env: { COLUMNS: '120', HIVE_TEST_VAR: 'yes' } })

    expect(spawnedEnv().COLUMNS).toBe('120')
    expect(spawnedEnv().HIVE_TEST_VAR).toBe('yes')
  })
})

type KillFn = (pid: number, signal?: string | number) => true

describe('ptyService.destroy kill escalation', () => {
  const PID = 4242
  let killSpy: MockInstance<KillFn>
  let groupMembersSpy: MockInstance<(pgid: number) => Promise<Set<number>>>
  let nextId = 0

  function createAndGetPty(): { kill: ReturnType<typeof vi.fn> } {
    const id = `pty-escalation-test-${nextId++}`
    ptyService.create(id, { cwd: '/tmp' })
    const fakePty = nodePtyMocks.spawn.mock.results.at(-1)?.value as {
      kill: ReturnType<typeof vi.fn>
    }
    ptyService.destroy(id)
    return fakePty
  }

  async function advancePastGrace(): Promise<void> {
    await vi.advanceTimersByTimeAsync(1500)
    // Flush the snapshot/ownership promise chains the timer kicked off
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    nodePtyMocks.spawn.mockImplementation(() => makeFakePty(PID))
    killSpy = vi.spyOn(process, 'kill') as unknown as MockInstance<KillFn>
    // Never run the real pgrep in unit tests
    groupMembersSpy = vi
      .spyOn(
        ptyService as unknown as { listGroupMembers(pgid: number): Promise<Set<number>> },
        'listGroupMembers'
      )
      .mockResolvedValue(new Set<number>()) as unknown as MockInstance<
      (pgid: number) => Promise<Set<number>>
    >
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    killSpy.mockRestore()
    groupMembersSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('escalates to a process-group SIGKILL when the process survives SIGHUP', async () => {
    killSpy.mockImplementation((() => true) as KillFn)

    const fakePty = createAndGetPty()

    expect(fakePty.kill).toHaveBeenCalledTimes(1)
    expect(killSpy).not.toHaveBeenCalled()

    await advancePastGrace()

    expect(killSpy).toHaveBeenCalledWith(PID, 0)
    expect(killSpy).toHaveBeenCalledWith(-PID, 'SIGKILL')
  })

  it('does not escalate when the process and its group are both dead at probe time', async () => {
    killSpy.mockImplementation(((_pid: number, signal?: string | number) => {
      if (signal === 0) throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' })
      return true
    }) as KillFn)

    createAndGetPty()
    await advancePastGrace()

    expect(killSpy).toHaveBeenCalledWith(PID, 0)
    expect(killSpy).toHaveBeenCalledWith(-PID, 0)
    expect(killSpy).not.toHaveBeenCalledWith(-PID, 'SIGKILL')
    expect(killSpy).not.toHaveBeenCalledWith(PID, 'SIGKILL')
  })

  it('escalates when the wrapper shell died but a snapshot member survives in the group', async () => {
    // Custom-provider topology: the direct child ($SHELL wrapper) is reaped,
    // but a HUP-ignoring agent in the same process group lives on. The agent
    // (999) appears in both the destroy-time snapshot and the current group,
    // proving ownership continuity.
    groupMembersSpy.mockResolvedValue(new Set([PID, 999]))
    killSpy.mockImplementation(((pid: number, signal?: string | number) => {
      if (signal === 0 && pid > 0) throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' })
      return true
    }) as KillFn)

    createAndGetPty()
    await advancePastGrace()

    expect(killSpy).toHaveBeenCalledWith(-PID, 0)
    expect(killSpy).toHaveBeenCalledWith(-PID, 'SIGKILL')
  })

  it('does not kill a group that no longer traces to the destroyed PTY (reused pgid)', async () => {
    // At destroy time the group held only the leader; at escalation time the
    // probe finds a live group, but none of its members were ours — the
    // numeric pgid was recycled by an unrelated process. No SIGKILL.
    groupMembersSpy
      .mockResolvedValueOnce(new Set([PID])) // destroy-time snapshot
      .mockResolvedValueOnce(new Set([777])) // escalation-time membership
    killSpy.mockImplementation(((pid: number, signal?: string | number) => {
      if (signal === 0 && pid > 0) throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' })
      return true
    }) as KillFn)

    createAndGetPty()
    await advancePastGrace()

    expect(killSpy).toHaveBeenCalledWith(-PID, 0)
    expect(killSpy).not.toHaveBeenCalledWith(-PID, 'SIGKILL')
    expect(killSpy).not.toHaveBeenCalledWith(PID, 'SIGKILL')
  })

  it('never signals the numeric pid after the pty reported exit (pid-reuse hazard)', async () => {
    // Distinct pid: the exited-pid ledger is module-level and must not leak
    // into the other escalation tests.
    const REUSED_PID = 5353
    nodePtyMocks.spawn.mockImplementation(() => makeFakePty(REUSED_PID))
    // Simulate the worst case: the pid probe would "succeed" because an
    // unrelated process inherited the number; the group is empty.
    killSpy.mockImplementation(((pid: number, signal?: string | number) => {
      if (signal === 0 && pid < 0) throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' })
      return true
    }) as KillFn)

    const id = `pty-escalation-test-${nextId++}`
    ptyService.create(id, { cwd: '/tmp' })
    const fakePty = nodePtyMocks.spawn.mock.results.at(-1)?.value as {
      onExit: ReturnType<typeof vi.fn>
    }
    ptyService.destroy(id)
    // The child exits (and is reaped) during the grace period
    const exitHandler = fakePty.onExit.mock.calls[0][0] as (e: {
      exitCode: number
      signal: number
    }) => void
    exitHandler({ exitCode: 0, signal: 1 })

    await advancePastGrace()

    expect(killSpy).not.toHaveBeenCalledWith(REUSED_PID, 0)
    expect(killSpy).toHaveBeenCalledWith(-REUSED_PID, 0)
    expect(killSpy).not.toHaveBeenCalledWith(REUSED_PID, 'SIGKILL')
    expect(killSpy).not.toHaveBeenCalledWith(-REUSED_PID, 'SIGKILL')
  })

  it('falls back to a direct SIGKILL when the group kill fails', async () => {
    killSpy.mockImplementation(((pid: number, signal?: string | number) => {
      if (signal === 0) return true
      if (pid < 0) throw Object.assign(new Error('EPERM'), { code: 'EPERM' })
      return true
    }) as KillFn)

    createAndGetPty()
    await advancePastGrace()

    expect(killSpy).toHaveBeenCalledWith(-PID, 'SIGKILL')
    expect(killSpy).toHaveBeenCalledWith(PID, 'SIGKILL')
  })

  it('destroyAllAndReap sweeps survivors after the bounded grace (quit path)', async () => {
    killSpy.mockImplementation((() => true) as KillFn)

    const id = `pty-escalation-test-${nextId++}`
    ptyService.create(id, { cwd: '/tmp' })
    const fakePty = nodePtyMocks.spawn.mock.results.at(-1)?.value as {
      kill: ReturnType<typeof vi.fn>
    }

    const reap = ptyService.destroyAllAndReap(300)
    expect(fakePty.kill).toHaveBeenCalledTimes(1)
    expect(killSpy).not.toHaveBeenCalledWith(-PID, 'SIGKILL')

    await vi.advanceTimersByTimeAsync(300)
    await reap

    expect(killSpy).toHaveBeenCalledWith(-PID, 'SIGKILL')
  })
})
