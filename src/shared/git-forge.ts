/**
 * Git "forge" detection — which pull-request host a remote lives on.
 *
 * Hive speaks to GitHub through `gh` and to GitLab through `glab`; everything
 * that needs to branch on the host (PR creation/merge/list/state, review
 * comments, PR URL construction, `pull/N/head` vs `merge-requests/N/head`
 * fetch refs) goes through the helpers in this file so the rule lives in one
 * place.
 *
 * Rule (product decision): `github.com` is GitHub; any OTHER host whose name
 * contains "gitlab" anywhere (gitlab.com, gitlab.example.com, my-gitlab.corp)
 * is GitLab. Everything else is unsupported — no PR button.
 *
 * Pure module: safe to import from main, server and renderer.
 */

export type GitForge = 'github' | 'gitlab'

export interface ParsedGitRemote {
  /** 'ssh' | 'https' | 'http' | 'git' | 'file' | 'scp' (git@host:path form) | other scheme */
  readonly protocol: string
  /** Lower-cased host name, without port or userinfo */
  readonly host: string
  /** Explicit port when the URL carried one, else null */
  readonly port: number | null
  /** Repository path: no leading slash, no trailing slash, no `.git` suffix */
  readonly path: string
}

export interface ForgeRemote extends ParsedGitRemote {
  readonly forge: GitForge
}

export const FORGE_LABEL: Readonly<Record<GitForge, string>> = {
  github: 'GitHub',
  gitlab: 'GitLab'
}

export const FORGE_CLI: Readonly<Record<GitForge, string>> = {
  github: 'gh',
  gitlab: 'glab'
}

const SCHEME_URL = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/(.+)$/
// user@host:path or host:path — but never a Windows drive (C:\...) or a scheme URL.
const SCP_LIKE = /^(?:([^@/\s]+)@)?([^:/\s]+):(?!\/\/)(.*)$/

const stripPathDecorations = (path: string): string =>
  path
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')

/**
 * Parse a git remote URL into protocol/host/port/path. Handles
 * `https://host/group/sub/repo.git`, `ssh://git@host:2222/group/repo`,
 * `git@host:group/sub/repo.git`, `host:group/repo`, and URLs carrying
 * userinfo (`https://oauth2:token@host/g/p.git`). Returns null for anything
 * it cannot make sense of (local paths, empty strings). Never throws.
 */
export function parseGitRemoteUrl(url: string | null | undefined): ParsedGitRemote | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  const scheme = SCHEME_URL.exec(trimmed)
  if (scheme) {
    const protocol = scheme[1].toLowerCase()
    // Strip userinfo (user@ or user:pass@) — it may contain ':' so cut at the
    // last '@' before the first '/'.
    let rest = scheme[2]
    const firstSlash = rest.indexOf('/')
    const authority = firstSlash === -1 ? rest : rest.slice(0, firstSlash)
    const at = authority.lastIndexOf('@')
    if (at !== -1) rest = rest.slice(at + 1)

    const slash = rest.indexOf('/')
    const hostPort = slash === -1 ? rest : rest.slice(0, slash)
    const rawPath = slash === -1 ? '' : rest.slice(slash + 1)
    if (!hostPort) return null

    let host = hostPort
    let port: number | null = null
    const portMatch = /^(.+):(\d+)$/.exec(hostPort)
    if (portMatch) {
      host = portMatch[1]
      port = parseInt(portMatch[2], 10)
    }
    // IPv6 literal `[::1]`
    host = host.replace(/^\[(.*)\]$/, '$1').toLowerCase()
    if (!host) return null
    return { protocol, host, port, path: stripPathDecorations(rawPath) }
  }

  const scp = SCP_LIKE.exec(trimmed)
  if (scp) {
    const host = scp[2].toLowerCase()
    // `C:\path` / `c:/path` — a Windows drive, not a host.
    if (/^[a-z]$/.test(host)) return null
    return { protocol: 'scp', host, port: null, path: stripPathDecorations(scp[3]) }
  }

  return null
}

/**
 * Classify a host name. `github.com` (and `www.github.com`) → GitHub. Any other
 * host containing "gitlab" anywhere → GitLab. Else null (no PR support).
 */
