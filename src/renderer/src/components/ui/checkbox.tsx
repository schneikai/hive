import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        ref={ref}
        className={cn(
          'peer size-4 shrink-0 rounded-[4px] border border-input',
          'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
          className
        )}
        data-state={checked ? 'checked' : 'unchecked'}
        onClick={() => onCheckedChange?.(!checked)}
        {...props}
      >
        {checked && (
          <span className="flex items-center justify-center text-current">
            <Check className="h-3 w-3" />
          </span>
        )}
      </button>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
