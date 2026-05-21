'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/lib/types'
import { ProspectTable } from '@/components/prospects/ProspectTable'
import { ProspectFilters, Filters, EMPTY_FILTERS } from '@/components/prospects/ProspectFilters'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { exportCompaniesToCSV } from '@/lib/export'
import { Plus, Download } from 'lucide-react'

const PAGE_SIZE = 50

function buildQuery(filters: Filters, page: number) {
  let q = supabase
    .from('companies')
    .select('*', { count: 'exact' })

  // Recherche texte
  if (filters.search.trim()) {
    const s = filters.search.trim()
    q = q.or(`name.ilike.%${s}%,city.ilike.%${s}%`)
  }

  // Statut
  if (filters.status) q = q.eq('status', filters.status)

  // Secteur
  if (filters.sector) q = q.eq('sector', filters.sector)

  // Région
  if (filters.region) q = q.eq('region', filters.region)

  // Ville
  if (filters.city.trim()) q = q.ilike('city', `%${filters.city.trim()}%`)

  // Effectifs
  if (filters.effectifs) {
    const [min, max] = filters.effectifs.split('-')
    if (min) q = q.gte('employees_count', parseInt(min))
    if (max) q = q.lte('employees_count', parseInt(max))
  }

  // Note Google
  if (filters.googleRatingMin) q = q.gte('google_rating', parseFloat(filters.googleRatingMin))

  // Présence vidéo
  if (filters.hasVideo === 'yes') q = q.eq('has_video', true)
  if (filters.hasVideo === 'no') q = q.eq('has_video', false)

  // Score minimum
  if (filters.scoreMin) {
    const min = parseInt(filters.scoreMin)
    if (min === 5) {
      q = q.eq('score', 5)
    } else {
      q = q.gte('score', min)
    }
  }

  // Source
  if (filters.source) q = q.eq('source', filters.source)

  // Relances uniquement
  if (filters.followupOnly) {
    q = q.lte('next_followup_date', new Date().toISOString().split('T')[0])
      .not('next_followup_date', 'is', null)
  }

  // Pagination
  q = q
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  return q
}

export default function ProspectsPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [exporting, setExporting] = useState(false)

  // Debounce pour la recherche texte
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFilters = useRef<Filters>(EMPTY_FILTERS)

  const load = useCallback(async (f: Filters, p: number) => {
    setLoading(true)
    const { data, count, error } = await buildQuery(f, p)
    if (!error) {
      setCompanies(data ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(filters, page)
  }, [filters, page, load])

  const handleFiltersChange = (newFilters: Filters) => {
    pendingFilters.current = newFilters
    setPage(0)

    // Debounce uniquement sur la recherche texte
    if (newFilters.search !== filters.search) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setFilters(pendingFilters.current)
      }, 350)
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setFilters(newFilters)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    // Export sans pagination — on récupère jusqu'à 5 000 lignes
    let q = supabase.from('companies').select('*')
    if (filters.search.trim()) q = q.or(`name.ilike.%${filters.search.trim()}%,city.ilike.%${filters.search.trim()}%`)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.sector) q = q.eq('sector', filters.sector)
    if (filters.region) q = q.eq('region', filters.region)
    if (filters.city.trim()) q = q.ilike('city', `%${filters.city.trim()}%`)
    if (filters.effectifs) {
      const [min, max] = filters.effectifs.split('-')
      if (min) q = q.gte('employees_count', parseInt(min))
      if (max) q = q.lte('employees_count', parseInt(max))
    }
    if (filters.googleRatingMin) q = q.gte('google_rating', parseFloat(filters.googleRatingMin))
    if (filters.hasVideo === 'yes') q = q.eq('has_video', true)
    if (filters.hasVideo === 'no') q = q.eq('has_video', false)
    if (filters.scoreMin) q = q.gte('score', parseInt(filters.scoreMin))
    if (filters.source) q = q.eq('source', filters.source)
    if (filters.followupOnly) q = q.lte('next_followup_date', new Date().toISOString().split('T')[0]).not('next_followup_date', 'is', null)
    q = q.limit(5000).order('created_at', { ascending: false })

    const { data } = await q
    if (data) exportCompaniesToCSV(data)
    setExporting(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#f0f0ee]">Prospects</h1>
          <p className="text-sm text-[#888880] mt-0.5">
            {total.toLocaleString('fr-FR')} entreprise{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={total === 0 || exporting}>
            {exporting ? <Spinner className="text-current" /> : <Download size={15} />}
            Exporter CSV
          </Button>
          <Button variant="primary" onClick={() => router.push('/prospects/new')}>
            <Plus size={15} />
            Nouveau
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <ProspectFilters filters={filters} onChange={handleFiltersChange} total={total} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
        </div>
      ) : (
        <ProspectTable
          data={companies}
          onRefresh={() => load(filters, page)}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
