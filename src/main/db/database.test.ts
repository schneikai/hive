import { afterEach, describe, expect, it, vi } from 'vitest'
import { join } from 'path'

import { resolveDatabasePath } from './database'

describe('database path resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the server state database under the configured server base directory', () => {
    expect(resolveDatabasePath({ serverBaseDir: '/tmp/hive-server-test' })).toBe(
      join('/tmp/hive-server-test', 'userdata', 'state.sqlite')
    )
  })

  it('uses the desktop database under the user hive directory without server mode', () => {
    expect(resolveDatabasePath({ homeDir: '/tmp/hive-home-test' })).toBe(
      join('/tmp/hive-home-test', '.hive', 'hive.db')
    )
  })

  it('prefers an explicit database path override over server base dir', () => {
    expect(
      resolveDatabasePath({
        explicitPath: '/tmp/legacy/hive.db',
        serverBaseDir: '/tmp/hive-server-test'
      })
    ).toBe('/tmp/legacy/hive.db')
  })

  it('uses the desktop base dir database so main matches the backend child', () => {
    expect(resolveDatabasePath({ desktopBaseDir: '/tmp/hive-dev-test' })).toBe(
      join('/tmp/hive-dev-test', 'hive.db')
    )
  })

  it('prefers the server base dir over a desktop base dir inherited from the shell', () => {
    expect(
      resolveDatabasePath({
        desktopBaseDir: '/tmp/hive-dev-test',
        serverBaseDir: '/tmp/hive-server-test'
      })
    ).toBe(join('/tmp/hive-server-test', 'userdata', 'state.sqlite'))
  })

  it('ignores HIVE_DESKTOP_BASE_DIR outside the desktop main process', () => {
    // This test runs as plain node, so the desktop check is false here.
    vi.stubEnv('HIVE_DESKTOP_BASE_DIR', '/tmp/hive-dev-test')
    expect(resolveDatabasePath({ homeDir: '/tmp/hive-home-test' })).toBe(
      join('/tmp/hive-home-test', '.hive', 'hive.db')
    )
  })

  it('prefers an explicit database path override over desktop base dir', () => {
    expect(
      resolveDatabasePath({
        explicitPath: '/tmp/legacy/hive.db',
        desktopBaseDir: '/tmp/hive-dev-test'
      })
    ).toBe('/tmp/legacy/hive.db')
  })
})
