/**
 * Helpers for stopping a Claude Agent SDK turn cleanly.
 *
 * Two separate problems are handled here.
 *
 * 1. Teardown has to be bounded. `query.interrupt()` and the stream fiber
 *    interrupt both talk to a child process that may already be gone, so an
 *    unbounded await there leaves the stop button spinning with no way out.
 *
 * 2. Aborting a turn while a tool permission request is still in flight makes
 *    the bundled `claude` binary report `Tool permission request failed:
 *    AbortError: Stream closed` as a normal failed tool result. That text is
 *    produced inside the binary, so it can only be recognised by its shape.
 */

/** Upper bound for a single teardown step. */
export const ABORT_STEP_TIMEOUT_MS = 2000

/**
 * Grace period after denying in-flight permission requests, so the SDK can
 * write those replies before we interrupt the same control stream.
 */
export const ABORT_REPLY_FLUSH_MS = 25

/** Replacement output for a tool call that only failed because we stopped. */
export const STOPPED_TOOL_OUTPUT = 'Stopped by user.'

/**
 * Deliberately narrow: it must match the CLI's own permission-plumbing failure
 * and nothing else. Tool output produced by the user's code may well contain
 * the word "AbortError", and that output must keep its error styling.
 */
const PERMISSION_ABORT_ARTIFACT = /^\s*tool permission request failed:.*(aborterror|stream closed)/i

/**
 * True for the "Tool permission request failed: AbortError: Stream closed"
 * tool result that a stopped turn leaves behind.
 */
export function isPermissionAbortArtifact(text: string | null | undefined): boolean {
  if (!text) return false
  return PERMISSION_ABORT_ARTIFACT.test(text)
}

/**
 * Run one teardown step. Never rejects, and never waits longer than
 * `timeoutMs`, so a wedged transport cannot block the stop request.
 * Returns false when the step threw or ran out of time.
 */
export async function runBoundedAbortStep(
  step: () => Promise<unknown>,
  timeoutMs: number = ABORT_STEP_TIMEOUT_MS
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const settled = step().then(() => true as const)
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs)
    })
    return await Promise.race([settled, timeout])
  } catch {
    return false
  } finally {
    if (timer) clearTimeout(timer)
  }
}
