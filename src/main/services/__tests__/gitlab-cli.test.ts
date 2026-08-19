import { describe, expect, it, vi } from 'vitest'
import {
  describeGlabError,
  GITLAB_MR_DISCUSSIONS_QUERY,
  gitlabRepoContextFromRemoteUrl,
  glabCreateMergeRequest,
  glabFindOpenMergeRequestForBranch,
  glabGetMergeRequest,
  glabGetMergeRequestReviewComments,
  glabListOpenMergeRequests,
  glabMergeMergeRequest,
  mapGitLabDiscussionToComments,
  parseGitLabGlobalId,
  parseMergeRequestRecord,
  type CliCommandRunner
} from '../gitlab-cli'

const CTX = gitlabRepoContextFromRemoteUrl('git@gitlab.tedooo.com:backend/a-team.git')

const runner = (
  impl: (file: string, args: ReadonlyArray<string>) => Promise<{ stdout: string; stderr: string }>
): { run: CliCommandRunner; calls: Array<{ file: string; args: ReadonlyArray<string> }> } => {
  const calls: Array<{ file: string; args: ReadonlyArray<string> }> = []
  const run: CliCommandRunner = async (file, args, _options) => {
    calls.push({ file, args })
    return impl(file, args)
  }
  return { run, calls }
}

const execError = (message: string, stderr = ''): Error & { stderr: string } =>
  Object.assign(new Error(message), { stderr })

describe('gitlabRepoContextFromRemoteUrl', () => {
  it('derives host and full path from an scp remote', () => {
    expect(CTX.remote).toMatchObject({
      forge: 'gitlab',
      host: 'gitlab.tedooo.com',
      path: 'backend/a-team'
    })
  })
})

describe('describeGlabError', () => {
  it('maps ENOENT to a not-installed message', () => {
    expect(describeGlabError(execError('spawn glab ENOENT'))).toBe(
      'GitLab CLI (glab) is not installed'
    )
  })

  it('maps unauthenticated hosts to an auth instruction with the host name', () => {
    const error = execError(
      'ERROR: none of the git remotes configured for this repository point to a known GitLab host. Please use `glab auth login` to authenticate and configure a new host for glab.'
    )
    expect(describeGlabError(error, 'gitlab.tedooo.com')).toBe(
      'GitLab CLI (glab) is not authenticated for gitlab.tedooo.com. Run `glab auth login --hostname gitlab.tedooo.com` and try again.'
    )
  })

  it('maps 401 responses to the auth instruction', () => {
    expect(describeGlabError(execError('GET https://gitlab.com/api/v4/user: 401'), null)).toContain(
      'not authenticated'
    )
  })

  it('passes other stderr through', () => {
    expect(describeGlabError(execError('exit status 1', 'something broke'))).toBe('something broke')
  })
})

describe('parseMergeRequestRecord', () => {
  it('parses a snake_case GitLab API record and normalises state', () => {
    expect(
      parseMergeRequestRecord({
        iid: 12,
        title: 'Add thing',
        state: 'opened',
        source_branch: 'feat',
        target_branch: 'main',
        web_url: 'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/12',
        author: { username: 'mor' }
      })
    ).toEqual({
      iid: 12,
      title: 'Add thing',
      state: 'OPEN',
      rawState: 'opened',
      sourceBranch: 'feat',
      targetBranch: 'main',
      webUrl: 'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/12',
      author: 'mor'
    })
  })

  it('normalises merged and closed states', () => {
    expect(parseMergeRequestRecord({ iid: 1, state: 'merged' })?.state).toBe('MERGED')
    expect(parseMergeRequestRecord({ iid: 1, state: 'closed' })?.state).toBe('CLOSED')
    expect(parseMergeRequestRecord({ iid: 1, state: 'locked' })?.state).toBe('OPEN')
  })

  it('rejects records without an iid', () => {
    expect(parseMergeRequestRecord({ title: 'x' })).toBeNull()
    expect(parseMergeRequestRecord(null)).toBeNull()
  })
})

