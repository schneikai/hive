import { useEffect, useState, useCallback } from 'react'
import { Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores'
import {
  SECTION_HEADER_ICON,
  SECTION_HEADER_WRAPPER_STICKY,
  SECTION_HEADER_WRAPPER_STICKY_TOP,
  SidebarSectionHeader
} from '@/components/sidebar'
import { ConnectionItem } from './ConnectionItem'
import { ManageConnectionWorktreesDialog } from './ManageConnectionWorktreesDialog'

export function ConnectionList(): React.JSX.Element | null {
  const connections = useConnectionStore((s) => s.connections)
  const loadConnections = useConnectionStore((s) => s.loadConnections)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // State for managing worktrees of an existing connection
  const [manageConnectionId, setManageConnectionId] = useState<string | null>(null)

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const handleManageWorktrees = useCallback((connectionId: string) => {
    setManageConnectionId(connectionId)
  }, [])

  const handleCloseManageDialog = useCallback(() => {
    setManageConnectionId(null)
  }, [])

  const connectionModeActive = useConnectionStore((s) => s.connectionModeActive)

  if (connections.length === 0 || connectionModeActive) {
    return null
  }

  return (
    // Orca virtual-row rhythm: ROW_GAP (6px) between header and every card; the
    // trailing pb-2.5 (= ROW_GAP + GROUP_HEADER_TOP_MARGIN) gives the next
    // section header its 6px gap + pt-1 spacer.
    <div data-testid="connection-list" className="flex flex-col gap-1.5 pb-2.5">
      {/* Sticky wrapper is ours (not the kit's `sticky` prop) so the header keeps its data-testid. */}
      <div
        className={cn(SECTION_HEADER_WRAPPER_STICKY, SECTION_HEADER_WRAPPER_STICKY_TOP)}
        data-testid="connections-section-header"
      >
        <SidebarSectionHeader
          icon={<Link className={SECTION_HEADER_ICON} />}
          label="Connections"
          count={connections.length}
          expanded={!isCollapsed}
          onToggle={() => setIsCollapsed((collapsed) => !collapsed)}
        />
      </div>

      {/* Connection items */}
      {!isCollapsed && (
        <div className="flex flex-col gap-1.5" data-testid="connections-list-items">
          {connections.map((connection) => (
            <ConnectionItem
              key={connection.id}
              connection={connection}
              onManageWorktrees={handleManageWorktrees}
            />
          ))}
        </div>
      )}

      {/* Manage connection worktrees dialog */}
      {manageConnectionId && (
        <ManageConnectionWorktreesDialog
          connectionId={manageConnectionId}
          open={!!manageConnectionId}
          onOpenChange={(open) => {
            if (!open) handleCloseManageDialog()
          }}
        />
      )}
    </div>
  )
}
