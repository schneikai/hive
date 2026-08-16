import { resolveModelIconAsset } from '@/components/worktrees/ModelIcon'
import { isUltraVariant } from '@/lib/parseProviders'
import { resolveQuickLaunchModel } from '@/components/kanban/WorktreePickerModal'
import { resolveModelDisplayName } from '@/components/kanban/TicketModelBadge'

/**
 * Overlay chip pinned under a right-button drag ghost: "Launches with
 * <icon> <model> <EFFORT>". Built imperatively because the ghost is a detached
 * DOM clone (no React tree to render into). Resolves the exact model + effort
 * `quickLaunchTicket` will use so the drag preview never lies.
 */
export function buildQuickLaunchGhostChip(): HTMLElement {
  const { model } = resolveQuickLaunchModel()
  const displayName = resolveModelDisplayName(model.providerID, model.modelID)
  const icon = resolveModelIconAsset(model.providerID, model.modelID)

  const chip = document.createElement('div')
  chip.setAttribute('data-testid', 'right-drag-launch-chip')
  chip.className =
    'absolute left-0 top-full mt-1.5 inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium leading-none text-foreground shadow-md'

  const label = document.createElement('span')
  label.className = 'text-muted-foreground'
  label.textContent = 'Launches with'
  chip.appendChild(label)

  if (icon) {
    const img = document.createElement('img')
    img.src = icon.src
    img.alt = icon.alt
    img.draggable = false
    img.className = 'h-3 w-3 shrink-0'
    chip.appendChild(img)
  }

  const name = document.createElement('span')
  name.className = 'truncate'
  name.textContent = displayName
  chip.appendChild(name)

  if (model.variant) {
    const variant = document.createElement('span')
    variant.className = isUltraVariant(model.variant)
      ? 'text-[10px] font-semibold uppercase text-violet-600 dark:text-violet-300'
      : 'text-[10px] font-semibold uppercase text-muted-foreground'
    variant.textContent = model.variant
    chip.appendChild(variant)
  }

  return chip
}
