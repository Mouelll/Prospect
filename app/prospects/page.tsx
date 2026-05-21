'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/lib/types'
import { ProspectTable } from '@/components/prospects/ProspectTable'
import { ProspectFilters, Filters } from '@/components/prospects/ProspectFilters'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { exportCompaniesToCSV } from '@/lib/export'
import { Plus, Download } from 'lucide-react'
import { isToday, isBefore, parseISO } from 'date-fns'

export default function ProspectsPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    sector: '',
    region: '',
    followupOnly: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    setCompanies(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = companies.filter((c) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!c.name.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q)) return false
    }
    if (filters.status && c.status !== filters.status) return false
    if (filters.sector && c.sector !== filters.sector) return false
    if (filters.region && c.region !== filters.region) return false
    if (filters.followupOnly) {
      if (!c.next_followup_date) return false
      const d = parseISO(c.next_followup_date)
      if (!isBefore(d, new Date()) && !isToday(d)) return false
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f0f0ee]">Prospects</h1>
          <p className="text-sm text-[#888880] mt-0.5">{companies.length} entreprises</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => exportCompaniesToCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={15} />
            Exporter CSV
          </Button>
          <Button variant="primary" onClick={() => router.push('/prospects/new')}>
            <Plus size={15} />
            Nouveau
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <ProspectFilters filters={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
        </div>
      ) : (
        <ProspectTable data={filtered} onRefresh={load} />
      )}
    </div>
  )
}
