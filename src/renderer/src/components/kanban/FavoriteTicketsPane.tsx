import { useEffect, useState } from 'react'
import { Braces, CopyPlus, Pencil, Star, StarOff, Target, X } from 'lucide-react'
import type { FavoriteTicket } from '../../../../main/db/types'
import { extractPlaceholderNames } from '@shared/lib/ticket-placeholders'
import { useFavoriteTicketsStore } from '@/stores/useFavoriteTicketsStore'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { FavoriteTicketCreateModal } from './FavoriteTicketCreateModal'
import { FavoriteTicketEditModal } from './FavoriteTicketEditModal'

interface FavoriteTicketCardProps {
  favorite: FavoriteTicket
  onCreate: (favorite: FavoriteTicket) => void
  onEdit: (favorite: FavoriteTicket) => void
}

function FavoriteTicketCard({
  favorite,
  onCreate,
  onEdit
}: FavoriteTicketCardProps): React.JSX.Element {
  const placeholderCount = extractPlaceholderNames(
    favorite.title,
    favorite.description,
    favorite.goal_mode ? favorite.goal_success_criteria : null
  ).length

  const handleUnfavorite = async (): Promise<void> => {
    try {
      const deleted = await useFavoriteTicketsStore.getState().deleteFavorite(favorite.id)
      if (deleted) {
        toast.success('Removed from favorites')
      } else {
        // Row was already gone — resync so the stale card disappears
        toast.error('Favorite no longer exists')
        void useFavoriteTicketsStore.getState().loadFavorites()
      }
    } catch {
      toast.error('Failed to remove favorite')
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-testid={`favorite-ticket-${favorite.id}`}
          data-favorite-ticket-id={favorite.id}
          className="group cursor-pointer rounded-md border border-border/60 bg-card shadow-sm p-2 transition-all duration-200 hover:bg-muted/40"
          onClick={() => onCreate(favorite)}
        >
          <p className="text-sm font-medium leading-snug text-foreground break-words">
            {favorite.title}
          </p>
          {favorite.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">
              {favorite.description}
            </p>
          )}
          {(favorite.goal_mode || placeholderCount > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {favorite.goal_mode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Goal
                </span>
              )}
              {placeholderCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Braces className="h-3 w-3" />
                  {placeholderCount} placeholder{placeholderCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          data-testid="ctx-favorite-create-ticket"
          onClick={() => onCreate(favorite)}
          className="gap-2"
        >
          <CopyPlus className="h-3.5 w-3.5" />
          Create ticket…
        </ContextMenuItem>
        <ContextMenuItem
          data-testid="ctx-favorite-edit"
          onClick={() => onEdit(favorite)}
          className="gap-2"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          data-testid="ctx-favorite-unfavorite"
          onClick={() => void handleUnfavorite()}
          className="gap-2 text-red-500 focus:text-red-500"
        >
          <StarOff className="h-3.5 w-3.5" />
          Unfavorite
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** Right-hand board pane listing favorite ticket templates. */
export function FavoriteTicketsPane(): React.JSX.Element {
  const favorites = useFavoriteTicketsStore((s) => s.favorites)
  const isLoaded = useFavoriteTicketsStore((s) => s.isLoaded)
  const isLoading = useFavoriteTicketsStore((s) => s.isLoading)
  const loadError = useFavoriteTicketsStore((s) => s.loadError)
  const setPaneOpen = useFavoriteTicketsStore((s) => s.setPaneOpen)
  const [createTarget, setCreateTarget] = useState<FavoriteTicket | null>(null)
  const [editTarget, setEditTarget] = useState<FavoriteTicket | null>(null)

  useEffect(() => {
    void useFavoriteTicketsStore.getState().loadFavorites()
  }, [])

  return (
    <div
      className="w-72 shrink-0 border-l border-border flex flex-col min-h-0 bg-background"
      data-testid="favorite-tickets-pane"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Favorite Tickets</span>
          <span className="rounded-full bg-muted/40 px-1.5 text-[11px] text-muted-foreground">
            {favorites.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          data-testid="favorite-tickets-pane-close"
          onClick={() => setPaneOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
        {favorites.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground">
            {isLoading ? (
              // An in-flight (re)load must not read as a confirmed empty list
              'Loading…'
            ) : loadError ? (
              // Check the error before isLoaded: it stays true after an earlier
              // successful load, and a failed reload must not read as "empty"
              <>
                <p>Failed to load favorites.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  data-testid="favorite-tickets-retry"
                  onClick={() => void useFavoriteTicketsStore.getState().loadFavorites()}
                >
                  Retry
                </Button>
              </>
            ) : isLoaded ? (
              <>
                <Star className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No favorite tickets yet.</p>
                <p className="mt-1">
                  Right-click a ticket on the board and choose “Add to favorites”.
                </p>
              </>
            ) : (
              'Loading…'
            )}
          </div>
        ) : (
          <>
            {loadError && (
              // A failed reload keeps the cached cards — say so instead of
              // silently presenting a possibly stale list
              <div
                className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive"
                data-testid="favorite-tickets-reload-error"
              >
                <span>Refresh failed — list may be stale.</span>
                <button
                  className="shrink-0 underline hover:no-underline"
                  onClick={() => void useFavoriteTicketsStore.getState().loadFavorites()}
                >
                  Retry
                </button>
              </div>
            )}
            {favorites.map((favorite) => (
              <FavoriteTicketCard
                key={favorite.id}
                favorite={favorite}
                onCreate={setCreateTarget}
                onEdit={setEditTarget}
              />
            ))}
          </>
        )}
      </div>

      <FavoriteTicketCreateModal
        favorite={createTarget}
        open={createTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCreateTarget(null)
        }}
      />
      <FavoriteTicketEditModal
        favorite={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      />
    </div>
  )
}
