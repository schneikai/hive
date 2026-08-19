/**
 * GitLab merge-request operations driven through the `glab` CLI.
 *
 * Mirrors what the GitHub path does with `gh` (create / merge / list / view /
 * review comments) so the rest of Hive can stay "PR"-shaped: MR iids are
 * reported as `number`, `web_url` as `url`, and MR states are normalised to
 * the GitHub vocabulary (OPEN / MERGED / CLOSED).
 *
 * `glab` resolves the GitLab host from the repository's git remotes and needs
 * `glab auth login --hostname <host>` to have been run once per host — the
 * error mapper below turns the raw CLI failure into that instruction.
 *
 * Every function takes the command runner as a parameter so both the server
 * RPC domain (injectable `runCommand`) and the Electron main Effect layer can
 * share one implementation and tests can stub the CLI.
 */
import type { PRReviewComment } from '@shared/types/git'
import {
  buildPullRequestUrl,
  buildRepoWebUrl,
  detectForgeRemote,
  extractPullRequestUrl,
  normalizePullRequestState,
  parsePullRequestNumber,
  type ForgeRemote
} from '@shared/git-forge'

export interface CliCommandResult {
  readonly stdout: string
  readonly stderr: string
}

export type CliCommandRunner = (
  file: string,
  args: ReadonlyArray<string>,
  options: { readonly cwd: string; readonly maxBuffer?: number }
) => Promise<CliCommandResult>

export const GLAB_NOT_INSTALLED_ERROR = 'GitLab CLI (glab) is not installed'

export const glabNotAuthenticatedError = (host?: string | null): string =>
  host
    ? `GitLab CLI (glab) is not authenticated for ${host}. Run \`glab auth login --hostname ${host}\` and try again.`
    : 'GitLab CLI (glab) is not authenticated for this GitLab host. Run `glab auth login --hostname <host>` and try again.'

const errorText = (error: unknown): { message: string; stderr: string } => {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error
      ? String((error as { stderr: unknown }).stderr ?? '').trim()
      : ''
  return { message, stderr }
}

const isNotInstalled = (text: string): boolean =>
  /\bENOENT\b|glab: command not found|spawn glab/i.test(text)

const isNotAuthenticated = (text: string): boolean =>
  /none of the git remotes .* known gitlab host|glab auth login|\b401\b|unauthorized|no token found|not authenticated|authentication required/i.test(
    text
  )

/**
 * Human-readable message for a failed glab invocation. `host` (when known)
 * makes the auth instruction copy-pasteable.
 */
export function describeGlabError(error: unknown, host?: string | null): string {
  const { message, stderr } = errorText(error)
  const combined = `${stderr}\n${message}`
  if (isNotInstalled(combined)) return GLAB_NOT_INSTALLED_ERROR
  if (isNotAuthenticated(combined)) return glabNotAuthenticatedError(host)
  if (/\b404\b|not found/i.test(combined) && /merge.?request/i.test(combined)) {
    return 'Merge request not found'
  }
  return (stderr || message).trim() || 'GitLab CLI (glab) failed'
}

export const isGlabNotInstalledError = (error: unknown): boolean => {
  const { message, stderr } = errorText(error)
  return isNotInstalled(`${stderr}\n${message}`)
}

// ---------------------------------------------------------------------------
// JSON helpers — glab `-F json` prints the raw GitLab API object (snake_case);
// accept camelCase too in case a future glab version reshapes it.
// ---------------------------------------------------------------------------

type JsonRecord = Record<string, unknown>

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null

const pick = <T>(record: JsonRecord | null, keys: string[], guard: (v: unknown) => v is T): T | null => {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (guard(value)) return value
  }
  return null
}

const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const parseJsonLoose = (text: string): unknown => {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    // glab may print a warning/notice line before the JSON (e.g. update
    // check) — retry from the first JSON bracket.
    const start = Math.min(
      ...['{', '['].map((c) => trimmed.indexOf(c)).filter((i) => i >= 0)
    )
    if (!Number.isFinite(start)) return null
    try {
      return JSON.parse(trimmed.slice(start))
    } catch {
      return null
    }
  }
}

