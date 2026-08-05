import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getDatabase } from '../../db'
import type { Project } from '../../db'
import { getKanbanBackendForProject } from '../kanban-backend'

/**
 * Markdown-mode tickets keep column_changed_at in markdown_kanban_card_state.
 * It must be stamped at creation, on in-app moves, and when a column change is
 * made OUTSIDE the app (frontmatter edit), but never by unrelated file edits.
 */
describe('MarkdownKanbanBackend column_changed_at', () => {
  const tempDirs: string[] = []
  let project: Project

  beforeEach(() => {
    const dbDir = mkdtempSync(join(tmpdir(), 'hive-markdown-transition-db-'))
    const projectDir = mkdtempSync(join(tmpdir(), 'hive-markdown-transition-project-'))
    tempDirs.push(dbDir, projectDir)

    process.env.HIVE_SERVER_DB_PATH = join(dbDir, 'hive.db')
    closeDatabase()
    const db = getDatabase()
    project = db.createProject({ name: 'Markdown Project', path: projectDir })
    db.updateProjectKanbanStorageMode(project.id, 'markdown')
  })

  afterEach(() => {
    closeDatabase()
    delete process.env.HIVE_SERVER_DB_PATH
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  const cardFolder = (): string => join(project.path, 'docs', 'kanban')

  const cardPath = (): string => {
    const files = readdirSync(cardFolder()).filter((name) => name.endsWith('.md'))
    expect(files).toHaveLength(1)
    return join(cardFolder(), files[0])
  }

  it('stamps column_changed_at when a markdown ticket is created', async () => {
    const backend = getKanbanBackendForProject(project.id)
    const created = await backend.create(project.id, { project_id: project.id, title: 'New card' })

    expect(created.column_changed_at).not.toBeNull()

    const fetched = await backend.get(project.id, created.id)
    expect(fetched?.column_changed_at).toBe(created.column_changed_at)
  })

  it('does not change column_changed_at on non-column updates', async () => {
    const backend = getKanbanBackendForProject(project.id)
    const created = await backend.create(project.id, { project_id: project.id, title: 'New card' })

    await backend.update(project.id, created.id, { note: 'a note', title: 'Renamed' })

    const fetched = await backend.get(project.id, created.id)
    expect(fetched?.column_changed_at).toBe(created.column_changed_at)
  })

  it('bumps column_changed_at on an in-app move and keeps it stable across reloads', async () => {
    const backend = getKanbanBackendForProject(project.id)
    const created = await backend.create(project.id, { project_id: project.id, title: 'New card' })

    await new Promise((r) => setTimeout(r, 5))
    const moved = await backend.move(project.id, created.id, 'review', 1)
    expect(moved?.column).toBe('review')
    expect(moved!.column_changed_at! > created.column_changed_at!).toBe(true)

    const reloaded = await backend.list(project.id, false)
    expect(reloaded.find((t) => t.id === created.id)?.column_changed_at).toBe(
      moved?.column_changed_at
    )
  })

  it('stamps column_changed_at when the column is changed outside the app', async () => {
    const backend = getKanbanBackendForProject(project.id)
    const created = await backend.create(project.id, { project_id: project.id, title: 'New card' })

    // External edit: rewrite the frontmatter column directly on disk
    const path = cardPath()
    const raw = readFileSync(path, 'utf-8')
    writeFileSync(path, raw.replace(/^column: todo$/m, 'column: review'))

    await new Promise((r) => setTimeout(r, 5))
    const listed = await backend.list(project.id, false)
    const ticket = listed.find((t) => t.id === created.id)
    expect(ticket?.column).toBe('review')
    expect(ticket!.column_changed_at! > created.column_changed_at!).toBe(true)

    // A second rescan without further edits must not re-stamp
    const again = await backend.list(project.id, false)
    expect(again.find((t) => t.id === created.id)?.column_changed_at).toBe(
      ticket?.column_changed_at
    )
  })

  it('does not stamp on external non-column edits', async () => {
    const backend = getKanbanBackendForProject(project.id)
    const created = await backend.create(project.id, { project_id: project.id, title: 'New card' })

    const path = cardPath()
    writeFileSync(path, readFileSync(path, 'utf-8') + '\nMore body text\n')

    const listed = await backend.list(project.id, false)
    expect(listed.find((t) => t.id === created.id)?.column_changed_at).toBe(
      created.column_changed_at
    )
  })

  it('adopts externally created cards without a stamp, then stamps their first observed move', async () => {
    // Card written straight to disk — never went through the backend
    const folder = cardFolder()
    rmSync(folder, { recursive: true, force: true })
    const backend = getKanbanBackendForProject(project.id)
    // create+delete forces the folder to exist with valid config
    const seed = await backend.create(project.id, { project_id: project.id, title: 'seed' })
    await backend.delete(project.id, seed.id)
    writeFileSync(
      join(folder, 'external-card.md'),
      '---\nid: external-1\ntitle: External card\ncolumn: todo\nsort_order: 0\n---\nBody\n'
    )

    const first = await backend.list(project.id, false)
    const adopted = first.find((t) => t.id === 'external-1')
    expect(adopted?.column_changed_at).toBeNull()

    // External move after adoption IS a transition and gets stamped
    const path = join(folder, 'external-card.md')
    writeFileSync(path, readFileSync(path, 'utf-8').replace(/^column: todo$/m, 'column: done'))
    const second = await backend.list(project.id, false)
    const movedExternal = second.find((t) => t.id === 'external-1')
    expect(movedExternal?.column).toBe('done')
    expect(movedExternal?.column_changed_at).not.toBeNull()
  })
})
