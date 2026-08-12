import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FavoriteTicket } from '../../../../main/db/types'
import { setRendererRpcClient, resetRendererRpcClientForTests } from '@/api/rpc-client'
import { useFavoriteTicketsStore } from '../useFavoriteTicketsStore'

const favorite = (overrides: Partial<FavoriteTicket> = {}): FavoriteTicket => ({
  id: 'fav-1',
  title: 'Fix {{placeholder.file}}',
  description: null,
  goal_mode: false,
  goal_success_criteria: null,
  created_at: '2026-08-12T00:00:00.000Z',
  updated_at: '2026-08-12T00:00:00.000Z',
  ...overrides
})

let request: ReturnType<typeof vi.fn>

beforeEach(() => {
  request = vi.fn()
  setRendererRpcClient({ request, subscribe: vi.fn() })
  useFavoriteTicketsStore.setState({
    favorites: [],
    isLoaded: false,
    isLoading: false,
    loadError: null,
    isPaneOpen: false
  })
})

afterEach(() => {
  resetRendererRpcClientForTests()
})

describe('useFavoriteTicketsStore', () => {
  it('loads favorites via favoriteTickets.list', async () => {
    const rows = [favorite(), favorite({ id: 'fav-2', title: 'Another' })]
    request.mockResolvedValueOnce(rows)

    await useFavoriteTicketsStore.getState().loadFavorites()

    expect(request).toHaveBeenCalledWith('favoriteTickets.list', {})
    expect(useFavoriteTicketsStore.getState().favorites).toEqual(rows)
    expect(useFavoriteTicketsStore.getState().isLoaded).toBe(true)
  })

  it('records a load error instead of staying in the loading state', async () => {
    request.mockRejectedValueOnce(new Error('server down'))

    await useFavoriteTicketsStore.getState().loadFavorites()

    const state = useFavoriteTicketsStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.isLoaded).toBe(false)
    expect(state.loadError).toBe('server down')

    // A successful retry clears the error
    request.mockResolvedValueOnce([favorite()])
    await useFavoriteTicketsStore.getState().loadFavorites()
    expect(useFavoriteTicketsStore.getState().loadError).toBeNull()
    expect(useFavoriteTicketsStore.getState().isLoaded).toBe(true)
  })

  it('prepends created favorites', async () => {
    useFavoriteTicketsStore.setState({ favorites: [favorite({ id: 'fav-old' })] })
    const created = favorite({ id: 'fav-new', title: 'New favorite' })
    request.mockResolvedValueOnce(created)

    await useFavoriteTicketsStore.getState().createFavorite({ title: 'New favorite' })

    expect(request).toHaveBeenCalledWith('favoriteTickets.create', { title: 'New favorite' })
    expect(useFavoriteTicketsStore.getState().favorites.map((f) => f.id)).toEqual([
      'fav-new',
      'fav-old'
    ])
  })

  it('replaces the updated favorite in place', async () => {
    useFavoriteTicketsStore.setState({
      favorites: [favorite(), favorite({ id: 'fav-2' })]
    })
    const updated = favorite({ title: 'Renamed', updated_at: '2026-08-12T01:00:00.000Z' })
    request.mockResolvedValueOnce(updated)

    await useFavoriteTicketsStore.getState().updateFavorite('fav-1', { title: 'Renamed' })

    expect(request).toHaveBeenCalledWith('favoriteTickets.update', {
      id: 'fav-1',
      data: { title: 'Renamed' }
    })
    expect(useFavoriteTicketsStore.getState().favorites[0]).toEqual(updated)
    expect(useFavoriteTicketsStore.getState().favorites[1].id).toBe('fav-2')
  })

  it('removes deleted favorites', async () => {
    useFavoriteTicketsStore.setState({
      favorites: [favorite(), favorite({ id: 'fav-2' })]
    })
    request.mockResolvedValueOnce(true)

    await useFavoriteTicketsStore.getState().deleteFavorite('fav-1')

    expect(request).toHaveBeenCalledWith('favoriteTickets.delete', { id: 'fav-1' })
    expect(useFavoriteTicketsStore.getState().favorites.map((f) => f.id)).toEqual(['fav-2'])
  })

  it('keeps the favorite when the backend reports nothing deleted', async () => {
    useFavoriteTicketsStore.setState({ favorites: [favorite()] })
    request.mockResolvedValueOnce(false)

    await useFavoriteTicketsStore.getState().deleteFavorite('fav-1')

    expect(useFavoriteTicketsStore.getState().favorites).toHaveLength(1)
  })

  it('toggles the pane flag', () => {
    expect(useFavoriteTicketsStore.getState().isPaneOpen).toBe(false)
    useFavoriteTicketsStore.getState().togglePane()
    expect(useFavoriteTicketsStore.getState().isPaneOpen).toBe(true)
    useFavoriteTicketsStore.getState().setPaneOpen(false)
    expect(useFavoriteTicketsStore.getState().isPaneOpen).toBe(false)
  })
})
