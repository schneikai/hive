import { GraphQLClient } from 'graphql-request'
import { useSettingsStore, type AppSettings } from '@/stores/useSettingsStore'
import { compareAppVersions } from '@/lib/version-compare'
import {
  CreateAccountShareDocument,
  ListAccountMembersDocument,
  MeDocument,
  RecordPromptIdleDocument,
  RecordPromptStartDocument,
  RecordQuestionsAnsweredDocument,
  ReportActiveAccountsDocument
} from './operations'
import type {
  GqlHiveEnterpriseListAccountMembersQuery,
  GqlHiveEnterpriseMeQuery,
  GqlHiveEnterpriseRecordPromptIdleMutation,
  GqlHiveEnterpriseRecordPromptIdleMutationVariables,
  GqlHiveEnterpriseRecordPromptStartMutation,
  GqlHiveEnterpriseRecordPromptStartMutationVariables,
  GqlHiveEnterpriseRecordQuestionsAnsweredMutation,
  GqlHiveEnterpriseRecordQuestionsAnsweredMutationVariables,
  GqlHiveEnterpriseReportActiveAccountsMutation,
  GqlHiveEnterpriseReportActiveAccountsMutationVariables
} from './generated'

type TelemetryGateSettings = Pick<AppSettings, 'hiveAuthToken' | 'hiveOrganizationId'>

export function isHiveTelemetryEnabled(settings: TelemetryGateSettings): boolean {
  return Boolean(settings.hiveAuthToken && settings.hiveOrganizationId)
}

type ForceBoardModeSettings = TelemetryGateSettings &
  Pick<AppSettings, 'hiveOrganizationForceBoardMode'>

/**
 * Org policy: when the organization has "Force board mode" enabled, members
 * can only start sessions from a board ticket — the new-session button and
 * shortcuts are disabled, no first session auto-opens, and auto-pinning the
 * project on board prompts is always on. Only applies while logged in to an
 * organization.
 */
export function isForceBoardMode(settings: ForceBoardModeSettings): boolean {
  return isHiveTelemetryEnabled(settings) && settings.hiveOrganizationForceBoardMode === true
}

type ForceUpdateSettings = TelemetryGateSettings &
  Pick<AppSettings, 'hiveOrganizationMinAppVersion'>

/**
 * Org policy: the minimum app version members must run before continuing to
 * use Hive. Null when not signed in to an organization or when the org does
 * not enforce one — the token+orgId gate means logging out clears a stale
 * policy, like the other org settings.
 */
export function requiredHiveMinAppVersion(settings: ForceUpdateSettings): string | null {
  if (!isHiveTelemetryEnabled(settings)) return null
  const minVersion = settings.hiveOrganizationMinAppVersion?.trim()
  return minVersion ? minVersion : null
}

/**
 * True when the org enforces a minimum app version and the running app is
 * older than it. `currentVersion` is null until the updater RPC answers —
 * treated as "not required" so enforcement never fires on unknown versions.
 */
export function isHiveUpdateRequired(
  settings: ForceUpdateSettings,
  currentVersion: string | null
): boolean {
  const minVersion = requiredHiveMinAppVersion(settings)
  if (!minVersion || !currentVersion) return false
  return compareAppVersions(currentVersion, minVersion) < 0
}

// Enforcement of org policy reads the locally persisted flag, which can be one
// launch behind when an admin changed it while the app was closed. Auto-start
// waits (bounded) on this promise so the startup refresh gets a chance to land
// before the first session would be auto-created.
let resolveStartupOrgPolicy: () => void = () => {}
const startupOrgPolicySettled = new Promise<void>((resolve) => {
  resolveStartupOrgPolicy = resolve
})

const STARTUP_ORG_POLICY_TIMEOUT_MS = 5000

/**
 * Mark the startup org-policy sync as finished. Called by App once the
 * startup refresh completes — or immediately when no refresh will run (not
 * signed in to an organization). Idempotent.
 */
export function markHiveOrgPolicySettled(): void {
  resolveStartupOrgPolicy()
}

/**
 * Resolves once the startup org-policy sync has settled, but never blocks
 * longer than a few seconds — a hung refresh falls back to the locally
 * persisted policy. Resolves immediately for users without an org login.
 */
export function whenHiveOrgPolicySettled(): Promise<void> {
  const settings = useSettingsStore.getState()
  if (!settings.isLoading && !isHiveTelemetryEnabled(settings)) return Promise.resolve()
  return Promise.race([
    startupOrgPolicySettled,
    new Promise<void>((resolve) => setTimeout(resolve, STARTUP_ORG_POLICY_TIMEOUT_MS))
  ])
}

function endpointFromSettings(settings: AppSettings): string {
  return `${settings.hiveEnterpriseServerUrl.replace(/\/+$/, '')}/api/graphql`
}

