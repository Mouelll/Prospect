'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/50 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-[#c9a96e] text-[#0f0f0f] hover:bg-[#b8955a]': variant === 'primary',
            'bg-[#1e1e1e] text-[#f0f0ee] border border-white/10 hover:bg-[#252525]': variant === 'secondary',
            'text-[#888880] hover:text-[#f0f0ee] hover:bg-white/5': variant === 'ghost',
            'bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50': variant === 'danger',
          },
          {
            'text-xs px-2.5 py-1.5': size === 'sm',
            'text-sm px-4 py-2': size === 'md',
            'text-base px-6 py-2.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
