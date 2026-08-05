import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { DatabaseService } from './database'

const tempDirs: string[] = []
let databaseLoadError: Error | null = null

const canRunDatabaseTests = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3')
    const db = new Database(':memory:')
    db.close()
    return true
  } catch (error) {
    databaseLoadError = error as Error
    return false
  }
}

const describeIf = canRunDatabaseTests() ? describe : describe.skip

const makeDbPath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'hive-transition-date-db-'))
  tempDirs.push(dir)
  return join(dir, 'state.sqlite')
}

const makeDb = (): DatabaseService => {
  const db = new DatabaseService(makeDbPath())
  db.init()
  return db
}

const columnNames = (db: DatabaseService, table: string): string[] =>
  (db.getRawDb().pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name)

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describeIf('kanban ticket column_changed_at', () => {
  if (databaseLoadError) {
    it('skips when better-sqlite3 is not available for this Node runtime', () => {
      expect(databaseLoadError?.message).toBeTruthy()
    })
  }

  it('exists on kanban_tickets and markdown_kanban_card_state', () => {
    const db = makeDb()
    expect(columnNames(db, 'kanban_tickets')).toContain('column_changed_at')
    expect(columnNames(db, 'markdown_kanban_card_state')).toContain('column_changed_at')
    db.close()
  })

  it('is initialized to the creation time for new tickets', () => {
    const db = makeDb()
    const project = db.createProject({ name: 'repo', path: join(tmpdir(), 'repo-t1') })
    const ticket = db.createKanbanTicket({ project_id: project.id, title: 'T' })
    expect(ticket.column_changed_at).toBe(ticket.created_at)
    expect(db.getKanbanTicket(ticket.id)?.column_changed_at).toBe(ticket.created_at)
    db.close()
  })

  it('is bumped by moveKanbanTicket when the column changes', () => {
    const db = makeDb()
    const project = db.createProject({ name: 'repo', path: join(tmpdir(), 'repo-t2') })
    const ticket = db.createKanbanTicket({ project_id: project.id, title: 'T' })
    const before = ticket.column_changed_at

    const moved = db.moveKanbanTicket(ticket.id, 'in_progress', 5)
    expect(moved?.column).toBe('in_progress')
    expect(moved?.column_changed_at).not.toBe(null)
    expect(moved!.column_changed_at! >= before!).toBe(true)
    expect(moved?.column_changed_at).toBe(moved?.updated_at)
    db.close()
  })

  it('is NOT bumped by a same-column moveKanbanTicket', () => {
    const db = makeDb()
    const project = db.createProject({ name: 'repo', path: join(tmpdir(), 'repo-t3') })
    const ticket = db.createKanbanTicket({ project_id: project.id, title: 'T' })
    const before = db.getKanbanTicket(ticket.id)?.column_changed_at

    const moved = db.moveKanbanTicket(ticket.id, 'todo', 42)
    expect(moved?.sort_order).toBe(42)
    expect(moved?.column_changed_at).toBe(before)
    db.close()
  })

  it('is bumped by updateKanbanTicket only when the column actually changes', () => {
    const db = makeDb()
    const project = db.createProject({ name: 'repo', path: join(tmpdir(), 'repo-t4') })
    const ticket = db.createKanbanTicket({ project_id: project.id, title: 'T' })
    const before = db.getKanbanTicket(ticket.id)?.column_changed_at

    // Non-column update: unchanged
    const titled = db.updateKanbanTicket(ticket.id, { title: 'Renamed' })
    expect(titled?.column_changed_at).toBe(before)

    // Same-column update: unchanged
    const sameCol = db.updateKanbanTicket(ticket.id, { column: 'todo', sort_order: 9 })
    expect(sameCol?.column_changed_at).toBe(before)

    // Column change: bumped
    const moved = db.updateKanbanTicket(ticket.id, { column: 'review' })
    expect(moved?.column).toBe('review')
    expect(moved?.column_changed_at).toBe(moved?.updated_at)
    expect(moved!.column_changed_at! >= before!).toBe(true)
    db.close()
  })

  it('is NOT bumped by reorder or token accumulation', () => {
    const db = makeDb()
    const project = db.createProject({ name: 'repo', path: join(tmpdir(), 'repo-t5') })
    const ticket = db.createKanbanTicket({ project_id: project.id, title: 'T' })
    const before = db.getKanbanTicket(ticket.id)?.column_changed_at

    db.reorderKanbanTicket(ticket.id, 3)
    db.addTicketTokens(ticket.id, 1000)

    expect(db.getKanbanTicket(ticket.id)?.column_changed_at).toBe(before)
    db.close()
  })

  it('survives moveKanbanTicketToProject without a bump (column is unchanged)', () => {
    const db = makeDb()
    const projectA = db.createProject({ name: 'a', path: join(tmpdir(), 'repo-t6a') })
    const projectB = db.createProject({ name: 'b', path: join(tmpdir(), 'repo-t6b') })
    const ticket = db.createKanbanTicket({ project_id: projectA.id, title: 'T' })
    const before = db.getKanbanTicket(ticket.id)?.column_changed_at

    const moved = db.moveKanbanTicketToProject(ticket.id, projectB.id)
    expect(moved?.project_id).toBe(projectB.id)
    expect(moved?.column_changed_at).toBe(before)
    db.close()
  })
})
