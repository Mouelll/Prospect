'use client'
import { Company, ProspectStatus } from '@/lib/types'
import { KanbanColumn } from './KanbanColumn'

const COLUMNS: { status: ProspectStatus; label: string }[] = [
  { status: 'to_contact', label: 'À contacter' },
  { status: 'contacted', label: 'Contacté' },
  { status: 'in_discussion', label: 'En discussion' },
  { status: 'quote_sent', label: 'Devis envoyé' },
  { status: 'client', label: 'Client' },
]

interface KanbanBoardProps {
  companies: Company[]
  onRefresh: () => void
}

export function KanbanBoard({ companies, onRefresh }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(({ status, label }) => (
        <KanbanColumn
          key={status}
          status={status}
          label={label}
          companies={companies.filter((c) => c.status === status)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}
