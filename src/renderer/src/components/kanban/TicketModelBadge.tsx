import { useSyncExternalStore } from 'react'
import { resolveModelIconAsset } from '@/components/worktrees/ModelIcon'
import {
  getAvailableHandoffAgentSdks,
  getCachedModelCatalog,
  getModelCatalogCacheVersion,
  subscribeModelCatalogCache
} from '@/lib/handoffSelection'
import { findModelInfo, getModelDisplayName, isUltraVariant } from '@/lib/parseProviders'
import {
  claudeCliFallbackModelName,
  isClaudeCliFallbackModelId
} from '@shared/types/claude-cli-fallback-models'
import { cn } from '@/lib/utils'
import type { KanbanTicket } from '../../../../main/db/types'

/**
 * Looks up the pretty model name from any cached handoff SDK catalog, falling
 * back to a known safety/usage-fallback name (e.g. `opus-4-8` → "Opus 4.8") and
 * then to the raw modelId. Fallback models are intentionally absent from the
 * picker catalog, so their name never resolves via findModelInfo.
 */
function resolveModelDisplayName(providerId: string | null, modelId: string): string {
  if (providerId) {
    for (const sdk of getAvailableHandoffAgentSdks()) {
      const catalog = getCachedModelCatalog(sdk)
      if (!catalog) continue
      const modelInfo = findModelInfo(catalog, providerId, modelId)
      if (modelInfo) return getModelDisplayName(modelInfo)
    }
  }

  return claudeCliFallbackModelName(modelId) ?? modelId
}

interface TicketModelBadgeProps {
  ticket: Pick<KanbanTicket, 'model_provider_id' | 'model_id' | 'model_variant'>
  className?: string
}

export function TicketModelBadge({
  ticket,
  className
}: TicketModelBadgeProps): React.JSX.Element | null {
  // Re-render when a model catalog lands so badges mounted before the launch
  // preload finishes swap their raw slug for the pretty name.
  useSyncExternalStore(subscribeModelCatalogCache, getModelCatalogCacheVersion)

  const { model_provider_id: providerId, model_id: modelId, model_variant: variant } = ticket
  if (!modelId) return null

  const icon = resolveModelIconAsset(providerId, modelId)
  const displayName = resolveModelDisplayName(providerId, modelId)
  // A non-selectable safety/usage fallback (the CLI degraded the session off the
  // picked model) — flag it so the badge reads as an involuntary state, not a choice.
  const isFallback = isClaudeCliFallbackModelId(modelId)
  const baseTitle = variant ? `${displayName} (${variant})` : displayName
  const title = isFallback ? `${baseTitle} — safety fallback` : baseTitle

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-transparent bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground',
        isUltraVariant(variant) && 'border-2 border-violet-500',
        className
      )}
    >
      {icon && <img src={icon.src} alt={icon.alt} className="h-3 w-3 shrink-0" draggable={false} />}
      {displayName}
      {isFallback && (
        <span
          className="rounded-sm bg-amber-500/15 px-1 text-[9px] font-semibold uppercase leading-tight tracking-wide text-amber-600 dark:text-amber-400"
          data-testid="model-fallback-tag"
        >
          fallback
        </span>
      )}
    </span>
  )
}
