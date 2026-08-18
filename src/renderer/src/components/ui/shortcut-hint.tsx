import { cn } from '@/lib/utils'

/**
 * Small inline keyboard-shortcut badge rendered inside a button next to its
 * label so the binding is discoverable without hovering.
 */
export function ShortcutHint({
  label,
  className
}: {
  label: string
  className?: string
}): React.JSX.Element {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        'ml-1 inline-flex h-4 items-center rounded-[4px] border border-current/20 px-1 font-sans text-[10px] font-medium leading-none opacity-60',
        className
      )}
    >
      {label}
    </kbd>
  )
}
