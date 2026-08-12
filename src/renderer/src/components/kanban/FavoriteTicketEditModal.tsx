import { useCallback, useEffect, useRef, useState } from 'react'
import type { FavoriteTicket } from '../../../../main/db/types'
import { useFavoriteTicketsStore } from '@/stores/useFavoriteTicketsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface FavoriteTicketEditModalProps {
  favorite: FavoriteTicket | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Edits a favorite ticket template: title, description, and goal (with on/off toggle). */
export function FavoriteTicketEditModal({
  favorite,
  open,
  onOpenChange
}: FavoriteTicketEditModalProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalMode, setGoalMode] = useState(false)
  const [goalCriteria, setGoalCriteria] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Seed fields from the favorite each time the modal opens
  useEffect(() => {
    if (!open || !favorite) return
    setTitle(favorite.title)
    setDescription(favorite.description ?? '')
    setGoalMode(favorite.goal_mode)
    setGoalCriteria(favorite.goal_success_criteria ?? '')
    setIsSaving(false)
    setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [open, favorite])

  const isTitleEmpty = !title.trim()
  const isGoalCriteriaMissing = goalMode && !goalCriteria.trim()

  const handleSave = useCallback(async () => {
    if (!favorite || isTitleEmpty || isGoalCriteriaMissing || isSaving) return
    setIsSaving(true)
    try {
      await useFavoriteTicketsStore.getState().updateFavorite(favorite.id, {
        title: title.trim(),
        description: description.trim() || null,
        goal_mode: goalMode,
        goal_success_criteria: goalMode ? goalCriteria.trim() : null
      })
      toast.success('Favorite updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update favorite')
    } finally {
      setIsSaving(false)
    }
  }, [
    favorite,
    title,
    description,
    goalMode,
    goalCriteria,
    isTitleEmpty,
    isGoalCriteriaMissing,
    isSaving,
    onOpenChange
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        void handleSave()
      }
    },
    [handleSave]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        data-testid="favorite-ticket-edit-modal"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Edit Favorite</DialogTitle>
          <DialogDescription>
            Update this reusable ticket template. Use {'{{placeholder.name}}'} tokens for values
            filled in at creation time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="favorite-edit-title" className="text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="favorite-edit-title"
              ref={titleInputRef}
              data-testid="favorite-edit-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="favorite-edit-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </label>
            <Textarea
              id="favorite-edit-description"
              data-testid="favorite-edit-description-input"
              placeholder="Describe the ticket (supports markdown)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-y"
            />
          </div>

          {/* Goal */}
          <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Goal</span>
              <Switch
                checked={goalMode}
                onCheckedChange={setGoalMode}
                data-testid="favorite-edit-goal-toggle"
              />
            </div>
            {goalMode && (
              <div className="space-y-1.5">
                <label
                  htmlFor="favorite-edit-goal-criteria"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Success criteria <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="favorite-edit-goal-criteria"
                  data-testid="favorite-edit-goal-criteria"
                  value={goalCriteria}
                  onChange={(e) => setGoalCriteria(e.target.value)}
                  placeholder="What does success look like?"
                  rows={3}
                  className="resize-y text-sm"
                />
                {isGoalCriteriaMissing && <p className="text-xs text-destructive">Required</p>}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            data-testid="favorite-edit-cancel-btn"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="favorite-edit-save-btn"
            disabled={isTitleEmpty || isGoalCriteriaMissing || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
