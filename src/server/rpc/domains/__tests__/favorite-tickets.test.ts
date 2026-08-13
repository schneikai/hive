import { Effect } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import type { FavoriteTicket } from '../../../../main/db'
import type { RpcContext } from '../../router'
import { makeFavoriteTicketsRpcHandlers, type FavoriteTicketsRpcService } from '../favorite-tickets'

const favorite: FavoriteTicket = {
  id: 'fav-1',
  title: 'Fix {{placeholder.file}}',
  description: 'Update {{placeholder.file}} accordingly',
  goal_mode: true,
  goal_success_criteria: 'File {{placeholder.file}} is fixed',
  created_at: '2026-08-12T00:00:00.000Z',
  updated_at: '2026-08-12T00:00:00.000Z'
}

const context = { eventBus: null } as unknown as RpcContext

function makeService(overrides: Partial<FavoriteTicketsRpcService> = {}): FavoriteTicketsRpcService {
  return {
    list: () => Effect.succeed([favorite]),
    create: () => Effect.succeed(favorite),
    update: () => Effect.succeed(favorite),
    delete: () => Effect.succeed(true),
    ...overrides
  }
}

function run(
  service: FavoriteTicketsRpcService,
  method: string,
  params: unknown
): Promise<unknown> {
  const handler = makeFavoriteTicketsRpcHandlers(service).get(method)
  if (!handler) throw new Error(`missing handler for ${method}`)
  return Effect.runPromise(handler(params, context) as Effect.Effect<unknown, never, never>)
}

describe('favoriteTickets RPC handlers', () => {
  it('registers all four methods', () => {
    const handlers = makeFavoriteTicketsRpcHandlers(makeService())
    expect([...handlers.keys()].sort()).toEqual([
      'favoriteTickets.create',
      'favoriteTickets.delete',
      'favoriteTickets.list',
      'favoriteTickets.update'
    ])
  })

  it('lists favorites with empty params', async () => {
    await expect(run(makeService(), 'favoriteTickets.list', {})).resolves.toEqual([favorite])
  })

  it('creates from flat params and passes them to the service', async () => {
    const create = vi.fn(() => Effect.succeed(favorite))
    const params = {
      title: 'Fix {{placeholder.file}}',
      description: 'body',
      goal_mode: true,
      goal_success_criteria: 'done'
    }
    await expect(
      run(makeService({ create }), 'favoriteTickets.create', params)
    ).resolves.toEqual(favorite)
    expect(create).toHaveBeenCalledWith(params)
  })

  it('rejects create params with unknown keys (strict schema)', async () => {
    await expect(
      run(makeService(), 'favoriteTickets.create', { title: 'x', project_id: 'p1' })
    ).rejects.toBeTruthy()
  })

  it('rejects create params without a title', async () => {
    await expect(
      run(makeService(), 'favoriteTickets.create', { description: 'x' })
    ).rejects.toBeTruthy()
  })

  it('updates via {id, data} params', async () => {
    const update = vi.fn(() => Effect.succeed(favorite))
    await expect(
      run(makeService({ update }), 'favoriteTickets.update', {
        id: 'fav-1',
        data: { title: 'New', goal_mode: false, goal_success_criteria: null }
      })
    ).resolves.toEqual(favorite)
    expect(update).toHaveBeenCalledWith('fav-1', {
      title: 'New',
      goal_mode: false,
      goal_success_criteria: null
    })
  })

  it('rejects update data with unknown keys (strict schema)', async () => {
    await expect(
      run(makeService(), 'favoriteTickets.update', { id: 'fav-1', data: { column: 'todo' } })
    ).rejects.toBeTruthy()
  })

  it('deletes by id', async () => {
    const del = vi.fn(() => Effect.succeed(true))
    await expect(
      run(makeService({ delete: del }), 'favoriteTickets.delete', { id: 'fav-1' })
    ).resolves.toBe(true)
    expect(del).toHaveBeenCalledWith('fav-1')
  })

  it('rejects delete without an id', async () => {
    await expect(run(makeService(), 'favoriteTickets.delete', {})).rejects.toBeTruthy()
  })
})
