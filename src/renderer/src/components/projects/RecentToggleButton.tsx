import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRecentStore } from '@/stores'
import {
  SIDEBAR_HEADER_ACTION_BUTTON,
  SIDEBAR_HEADER_ACTION_ICON,
  SIDEBAR_HEADER_ACTION_ICON_STROKE
} from '@/components/sidebar'

export function RecentToggleButton(): React.JSX.Element {
  const recentVisible = useRecentStore((s) => s.recentVisible)
  const toggleRecent = useRecentStore((s) => s.toggleRecent)

  return (
    <Button
      // Orca SidebarToolbar: 'secondary' variant while the toggled surface is open
      variant={recentVisible ? 'secondary' : 'ghost'}
      size="icon-xs"
      className={SIDEBAR_HEADER_ACTION_BUTTON}
      title="Toggle recent activity"
      aria-pressed={recentVisible}
      onClick={toggleRecent}
      data-testid="recent-toggle-button"
    >
      <Zap className={SIDEBAR_HEADER_ACTION_ICON} strokeWidth={SIDEBAR_HEADER_ACTION_ICON_STROKE} />
    </Button>
  )
}