describe('glabCreateMergeRequest', () => {
  it('creates an MR non-interactively and parses the URL from stdout', async () => {
    const { run, calls } = runner(async () => ({
      stdout: '!13 Add thing (feat)\n https://gitlab.tedooo.com/backend/a-team/-/merge_requests/13\n',
      stderr: ''
    }))

    const result = await glabCreateMergeRequest(run, '/repo', CTX, {
      baseBranch: 'main',
      title: 'Add thing',
      body: 'Body text'
    })

    expect(result).toEqual({
      success: true,
      url: 'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/13',
      number: 13
    })
    expect(calls[0]).toEqual({
      file: 'glab',
      args: [
        'mr',
        'create',
        '--target-branch',
        'main',
        '--title',
        'Add thing',
        '--description',
        'Body text',
        '--yes'
      ]
    })
  })

  it('recovers the MR via mr list when stdout has no URL', async () => {
    const { run, calls } = runner(async (file, args) => {
      if (file === 'glab' && args[1] === 'create') return { stdout: '!7 Add thing (feat)\n', stderr: '' }
      if (file === 'git') return { stdout: 'feat\n', stderr: '' }
      if (file === 'glab' && args[1] === 'list') {
        return {
          stdout: JSON.stringify([
            {
              iid: 7,
              state: 'opened',
              source_branch: 'feat',
              web_url: 'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/7'
            }
          ]),
          stderr: ''
        }
      }
      throw new Error(`unexpected ${file} ${args.join(' ')}`)
    })

    const result = await glabCreateMergeRequest(run, '/repo', CTX, {
      baseBranch: 'main',
      title: 'Add thing',
      body: ''
    })

    expect(result).toEqual({
      success: true,
      url: 'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/7',
      number: 7
    })
    expect(calls.map((c) => `${c.file} ${c.args.slice(0, 2).join(' ')}`)).toEqual([
      'glab mr create',
      'git branch --show-current',
      'glab mr list'
    ])
  })

  it('returns the existing MR details when one already exists for the branch', async () => {
    const { run } = runner(async (file, args) => {
      if (file === 'glab' && args[1] === 'create') {
        throw execError(
          'exit status 1',
          'ERROR: 409 Conflict: Another open merge request already exists for this source branch: !4'
        )
      }
      if (file === 'git') return { stdout: 'feat\n', stderr: '' }
      throw new Error(`unexpected ${file} ${args.join(' ')}`)
    })

    const result = await glabCreateMergeRequest(run, '/repo', CTX, {
      baseBranch: 'main',
      title: 'Add thing',
      body: ''
    })

    expect(result.success).toBe(false)
    expect(result.number).toBe(4)
    expect(result.url).toBe('https://gitlab.tedooo.com/backend/a-team/-/merge_requests/4')
    expect(result.error).toContain('already exists')
  })

  it('never passes a bare "-" description (glab would open an editor)', async () => {
    const { run, calls } = runner(async () => ({
      stdout: 'https://gitlab.tedooo.com/backend/a-team/-/merge_requests/2\n',
      stderr: ''
    }))

    await glabCreateMergeRequest(run, '/repo', CTX, { baseBranch: 'main', title: 't', body: '-' })

    const descriptionIndex = calls[0].args.indexOf('--description')
    expect(calls[0].args[descriptionIndex + 1]).not.toBe('-')
  })

  it('maps a missing glab binary to the not-installed error', async () => {
    const { run } = runner(async () => {
      throw execError('spawn glab ENOENT')
    })

    const result = await glabCreateMergeRequest(run, '/repo', CTX, {
      baseBranch: 'main',
      title: 't',
      body: ''
    })
    expect(result).toEqual({ success: false, error: 'GitLab CLI (glab) is not installed' })
  })
})

describe('glabMergeMergeRequest', () => {
  it('merges with auto-merge disabled and --yes', async () => {
    const { run, calls } = runner(async () => ({ stdout: '', stderr: '' }))
    const result = await glabMergeMergeRequest(run, '/repo', CTX, 12)
    expect(result).toEqual({ success: true })
    expect(calls[0]).toEqual({
      file: 'glab',
      args: ['mr', 'merge', '12', '--yes', '--auto-merge=false']
    })
  })

  it('falls back to the plain merge on old glab without --auto-merge', async () => {
    const { run, calls } = runner(async (_file, args) => {
      if (args.includes('--auto-merge=false')) {
        throw execError('unknown flag: --auto-merge')
      }
      return { stdout: '', stderr: '' }
    })
    const result = await glabMergeMergeRequest(run, '/repo', CTX, 12)
    expect(result).toEqual({ success: true })
    expect(calls[1].args).toEqual(['mr', 'merge', '12', '--yes'])
  })

  it('reports non-mergeable MRs with a helpful message', async () => {
    const { run } = runner(async () => {
      throw execError('exit status 1', 'PUT ...: 405 Method Not Allowed')
    })
    const result = await glabMergeMergeRequest(run, '/repo', CTX, 12)
    expect(result.success).toBe(false)
    expect(result.error).toContain('cannot be merged yet')
  })
})

