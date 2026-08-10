import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodePath } from '../claude-transcript-reader'
import { watchForClaudeSessionId, type ClaudeSessionWatchHandle } from '../claude-session-watcher'

vi.mock('../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

const WORKTREE_PATH = '/repo/watched-worktree'

describe('watchForClaudeSessionId rejection', () => {
  let configRoot: string
  let transcriptDir: string
  let savedConfigDir: string | undefined
  let handle: ClaudeSessionWatchHandle | null = null

  beforeEach(() => {
    vi.useFakeTimers({ now: Date.now() })
    configRoot = mkdtempSync(join(tmpdir(), 'claude-watcher-test-'))
    transcriptDir = join(configRoot, 'projects', encodePath(WORKTREE_PATH))
    savedConfigDir = process.env.CLAUDE_CONFIG_DIR
    process.env.CLAUDE_CONFIG_DIR = configRoot
  })

  afterEach(() => {
    handle?.close()
    handle = null
    vi.useRealTimers()
    if (savedConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = savedConfigDir
    rmSync(configRoot, { recursive: true, force: true })
  })

  it('keeps watching after a rejected id and reports the next transcript', () => {
    const seen: string[] = []
    // First discovery is rejected (claimed by a concurrent session), later
    // ones are accepted.
    const onSessionId = vi.fn((sessionId: string): boolean | void => {
      seen.push(sessionId)
      if (sessionId === 'stolen') return false
    })

    // The transcript dir does not exist yet, so the watcher uses its 1s
    // polling fallback — deterministic under fake timers.
    handle = watchForClaudeSessionId(WORKTREE_PATH, onSessionId)
    expect(onSessionId).not.toHaveBeenCalled()

    mkdirSync(transcriptDir, { recursive: true })
    writeFileSync(join(transcriptDir, 'stolen.jsonl'), '{}\n')
    vi.advanceTimersByTime(1000)

    expect(seen).toEqual(['stolen'])

    // The rejected transcript stays excluded on subsequent scans.
    vi.advanceTimersByTime(2000)
    expect(seen).toEqual(['stolen'])

    writeFileSync(join(transcriptDir, 'mine.jsonl'), '{}\n')
    vi.advanceTimersByTime(1000)
    expect(seen).toEqual(['stolen', 'mine'])

    // Accepted discovery closes the watcher — no further scans fire.
    writeFileSync(join(transcriptDir, 'later.jsonl'), '{}\n')
    vi.advanceTimersByTime(3000)
    expect(seen).toEqual(['stolen', 'mine'])
  })

  it('recovers an already-present sibling transcript in the same scan after a rejection', () => {
    const seen: string[] = []
    const onSessionId = vi.fn((sessionId: string): boolean | void => {
      seen.push(sessionId)
      if (sessionId === 'stolen') return false
    })

    handle = watchForClaudeSessionId(WORKTREE_PATH, onSessionId)
    mkdirSync(transcriptDir, { recursive: true })
    writeFileSync(join(transcriptDir, 'mine.jsonl'), '{}\n')
    writeFileSync(join(transcriptDir, 'stolen.jsonl'), '{}\n')
    // Force distinct mtimes so 'stolen' is strictly newest.
    const base = Date.now()
    utimesSync(join(transcriptDir, 'mine.jsonl'), new Date(base), new Date(base))
    utimesSync(join(transcriptDir, 'stolen.jsonl'), new Date(base + 100), new Date(base + 100))

    // One poll tick: reject 'stolen', and the immediate re-scan must pick up
    // 'mine' without waiting for another fs event or poll.
    vi.advanceTimersByTime(1000)

    expect(seen).toEqual(['stolen', 'mine'])
  })

  it('closes after an accepted discovery without rejections', () => {
    const onSessionId = vi.fn()

    handle = watchForClaudeSessionId(WORKTREE_PATH, onSessionId)
    mkdirSync(transcriptDir, { recursive: true })
    writeFileSync(join(transcriptDir, 'first.jsonl'), '{}\n')
    vi.advanceTimersByTime(1000)

    expect(onSessionId).toHaveBeenCalledTimes(1)
    expect(onSessionId).toHaveBeenCalledWith('first')

    writeFileSync(join(transcriptDir, 'second.jsonl'), '{}\n')
    vi.advanceTimersByTime(3000)
    expect(onSessionId).toHaveBeenCalledTimes(1)
  })
})
