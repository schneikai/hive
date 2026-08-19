import { useEffect, useState } from 'react'
import { systemApi } from '@/api/system-api'
import { updaterApi } from '@/api/updater-api'
import {
  isHiveUpdateRequired,
  refreshHiveEnterpriseOrg,
  requiredHiveMinAppVersion,
  whenHiveOrgPolicySettled
} from '@/api/hive-enterprise/client'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWorktreeStatusStore, type SessionStatusType } from '@/stores/useWorktreeStatusStore'
import {
  FORCE_UPDATE_CHECK_INTERVAL_MS,
  useForceUpdateStore
} from '@/stores/useForceUpdateStore'

// A session in any of these states is actively in progress — the org's forced
// update must not interrupt it. Same set as useSleepWhenIdle's non-idle check.
const ACTIVE_SESSION_STATUSES = new Set<SessionStatusType>([
  'working',
  'planning',
  'answering',
  'permission',
  'command_approval'
])

/**
 * Org policy: enforce the organization's minimum app version. Checks on
 * launch (after the startup org refresh settles) and re-fetches the policy on
 * window focus at most once per hour. When the running version is older, a
 * blocking update modal opens — deferred while any session is actively
 * running or while a snooze is in effect, and re-opened as soon as the
 * blocker clears.
 */
export function useForceUpdateGuard(): void {
  const [policySettled, setPolicySettled] = useState(false)
  const [snoozeExpiryTick, setSnoozeExpiryTick] = useState(0)

  const settingsLoading = useSettingsStore((state) => state.isLoading)
  const hiveAuthToken = useSettingsStore((state) => state.hiveAuthToken)
  const hiveOrganizationId = useSettingsStore((state) => state.hiveOrganizationId)
  const hiveOrganizationMinAppVersion = useSettingsStore(
    (state) => state.hiveOrganizationMinAppVersion
  )
  const currentVersion = useForceUpdateStore((state) => state.currentVersion)
  const modalOpen = useForceUpdateStore((state) => state.modalOpen)
  const snoozedUntil = useForceUpdateStore((state) => state.snoozedUntil)
  const anySessionActive = useWorktreeStatusStore((state) =>
    Object.values(state.sessionStatuses).some(
      (entry) => entry && ACTIVE_SESSION_STATUSES.has(entry.status)
    )
  )

  // Learn the running app version once.
  useEffect(() => {
    let cancelled = false
    updaterApi
      .getVersion()
      .then((version) => {
        if (!cancelled) useForceUpdateStore.getState().setCurrentVersion(version)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Launch check: wait (bounded) for the startup org refresh so a policy
  // changed while the app was closed neither flashes nor misses the modal.
  useEffect(() => {
    let cancelled = false
    void whenHiveOrgPolicySettled().then(() => {
      if (cancelled) return
      useForceUpdateStore.getState().markChecked()
      setPolicySettled(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Refocus check, at most once per hour. The refresh writes into the
  // settings store, so evaluation below reacts on its own.
  useEffect(() => {
    return systemApi.onWindowFocused(() => {
      const { lastCheckAt } = useForceUpdateStore.getState()
      if (lastCheckAt !== null && Date.now() - lastCheckAt < FORCE_UPDATE_CHECK_INTERVAL_MS) return
      useForceUpdateStore.getState().markChecked()
      void refreshHiveEnterpriseOrg()
    })
  }, [])

  useEffect((): (() => void) | undefined => {
    if (!policySettled || settingsLoading) return undefined
    const policySettings = { hiveAuthToken, hiveOrganizationId, hiveOrganizationMinAppVersion }
    const store = useForceUpdateStore.getState()
    if (!isHiveUpdateRequired(policySettings, currentVersion)) {
      // Policy cleared (admin lowered/removed it, or logout) — stand down.
      store.clearEnforcement()
      return undefined
    }
    const minVersion = requiredHiveMinAppVersion(policySettings)
    if (!minVersion) return undefined
    // A running session defers enforcement — including standing the modal
    // down if a session turns active while it is open (sessions can start
    // with no user input, e.g. a queued follow-up draining or a background
    // task waking its session; the blocker must never sit over a live
    // session's permission prompt). Re-runs when the selector flips idle.
    if (anySessionActive) {
      store.deferForActiveSession()
      return undefined
    }
    if (modalOpen) {
      // Keep the displayed requirement current if the admin bumped it.
      store.openModal(minVersion)
      return undefined
    }
    const now = Date.now()
    if (snoozedUntil !== null && snoozedUntil > now) {
      const timer = setTimeout(
        () => setSnoozeExpiryTick((tick) => tick + 1),
        snoozedUntil - now + 250
      )
      return () => clearTimeout(timer)
    }
    store.openModal(minVersion)
    return undefined
  }, [
    policySettled,
    settingsLoading,
    hiveAuthToken,
    hiveOrganizationId,
    hiveOrganizationMinAppVersion,
    currentVersion,
    modalOpen,
    anySessionActive,
    snoozedUntil,
    snoozeExpiryTick
  ])
}