async function requestWithRefresh<TData, TVariables extends Record<string, unknown>>(
  document: string,
  variables?: TVariables,
  tokenOverride?: string
): Promise<TData> {
  const settings = useSettingsStore.getState()
  const authToken = tokenOverride ?? settings.hiveAuthToken
  if (!authToken) throw new Error('Hive Enterprise token is not set')

  const client = new GraphQLClient(endpointFromSettings(settings), {
    headers: {
      authorization: `Bearer ${authToken}`
    }
  })
  const response = await client.rawRequest<TData, TVariables>(document, variables)
  const refreshedToken = response.headers.get('x-hive-refreshed-token')
  // Only persist a refresh when acting on the already-stored token; during initial
  // login the caller is responsible for committing the token after verification.
  if (!tokenOverride && refreshedToken && refreshedToken !== settings.hiveAuthToken) {
    await useSettingsStore.getState().updateSetting('hiveAuthToken', refreshedToken)
  }
  return response.data
}

export async function fetchHiveEnterpriseMe(
  tokenOverride?: string
): Promise<GqlHiveEnterpriseMeQuery['me']> {
  const data = await requestWithRefresh<GqlHiveEnterpriseMeQuery, Record<string, never>>(
    MeDocument,
    undefined,
    tokenOverride
  )
  return data.me
}

export async function recordHivePromptStart(
  input: GqlHiveEnterpriseRecordPromptStartMutationVariables['input']
): Promise<string | null> {
  const settings = useSettingsStore.getState()
  if (!isHiveTelemetryEnabled(settings)) return null
  const payload = settings.hiveOrganizationStorePrompts === false ? { ...input, prompt: '' } : input
  try {
    const data = await requestWithRefresh<
      GqlHiveEnterpriseRecordPromptStartMutation,
      GqlHiveEnterpriseRecordPromptStartMutationVariables
    >(RecordPromptStartDocument, { input: payload })
    await reconcileOrgSettings(data.recordPromptStart)
    return data.recordPromptStart.promptId ?? null
  } catch (error) {
    console.warn('[HiveEnterprise] recordPromptStart failed:', error)
    return null
  }
}

export async function recordHivePromptIdle(
  input: GqlHiveEnterpriseRecordPromptIdleMutationVariables['input']
): Promise<void> {
  const settings = useSettingsStore.getState()
  if (!isHiveTelemetryEnabled(settings)) return
  try {
    const data = await requestWithRefresh<
      GqlHiveEnterpriseRecordPromptIdleMutation,
      GqlHiveEnterpriseRecordPromptIdleMutationVariables
    >(RecordPromptIdleDocument, { input })
    await reconcileOrgSettings(data.recordPromptIdle)
  } catch (error) {
    console.warn('[HiveEnterprise] recordPromptIdle failed:', error)
  }
}

export async function recordHiveQuestionsAnswered(
  input: GqlHiveEnterpriseRecordQuestionsAnsweredMutationVariables['input']
): Promise<void> {
  const settings = useSettingsStore.getState()
  if (!isHiveTelemetryEnabled(settings)) return
  if (settings.hiveOrganizationRecordQuestions === false) return
  try {
    const data = await requestWithRefresh<
      GqlHiveEnterpriseRecordQuestionsAnsweredMutation,
      GqlHiveEnterpriseRecordQuestionsAnsweredMutationVariables
    >(RecordQuestionsAnsweredDocument, { input })
    await reconcileOrgSettings(data.recordQuestionsAnswered)
  } catch (error) {
    console.warn('[HiveEnterprise] recordQuestionsAnswered failed:', error)
  }
}

/**
 * Report the caller's current active account(s) so hive-enterprise can keep
 * its member↔account mapping fresh. The server upserts one row per (member,
 * provider) — this always sends the full snapshot, never a partial diff — and
 * echoes org settings back like the other telemetry mutations. Cadence
 * (immediate-on-change vs hourly heartbeat) and dedupe live in the caller
 * (`hive-account-report.ts`); this helper is a thin, fire-and-forget-safe
 * transport that just reports success/failure.
 */
export async function reportHiveActiveAccounts(
  accounts: GqlHiveEnterpriseReportActiveAccountsMutationVariables['accounts']
): Promise<boolean> {
  const settings = useSettingsStore.getState()
  if (!isHiveTelemetryEnabled(settings)) return false
  try {
    const data = await requestWithRefresh<
      GqlHiveEnterpriseReportActiveAccountsMutation,
      GqlHiveEnterpriseReportActiveAccountsMutationVariables
    >(ReportActiveAccountsDocument, { accounts })
    await reconcileOrgSettings(data.reportActiveAccounts)
    return data.reportActiveAccounts.recorded
  } catch (error) {
    console.warn('[HiveEnterprise] reportActiveAccounts failed:', error)
    return false
  }
}

