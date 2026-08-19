import { beforeEach, describe, expect, it } from 'vitest'
import {
  FORCE_UPDATE_SNOOZE_MS,
  forceUpdateSnoozeLockMs,
  useForceUpdateStore
} from '@/stores/useForceUpdateStore'

function resetStore(): void {
  useForceUpdateStore.setState({
    currentVersion: null,
    modalOpen: false,
    modalOpenedAt: null,
    requiredVersion: null,
    snoozeCount: 0,
    snoozedUntil: null,
    lastCheckAt: null
  })
}

describe('forceUpdateSnoozeLockMs', () => {
  it('is instant at first, then doubles from 10s and pins at 2 minutes', () => {
    expect(forceUpdateSnoozeLockMs(0)).toBe(0)
    expect(forceUpdateSnoozeLockMs(1)).toBe(10_000)
    expect(forceUpdateSnoozeLockMs(2)).toBe(20_000)
    expect(forceUpdateSnoozeLockMs(3)).toBe(40_000)
    expect(forceUpdateSnoozeLockMs(4)).toBe(80_000)
    expect(forceUpdateSnoozeLockMs(5)).toBe(120_000)
    expect(forceUpdateSnoozeLockMs(6)).toBe(120_000)
    expect(forceUpdateSnoozeLockMs(50)).toBe(120_000)
  })
})

describe('useForceUpdateStore', () => {
  beforeEach(resetStore)

  it('opens the modal, clears any pending snooze, and anchors the open time', () => {
    useForceUpdateStore.setState({ snoozedUntil: 999 })
    useForceUpdateStore.getState().openModal('1.5.0', 1_000)
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(true)
    expect(state.modalOpenedAt).toBe(1_000)
    expect(state.requiredVersion).toBe('1.5.0')
    expect(state.snoozedUntil).toBeNull()
  })

  it('re-opening while open updates the required version without restarting the lock anchor', () => {
    useForceUpdateStore.getState().openModal('1.5.0', 1_000)
    useForceUpdateStore.getState().openModal('1.6.0', 2_000)
    const state = useForceUpdateStore.getState()
    expect(state.requiredVersion).toBe('1.6.0')
    expect(state.modalOpenedAt).toBe(1_000)
  })

  it('snooze closes the modal for 2 minutes and increments the count', () => {
    useForceUpdateStore.getState().openModal('1.5.0', 1_000)
    useForceUpdateStore.getState().snooze(5_000)
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(false)
    expect(state.snoozeCount).toBe(1)
    expect(state.snoozedUntil).toBe(5_000 + FORCE_UPDATE_SNOOZE_MS)
  })

  it('snooze is a no-op while the modal is closed', () => {
    useForceUpdateStore.getState().snooze(5_000)
    expect(useForceUpdateStore.getState().snoozeCount).toBe(0)
    expect(useForceUpdateStore.getState().snoozedUntil).toBeNull()
  })

  it('successive snoozes keep doubling the lock the modal reopens with', () => {
    for (let i = 1; i <= 3; i++) {
      useForceUpdateStore.getState().openModal('1.5.0', i * 10_000)
      useForceUpdateStore.getState().snooze(i * 10_000)
    }
    expect(useForceUpdateStore.getState().snoozeCount).toBe(3)
    expect(forceUpdateSnoozeLockMs(useForceUpdateStore.getState().snoozeCount)).toBe(40_000)
  })

  it('deferForActiveSession closes the modal without touching the snooze state', () => {
    useForceUpdateStore.getState().openModal('1.5.0', 1_000)
    useForceUpdateStore.getState().snooze(2_000)
    useForceUpdateStore.getState().openModal('1.5.0', 3_000)
    useForceUpdateStore.getState().deferForActiveSession()
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(false)
    expect(state.snoozeCount).toBe(1)
    expect(state.requiredVersion).toBe('1.5.0')
  })

  it('deferForActiveSession is a no-op while the modal is closed', () => {
    useForceUpdateStore.getState().deferForActiveSession()
    expect(useForceUpdateStore.getState().modalOpen).toBe(false)
    expect(useForceUpdateStore.getState().snoozeCount).toBe(0)
  })

  it('clearEnforcement resets modal, snooze count, and pending snooze', () => {
    useForceUpdateStore.getState().openModal('1.5.0', 1_000)
    useForceUpdateStore.getState().snooze(2_000)
    useForceUpdateStore.getState().clearEnforcement()
    const state = useForceUpdateStore.getState()
    expect(state.modalOpen).toBe(false)
    expect(state.requiredVersion).toBeNull()
    expect(state.snoozeCount).toBe(0)
    expect(state.snoozedUntil).toBeNull()
  })

  it('clearEnforcement leaves lastCheckAt and currentVersion alone', () => {
    useForceUpdateStore.getState().setCurrentVersion('1.2.3')
    useForceUpdateStore.getState().markChecked(42)
    useForceUpdateStore.getState().openModal('1.5.0')
    useForceUpdateStore.getState().clearEnforcement()
    expect(useForceUpdateStore.getState().currentVersion).toBe('1.2.3')
    expect(useForceUpdateStore.getState().lastCheckAt).toBe(42)
  })
})
