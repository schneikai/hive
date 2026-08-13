import { execFile, type ExecFileException } from 'child_process'
import { platform, userInfo } from 'os'
import { createLogger } from './logger'

const log = createLogger({ component: 'Keychain' })

/**
 * `security`'s documented exit code for errSecItemNotFound. Preferred over
 * the message regex below, which is fragile to macOS wording drift across
 * OS versions/locales.
 */
const ERR_SEC_ITEM_NOT_FOUND_CODE = 44

function isItemNotFoundError(error: unknown): boolean {
  const code = (error as ExecFileException | undefined)?.code
  if (code === ERR_SEC_ITEM_NOT_FOUND_CODE) return true

  const message = error instanceof Error ? error.message : String(error)
  return /could not be found/i.test(message)
}

function runSecurity(args: string[], timeoutMs = 5000): Promise<string> {
  const subcommand = args[0] ?? 'security'
  return new Promise((resolve, reject) => {
    // `-w <secret>` passes the secret as an argv element, so it is briefly
    // visible in the process table. ccswitch does the same; this is an accepted
    // tradeoff for Keychain-CLI parity (there is no stdin variant of
    // `add-generic-password` that also does an in-place `-U` update).
    //
    // Critically, we MUST NOT surface execFile's raw ExecFileException: its
    // `message` embeds the full command line — INCLUDING the `-w <secret>`
    // credential. That message would otherwise propagate to log.warn, the
    // saved_usage_accounts.last_error column, switchAccount error results, and
    // renderer toasts. Reject instead with only the subcommand name, the exit
    // code, and security's stderr (which never echoes `-w` values).
    execFile('security', args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const rawCode = (error as ExecFileException).code
        const trimmedStderr = typeof stderr === 'string' ? stderr.trim() : ''
        const notFound = isItemNotFoundError(error) || /could not be found/i.test(trimmedStderr)

        const parts = [`security ${subcommand} failed`]
        if (rawCode !== undefined) parts.push(`(exit ${rawCode})`)
        if (trimmedStderr) parts.push(`- ${trimmedStderr}`)

        const sanitized = new Error(parts.join(' ')) as Error & { code?: number | string }
        // Preserve not-found detection: attach the exit code so the code-44
        // check in isItemNotFoundError still fires on the sanitized error.
        const resolvedCode = rawCode ?? (notFound ? ERR_SEC_ITEM_NOT_FOUND_CODE : undefined)
        if (resolvedCode !== undefined) sanitized.code = resolvedCode
        reject(sanitized)
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

/**
 * Read a secret from the macOS Keychain's generic password store. When
 * `account` is given, only an item matching BOTH service and account is
 * returned — `find-generic-password -s` alone returns the FIRST match, which
 * is ambiguous when duplicate items share a service name (see
 * `keychainListAccounts`). Returns null when not on macOS, the item isn't
 * found, or any other error occurs.
 */
export async function keychainRead(service: string, account?: string): Promise<string | null> {
  if (platform() !== 'darwin') return null
  const args = ['find-generic-password', '-s', service]
  if (account !== undefined) args.push('-a', account)
  args.push('-w')
  try {
    const stdout = await runSecurity(args)
    return stdout || null
  } catch {
    return null
  }
}

/**
 * Write (or overwrite) a secret in the macOS Keychain's generic password
 * store. Throws on non-macOS platforms and when the underlying `security`
 * CLI call fails.
 *
 * `-U` only updates in place when an item matches BOTH service and account —
 * writing with a different account attribute than an existing item's silently
 * creates a duplicate item under the same service name. Callers that target a
 * pre-existing item (e.g. the live Claude entry the `claude` CLI owns) must
 * pass that item's actual `account` so the update lands on it.
 */
export async function keychainWrite(service: string, secret: string, account?: string): Promise<void> {
  if (platform() !== 'darwin') {
    throw new Error('Keychain is only available on macOS')
  }
  const accountAttr = account ?? process.env.USER ?? userInfo().username
  try {
    await runSecurity(['add-generic-password', '-U', '-s', service, '-a', accountAttr, '-w', secret])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn('Keychain write failed', { service, error: message })
    throw error
  }
}

/**
 * The `acct` attributes of every generic-password item whose service matches
 * `service`, in keychain order (null for items with no account attribute).
 * There is normally exactly one, but duplicates happen — e.g. Claude Code CLI
 * and an `add-generic-password -a $USER` write disagreeing on the account
 * attribute — and `find-generic-password` then resolves reads/updates against
 * whichever item happens to come first. `security` has no "find all" verb, so
 * this parses the attribute listing of `dump-keychain` (which prints item
 * attributes only — it never touches secret data, so it cannot trigger
 * permission prompts).
 *
 * Returns [] on non-macOS; throws when `security dump-keychain` itself fails
 * so callers can distinguish "no items" from "could not enumerate".
 */
export async function keychainListAccounts(service: string): Promise<Array<string | null>> {
  if (platform() !== 'darwin') return []
  const dump = await runSecurity(['dump-keychain'], 15000)
  return parseDumpAccounts(dump, service)
}

/** Exported for tests: parse `security dump-keychain` output into the acct
 * attributes of generic-password items matching `service`. */
export function parseDumpAccounts(dump: string, service: string): Array<string | null> {
  const accounts: Array<string | null> = []
  let itemClass: string | null = null
  let itemService: string | null = null
  let itemAccount: string | null = null

  const flush = (): void => {
    if (itemClass === 'genp' && itemService === service) {
      accounts.push(itemAccount)
    }
    itemClass = null
    itemService = null
    itemAccount = null
  }

  for (const line of dump.split('\n')) {
    if (line.startsWith('keychain: ')) {
      flush()
      continue
    }
    const classMatch = line.match(/^class: "(\w+)"/)
    if (classMatch) {
      itemClass = classMatch[1]
      continue
    }
    const svceMatch = line.match(/^\s*"svce"<blob>="(.*)"\s*$/)
    if (svceMatch) {
      itemService = svceMatch[1]
      continue
    }
    const acctMatch = line.match(/^\s*"acct"<blob>=(?:"(.*)"|<NULL>)\s*$/)
    if (acctMatch) {
      itemAccount = acctMatch[1] ?? null
    }
  }
  flush()

  return accounts
}

/**
 * Delete a secret from the macOS Keychain's generic password store.
 * Throws on non-macOS platforms. Deleting an item that doesn't exist is not
 * treated as an error; other `security` CLI failures are re-thrown.
 */
export async function keychainDelete(service: string): Promise<void> {
  if (platform() !== 'darwin') {
    throw new Error('Keychain is only available on macOS')
  }
  try {
    await runSecurity(['delete-generic-password', '-s', service])
  } catch (error) {
    if (isItemNotFoundError(error)) return
    const message = error instanceof Error ? error.message : String(error)
    log.warn('Keychain delete failed', { service, error: message })
    throw error
  }
}