/**
 * Fetch the org's member↔active-account mapping for the usage popover's
 * avatar stack. Every org member (dev role included) can read this — the
 * server resolves org from the JWT, not a client-supplied id. Returns null on
 * error or when telemetry is disabled so callers can distinguish "nothing to
 * show" from "should render an empty state".
 */
export async function fetchHiveAccountMembers(): Promise<
  GqlHiveEnterpriseListAccountMembersQuery['listAccountMembers'] | null
> {
  const settings = useSettingsStore.getState()
  if (!isHiveTelemetryEnabled(settings)) return null
  try {
    const data = await requestWithRefresh<
      GqlHiveEnterpriseListAccountMembersQuery,
      Record<string, never>
    >(ListAccountMembersDocument)
    return data.listAccountMembers
  } catch (error) {
    console.warn('[HiveEnterprise] listAccountMembers failed:', error)
    return null
  }
}

export interface CreatedAccountShare {
  token: string
  expiresAt: string
}

/**
 * Store an already-encrypted account payload as a one-time share on the
 * hive-enterprise server. The encryption key must NOT be passed here — it
 * belongs only in the generated hive:// link. Throws when the Hive Enterprise
 * token is not configured (share links require a connected server).
 */
export async function createHiveAccountShare(
  provider: 'anthropic' | 'openai',
  encryptedPayload: string
): Promise<CreatedAccountShare> {
  const data = await requestWithRefresh<
    { createAccountShare: CreatedAccountShare },
    { provider: string; encryptedPayload: string }
  >(CreateAccountShareDocument, { provider, encryptedPayload })
  return data.createAccountShare
}

export async function completeHiveEnterpriseLogin(token: string): Promise<void> {
  // Verify the token before persisting anything so a failed lookup can't leave a
  // stored token without an associated identity. Commit token + identity atomically.
  const me = await fetchHiveEnterpriseMe(token)
  await useSettingsStore.getState().updateSettings({
    hiveAuthToken: token,
    hiveLoggedInEmail: me?.email ?? null,
    hiveOrganizationId: me?.organization?.id ?? null,
    hiveOrganizationName: me?.organization?.name ?? null,
    hiveOrganizationStorePrompts: me?.organization?.storePrompts ?? true,
    hiveOrganizationRecordQuestions: me?.organization?.recordQuestions ?? true,
    hiveOrganizationForceBoardMode: me?.organization?.forceBoardMode ?? false,
    hiveOrganizationMinAppVersion: me?.organization?.minAppVersion ?? null
  })
}

// Every telemetry mutation echoes the org settings back, so each response is a
// chance to converge the local cache without an extra round-trip.
async function reconcileOrgSettings(result: {
  storePrompts?: boolean | null
  recordQuestions?: boolean | null
  forceBoardMode?: boolean | null
  minAppVersion?: string | null
}): Promise<void> {
  const state = useSettingsStore.getState()
  const updates: Partial<AppSettings> = {}
  if (
    typeof result.storePrompts === 'boolean' &&
    result.storePrompts !== state.hiveOrganizationStorePrompts
  ) {
    updates.hiveOrganizationStorePrompts = result.storePrompts
  }
  if (
    typeof result.recordQuestions === 'boolean' &&
    result.recordQuestions !== state.hiveOrganizationRecordQuestions
  ) {
    updates.hiveOrganizationRecordQuestions = result.recordQuestions
  }
  if (
    typeof result.forceBoardMode === 'boolean' &&
    result.forceBoardMode !== state.hiveOrganizationForceBoardMode
  ) {
    updates.hiveOrganizationForceBoardMode = result.forceBoardMode
  }
  // Absent (old server) is not the same as null (policy cleared) — only
  // reconcile when the server actually sent the field.
  if (
    result.minAppVersion !== undefined &&
    (result.minAppVersion ?? null) !== state.hiveOrganizationMinAppVersion
  ) {
    updates.hiveOrganizationMinAppVersion = result.minAppVersion ?? null
  }
  if (Object.keys(updates).length > 0) {
    await useSettingsStore.getState().updateSettings(updates)
  }
}

export async function refreshHiveEnterpriseOrg(): Promise<void> {
  const settings = useSettingsStore.getState()
  if (!isHiveTelemetryEnabled(settings)) return
  try {
    const me = await fetchHiveEnterpriseMe()
    await useSettingsStore.getState().updateSettings({
      hiveLoggedInEmail: me?.email ?? null,
      hiveOrganizationId: me?.organization?.id ?? null,
      hiveOrganizationName: me?.organization?.name ?? null,
      hiveOrganizationStorePrompts: me?.organization?.storePrompts ?? true,
      hiveOrganizationRecordQuestions: me?.organization?.recordQuestions ?? true,
      hiveOrganizationForceBoardMode: me?.organization?.forceBoardMode ?? false,
      hiveOrganizationMinAppVersion: me?.organization?.minAppVersion ?? null
    })
  } catch (error) {
    console.warn('[HiveEnterprise] org refresh failed:', error)
  }
}
