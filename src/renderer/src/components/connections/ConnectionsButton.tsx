import { useState } from 'react'
import { Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SIDEBAR_HEADER_ACTION_BUTTON,
  SIDEBAR_HEADER_ACTION_ICON,
  SIDEBAR_HEADER_ACTION_ICON_STROKE
} from '@/components/sidebar'
import { RecentConnectionsDialog } from './RecentConnectionsDialog'

export function ConnectionsButton(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      {/* Orca SidebarHeader action: ghost icon-xs (24px, rounded-md), muted 14px glyph */}
      <Button
        variant="ghost"
        size="icon-xs"
        className={SIDEBAR_HEADER_ACTION_BUTTON}
        title="Recent connections"
        onClick={() => setDialogOpen(true)}
        data-testid="connections-button"
      >
        <Link
          className={SIDEBAR_HEADER_ACTION_ICON}
          strokeWidth={SIDEBAR_HEADER_ACTION_ICON_STROKE}
        />
      </Button>
      <RecentConnectionsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
