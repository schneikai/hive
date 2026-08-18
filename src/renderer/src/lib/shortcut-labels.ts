import { isMac } from '@/lib/platform'

/**
 * Platform-aware label for a Cmd/Ctrl(+Shift)+Enter shortcut, e.g. "⌘↵" /
 * "⌘⇧↵" on macOS and "Ctrl+Enter" / "Ctrl+Shift+Enter" elsewhere.
 */
export function submitShortcutLabel(opts: { shift?: boolean } = {}): string {
  if (isMac()) return `⌘${opts.shift ? '⇧' : ''}↵`
  return `Ctrl+${opts.shift ? 'Shift+' : ''}Enter`
}
