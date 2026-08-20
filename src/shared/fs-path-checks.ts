import { existsSync, realpathSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

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

/**
 * The one spelling of a path we compare and store. realpath rather than resolve,
 * because the filesystem follows a symlink before a "..", so resolving lexically can
 * land on a different directory.
 *
 * Falls back to the lexical form when realpath fails, which happens on macOS when a
 * ".." follows a symlink, even though opening that path works. Callers should treat
 * the fallback as a best effort and still check the path exists.
 */
export function canonicalPath(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}
