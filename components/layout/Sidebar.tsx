'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, KanbanSquare, Bell, Upload, FileText, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/prospects', label: 'Prospects', icon: Building2 },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/relances', label: 'Relances', icon: Bell },
  { href: '/base', label: 'Base Sirene', icon: Database },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/templates', label: 'Templates', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-full w-[220px] bg-[#111] border-r border-white/[0.07] flex flex-col z-40">
      <div className="px-5 py-6 border-b border-white/[0.07]">
        <span className="text-[#c9a96e] font-semibold tracking-wide text-sm uppercase">
          Prospecteur
        </span>
        <p className="text-[#555550] text-xs mt-0.5">B2B Vidéaste</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-[#c9a96e]/10 text-[#c9a96e]'
                  : 'text-[#888880] hover:text-[#f0f0ee] hover:bg-white/5'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
