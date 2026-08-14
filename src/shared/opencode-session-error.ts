/**
 * OpenCode reports session failures on the `session.error` event as
 * `{ name, data: { message } }` (see `EventSessionError` in the SDK types).
 *
 * Two things go wrong if that shape is not respected:
 *
 * 1. `new Error(String(payload))` yields `Error: [object Object]`, so the log
 *    says nothing and the real cause is lost.
 * 2. The renderer falls back to the bare `name`, so the user sees
 *    "UnknownError" with no hint of what actually failed.
 */

export interface OpenCodeSessionErrorPayload {
  name?: string
  data?: {
    message?: string
    providerID?: string
    statusCode?: number
  }
}

/**
 * OpenCode reports a turn the user interrupted as a session error. It is a
 * stop, not a failure, so it must not surface as one.
 */
export const OPENCODE_ABORTED_ERROR_NAME = 'MessageAbortedError'

function asPayload(error: unknown): OpenCodeSessionErrorPayload | null {
  if (typeof error !== 'object' || error === null) return null
  return error as OpenCodeSessionErrorPayload
}

export function isOpenCodeAbortedError(error: unknown): boolean {
  return asPayload(error)?.name === OPENCODE_ABORTED_ERROR_NAME
}

/** Human-readable one-liner for logs and the error banner. */
export function describeOpenCodeSessionError(error: unknown): string {
  if (typeof error === 'string' && error.trim().length > 0) return error

  const payload = asPayload(error)
  if (!payload) return 'OpenCode session failed'

  const name = typeof payload.name === 'string' ? payload.name : undefined
  const message =
    typeof payload.data?.message === 'string' && payload.data.message.trim().length > 0
      ? payload.data.message
      : undefined
  const providerID =
    typeof payload.data?.providerID === 'string' ? payload.data.providerID : undefined

  const detail = [message, providerID ? `provider: ${providerID}` : undefined]
    .filter(Boolean)
    .join(' (')
  const suffix = providerID && message ? `${detail})` : detail

  if (name && suffix) return `${name}: ${suffix}`
  // Truthiness, not ??: an empty detail string must fall through to the default.
  return name || suffix || 'OpenCode session failed'
}
