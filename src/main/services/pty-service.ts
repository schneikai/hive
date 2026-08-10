import * as pty from 'node-pty'
import { createLogger } from './logger'

const log = createLogger({ component: 'PtyService' })

/**
 * Terminal backend type.
 * - 'node-pty': Uses node-pty + xterm.js for terminal emulation (cross-platform)
 * - 'ghostty': Uses the native Ghostty module for Metal-rendered terminals (macOS only)
 *
 * When using the 'ghostty' backend, the native module handles both the PTY and
 * the terminal rendering. The PtyService is not used for I/O in that case —
 * surface lifecycle is managed entirely through GhosttyService.
 */
export type TerminalBackend = 'node-pty' | 'ghostty'

interface PtyInstance {
  pty: pty.IPty
  cwd: string
  backend: TerminalBackend
  dataListeners: Array<(data: string) => void>
  exitListeners: Array<(code: number, signal: number) => void>
}

export interface PtyCreateOpts {
  cwd: string
  command?: string
  args?: string[]
  shell?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
  backend?: TerminalBackend
}

/** Env vars that influence terminal/TUI rendering — logged at every spawn. */
const ENV_SNAPSHOT_KEYS = [
  'TERM',
  'COLORTERM',
  'LANG',
  'LC_ALL',
  'COLUMNS',
  'LINES',
  'NO_COLOR',
  'FORCE_COLOR',
  'CI'
] as const

/**
 * Diagnostic snapshot of the rendering-relevant spawn env. CLAUDE_CODE_*
 * variables are logged by name only — their values may embed secrets.
 */
function buildEnvSnapshot(env: Record<string, string>): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {}
  for (const key of ENV_SNAPSHOT_KEYS) {
    snapshot[key] = env[key]
  }
  const claudeCodeKeys = Object.keys(env)
    .filter((key) => key.startsWith('CLAUDE_CODE_'))
    .sort()
  if (claudeCodeKeys.length > 0) {
    snapshot.claudeCodeKeys = claudeCodeKeys.join(',')
  }
  return snapshot
}

/** Grace period between the polite SIGHUP and the SIGKILL escalation probe. */
const KILL_ESCALATION_GRACE_MS = 1500

class PtyService {
  private ptys: Map<string, PtyInstance> = new Map()

  create(id: string, opts: PtyCreateOpts): { cols: number; rows: number } {
    // If using the ghostty backend, the native module handles the PTY internally.
    // We don't create a node-pty process — surface lifecycle is managed by GhosttyService.
    if (opts.backend === 'ghostty') {
      log.info('Skipping node-pty creation for ghostty backend', { id })
      return { cols: opts.cols || 80, rows: opts.rows || 24 }
    }

    // If a PTY already exists for this id, return its dimensions
    const existing = this.ptys.get(id)
    if (existing) {
      log.info('PTY already exists, reusing', { id })
      return {
        cols: existing.pty.cols,
        rows: existing.pty.rows
      }
    }

    const command =
      opts.command ||
      opts.shell ||
      process.env.SHELL ||
      (process.platform === 'win32'
        ? 'powershell.exe'
        : process.platform === 'darwin'
          ? '/bin/zsh'
          : '/bin/bash')
    const args = opts.command ? (opts.args ?? []) : []
    const cols = opts.cols || 80
    const rows = opts.rows || 24

    const env: Record<string, string> = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    } as Record<string, string>
    // COLUMNS/LINES leak in from the interactive login shell that
    // loadShellEnv() captures at startup. TUI programs prefer them over the
    // PTY's actual size, pinning width detection to the wrong dimensions and
    // fighting SIGWINCH-driven resizes. The PTY size is authoritative here.
    delete env.COLUMNS
    delete env.LINES
    Object.assign(env, opts.env ?? {})

