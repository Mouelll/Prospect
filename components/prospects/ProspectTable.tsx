'use client'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Archive, ChevronLeft, ChevronRight } from 'lucide-react'
import { Company } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { ScoreStars } from './ScoreStars'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

const col = createColumnHelper<Company>()

interface ProspectTableProps {
  data: Company[]
  onRefresh: () => void
}

export function ProspectTable({ data, onRefresh }: ProspectTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    col.accessor('name', {
      header: 'Nom',
      cell: (i) => (
        <span className="font-medium text-[#f0f0ee]">{i.getValue()}</span>
      ),
    }),
    col.accessor('sector', {
      header: 'Secteur',
      cell: (i) => <span className="text-[#888880]">{i.getValue() ?? '—'}</span>,
    }),
    col.accessor('city', {
      header: 'Ville',
      cell: (i) => <span className="text-[#888880]">{i.getValue() ?? '—'}</span>,
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
        if (!v) return <span className="text-[#555550]">—</span>
        const date = new Date(v)
        const past = date < new Date()
        return (
          <span className={past ? 'text-amber-400' : 'text-[#888880]'}>
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
              await supabase
                .from('companies')
                .update({ status: 'archived' })
                .eq('id', i.row.original.id)
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
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
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
                    className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#888880] transition-colors"
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
                <td colSpan={7} className="px-4 py-12 text-center text-[#555550]">
                  Aucun prospect trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-[#888880]">
        <span>
          {table.getFilteredRowModel().rows.length} prospect
          {table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-xs">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
