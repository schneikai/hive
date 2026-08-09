import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('UpdatePill sidebar mount', () => {
  it('mounts UpdatePill directly above the usage slot, hidden in connection mode', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/renderer/src/components/layout/LeftSidebar.tsx'),
      'utf-8'
    )

    expect(source).toContain("import { UpdatePill } from './UpdatePill'")
    const pillIndex = source.indexOf('{!connectionModeActive && <UpdatePill />}')
    const usageSlotIndex = source.indexOf(
      'shouldShowUsageIndicator ? <UsageIndicator /> : <SpacesTabBar />'
    )

    expect(pillIndex).toBeGreaterThan(-1)
    expect(usageSlotIndex).toBeGreaterThan(pillIndex)
  })
})