    log.info('Creating PTY', {
      id,
      command,
      args: args.length,
      cwd: opts.cwd,
      cols,
      rows,
      env: buildEnvSnapshot(env)
    })

    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: opts.cwd,
      env
    })

    const instance: PtyInstance = {
      pty: ptyProcess,
      cwd: opts.cwd,
      backend: opts.backend || 'node-pty',
      dataListeners: [],
      exitListeners: []
    }

    // Wire up data events
    ptyProcess.onData((data) => {
      for (const listener of instance.dataListeners) {
        try {
          listener(data)
        } catch (err) {
          log.error(
            'Error in PTY data listener',
            err instanceof Error ? err : new Error(String(err)),
            { id }
          )
        }
      }
    })

    // Wire up exit events
    ptyProcess.onExit(({ exitCode, signal }) => {
      const code = exitCode ?? -1
      const sig = signal ?? 0
      log.info('PTY exited', { id, exitCode: code, signal: sig })
      for (const listener of instance.exitListeners) {
        try {
          listener(code, sig)
        } catch (err) {
          log.error(
            'Error in PTY exit listener',
            err instanceof Error ? err : new Error(String(err)),
            { id }
          )
        }
      }
      this.ptys.delete(id)
    })

    this.ptys.set(id, instance)

    return { cols, rows }
  }

  write(id: string, data: string): void {
    const instance = this.ptys.get(id)
    if (!instance) {
      log.warn('PTY not found for write', { id })
      return
    }
    instance.pty.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const instance = this.ptys.get(id)
    if (!instance) {
      log.warn('PTY not found for resize', { id })
      return
    }
    try {
      instance.pty.resize(cols, rows)
    } catch (err) {
      log.error('Error resizing PTY', err instanceof Error ? err : new Error(String(err)), {
        id,
        cols,
        rows
      })
    }
  }

  destroy(id: string): void {
    const instance = this.ptys.get(id)
    if (!instance) {
      log.warn('PTY not found for destroy', { id })
      return
    }
    log.info('Destroying PTY', { id })
    const pid = instance.pty.pid
    try {
      instance.pty.kill()
    } catch (err) {
      log.error('Error killing PTY', err instanceof Error ? err : new Error(String(err)), { id })
    }
    this.ptys.delete(id)
    this.scheduleKillEscalation(id, pid)
  }

  /**
   * node-pty's kill() sends a single SIGHUP to the direct child and never
   * checks the outcome. HUP-ignoring processes — and custom-provider spawns,
   * where the agent is a grandchild of a `$SHELL -ilc` wrapper — survive it
   * and leak. After a grace period, probe liveness and escalate to a
   * process-group SIGKILL (the pty child is a session leader, so pgid ===
   * pid, which also reaps same-group grandchildren). The timer is unref'd
   * and fire-and-forget so destroyAll() under the quit-cleanup deadline
   * never blocks on it.
   */
  private scheduleKillEscalation(id: string, pid: number | undefined): void {
    if (!pid || process.platform === 'win32') return
    const timer = setTimeout(() => this.reapSurvivors(id, pid), KILL_ESCALATION_GRACE_MS)
    timer.unref?.()
  }

  /**
   * Probe the direct child AND its process group before deciding everything
   * is dead: a wrapper shell can die on SIGHUP while a HUP-ignoring agent in
   * the same group survives — probing only the (reaped) wrapper pid would
   * skip the group SIGKILL that reaps the survivor. Known gap: a shell whose
   * interactive job control forked the agent into its OWN pgid is invisible
   * to both probes; covering that would require a descendant walk.
   */
  private reapSurvivors(id: string, pid: number): void {
    let anyAlive = false
    try {
      process.kill(pid, 0)
      anyAlive = true
    } catch {
      // direct child dead and reaped
    }
    if (!anyAlive) {
      try {
        process.kill(-pid, 0)
        anyAlive = true
      } catch {
        // process group empty
      }
    }
    if (!anyAlive) return
    log.warn('PTY process (or group member) survived SIGHUP, escalating to SIGKILL', { id, pid })
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // Died between the probe and the kill — nothing left to do
      }
    }
  }

  destroyAll(): void {
    log.info('Destroying all PTYs', { count: this.ptys.size })
    for (const [id] of this.ptys) {
      this.destroy(id)
    }
  }

  /**
   * Quit-path variant of destroyAll: HUP everything, wait a short bounded
   * grace (well inside the quit-cleanup deadline), then synchronously
   * group-SIGKILL anything still alive. The per-destroy escalation timers
   * never get to fire on quit — the process exits first — so without this
   * sweep HUP-surviving agents would leak on every app quit.
   */
  async destroyAllAndReap(graceMs = 300): Promise<void> {
    const targets: Array<{ id: string; pid: number }> = []
    for (const [id, instance] of this.ptys) {
      const pid = instance.pty.pid
      if (pid) targets.push({ id, pid })
    }
    this.destroyAll()
    if (process.platform === 'win32' || targets.length === 0) return
    await new Promise((resolve) => setTimeout(resolve, graceMs))
    for (const { id, pid } of targets) {
      this.reapSurvivors(id, pid)
    }
  }

  onData(id: string, callback: (data: string) => void): () => void {
    const instance = this.ptys.get(id)
    if (!instance) {
      log.warn('PTY not found for onData', { id })
      return () => {}
    }
    instance.dataListeners.push(callback)
    return () => {
      const idx = instance.dataListeners.indexOf(callback)
      if (idx !== -1) {
        instance.dataListeners.splice(idx, 1)
      }
    }
  }

  onExit(id: string, callback: (code: number, signal: number) => void): () => void {
    const instance = this.ptys.get(id)
    if (!instance) {
      log.warn('PTY not found for onExit', { id })
      return () => {}
    }
    instance.exitListeners.push(callback)
    return () => {
      const idx = instance.exitListeners.indexOf(callback)
      if (idx !== -1) {
        instance.exitListeners.splice(idx, 1)
      }
    }
  }

  /**
   * Get an existing PTY or create a new one. Alias for `create()` which
   * already returns existing PTY dimensions if one exists for this id.
   */
  getOrCreate(id: string, opts: PtyCreateOpts): { cols: number; rows: number } {
    return this.create(id, opts)
  }

  has(id: string): boolean {
    return this.ptys.has(id)
  }

  getBackend(id: string): TerminalBackend | undefined {
    return this.ptys.get(id)?.backend
  }

  getIds(): string[] {
    return Array.from(this.ptys.keys())
  }

  /**
   * Destroy all PTYs whose IDs are NOT in the given set of valid IDs.
   * Useful for cleaning up terminals when worktrees are deleted.
   */
  getCount(): number {
    return this.ptys.size
  }

  destroyExcept(validIds: Set<string>): void {
    for (const [id] of this.ptys) {
      if (!validIds.has(id)) {
        log.info('Destroying orphaned PTY', { id })
        this.destroy(id)
      }
    }
  }
}

export const ptyService = new PtyService()