export interface GitLabMergeRequestInfo {
  readonly iid: number
  readonly title: string
  /** Normalised: OPEN | MERGED | CLOSED */
  readonly state: string
  /** Raw GitLab state: opened | merged | closed | locked */
  readonly rawState: string
  readonly sourceBranch: string
  readonly targetBranch: string
  readonly webUrl: string
  readonly author: string
}

export const parseMergeRequestRecord = (value: unknown): GitLabMergeRequestInfo | null => {
  const record = asRecord(value)
  if (!record) return null
  const iid = pick(record, ['iid', 'number'], isNumber)
  if (iid === null) return null
  const author = asRecord(record.author)
  const rawState = pick(record, ['state'], isString) ?? ''
  return {
    iid,
    title: pick(record, ['title'], isString) ?? '',
    state: normalizePullRequestState(rawState),
    rawState,
    sourceBranch: pick(record, ['source_branch', 'sourceBranch'], isString) ?? '',
    targetBranch: pick(record, ['target_branch', 'targetBranch'], isString) ?? '',
    webUrl: pick(record, ['web_url', 'webUrl'], isString) ?? '',
    author: pick(author, ['username', 'login', 'name'], isString) ?? ''
  }
}

// ---------------------------------------------------------------------------
// Remote resolution
// ---------------------------------------------------------------------------

export interface GitLabRepoContext {
  readonly remote: ForgeRemote | null
  readonly remoteUrl: string | null
}

const hostOf = (ctx: GitLabRepoContext | null | undefined): string | null =>
  ctx?.remote?.host ?? null

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export interface GitLabCreateMergeRequestOptions {
  readonly baseBranch: string
  readonly title: string
  readonly body: string
}

export interface GitLabCreateMergeRequestResult {
  readonly success: boolean
  readonly url?: string
  readonly number?: number
  readonly error?: string
}

const currentBranch = async (run: CliCommandRunner, cwd: string): Promise<string | null> => {
  try {
    const { stdout } = await run('git', ['branch', '--show-current'], { cwd })
    const name = stdout.trim()
    return name || null
  } catch {
    return null
  }
}

/** Open MR whose source branch is `branch`, if any (used to recover "already exists"). */
export async function glabFindOpenMergeRequestForBranch(
  run: CliCommandRunner,
  cwd: string,
  branch: string
): Promise<GitLabMergeRequestInfo | null> {
  try {
    const { stdout } = await run(
      'glab',
      ['mr', 'list', '-F', 'json', '--source-branch', branch, '--per-page', '20'],
      { cwd, maxBuffer: 8 * 1024 * 1024 }
    )
    const parsed = parseJsonLoose(stdout)
    if (!Array.isArray(parsed)) return null
    const candidates = parsed
      .map(parseMergeRequestRecord)
      .filter((mr): mr is GitLabMergeRequestInfo => mr !== null && mr.sourceBranch === branch)
    return candidates.find((mr) => mr.rawState === 'opened') ?? candidates[0] ?? null
  } catch {
    return null
  }
}

/**
 * `glab mr create` — non-interactive. Prints the MR web URL on stdout; when
 * an open MR already exists for the branch GitLab answers 409 with
 * "Another open merge request already exists for this source branch: !N".
 */
