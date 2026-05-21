import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gold' | 'blue' | 'amber' | 'purple' | 'green' | 'slate' | 'red'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        {
          'bg-white/10 text-[#f0f0ee]': variant === 'default',
          'bg-[#c9a96e]/20 text-[#c9a96e]': variant === 'gold',
          'bg-blue-900/40 text-blue-300': variant === 'blue',
          'bg-amber-900/40 text-amber-300': variant === 'amber',
          'bg-purple-900/40 text-purple-300': variant === 'purple',
          'bg-green-900/40 text-green-300': variant === 'green',
          'bg-slate-800/60 text-slate-400': variant === 'slate',
          'bg-red-900/40 text-red-300': variant === 'red',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
