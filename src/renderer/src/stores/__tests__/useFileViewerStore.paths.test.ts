import { describe, expect, it, vi } from 'vitest'

const isWindows = vi.hoisted(() => vi.fn(() => false))

vi.mock('@/lib/platform', () => ({ isWindows }))

const { diffTabAbsolutePath, isSameFilePath } = await import('@/stores/useFileViewerStore')

describe('diffTabAbsolutePath', () => {
  it('joins with a forward slash off Windows', () => {
    isWindows.mockReturnValue(false)
    expect(diffTabAbsolutePath({ worktreePath: '/wt', filePath: 'src/a.ts' })).toBe('/wt/src/a.ts')
  })

  it('builds a native path on Windows', () => {
    isWindows.mockReturnValue(true)
    // Git hands us "src/a.ts" on every platform, so the separators need converting.
    expect(diffTabAbsolutePath({ worktreePath: 'C:\\wt', filePath: 'src/a.ts' })).toBe(
      'C:\\wt\\src\\a.ts'
    )
  })

  // These all match what path.join gives the rows on the backend side.
  it('does not double a trailing separator', () => {
    isWindows.mockReturnValue(false)
    expect(diffTabAbsolutePath({ worktreePath: '/wt/', filePath: 'src/a.ts' })).toBe('/wt/src/a.ts')
    expect(diffTabAbsolutePath({ worktreePath: '/', filePath: 'src/a.ts' })).toBe('/src/a.ts')
  })

  it('keeps a trailing backslash that is part of the directory name', () => {
    isWindows.mockReturnValue(false)
    expect(diffTabAbsolutePath({ worktreePath: '/tmp/repo\\', filePath: 'src/a.ts' })).toBe(
      '/tmp/repo\\/src/a.ts'
    )
  })

  it('does not double a trailing separator on Windows', () => {
    isWindows.mockReturnValue(true)
    expect(diffTabAbsolutePath({ worktreePath: 'C:\\wt\\', filePath: 'src/a.ts' })).toBe(
      'C:\\wt\\src\\a.ts'
    )
  })
})

describe('isSameFilePath', () => {
  it('accepts either separator for the same file on Windows', () => {
    isWindows.mockReturnValue(true)
    expect(isSameFilePath('C:\\wt\\src\\a.ts', 'C:\\wt/src/a.ts')).toBe(true)
  })

  it('keeps backslash filenames distinct off Windows', () => {
    isWindows.mockReturnValue(false)
    // A backslash is a valid filename character on macOS and Linux, so these
    // are two different files and must not be treated as one.
    expect(isSameFilePath('/wt/a\\b.ts', '/wt/a/b.ts')).toBe(false)
  })

  it('matches identical paths on any platform', () => {
    isWindows.mockReturnValue(false)
    expect(isSameFilePath('/wt/src/a.ts', '/wt/src/a.ts')).toBe(true)
  })

  it('still tells different files apart', () => {
    isWindows.mockReturnValue(true)
    expect(isSameFilePath('/wt/src/a.ts', '/wt/src/b.ts')).toBe(false)
  })
})