export async function glabCreateMergeRequest(
  run: CliCommandRunner,
  cwd: string,
  ctx: GitLabRepoContext,
  options: GitLabCreateMergeRequestOptions
): Promise<GitLabCreateMergeRequestResult> {
  const { baseBranch, title } = options
  // glab treats a description of exactly "-" as "open an editor" — never do that.
  const body = options.body === '-' ? '- ' : options.body
  try {
    const { stdout, stderr } = await run(
      'glab',
      [
        'mr',
        'create',
        '--target-branch',
        baseBranch,
        '--title',
        title,
        '--description',
        body,
        '--yes'
      ],
      { cwd }
    )
    let url = extractPullRequestUrl(stdout) ?? extractPullRequestUrl(stderr)
    let number = parsePullRequestNumber(url)
    if (!url || !number) {
      // Older glab builds print a table rather than the bare URL — look the MR up.
      const branch = await currentBranch(run, cwd)
      const mr = branch ? await glabFindOpenMergeRequestForBranch(run, cwd, branch) : null
      if (mr) {
        number = mr.iid
        url = mr.webUrl || buildPullRequestUrl(ctx.remoteUrl, mr.iid) || url
      }
    }
    if (!url || !number) {
      return {
        success: false,
        error: `Merge request was created but its URL could not be determined.\n${(stdout + stderr).trim()}`.trim()
      }
    }
    return { success: true, url, number }
  } catch (error) {
    const { message, stderr } = errorText(error)
    const combined = `${stderr}\n${message}`
    if (/already exists/i.test(combined)) {
      const iidMatch = combined.match(/already exists[^!\n]*!(\d+)/i)
      let number = iidMatch ? parseInt(iidMatch[1], 10) : null
      let url = extractPullRequestUrl(combined)
      if (!number && url) number = parsePullRequestNumber(url)
      if (!number) {
        const branch = await currentBranch(run, cwd)
        const mr = branch ? await glabFindOpenMergeRequestForBranch(run, cwd, branch) : null
        if (mr) {
          number = mr.iid
          url = mr.webUrl || url
        }
      }
      if (number && !url) url = buildPullRequestUrl(ctx.remoteUrl, number)
      return {
        success: false,
        error: describeGlabError(error, hostOf(ctx)),
        ...(url ? { url } : {}),
        ...(number ? { number } : {})
      }
    }
    return { success: false, error: describeGlabError(error, hostOf(ctx)) }
  }
}

/**
 * `glab mr merge <iid>` — plain merge commit, source branch kept (parity with
 * `gh pr merge --merge`). Auto-merge is disabled so the call either merges now
 * or fails; otherwise glab would arm merge-when-pipeline-succeeds and exit 0
 * while the MR is still open.
 */
export async function glabMergeMergeRequest(
  run: CliCommandRunner,
  cwd: string,
  ctx: GitLabRepoContext | null,
  number: number
): Promise<{ success: boolean; error?: string }> {
  const base = ['mr', 'merge', String(number), '--yes']
  try {
    await run('glab', [...base, '--auto-merge=false'], { cwd })
    return { success: true }
  } catch (error) {
    const { message, stderr } = errorText(error)
    if (/unknown flag.*auto-merge/i.test(`${stderr}\n${message}`)) {
      // Old glab without --auto-merge: fall back to the default behaviour.
      try {
        await run('glab', base, { cwd })
        return { success: true }
      } catch (retryError) {
        return { success: false, error: describeMergeError(retryError, hostOf(ctx)) }
      }
    }
    return { success: false, error: describeMergeError(error, hostOf(ctx)) }
  }
}

const describeMergeError = (error: unknown, host: string | null): string => {
  const { message, stderr } = errorText(error)
  const combined = `${stderr}\n${message}`
  if (/\b405\b|\b406\b|not mergeable|cannot be merged|merge status/i.test(combined)) {
    return `Merge request cannot be merged yet (pipeline still running, approvals missing, or conflicts).\n${(stderr || message).trim()}`
  }
  return describeGlabError(error, host)
}

/** `glab mr view <iid> -F json` */
export async function glabGetMergeRequest(
  run: CliCommandRunner,
  cwd: string,
  number: number
): Promise<GitLabMergeRequestInfo | null> {
  const { stdout } = await run('glab', ['mr', 'view', String(number), '-F', 'json'], {
    cwd,
    maxBuffer: 8 * 1024 * 1024
  })
  return parseMergeRequestRecord(parseJsonLoose(stdout))
}

