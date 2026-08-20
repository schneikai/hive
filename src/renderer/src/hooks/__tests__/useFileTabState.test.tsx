import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useFileTabState } from '../useFileTabState'
import { useFileViewerStore } from '@/stores/useFileViewerStore'

describe('useFileTabState', () => {
  beforeEach(() => {
    useFileViewerStore.getState().closeAllFiles()
  })

  afterEach(() => {
    cleanup()
    useFileViewerStore.getState().closeAllFiles()
  })

  it('returns null when the file has no tab', () => {
    const { result } = renderHook(() => useFileTabState('/wt/src/a.ts'))
    expect(result.current).toBeNull()
  })

  it('returns null for rows without a path, like folders', () => {
    useFileViewerStore.getState().openFile('/wt/src/a.ts', 'a.ts', 'wt-1')

    const { result } = renderHook(() => useFileTabState(null))
    expect(result.current).toBeNull()
  })

  it('marks the file tab that is active', () => {
    useFileViewerStore.getState().openFile('/wt/src/a.ts', 'a.ts', 'wt-1')
    useFileViewerStore.getState().openFile('/wt/src/b.ts', 'b.ts', 'wt-1')

    expect(renderHook(() => useFileTabState('/wt/src/b.ts')).result.current).toBe('active')
    expect(renderHook(() => useFileTabState('/wt/src/a.ts')).result.current).toBe('open')
  })

  it('resolves a diff tab to the absolute path of its file', () => {
    useFileViewerStore.getState().setActiveDiff({
      worktreePath: '/wt',
      filePath: 'src/a.ts',
      fileName: 'a.ts',
      staged: false,
      isUntracked: false
    })

    const { result } = renderHook(() => useFileTabState('/wt/src/a.ts'))
    expect(result.current).toBe('active')
  })

  it('matches a row whose path uses the other separator', () => {
    // Rows get native paths from the backend, diff tabs are joined in the renderer,
    // so on Windows the two spellings have to still count as the same file.
    useFileViewerStore.getState().setActiveDiff({
      worktreePath: 'C:\\wt',
      filePath: 'src/a.ts',
      fileName: 'a.ts',
      staged: false,
      isUntracked: false
    })

    const { result } = renderHook(() => useFileTabState('C:\\wt\\src\\a.ts'))
    expect(result.current).toBe('active')
  })

  it('ignores context tabs', () => {
    useFileViewerStore.getState().openContextEditor('wt-1')

    const { result } = renderHook(() => useFileTabState('/wt/src/a.ts'))
    expect(result.current).toBeNull()
  })
})
