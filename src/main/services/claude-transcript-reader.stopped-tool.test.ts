import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { STOPPED_TOOL_OUTPUT } from './claude-abort'
import { encodePath, readClaudeTranscript } from './claude-transcript-reader'

interface ReplayedToolUse {
  status?: string
  error?: string
  output?: string
}

let tempDirs: string[] = []

function writeTranscript(toolResultText: string): {
  worktreePath: string
  claudeSessionId: string
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'hive-stopped-tool-'))
  tempDirs.push(tempDir)
  const claudeConfigDir = join(tempDir, 'claude')
  const worktreePath = join(tempDir, 'worktree')
  const claudeSessionId = 'session-stopped'

  mkdirSync(worktreePath, { recursive: true })
  vi.stubEnv('CLAUDE_CONFIG_DIR', claudeConfigDir)

  const transcriptDir = join(claudeConfigDir, 'projects', encodePath(worktreePath))
  mkdirSync(transcriptDir, { recursive: true })

  const entries = [
    {
      type: 'assistant',
      uuid: 'assistant-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls' } }]
      }
    },
    {
      type: 'user',
      uuid: 'user-1',
      timestamp: '2026-01-01T00:00:01.000Z',
      message: {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tool-1', is_error: true, content: toolResultText }
        ]
      }
    }
  ]

  writeFileSync(
    join(transcriptDir, `${claudeSessionId}.jsonl`),
    entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n'
  )

  return { worktreePath, claudeSessionId }
}

async function replayToolUse(toolResultText: string): Promise<ReplayedToolUse> {
  const { worktreePath, claudeSessionId } = writeTranscript(toolResultText)
  const messages = (await readClaudeTranscript(worktreePath, claudeSessionId)) as Array<{
    role?: string
    parts?: Array<{ type: string; toolUse?: ReplayedToolUse }>
  }>

  const toolPart = messages
    .flatMap((message) => message.parts ?? [])
    .find((part) => part.type === 'tool_use')

  expect(toolPart?.toolUse).toBeDefined()
  return toolPart!.toolUse!
}

describe('readClaudeTranscript with a stopped permission round-trip', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
    tempDirs = []
  })

  it('replays the abort artifact as stopped, not as an error', async () => {
    const toolUse = await replayToolUse('Tool permission request failed: AbortError: Stream closed')

    expect(toolUse.status).not.toBe('error')
    expect(toolUse.error).toBeUndefined()
    expect(toolUse.output).toBe(STOPPED_TOOL_OUTPUT)
  })

  it('still replays a real tool failure as an error', async () => {
    const toolUse = await replayToolUse('ENOENT: no such file or directory')

    expect(toolUse.status).toBe('error')
    expect(toolUse.error).toBe('ENOENT: no such file or directory')
  })
})
