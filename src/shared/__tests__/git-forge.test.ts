import { describe, expect, it } from 'vitest'
import {
  buildPullRequestUrl,
  buildRepoWebUrl,
  detectForge,
  detectForgeFromHost,
  detectForgeFromPullRequestUrl,
  detectForgeRemote,
  extractPullRequestUrl,
  normalizePullRequestState,
  parseGitRemoteUrl,
  parsePullRequestNumber,
  pullRequestHeadRef
} from '../git-forge'

describe('parseGitRemoteUrl', () => {
  it('parses https URLs with nested groups and .git suffix', () => {
    expect(parseGitRemoteUrl('https://gitlab.com/group/sub/project.git')).toEqual({
      protocol: 'https',
      host: 'gitlab.com',
      port: null,
      path: 'group/sub/project'
    })
  })

  it('parses scp-like ssh URLs', () => {
    expect(parseGitRemoteUrl('git@gitlab.tedooo.com:backend/a-team.git')).toEqual({
      protocol: 'scp',
      host: 'gitlab.tedooo.com',
      port: null,
      path: 'backend/a-team'
    })
    expect(parseGitRemoteUrl('git@github.com:acme/hive.git')).toEqual({
      protocol: 'scp',
      host: 'github.com',
      port: null,
      path: 'acme/hive'
    })
  })

  it('parses ssh:// URLs with ports', () => {
    expect(parseGitRemoteUrl('ssh://git@gitlab.tedooo.com:2222/group/project.git')).toEqual({
      protocol: 'ssh',
      host: 'gitlab.tedooo.com',
      port: 2222,
      path: 'group/project'
    })
  })

  it('strips userinfo including tokens with colons', () => {
    expect(parseGitRemoteUrl('https://oauth2:glpat-abc:def@gitlab.example.com/g/p.git')).toEqual({
      protocol: 'https',
      host: 'gitlab.example.com',
      port: null,
      path: 'g/p'
    })
  })

  it('handles trailing slashes, mixed case hosts and scp-like without user', () => {
    expect(parseGitRemoteUrl('https://GitHub.com/Acme/Hive/')).toEqual({
      protocol: 'https',
      host: 'github.com',
      port: null,
      path: 'Acme/Hive'
    })
    expect(parseGitRemoteUrl('gitlab.com:group/project')).toEqual({
      protocol: 'scp',
      host: 'gitlab.com',
      port: null,
      path: 'group/project'
    })
  })

  it('returns null for empty, local and windows-drive inputs', () => {
    expect(parseGitRemoteUrl('')).toBeNull()
    expect(parseGitRemoteUrl(null)).toBeNull()
    expect(parseGitRemoteUrl(undefined)).toBeNull()
    expect(parseGitRemoteUrl('/Users/me/repo')).toBeNull()
    expect(parseGitRemoteUrl('C:\\repos\\thing')).toBeNull()
    expect(parseGitRemoteUrl('../relative/repo')).toBeNull()
  })
})

describe('detectForgeFromHost / detectForge', () => {
  it('classifies github.com as github', () => {
    expect(detectForgeFromHost('github.com')).toBe('github')
    expect(detectForgeFromHost('GITHUB.COM')).toBe('github')
    expect(detectForgeFromHost('www.github.com')).toBe('github')
  })

  it('classifies any non-github host containing "gitlab" as gitlab', () => {
    expect(detectForgeFromHost('gitlab.com')).toBe('gitlab')
    expect(detectForgeFromHost('gitlab.tedooo.com')).toBe('gitlab')
    expect(detectForgeFromHost('my-gitlab.internal')).toBe('gitlab')
    expect(detectForgeFromHost('code.GitLab.example.org')).toBe('gitlab')
  })

  it('returns null for other hosts', () => {
    expect(detectForgeFromHost('bitbucket.org')).toBeNull()
    expect(detectForgeFromHost('git.example.com')).toBeNull()
    expect(detectForgeFromHost('')).toBeNull()
    expect(detectForgeFromHost(null)).toBeNull()
  })

  it('detects from full remote URLs', () => {
    expect(detectForge('git@github.com:acme/hive.git')).toBe('github')
    expect(detectForge('https://github.com/acme/hive')).toBe('github')
    expect(detectForge('git@gitlab.tedooo.com:backend/a-team.git')).toBe('gitlab')
    expect(detectForge('https://gitlab.com/group/sub/project.git')).toBe('gitlab')
    expect(detectForge('ssh://git@gitlab.example.com:2222/g/p.git')).toBe('gitlab')
    expect(detectForge('git@bitbucket.org:acme/hive.git')).toBeNull()
    expect(detectForge(null)).toBeNull()
    expect(detectForge('/local/path')).toBeNull()
  })

  it('detectForgeRemote carries host and path', () => {
    expect(detectForgeRemote('git@gitlab.tedooo.com:backend/a-team.git')).toEqual({
      forge: 'gitlab',
      protocol: 'scp',
      host: 'gitlab.tedooo.com',
      port: null,
      path: 'backend/a-team'
    })
    expect(detectForgeRemote('git@bitbucket.org:acme/hive.git')).toBeNull()
  })
})

