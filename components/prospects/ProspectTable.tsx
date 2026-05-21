'use client'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  Eye, Archive, ChevronLeft, ChevronRight,
  Users, MapPin, Globe
} from 'lucide-react'
import { Company } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { ScoreStars } from './ScoreStars'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

const col = createColumnHelper<Company>()

interface ProspectTableProps {
  data: Company[]
  onRefresh: () => void
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

export function ProspectTable({
  data, onRefresh, page, totalPages, total, pageSize, onPageChange,
}: ProspectTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    col.accessor('name', {
      header: 'Nom',
      cell: (i) => (
        <div className="min-w-0">
          <span className="font-medium text-[#f0f0ee] truncate block">{i.getValue()}</span>
          {i.row.original.sector && (
            <span className="text-xs text-[#555550]">{i.row.original.sector}</span>
          )}
        </div>
      ),
    }),
    col.accessor('city', {
      header: 'Localisation',
      cell: (i) => {
        const city = i.getValue()
        const region = i.row.original.region
        if (!city && !region) return <span className="text-[#444440]">—</span>
        return (
          <div className="text-sm">
            {city && <div className="flex items-center gap-1 text-[#888880]"><MapPin size={11} />{city}</div>}
            {region && <div className="text-xs text-[#555550]">{region}</div>}
          </div>
        )
      },
    }),
    col.accessor('employees_count', {
      header: 'Effectifs',
      cell: (i) => {
        const v = i.getValue()
        if (v == null) return <span className="text-[#444440]">—</span>
        return (
          <div className="flex items-center gap-1 text-sm text-[#888880]">
            <Users size={11} />
            {v.toLocaleString('fr-FR')}
          </div>
        )
      },
    }),
    col.accessor('google_rating', {
      header: 'Google',
      cell: (i) => {
        const v = i.getValue()
        if (v == null) return <span className="text-[#444440]">—</span>
        return (
          <span className={`text-sm font-medium ${v >= 4.5 ? 'text-green-400' : v >= 4 ? 'text-[#c9a96e]' : 'text-[#888880]'}`}>
            ★ {v}
          </span>
        )
      },
    }),
    col.accessor('score', {
      header: 'Score',
      cell: (i) => <ScoreStars score={i.getValue()} />,
    }),
    col.accessor('status', {
      header: 'Statut',
      cell: (i) => <StatusBadge status={i.getValue()} />,
    }),
    col.accessor('next_followup_date', {
      header: 'Relance',
      cell: (i) => {
        const v = i.getValue()
        if (!v) return <span className="text-[#444440]">—</span>
        const date = new Date(v)
        const past = date < new Date()
        return (
          <span className={`text-sm ${past ? 'text-amber-400' : 'text-[#888880]'}`}>
            {format(date, 'd MMM yy', { locale: fr })}
          </span>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (i) => (
        <div className="flex items-center gap-1 justify-end">
          {i.row.original.website && (
            <a
              href={i.row.original.website.startsWith('http') ? i.row.original.website : `https://${i.row.original.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-[#555550] hover:text-[#f0f0ee] transition-colors"
            >
              <Globe size={14} />
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/prospects/${i.row.original.id}`)
            }}
          >
            <Eye size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation()
              await supabase.from('companies').update({ status: 'archived' }).eq('id', i.row.original.id)
              onRefresh()
            }}
          >
            <Archive size={14} />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  })

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-white/[0.07]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-white/[0.07]">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#888880] transition-colors whitespace-nowrap"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <>
                          {header.column.getIsSorted() === 'asc' && <ArrowUp size={12} />}
                          {header.column.getIsSorted() === 'desc' && <ArrowDown size={12} />}
                          {!header.column.getIsSorted() && <ArrowUpDown size={12} className="opacity-30" />}
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => router.push(`/prospects/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#555550]">
                  Aucune entreprise trouvée — ajustez les filtres
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-[#555550]">
          {total === 0 ? '0' : (page * pageSize + 1).toLocaleString('fr-FR')}
          –{Math.min((page + 1) * pageSize, total).toLocaleString('fr-FR')} sur{' '}
          <span className="text-[#f0f0ee] font-medium">{total.toLocaleString('fr-FR')}</span>
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-[#888880] text-xs px-2">
            {page + 1} / {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