/** `glab mr list -F json` — open MRs, newest first (GitLab default order). */
export async function glabListOpenMergeRequests(
  run: CliCommandRunner,
  cwd: string
): Promise<GitLabMergeRequestInfo[]> {
  const { stdout } = await run('glab', ['mr', 'list', '-F', 'json', '--per-page', '100'], {
    cwd,
    maxBuffer: 16 * 1024 * 1024
  })
  const parsed = parseJsonLoose(stdout)
  if (!Array.isArray(parsed)) return []
  return parsed
    .map(parseMergeRequestRecord)
    .filter((mr): mr is GitLabMergeRequestInfo => mr !== null)
    .filter((mr) => !mr.rawState || mr.rawState === 'opened' || mr.rawState === 'locked')
}

// ---------------------------------------------------------------------------
// Review comments (MR diff discussions)
// ---------------------------------------------------------------------------

/**
 * GraphQL mirrors the GitHub path: it is the only API that returns rendered
 * `bodyHtml`. `truncatedDiffLines` is deliberately NOT requested — older
 * self-hosted instances lack it and an unknown field fails the whole query.
 */
export const GITLAB_MR_DISCUSSIONS_QUERY =
  'query($fullPath:ID!,$iid:String!,$after:String){project(fullPath:$fullPath){mergeRequest(iid:$iid){targetBranch discussions(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{id notes(first:100){nodes{id body bodyHtml system createdAt updatedAt author{username avatarUrl}position{positionType filePath oldPath newPath oldLine newLine}}}}}}}}'

interface GqlNote {
  readonly id?: string
  readonly body?: string | null
  readonly bodyHtml?: string | null
  readonly system?: boolean
  readonly createdAt?: string
  readonly updatedAt?: string
  readonly author?: { readonly username?: string; readonly avatarUrl?: string | null } | null
  readonly position?: {
    readonly positionType?: string
    readonly filePath?: string | null
    readonly oldPath?: string | null
    readonly newPath?: string | null
    readonly oldLine?: number | null
    readonly newLine?: number | null
  } | null
}

interface GqlDiscussion {
  readonly id?: string
  readonly notes?: { readonly nodes?: ReadonlyArray<GqlNote | null> | null } | null
}

interface GqlDiscussionsPage {
  readonly errors?: ReadonlyArray<{ readonly message?: string }>
  readonly data?: {
    readonly project?: {
      readonly mergeRequest?: {
        readonly targetBranch?: string | null
        readonly discussions?: {
          readonly pageInfo?: { readonly hasNextPage?: boolean; readonly endCursor?: string | null }
          readonly nodes?: ReadonlyArray<GqlDiscussion | null> | null
        } | null
      } | null
    } | null
  }
}

/** `gid://gitlab/DiffNote/123` → 123 */
export const parseGitLabGlobalId = (gid: string | null | undefined): number | null => {
  if (!gid) return null
  const match = /(\d+)\s*$/.exec(gid)
  if (!match) return null
  const value = parseInt(match[1], 10)
  return Number.isFinite(value) ? value : null
}

const absoluteAvatarUrl = (avatarUrl: string | null | undefined, ctx: GitLabRepoContext): string => {
  if (!avatarUrl) return ''
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl
  if (!ctx.remote) return avatarUrl
  const origin = buildRepoWebUrl({ ...ctx.remote, path: '' }).replace(/\/+$/, '')
  return avatarUrl.startsWith('/') ? `${origin}${avatarUrl}` : `${origin}/${avatarUrl}`
}

/**
 * Map one GraphQL discussion onto the renderer's PRReviewComment shape.
 * Only diff-anchored discussions (root note carries a `position`) are kept —
 * GitHub's reviewThreads likewise exclude general conversation comments.
 */
