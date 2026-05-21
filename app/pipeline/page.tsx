'use client'
export const dynamic = 'force-dynamic'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/lib/types'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { Spinner } from '@/components/ui/Spinner'

export default function PipelinePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
    setCompanies(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#f0f0ee]">Pipeline</h1>
        <p className="text-sm text-[#888880] mt-0.5">Vue Kanban</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
        </div>
      ) : (
        <KanbanBoard companies={companies} onRefresh={load} />
      )}
    </div>
  )
}
