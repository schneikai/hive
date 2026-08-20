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
})

describe('isSameFilePath', () => {
  it('accepts either separator for the same file', () => {
    expect(isSameFilePath('C:\\wt\\src\\a.ts', 'C:\\wt/src/a.ts')).toBe(true)
    expect(isSameFilePath('/wt/src/a.ts', '/wt/src/a.ts')).toBe(true)
  })

  it('still tells different files apart', () => {
    expect(isSameFilePath('/wt/src/a.ts', '/wt/src/b.ts')).toBe(false)
  })
})
