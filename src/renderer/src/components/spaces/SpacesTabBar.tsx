import { useState, useCallback, useRef } from 'react'
import { LayoutGrid, Plus, Pencil, Palette, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpaceStore } from '@/stores'
import { getSpaceIcon } from './SpaceIconPicker'
import { SpaceIconPicker } from './SpaceIconPicker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  FOOTER_TOOLBAR,
  FOOTER_TOOLBAR_BUTTON,
  FOOTER_TOOLBAR_ICON,
  FOOTER_TOOLBAR_LEFT,
  FOOTER_TOOLBAR_OUTER,
  FOOTER_TOOLBAR_RIGHT
} from '@/components/sidebar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'

export function SpacesTabBar(): React.JSX.Element {
  const spaces = useSpaceStore((s) => s.spaces)
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId)
  const setActiveSpace = useSpaceStore((s) => s.setActiveSpace)
  const createSpace = useSpaceStore((s) => s.createSpace)
  const updateSpace = useSpaceStore((s) => s.updateSpace)
  const deleteSpace = useSpaceStore((s) => s.deleteSpace)
  const reorderSpaces = useSpaceStore((s) => s.reorderSpaces)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createIconType, setCreateIconType] = useState('default')
  const [createIconValue, setCreateIconValue] = useState('Folder')

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editSpaceId, setEditSpaceId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIconType, setEditIconType] = useState('default')
  const [editIconValue, setEditIconValue] = useState('Folder')

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragCounterRef = useRef(0)

  const handleCreate = useCallback(async () => {
    const name = createName.trim()
    if (!name) return
    await createSpace(name, createIconType, createIconValue)
    setCreateOpen(false)
    setCreateName('')
    setCreateIconType('default')
    setCreateIconValue('Folder')
  }, [createName, createIconType, createIconValue, createSpace])

  const handleOpenEdit = useCallback((space: Space) => {
    setEditSpaceId(space.id)
    setEditName(space.name)
    setEditIconType(space.icon_type)
    setEditIconValue(space.icon_value)
    setEditOpen(true)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editSpaceId) return
    const name = editName.trim()
    if (!name) return
    await updateSpace(editSpaceId, {
      name,
      icon_type: editIconType,
      icon_value: editIconValue
    })
    setEditOpen(false)
  }, [editSpaceId, editName, editIconType, editIconValue, updateSpace])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSpace(id)
    },
    [deleteSpace]
  )

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (draggedIndex !== null && draggedIndex !== index) {
        setDragOverIndex(index)
      }
    },
    [draggedIndex]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault()
      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        reorderSpaces(draggedIndex, targetIndex)
      }
      setDraggedIndex(null)
      setDragOverIndex(null)
      dragCounterRef.current = 0
    },
    [draggedIndex, reorderSpaces]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    dragCounterRef.current = 0
  }, [])

  return (
    <>
      {/* Orca SidebarToolbar (SidebarToolbar.tsx:71-124): hairline top border,
          px-2 py-1.5, icon-xs ghost buttons ('secondary' while active). */}
      <div className={FOOTER_TOOLBAR_OUTER} data-testid="spaces-tab-bar">
        <div className={FOOTER_TOOLBAR}>
          <div className={cn(FOOTER_TOOLBAR_LEFT, 'overflow-x-auto scrollbar-none')}>
            {/* "All" tab */}
            <Button
              type="button"
              variant={activeSpaceId === null ? 'secondary' : 'ghost'}
              size="icon-xs"
              className={FOOTER_TOOLBAR_BUTTON}
              onClick={() => setActiveSpace(null)}
              title="All projects"
              aria-pressed={activeSpaceId === null}
              data-testid="space-tab-all"
            >
              <LayoutGrid className={FOOTER_TOOLBAR_ICON} />
            </Button>

            {/* Space tabs */}
            {spaces.map((space, index) => {
              const Icon = getSpaceIcon(space.icon_value)
              const isActive = activeSpaceId === space.id
              return (
                <ContextMenu key={space.id}>
                  <ContextMenuTrigger asChild>
                    <Button
                      type="button"
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="icon-xs"
                      className={cn(
                        FOOTER_TOOLBAR_BUTTON,
                        draggedIndex === index && 'opacity-50',
                        dragOverIndex === index && 'ring-1 ring-worktree-sidebar-ring'
                      )}
                      onClick={() => setActiveSpace(space.id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      title={space.name}
                      aria-pressed={isActive}
                      data-testid={`space-tab-${space.id}`}
                    >
                      <Icon className={FOOTER_TOOLBAR_ICON} />
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem onClick={() => handleOpenEdit(space)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleOpenEdit(space)}>
                      <Palette className="h-4 w-4 mr-2" />
                      Change Icon
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleDelete(space.id)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>

          <div className={FOOTER_TOOLBAR_RIGHT}>
            {/* Add space button */}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={FOOTER_TOOLBAR_BUTTON}
              onClick={() => setCreateOpen(true)}
              title="Create space"
              data-testid="space-add-button"
            >
              <Plus className={FOOTER_TOOLBAR_ICON} strokeWidth={2.25} />
            </Button>
          </div>
        </div>
      </div>

      {/* Create Space Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Space</DialogTitle>
            <DialogDescription>Organize your projects into spaces.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Work, Side Projects"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Icon</label>
              <div className="mt-1">
                <SpaceIconPicker
                  selectedValue={createIconValue}
                  onSelect={(type, value) => {
                    setCreateIconType(type)
                    setCreateIconValue(value)
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!createName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Space Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Space</DialogTitle>
            <DialogDescription>Update the space name or icon.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit()
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Icon</label>
              <div className="mt-1">
                <SpaceIconPicker
                  selectedValue={editIconValue}
                  onSelect={(type, value) => {
                    setEditIconType(type)
                    setEditIconValue(value)
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
