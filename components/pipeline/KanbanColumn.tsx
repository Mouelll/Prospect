'use client'
import { Company, ProspectStatus } from '@/lib/types'
import { ScoreStars } from '@/components/prospects/ScoreStars'
import { Select } from '@/components/ui/Select'
import { STATUS_OPTIONS } from '@/components/prospects/StatusBadge'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface KanbanColumnProps {
  status: ProspectStatus
  label: string
  companies: Company[]
  onRefresh: () => void
}

const COLUMN_COLORS: Record<ProspectStatus, string> = {
  to_contact: 'border-slate-700',
  contacted: 'border-blue-800',
  in_discussion: 'border-amber-800',
  quote_sent: 'border-purple-800',
  client: 'border-green-800',
  archived: 'border-slate-800',
}

export function KanbanColumn({ status, label, companies, onRefresh }: KanbanColumnProps) {
  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('companies').update({ status: newStatus }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${COLUMN_COLORS[status]}`}>
        <span className="text-sm font-semibold text-[#f0f0ee]">{label}</span>
        <span className="text-xs text-[#555550] bg-white/5 px-2 py-0.5 rounded-full">
          {companies.length}
        </span>
      </div>

      <div className="space-y-2">
        {companies.map((company) => (
          <div
            key={company.id}
            className="bg-[#161616] border border-white/[0.07] rounded-lg p-3 hover:border-white/15 transition-colors"
          >
            <Link
              href={`/prospects/${company.id}`}
              className="font-medium text-sm text-[#f0f0ee] hover:text-[#c9a96e] transition-colors block mb-2"
            >
              {company.name}
            </Link>

            {company.city && (
              <p className="text-xs text-[#555550] mb-2">{company.city}</p>
            )}

            <div className="mb-2">
              <ScoreStars score={company.score} size={12} />
            </div>

            {company.next_followup_date && (
              <p className="text-xs text-amber-400 mb-2">
                Relance : {format(new Date(company.next_followup_date), 'd MMM', { locale: fr })}
              </p>
            )}

            <Select
              value={company.status}
              onChange={(e) => handleStatusChange(company.id, e.target.value)}
              className="text-xs py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {STATUS_OPTIONS.filter((s) => s.value !== 'archived').map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        ))}

        {companies.length === 0 && (
          <div className="text-center py-8 text-[#333330] text-xs">Vide</div>
        )}
      </div>
    </div>
  )
}
