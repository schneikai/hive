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

  it('does not double the separator for a worktree at the filesystem root', () => {
    // path.join gives the rows "/src/a.ts", so this has to match it.
    isWindows.mockReturnValue(false)
    expect(diffTabAbsolutePath({ worktreePath: '/', filePath: 'src/a.ts' })).toBe('/src/a.ts')

    isWindows.mockReturnValue(true)
    expect(diffTabAbsolutePath({ worktreePath: 'C:\\', filePath: 'src/a.ts' })).toBe(
      'C:\\src\\a.ts'
    )
  })
})

describe('isSameFilePath', () => {
  it('accepts either separator for the same file on Windows', () => {
    isWindows.mockReturnValue(true)
    expect(isSameFilePath('C:\\wt\\src\\a.ts', 'C:\\wt/src/a.ts')).toBe(true)
  })

  it('ignores casing on Windows, including the drive letter', () => {
    isWindows.mockReturnValue(true)
    expect(isSameFilePath('C:\\wt\\src\\Foo.ts', 'c:\\wt\\src\\foo.ts')).toBe(true)
  })

  it('keeps casing significant off Windows', () => {
    isWindows.mockReturnValue(false)
    // Two different files on a case-sensitive volume.
    expect(isSameFilePath('/wt/src/Foo.ts', '/wt/src/foo.ts')).toBe(false)
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
