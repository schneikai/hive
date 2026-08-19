import simpleGit from 'simple-git'
import { detectForgeRemote, type ForgeRemote, type GitForge } from '@shared/git-forge'

export interface RepoForgeInfo {
  readonly forge: GitForge
  readonly remote: ForgeRemote
  readonly remoteUrl: string
}

/**
 * Which PR host (GitHub / GitLab) the repository at `cwd` pushes to, read from
 * its `origin` remote (falling back to the first remote). Null when there is
 * no remote, the directory is not a repo, or the host is neither GitHub nor
 * GitLab — callers treat null as "behave like before" (GitHub / `gh`).
 *
 * Never throws.
 */
export async function resolveRepoForge(
  cwd: string,
  remoteName = 'origin'
): Promise<RepoForgeInfo | null> {
  try {
    const remotes = await simpleGit(cwd).getRemotes(true)
    if (!Array.isArray(remotes) || remotes.length === 0) return null
    const target = remotes.find((candidate) => candidate.name === remoteName) ?? remotes[0]
    const url = target?.refs?.fetch || target?.refs?.push || null
    if (!url) return null
    const remote = detectForgeRemote(url)
    if (!remote) return null
    return { forge: remote.forge, remote, remoteUrl: url }
  } catch {
    return null
  }
}

export type ForgeResolver = (cwd: string) => Promise<RepoForgeInfo | null>