describe('URL builders', () => {
  it('builds repo web URLs, keeping non-standard http(s) ports only', () => {
    expect(buildRepoWebUrl(detectForgeRemote('git@github.com:acme/hive.git')!)).toBe(
      'https://github.com/acme/hive'
    )
    expect(
      buildRepoWebUrl(detectForgeRemote('ssh://git@gitlab.tedooo.com:2222/backend/a-team.git')!)
    ).toBe('https://gitlab.tedooo.com/backend/a-team')
    expect(buildRepoWebUrl(detectForgeRemote('http://gitlab.local:8080/g/p.git')!)).toBe(
      'http://gitlab.local:8080/g/p'
    )
  })

  it('builds PR / MR URLs per forge', () => {
    expect(buildPullRequestUrl('git@github.com:acme/hive.git', 42)).toBe(
      'https://github.com/acme/hive/pull/42'
    )
    expect(buildPullRequestUrl('https://github.com/acme/hive', 7)).toBe(
      'https://github.com/acme/hive/pull/7'
    )
    expect(buildPullRequestUrl('git@gitlab.tedooo.com:backend/a-team.git', 12)).toBe(
      'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/12'
    )
    expect(buildPullRequestUrl('https://gitlab.com/group/sub/project.git', 3)).toBe(
      'https://gitlab.com/group/sub/project/-/merge_requests/3'
    )
    expect(buildPullRequestUrl('git@bitbucket.org:acme/hive.git', 1)).toBeNull()
    expect(buildPullRequestUrl(null, 1)).toBeNull()
  })

  it('returns the right head ref per forge', () => {
    expect(pullRequestHeadRef('github', 5)).toBe('pull/5/head')
    expect(pullRequestHeadRef('gitlab', 5)).toBe('merge-requests/5/head')
  })
})

describe('URL parsing', () => {
  it('extracts PR / MR URLs from CLI output', () => {
    expect(
      extractPullRequestUrl(
        'a pull request for branch "f" into branch "main" already exists:\nhttps://github.com/acme/hive/pull/42\n'
      )
    ).toBe('https://github.com/acme/hive/pull/42')
    expect(extractPullRequestUrl('https://gitlab.com/g/p/-/merge_requests/9\n')).toBe(
      'https://gitlab.com/g/p/-/merge_requests/9'
    )
    expect(extractPullRequestUrl('see https://gitlab.tedooo.com/backend/x/merge_requests/3.')).toBe(
      'https://gitlab.tedooo.com/backend/x/merge_requests/3'
    )
    expect(extractPullRequestUrl('nothing here')).toBeNull()
    expect(extractPullRequestUrl(null)).toBeNull()
  })

  it('parses PR / MR numbers from URLs', () => {
    expect(parsePullRequestNumber('https://github.com/acme/hive/pull/42')).toBe(42)
    expect(parsePullRequestNumber('https://gitlab.com/g/p/-/merge_requests/9')).toBe(9)
    expect(parsePullRequestNumber('https://gitlab.com/g/p/merge_requests/9/diffs')).toBe(9)
    expect(parsePullRequestNumber('https://github.com/acme/hive/pull/42#issuecomment-1')).toBe(42)
    expect(parsePullRequestNumber('https://github.com/acme/hive')).toBeNull()
    expect(parsePullRequestNumber(null)).toBeNull()
  })

  it('detects the forge of a PR URL', () => {
    expect(detectForgeFromPullRequestUrl('https://github.com/acme/hive/pull/42')).toBe('github')
    expect(detectForgeFromPullRequestUrl('https://gitlab.tedooo.com/b/x/-/merge_requests/3')).toBe(
      'gitlab'
    )
    expect(detectForgeFromPullRequestUrl('https://gitlab.com/g/p')).toBe('gitlab')
    expect(detectForgeFromPullRequestUrl('https://example.com/x')).toBeNull()
  })
})

describe('normalizePullRequestState', () => {
  it('maps gitlab states onto the github vocabulary', () => {
    expect(normalizePullRequestState('opened')).toBe('OPEN')
    expect(normalizePullRequestState('locked')).toBe('OPEN')
    expect(normalizePullRequestState('merged')).toBe('MERGED')
    expect(normalizePullRequestState('closed')).toBe('CLOSED')
  })

  it('passes github states through upper-cased', () => {
    expect(normalizePullRequestState('OPEN')).toBe('OPEN')
    expect(normalizePullRequestState('MERGED')).toBe('MERGED')
    expect(normalizePullRequestState('CLOSED')).toBe('CLOSED')
    expect(normalizePullRequestState('')).toBe('')
    expect(normalizePullRequestState(undefined)).toBe('')
  })
})