describe('glabGetMergeRequest / glabListOpenMergeRequests', () => {
  it('reads MR state via mr view -F json', async () => {
    const { run, calls } = runner(async () => ({
      stdout: JSON.stringify({ iid: 3, title: 'T', state: 'merged', target_branch: 'main' }),
      stderr: ''
    }))
    const mr = await glabGetMergeRequest(run, '/repo', 3)
    expect(mr).toMatchObject({ iid: 3, state: 'MERGED', targetBranch: 'main' })
    expect(calls[0].args).toEqual(['mr', 'view', '3', '-F', 'json'])
  })

  it('lists open MRs and tolerates a notice line before the JSON', async () => {
    const { run, calls } = runner(async () => ({
      stdout:
        'A new version of glab has been released\n' +
        JSON.stringify([
          { iid: 5, title: 'Five', state: 'opened', source_branch: 'f5', author: { username: 'a' } },
          { iid: 4, title: 'Four', state: 'merged', source_branch: 'f4', author: { username: 'b' } }
        ]),
      stderr: ''
    }))
    const mrs = await glabListOpenMergeRequests(run, '/repo')
    expect(mrs).toHaveLength(1)
    expect(mrs[0]).toMatchObject({ iid: 5, author: 'a', sourceBranch: 'f5' })
    expect(calls[0].args).toEqual(['mr', 'list', '-F', 'json', '--per-page', '100'])
  })

  it('finds an open MR by source branch', async () => {
    const { run, calls } = runner(async () => ({
      stdout: JSON.stringify([
        { iid: 9, state: 'opened', source_branch: 'feat', web_url: 'https://x/-/merge_requests/9' }
      ]),
      stderr: ''
    }))
    const mr = await glabFindOpenMergeRequestForBranch(run, '/repo', 'feat')
    expect(mr?.iid).toBe(9)
    expect(calls[0].args).toContain('--source-branch')
  })
})

describe('parseGitLabGlobalId', () => {
  it('extracts the numeric tail of a gid', () => {
    expect(parseGitLabGlobalId('gid://gitlab/DiffNote/12345')).toBe(12345)
    expect(parseGitLabGlobalId('gid://gitlab/Note/7')).toBe(7)
    expect(parseGitLabGlobalId('gid://gitlab/Discussion/abcdef')).toBeNull()
    expect(parseGitLabGlobalId(null)).toBeNull()
  })
})

describe('mapGitLabDiscussionToComments', () => {
  const diffNote = (
    id: number,
    body: string,
    position: Record<string, unknown> | null = {
      positionType: 'text',
      newPath: 'src/a.ts',
      oldPath: 'src/a.ts',
      newLine: 10,
      oldLine: null
    }
  ) => ({
    id: `gid://gitlab/DiffNote/${id}`,
    body,
    bodyHtml: `<p>${body}</p>`,
    system: false,
    createdAt: '2026-08-19T10:00:00Z',
    updatedAt: '2026-08-19T10:00:00Z',
    author: { username: 'mor', avatarUrl: '/uploads/avatar.png' },
    position
  })

  it('maps a diff discussion thread with replies onto PRReviewComment', () => {
    const discussion = {
      id: 'gid://gitlab/Discussion/abc',
      notes: {
        nodes: [
          diffNote(100, 'root comment'),
          { ...diffNote(101, 'a reply'), position: null }
        ]
      }
    }
    const comments = mapGitLabDiscussionToComments(discussion, CTX)
    expect(comments).toHaveLength(2)
    expect(comments[0]).toMatchObject({
      id: 100,
      body: 'root comment',
      bodyHTML: '<p>root comment</p>',
      path: 'src/a.ts',
      line: 10,
      originalLine: null,
      side: 'RIGHT',
      inReplyToId: null,
      pullRequestReviewId: null,
      subjectType: 'line',
      user: {
        login: 'mor',
        avatarUrl: 'https://gitlab.tedooo.com/uploads/avatar.png'
      }
    })
    expect(comments[1]).toMatchObject({ id: 101, inReplyToId: 100 })
  })

  it('marks deleted-line comments as LEFT with originalLine', () => {
    const discussion = {
      notes: {
        nodes: [
          diffNote(200, 'old side', {
            positionType: 'text',
            newPath: 'src/a.ts',
            oldPath: 'src/a.ts',
            newLine: null,
            oldLine: 42
          })
        ]
      }
    }
    const [comment] = mapGitLabDiscussionToComments(discussion, CTX)
    expect(comment).toMatchObject({ side: 'LEFT', line: null, originalLine: 42 })
  })

  it('maps file-level positions to subjectType file', () => {
    const discussion = {
      notes: {
        nodes: [
          diffNote(300, 'file note', {
            positionType: 'file',
            newPath: 'src/a.ts',
            oldPath: 'src/a.ts',
            newLine: null,
            oldLine: null
          })
        ]
      }
    }
    const [comment] = mapGitLabDiscussionToComments(discussion, CTX)
    expect(comment).toMatchObject({ subjectType: 'file', line: null, originalLine: null })
  })

  it('drops non-diff discussions and system notes', () => {
    expect(
      mapGitLabDiscussionToComments(
        { notes: { nodes: [{ ...diffNote(400, 'general talk'), position: null }] } },
        CTX
      )
    ).toEqual([])
    expect(
      mapGitLabDiscussionToComments(
        { notes: { nodes: [{ ...diffNote(401, 'changed this line'), system: true }] } },
        CTX
      )
    ).toEqual([])
  })
})

