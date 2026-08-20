import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isValidDirectory, isGitRepository } from '../fs-path-checks'

// This is imported statically by three RPC domains (project-ops, github-ops) and by
// main/services/project-ops, replacing what used to be three copied definitions.
describe('fs-path-checks', () => {
  let base: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'hive-fs-path-checks-'))
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  describe('isValidDirectory', () => {
    it('is true for a directory', () => {
      expect(isValidDirectory(base)).toBe(true)
    })

    it('is false for a file', () => {
      const file = join(base, 'file.txt')
      writeFileSync(file, '')
      expect(isValidDirectory(file)).toBe(false)
    })

    it('is false for a path that does not exist', () => {
      expect(isValidDirectory(join(base, 'missing'))).toBe(false)
    })
  })

  describe('isGitRepository', () => {
    it('is true when .git is a directory', () => {
      mkdirSync(join(base, '.git'))
      expect(isGitRepository(base)).toBe(true)
    })

    it('is false when there is no .git', () => {
      expect(isGitRepository(base)).toBe(false)
    })

    it('is false when .git is a file, not a directory', () => {
      // A git worktree links back with a .git *file*, which is not a repo root itself.
      writeFileSync(join(base, '.git'), 'gitdir: /elsewhere')
      expect(isGitRepository(base)).toBe(false)
    })
  })
})
