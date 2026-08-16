import { useState, useCallback } from 'react'
import { ArrowDownUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores'
import { cn } from '@/lib/utils'
import {
  SIDEBAR_HEADER_ACTION_BUTTON,
  SIDEBAR_HEADER_ACTION_ICON,
  SIDEBAR_HEADER_ACTION_ICON_STROKE
} from '@/components/sidebar'

export function SortProjectsButton(): React.JSX.Element {
  const [isSorting, setIsSorting] = useState(false)
  const sortProjectsByLastMessage = useProjectStore((s) => s.sortProjectsByLastMessage)

  const handleSort = useCallback(async (): Promise<void> => {
    if (isSorting) return
    setIsSorting(true)
    try {
      await sortProjectsByLastMessage()
    } finally {
      setIsSorting(false)
    }
  }, [isSorting, sortProjectsByLastMessage])

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className={SIDEBAR_HEADER_ACTION_BUTTON}
      title="Sort by last message"
      onClick={handleSort}
      disabled={isSorting}
      data-testid="sort-projects-button"
    >
      {isSorting ? (
        <Loader2 className={cn(SIDEBAR_HEADER_ACTION_ICON, 'animate-spin')} />
      ) : (
        <ArrowDownUp
          className={SIDEBAR_HEADER_ACTION_ICON}
          strokeWidth={SIDEBAR_HEADER_ACTION_ICON_STROKE}
        />
      )}
    </Button>
  )
}