describe('glabGetMergeRequestReviewComments', () => {
  it('queries GraphQL with string variables and pages the discussions connection', async () => {
    let call = 0
    const { run, calls } = runner(async () => {
      call++
      const page1 = {
        data: {
          project: {
            mergeRequest: {
              targetBranch: 'main',
              discussions: {
                pageInfo: { hasNextPage: true, endCursor: 'CURSOR1' },
                nodes: [
                  {
                    notes: {
                      nodes: [
                        {
                          id: 'gid://gitlab/DiffNote/1',
                          body: 'first',
                          system: false,
                          author: { username: 'a', avatarUrl: 'https://x/a.png' },
                          position: { positionType: 'text', newPath: 'f.ts', newLine: 1 }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      }
      const page2 = {
        data: {
          project: {
            mergeRequest: {
              targetBranch: 'main',
              discussions: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    notes: {
                      nodes: [
                        {
                          id: 'gid://gitlab/DiffNote/2',
                          body: 'second',
                          system: false,
                          author: { username: 'b', avatarUrl: 'https://x/b.png' },
                          position: { positionType: 'text', newPath: 'g.ts', newLine: 2 }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      }
      return { stdout: JSON.stringify(call === 1 ? page1 : page2), stderr: '' }
    })

    const result = await glabGetMergeRequestReviewComments(run, '/repo', CTX, 12)

    expect(result.success).toBe(true)
    expect(result.baseBranch).toBe('main')
    expect(result.comments?.map((c) => c.id)).toEqual([1, 2])

    // Variables travel as raw strings (-f): iid is String! in the schema.
    expect(calls[0].args).toEqual([
      'api',
      'graphql',
      '-f',
      `query=${GITLAB_MR_DISCUSSIONS_QUERY}`,
      '-f',
      'fullPath=backend/a-team',
      '-f',
      'iid=12'
    ])
    expect(calls[1].args).toContain('after=CURSOR1')
  })

  it('surfaces GraphQL errors', async () => {
    const { run } = runner(async () => ({
      stdout: JSON.stringify({ errors: [{ message: 'Invalid token' }] }),
      stderr: ''
    }))
    const result = await glabGetMergeRequestReviewComments(run, '/repo', CTX, 12)
    expect(result).toEqual({ success: false, error: 'Invalid token' })
  })

  it('reports a missing MR', async () => {
    const { run } = runner(async () => ({
      stdout: JSON.stringify({ data: { project: { mergeRequest: null } } }),
      stderr: ''
    }))
    const result = await glabGetMergeRequestReviewComments(run, '/repo', CTX, 999)
    expect(result).toEqual({ success: false, error: 'Merge request not found' })
  })

  it('maps a missing glab binary to the not-installed error', async () => {
    const { run } = runner(async () => {
      throw execError('spawn glab ENOENT')
    })
    const result = await glabGetMergeRequestReviewComments(run, '/repo', CTX, 1)
    expect(result).toEqual({ success: false, error: 'GitLab CLI (glab) is not installed' })
  })
})

// Keep vi imported for parity with sibling test files' patterns.
void vi
