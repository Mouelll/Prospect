import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f0f0ee] placeholder-[#555550]',
          'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/50 focus:border-[#c9a96e]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
