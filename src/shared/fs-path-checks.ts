import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Sync fs checks shared by main and server project code. Kept Electron-free so the
 * server (browser/headless) build can import them statically: main/services/project-ops
 * imports Electron's `app` at module scope, so anything in that file needs a lazy
 * `await import(...)` from server code instead of a static import.
 */

export function isValidDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory()
  } catch {
    return false
  }
}

export function isGitRepository(path: string): boolean {
  try {
    const gitPath = join(path, '.git')
    return existsSync(gitPath) && statSync(gitPath).isDirectory()
  } catch {
    return false
  }
}