export function detectForgeFromHost(host: string | null | undefined): GitForge | null {
  if (!host) return null
  const normalized = host.trim().toLowerCase().replace(/\.$/, '')
  if (!normalized) return null
  if (normalized === 'github.com' || normalized === 'www.github.com') return 'github'
  if (normalized.includes('gitlab')) return 'gitlab'
  return null
}

/** Parse a remote URL and classify its host in one go. */
export function detectForgeRemote(url: string | null | undefined): ForgeRemote | null {
  const parsed = parseGitRemoteUrl(url)
  if (!parsed) return null
  const forge = detectForgeFromHost(parsed.host)
  if (!forge) return null
  return { ...parsed, forge }
}

/** Convenience: which forge a remote URL belongs to, or null. */
export function detectForge(url: string | null | undefined): GitForge | null {
  return detectForgeRemote(url)?.forge ?? null
}

/**
 * Browser URL of the repository on its forge, e.g.
 * `https://github.com/owner/repo` or `https://gitlab.example.com/group/sub/repo`.
 * Non-standard ports are preserved for self-hosted GitLab over http(s).
 */
export function buildRepoWebUrl(remote: ForgeRemote): string {
  const isHttp = remote.protocol === 'http' || remote.protocol === 'https'
  const scheme = remote.protocol === 'http' ? 'http' : 'https'
  const port = isHttp && remote.port ? `:${remote.port}` : ''
  return `${scheme}://${remote.host}${port}/${remote.path}`
}

/**
 * Browser URL for PR/MR `number` in the repository behind `remoteUrl`.
 * GitHub: `.../pull/N`; GitLab: `.../-/merge_requests/N`. Null when the remote
 * is not on a supported forge.
 */
export function buildPullRequestUrl(
  remoteUrl: string | null | undefined,
  number: number
): string | null {
  const remote = detectForgeRemote(remoteUrl)
  if (!remote || !remote.path) return null
  const base = buildRepoWebUrl(remote)
  return remote.forge === 'github' ? `${base}/pull/${number}` : `${base}/-/merge_requests/${number}`
}

const GITHUB_PR_URL = /https?:\/\/[^\s"'<>]+\/pull\/(\d+)/
const GITLAB_MR_URL = /https?:\/\/[^\s"'<>]+\/merge_requests\/(\d+)/

/**
 * Find the first PR/MR web URL inside free text (CLI stdout/stderr). Trailing
 * punctuation from prose ("...pull/12.") is trimmed.
 */
export function extractPullRequestUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const match = GITHUB_PR_URL.exec(text) ?? GITLAB_MR_URL.exec(text)
  if (!match) return null
  return match[0].replace(/[.,;:)\]]+$/, '')
}

/** PR/MR number from a GitHub `/pull/N` or GitLab `/merge_requests/N` URL. */
export function parsePullRequestNumber(url: string | null | undefined): number | null {
  if (!url) return null
  const match = /\/(?:pull|merge_requests)\/(\d+)(?:[/?#]|$)/.exec(url)
  if (!match) return null
  const value = parseInt(match[1], 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Which forge a PR/MR web URL points at (by URL shape, then by host). */
export function detectForgeFromPullRequestUrl(url: string | null | undefined): GitForge | null {
  if (!url) return null
  if (/\/merge_requests\/\d+/.test(url)) return 'gitlab'
  if (/\/pull\/\d+/.test(url)) return 'github'
  return detectForge(url)
}

/**
 * Remote ref that fetches the head of PR/MR `number`:
 * GitHub `pull/N/head`, GitLab `merge-requests/N/head`.
 */
export function pullRequestHeadRef(forge: GitForge, number: number): string {
  return forge === 'gitlab' ? `merge-requests/${number}/head` : `pull/${number}/head`
}

/**
 * Normalise a forge-specific PR/MR state into the GitHub-style upper-case
 * vocabulary the UI already understands: OPEN | MERGED | CLOSED.
 * GitLab reports `opened` / `merged` / `closed` / `locked`.
 */
export function normalizePullRequestState(state: string | null | undefined): string {
  const value = (state ?? '').trim().toLowerCase()
  if (!value) return ''
  if (value === 'opened' || value === 'open' || value === 'locked') return 'OPEN'
  if (value === 'merged') return 'MERGED'
  if (value === 'closed') return 'CLOSED'
  return value.toUpperCase()
}
