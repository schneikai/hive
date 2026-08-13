import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { favoriteTicketsApi } from '@/api/favorite-tickets-api'
import type {
  FavoriteTicket,
  FavoriteTicketCreate,
  FavoriteTicketUpdate
} from '../../../main/db/types'

interface FavoriteTicketsState {
  favorites: FavoriteTicket[]
  isLoaded: boolean
  isLoading: boolean
  loadError: string | null
  /** Whether the favorites pane is visible on the kanban board (persisted). */
  isPaneOpen: boolean

  loadFavorites: () => Promise<void>
  createFavorite: (data: FavoriteTicketCreate) => Promise<FavoriteTicket>
  updateFavorite: (id: string, data: FavoriteTicketUpdate) => Promise<FavoriteTicket | null>
  deleteFavorite: (id: string) => Promise<boolean>
  togglePane: () => void
  setPaneOpen: (open: boolean) => void
}

// Bumped whenever a mutation lands so an in-flight list fetch can detect that
// its response predates the mutation and must not clobber newer state.
let mutationSeq = 0

export const useFavoriteTicketsStore = create<FavoriteTicketsState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isLoaded: false,
      isLoading: false,
      loadError: null,
      isPaneOpen: false,

      loadFavorites: async () => {
        if (get().isLoading) return
        set({ isLoading: true, loadError: null })
        const seqAtStart = mutationSeq
        try {
          const favorites = await favoriteTicketsApi.list<FavoriteTicket>()
          if (mutationSeq !== seqAtStart) {
            // A create/update/delete completed while this list was in flight —
            // the response may predate it, so fetch again instead of applying.
            set({ isLoading: false })
            return get().loadFavorites()
          }
          set({ favorites, isLoaded: true, isLoading: false })
        } catch (err) {
          console.error('Failed to load favorite tickets:', err)
          set({
            isLoading: false,
            loadError: err instanceof Error ? err.message : 'Failed to load favorites'
          })
        }
      },

      createFavorite: async (data) => {
        const created = await favoriteTicketsApi.create<FavoriteTicket, FavoriteTicketCreate>(data)
        mutationSeq++
        set((state) => ({ favorites: [created, ...state.favorites] }))
        return created
      },

      updateFavorite: async (id, data) => {
        const updated = await favoriteTicketsApi.update<FavoriteTicket, FavoriteTicketUpdate>(
          id,
          data
        )
        if (updated) {
          mutationSeq++
          set((state) => ({
            favorites: state.favorites.map((f) => (f.id === id ? updated : f))
          }))
        }
        return updated
      },

      deleteFavorite: async (id) => {
        const deleted = await favoriteTicketsApi.delete(id)
        if (deleted) {
          mutationSeq++
          set((state) => ({ favorites: state.favorites.filter((f) => f.id !== id) }))
        }
        return deleted
      },

      togglePane: () => set((state) => ({ isPaneOpen: !state.isPaneOpen })),
      setPaneOpen: (open) => set({ isPaneOpen: open })
    }),
    {
      name: 'hive-favorite-tickets',
      storage: createJSONStorage(() => localStorage),
      // Inclusion-based: only UI prefs persist; favorites always refetch from sqlite
      partialize: (state) => ({ isPaneOpen: state.isPaneOpen })
    }
  )
)
