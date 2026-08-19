import { create } from 'zustand'

/** Snooze always hides the modal for 2 minutes (or until conditions are met). */
export const FORCE_UPDATE_SNOOZE_MS = 2 * 60 * 1000
/** Re-fetch the org's minimum-version policy at most once per hour on refocus. */
export const FORCE_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

const SNOOZE_LOCK_BASE_MS = 10_000
const SNOOZE_LOCK_MAX_MS = 2 * 60 * 1000

/**
 * How long the snooze button stays disabled after the modal (re)opens:
 * instant on first open, then 10s, 20s, 40s, 80s… doubling per prior snooze
 * until pinned at 2 minutes.
 */
export function forceUpdateSnoozeLockMs(snoozeCount: number): number {
  if (snoozeCount <= 0) return 0
  return Math.min(SNOOZE_LOCK_MAX_MS, SNOOZE_LOCK_BASE_MS * 2 ** (snoozeCount - 1))
}

interface ForceUpdateStoreState {
  /** Running app version, learned from the updater RPC; null until it answers. */
  currentVersion: string | null
  modalOpen: boolean
  /** When the modal last opened — anchors the snooze-lock countdown. */
  modalOpenedAt: number | null
  /** Org minimum version the open modal is enforcing. */
  requiredVersion: string | null
  snoozeCount: number
  snoozedUntil: number | null
  /** Last time the policy was checked (launch or focus refresh). */
  lastCheckAt: number | null

  setCurrentVersion: (version: string) => void
  markChecked: (now?: number) => void
  openModal: (requiredVersion: string, now?: number) => void
  snooze: (now?: number) => void
  deferForActiveSession: () => void
  clearEnforcement: () => void
}

export const useForceUpdateStore = create<ForceUpdateStoreState>()((set, get) => ({
  currentVersion: null,
  modalOpen: false,
  modalOpenedAt: null,
  requiredVersion: null,
  snoozeCount: 0,
  snoozedUntil: null,
  lastCheckAt: null,

  setCurrentVersion: (version) => {
    set({ currentVersion: version })
  },

  markChecked: (now = Date.now()) => {
    set({ lastCheckAt: now })
  },

  openModal: (requiredVersion, now = Date.now()) => {
    if (get().modalOpen) {
      // Admin bumped the minimum while the modal is up — refresh the copy but
      // keep modalOpenedAt so the snooze lock doesn't restart.
      if (get().requiredVersion !== requiredVersion) set({ requiredVersion })
      return
    }
    set({ modalOpen: true, modalOpenedAt: now, requiredVersion, snoozedUntil: null })
  },

  snooze: (now = Date.now()) => {
    const { modalOpen, snoozeCount } = get()
    if (!modalOpen) return
    set({
      modalOpen: false,
      modalOpenedAt: null,
      snoozeCount: snoozeCount + 1,
      snoozedUntil: now + FORCE_UPDATE_SNOOZE_MS
    })
  },

  // A session became active while the modal was up — stand down without
  // spending a snooze (count and any pending snooze window untouched), so
  // the modal reopens as soon as sessions go idle again.
  deferForActiveSession: () => {
    if (!get().modalOpen) return
    set({ modalOpen: false, modalOpenedAt: null })
  },

  clearEnforcement: () => {
    const { modalOpen, requiredVersion, snoozeCount, snoozedUntil } = get()
    if (!modalOpen && requiredVersion === null && snoozeCount === 0 && snoozedUntil === null) {
      return
    }
    set({
      modalOpen: false,
      modalOpenedAt: null,
      requiredVersion: null,
      snoozeCount: 0,
      snoozedUntil: null
    })
  }
}))
