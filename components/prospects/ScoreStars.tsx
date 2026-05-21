'use client'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreStarsProps {
  score: number | null
  interactive?: boolean
  onChange?: (score: number) => void
  size?: number
}

export function ScoreStars({ score, interactive = false, onChange, size = 14 }: ScoreStarsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          onClick={interactive && onChange ? () => onChange(i) : undefined}
          className={cn(
            'transition-colors',
            i <= (score ?? 0) ? 'fill-[#c9a96e] text-[#c9a96e]' : 'fill-transparent text-[#333330]',
            interactive && 'cursor-pointer hover:text-[#c9a96e]'
          )}
        />
      ))}
    </div>
  )
}
