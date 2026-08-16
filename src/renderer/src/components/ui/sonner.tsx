import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useThemeStore } from '@/stores/useThemeStore'

function Toaster({ ...props }: ToasterProps) {
  const theme = useThemeStore((state) => state.getCurrentTheme()?.type ?? 'dark')

  return (
    <Sonner
      position="bottom-left"
      theme={theme}
      className="toaster group"
      // Below the z-50 popup layer (context/dropdown menus, dialogs) so toasts
      // never intercept clicks on menu items that overlap them
      style={{ zIndex: 40 }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[rgba(255,255,255,0.82)] dark:group-[.toaster]:bg-[rgba(0,0,0,0.72)] group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-foreground group-[.toaster]:border-black/14 dark:group-[.toaster]:border-white/14 group-[.toaster]:shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] group-[.toaster]:rounded-[11px] group-[.toaster]:text-[13px]',
          success: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-emerald-500',
          error: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-red-500',
          info: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500',
          warning: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