export const mapGitLabDiscussionToComments = (
  discussion: GqlDiscussion,
  ctx: GitLabRepoContext
): PRReviewComment[] => {
  const notes = (discussion.notes?.nodes ?? []).filter(
    (note): note is GqlNote => !!note && !note.system
  )
  if (notes.length === 0) return []
  const root = notes[0]
  const position = root.position ?? notes.find((n) => n.position)?.position ?? null
  if (!position) return []

  const rootId = parseGitLabGlobalId(root.id)
  if (rootId === null) return []
  const path = position.newPath || position.oldPath || position.filePath || ''
  const line = typeof position.newLine === 'number' ? position.newLine : null
  const originalLine = typeof position.oldLine === 'number' ? position.oldLine : null
  const side: 'LEFT' | 'RIGHT' = line === null && originalLine !== null ? 'LEFT' : 'RIGHT'
  const subjectType: 'line' | 'file' = position.positionType === 'text' ? 'line' : 'file'

  const comments: PRReviewComment[] = []
  notes.forEach((note, index) => {
    const id = parseGitLabGlobalId(note.id)
    if (id === null) return
    comments.push({
      id,
      body: note.body ?? '',
      bodyHTML: note.bodyHtml ?? '',
      path,
      line: subjectType === 'line' ? line : null,
      originalLine: subjectType === 'line' ? originalLine : null,
      side,
      diffHunk: '',
      user: {
        login: note.author?.username ?? 'ghost',
        avatarUrl: absoluteAvatarUrl(note.author?.avatarUrl, ctx)
      },
      createdAt: note.createdAt ?? '',
      updatedAt: note.updatedAt ?? '',
      inReplyToId: index === 0 ? null : rootId,
      pullRequestReviewId: null,
      subjectType
    })
  })
  return comments
}

export interface GitLabReviewCommentsResult {
  readonly success: boolean
  readonly comments?: PRReviewComment[]
  readonly baseBranch?: string
  readonly error?: string
}

/**
 * Fetch every diff discussion of an MR through `glab api graphql`, paging
 * the `discussions` connection manually (the `$after` variable is omitted on
 * the first page so it resolves to null).
 */
export async function glabGetMergeRequestReviewComments(
  run: CliCommandRunner,
  cwd: string,
  ctx: GitLabRepoContext,
  number: number
): Promise<GitLabReviewCommentsResult> {
  const fullPath = ctx.remote?.path
  if (!fullPath) {
    return { success: false, error: 'Could not determine the GitLab project path from the origin remote' }
  }
  try {
    const comments: PRReviewComment[] = []
    let baseBranch: string | undefined
    let after: string | null = null
    for (let page = 0; page < 50; page++) {
      const args = [
        'api',
        'graphql',
        '-f',
        `query=${GITLAB_MR_DISCUSSIONS_QUERY}`,
        '-f',
        `fullPath=${fullPath}`,
        '-f',
        `iid=${number}`
      ]
      if (after) args.push('-f', `after=${after}`)
      const { stdout } = await run('glab', args, { cwd, maxBuffer: 16 * 1024 * 1024 })
      const response = parseJsonLoose(stdout) as GqlDiscussionsPage | null
      if (!response) {
        return { success: false, error: 'Unexpected response from glab api graphql' }
      }
      if (response.errors?.length) {
        return { success: false, error: response.errors[0]?.message ?? 'GraphQL error' }
      }
      const mergeRequest = response.data?.project?.mergeRequest
      if (!mergeRequest) return { success: false, error: 'Merge request not found' }
      if (mergeRequest.targetBranch) baseBranch = mergeRequest.targetBranch
      for (const discussion of mergeRequest.discussions?.nodes ?? []) {
        if (discussion) comments.push(...mapGitLabDiscussionToComments(discussion, ctx))
      }
      const pageInfo = mergeRequest.discussions?.pageInfo
      if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break
      after = pageInfo.endCursor
    }
    return { success: true, comments, baseBranch }
  } catch (error) {
    return { success: false, error: describeGlabError(error, hostOf(ctx)) }
  }
}

// ---------------------------------------------------------------------------
// Convenience: build a GitLabRepoContext from a remote URL
// ---------------------------------------------------------------------------

export const gitlabRepoContextFromRemoteUrl = (
  remoteUrl: string | null | undefined
): GitLabRepoContext => ({
  remote: detectForgeRemote(remoteUrl),
  remoteUrl: remoteUrl ?? null
})
