'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ScoreStars } from '@/components/prospects/ScoreStars'
import { Spinner } from '@/components/ui/Spinner'
import { NAF_LABELS, ALL_SECTEURS } from '@/lib/naf-codes'
import { enrichBySiren, pappersUrl, googleSearchUrl } from '@/lib/enrichment'
import {
  UserPlus, Users, MapPin, ChevronLeft, ChevronRight,
  SlidersHorizontal, ChevronDown, ChevronUp, X, CheckSquare, Square,
  Sparkles, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

const PAGE_SIZE = 100

const EFFECTIFS_OPTIONS = [
  { value: '', label: 'Tous les effectifs' },
  { value: '1-9', label: '1 – 9 salariés' },
  { value: '10-49', label: '10 – 49 salariés' },
  { value: '50-199', label: '50 – 199 salariés' },
  { value: '200-999', label: '200 – 999 salariés' },
  { value: '1000-', label: '1 000+ salariés' },
]

interface Filters {
  search: string
  sector: string
  naf: string
  region: string
  city: string
  effectifs: string
  source: string
}

const EMPTY: Filters = { search: '', sector: '', naf: '', region: '', city: '', effectifs: '', source: '' }

const REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire',
  'Corse', 'Grand Est', 'Guadeloupe', 'Guyane', 'Hauts-de-France',
  'Île-de-France', 'La Réunion', 'Martinique', 'Mayotte', 'Normandie',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
]

export default function BaseSirenePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [enrichingId, setEnrichingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFilters = useRef<Filters>(EMPTY)

  const buildQuery = useCallback((f: Filters, p: number, hasMigration: boolean) => {
    let q = supabase
      .from('companies')
      .select('*', { count: 'estimated' })
      .in('source', ['sirene', 'sirene_ul'])

    // Filtre in_prospect_list uniquement si la colonne existe
    if (hasMigration) q = q.eq('in_prospect_list', false)

    if (f.search.trim()) q = q.or(`name.ilike.%${f.search.trim()}%,city.ilike.%${f.search.trim()}%`)
    if (f.sector) q = q.eq('sector', f.sector)
    if (f.naf) q = q.eq('naf_code', f.naf)
    if (f.region) q = q.eq('region', f.region)
    if (f.city.trim()) q = q.ilike('city', `%${f.city.trim()}%`)
    if (f.source) q = q.eq('source', f.source)
    if (f.effectifs) {
      const [min, max] = f.effectifs.split('-')
      if (min) q = q.gte('employees_count', parseInt(min))
      if (max) q = q.lte('employees_count', parseInt(max))
    }

    return q.order('id').range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)
  }, [])

  const load = useCallback(async (f: Filters, p: number) => {
    setLoading(true)

    // Tente d'abord avec la colonne in_prospect_list
    const { data, count, error } = await buildQuery(f, p, true)

    if (error && error.message?.includes('in_prospect_list')) {
      // Colonne absente → migration non exécutée
      setMigrationNeeded(true)
      const fallback = await buildQuery(f, p, false)
      setCompanies(fallback.data ?? [])
      setTotal(fallback.count ?? 0)
    } else {
      setMigrationNeeded(false)
      setCompanies(data ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
    setSelected(new Set())
  }, [buildQuery])

  useEffect(() => { load(filters, page) }, [filters, page, load])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const next = { ...pendingFilters.current, [key]: value }
    pendingFilters.current = next
    setPage(0)
    if (key === 'search' || key === 'city') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setFilters(pendingFilters.current), 350)
    } else {
      setFilters(next)
    }
  }

  const reset = () => {
    pendingFilters.current = EMPTY
    setFilters(EMPTY)
    setPage(0)
  }

  // Sélection
  const toggleAll = () => {
    if (selected.size === companies.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(companies.map(c => c.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  // Enrichissement individuel d'une société
  const enrichOne = async (company: Company) => {
    if (!company.siren || enrichingId) return
    setEnrichingId(company.id)
    try {
      const data = await enrichBySiren(company.siren)
      if (data) {
        const update: Partial<Company> = {}
        if (!company.city && data.city) update.city = data.city
        if (!company.postal_code && data.postal_code) update.postal_code = data.postal_code
        if (!company.region && data.region) update.region = data.region
        if (!company.siret && data.siret) update.siret = data.siret
        if (Object.keys(update).length > 0) {
          await supabase.from('companies').update(update).eq('id', company.id)
          load(filters, page)
        }
      }
    } finally {
      setEnrichingId(null)
    }
  }

  // Import vers Prospects (avec enrichissement auto)
  const addToProspects = async (ids: string[]) => {
    if (ids.length === 0) return
    setImporting(true)
    setImportedCount(null)

    // Récupère les sociétés sélectionnées pour enrichissement
    const toEnrich = companies.filter(c => ids.includes(c.id) && c.siren && !c.city)

    // Par batch de 500 → promotion
    const BATCH = 500
    let done = 0
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH)
      await supabase.from('companies').update({ in_prospect_list: true }).in('id', batch)
      done += batch.length
    }

    // Enrichissement en arrière-plan (sans bloquer l'UI)
    if (toEnrich.length > 0) {
      const ENRICH_CONCURRENCY = 5
      for (let i = 0; i < toEnrich.length; i += ENRICH_CONCURRENCY) {
        const chunk = toEnrich.slice(i, i + ENRICH_CONCURRENCY)
        await Promise.all(chunk.map(async (c) => {
          const data = await enrichBySiren(c.siren!)
          if (data?.city) {
            await supabase.from('companies').update({
              city: data.city,
              postal_code: data.postal_code,
              region: data.region,
              siret: data.siret ?? c.siret,
            }).eq('id', c.id)
          }
        }))
      }
    }

    setImportedCount(done)
    setImporting(false)
    load(filters, page)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = Object.values(filters).filter(v => v !== '').length
  const allSelected = companies.length > 0 && selected.size === companies.length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#f0f0ee]">Base Sirene</h1>
          <p className="text-sm text-[#888880] mt-0.5">
            {total.toLocaleString('fr-FR')} entreprise{total !== 1 ? 's' : ''} disponibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="primary"
              onClick={() => addToProspects([...selected])}
              disabled={importing}
            >
              {importing ? <Spinner className="text-[#0f0f0f]" /> : <UserPlus size={15} />}
              Ajouter {selected.size.toLocaleString('fr-FR')} à mes prospects
            </Button>
          )}
          <Link href="/import">
            <Button variant="secondary">+ Importer un CSV</Button>
          </Link>
        </div>
      </div>

      {/* Bandeau migration manquante */}
      {migrationNeeded && (
        <div className="mb-4 bg-amber-900/20 border border-amber-700/50 text-amber-300 text-sm rounded-lg px-4 py-3">
          <p className="font-medium mb-1">⚠️ Migration Supabase requise</p>
          <p className="text-amber-400/80 mb-2">
            La colonne <code className="bg-black/30 px-1 rounded">in_prospect_list</code> est manquante.
            Les entreprises s&apos;affichent mais le bouton &quot;Ajouter aux prospects&quot; ne fonctionnera pas tant que la migration n&apos;est pas exécutée.
          </p>
          <p className="text-xs text-amber-400/60 font-mono bg-black/30 px-3 py-2 rounded">
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS in_prospect_list boolean NOT NULL DEFAULT false;<br />
            CREATE INDEX IF NOT EXISTS idx_companies_prospect_list ON companies(in_prospect_list);
          </p>
          <a
            href="https://supabase.com/dashboard/project/zdfaocljvgivthnmlhoc/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-amber-300 underline hover:text-amber-200"
          >
            Ouvrir le SQL Editor Supabase →
          </a>
        </div>
      )}

      {/* Feedback import */}
      {importedCount !== null && (
        <div className="mb-4 bg-green-900/20 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span>✓ {importedCount.toLocaleString('fr-FR')} entreprise{importedCount !== 1 ? 's' : ''} ajoutée{importedCount !== 1 ? 's' : ''} à vos prospects</span>
          <Link href="/prospects" className="underline hover:text-green-300">Voir les prospects →</Link>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Rechercher par nom, ville…"
            defaultValue={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-52"
          />
          <Select value={filters.sector} onChange={(e) => handleFilterChange('sector', e.target.value)} className="w-44">
            <option value="">Tous secteurs</option>
            {ALL_SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filters.source} onChange={(e) => handleFilterChange('source', e.target.value)} className="w-44">
            <option value="">Toutes sources</option>
            <option value="sirene">Sirene Établissement</option>
            <option value="sirene_ul">Sirene Unité légale</option>
          </Select>
          <Button
            variant={expanded ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            <SlidersHorizontal size={13} />
            Avancé
            {activeFilters > 0 && (
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{activeFilters}</span>
            )}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}><X size={13} />Reset</Button>
          )}
          <span className="ml-auto text-sm text-[#555550]">
            {total.toLocaleString('fr-FR')} résultat{total !== 1 ? 's' : ''}
          </span>
        </div>

        {expanded && (
          <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Région</label>
              <Select value={filters.region} onChange={(e) => handleFilterChange('region', e.target.value)}>
                <option value="">Toutes régions</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <label className="label">Ville</label>
              <Input placeholder="Ex: Lyon" defaultValue={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)} />
            </div>
            <div>
              <label className="label">Effectifs</label>
              <Select value={filters.effectifs} onChange={(e) => handleFilterChange('effectifs', e.target.value)}>
                {EFFECTIFS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="label">Code NAF</label>
              <Select value={filters.naf} onChange={(e) => handleFilterChange('naf', e.target.value)}>
                <option value="">Tous les NAF</option>
                {Object.entries(NAF_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Action barre de sélection */}
      {companies.length > 0 && (
        <div className="flex items-center gap-3 mb-3 text-sm">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-[#888880] hover:text-[#f0f0ee] transition-colors"
          >
            {allSelected
              ? <CheckSquare size={16} className="text-[#c9a96e]" />
              : <Square size={16} />}
            {allSelected ? 'Tout désélectionner' : `Tout sélectionner (${companies.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-[#333330]">|</span>
              <span className="text-[#c9a96e]">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => addToProspects([...selected])}
                disabled={importing}
              >
                {importing ? <Spinner className="text-[#0f0f0f]" /> : <UserPlus size={13} />}
                Ajouter aux prospects
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/[0.07]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleAll}>
                      {allSelected
                        ? <CheckSquare size={15} className="text-[#c9a96e]" />
                        : <Square size={15} className="text-[#555550]" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider">Nom</th>
                  <th className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider">NAF</th>
                  <th className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider">Localisation</th>
                  <th className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider">Effectifs</th>
                  <th className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-3 text-[#555550] font-medium text-xs uppercase tracking-wider">Liens</th>
                  <th className="px-4 py-3 w-36"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-white/[0.04] transition-colors cursor-pointer ${
                      selected.has(c.id) ? 'bg-[#c9a96e]/5' : 'hover:bg-white/[0.02]'
                    }`}
                    onClick={() => toggleOne(c.id)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleOne(c.id)}>
                        {selected.has(c.id)
                          ? <CheckSquare size={15} className="text-[#c9a96e]" />
                          : <Square size={15} className="text-[#555550]" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#f0f0ee]">{c.name}</div>
                      {c.sector && <div className="text-xs text-[#555550]">{c.sector}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {c.naf_code ? (
                        <div>
                          <div className="text-xs text-[#c9a96e] font-medium">{c.naf_code}</div>
                          <div className="text-xs text-[#555550]">{NAF_LABELS[c.naf_code] ?? ''}</div>
                        </div>
                      ) : <span className="text-[#444440]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.city || c.region ? (
                        <div>
                          {c.city && (
                            <div className="flex items-center gap-1 text-[#888880] text-xs">
                              <MapPin size={10} />{c.city}
                              {c.postal_code && <span className="text-[#555550]">({c.postal_code})</span>}
                            </div>
                          )}
                          {c.region && <div className="text-xs text-[#555550]">{c.region}</div>}
                        </div>
                      ) : <span className="text-[#444440]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.employees_count != null ? (
                        <div className="flex items-center gap-1 text-[#888880] text-xs">
                          <Users size={11} />
                          {c.employees_count.toLocaleString('fr-FR')}
                        </div>
                      ) : <span className="text-[#444440]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreStars score={c.score} size={12} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {c.siren && (
                          <>
                            <a
                              href={pappersUrl(c.siren)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#c9a96e] hover:text-[#e0c080] flex items-center gap-0.5"
                              title="Pappers.fr — infos légales + site web"
                            >
                              <ExternalLink size={11} />
                              Pappers
                            </a>
                            <a
                              href={googleSearchUrl(c.name, c.city)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#555550] hover:text-[#888880] flex items-center gap-0.5"
                              title="Chercher le site web sur Google"
                            >
                              <ExternalLink size={11} />
                              Google
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {!c.city && c.siren && (
                          <button
                            onClick={() => enrichOne(c)}
                            disabled={enrichingId === c.id}
                            className="p-1.5 rounded text-[#555550] hover:text-[#c9a96e] hover:bg-white/5 transition-colors disabled:opacity-50"
                            title="Enrichir : récupérer ville, région…"
                          >
                            {enrichingId === c.id
                              ? <Spinner className="w-3 h-3" />
                              : <Sparkles size={13} />}
                          </button>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => addToProspects([c.id])}
                          disabled={importing}
                        >
                          <UserPlus size={13} />
                          Ajouter
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-[#555550]">
                      {total === 0
                        ? 'Aucune entreprise dans la base — importez un fichier Sirene'
                        : 'Aucun résultat pour ces filtres'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-[#555550]">
              {total === 0 ? '0' : (page * PAGE_SIZE + 1).toLocaleString('fr-FR')}–
              {Math.min((page + 1) * PAGE_SIZE, total).toLocaleString('fr-FR')} sur{' '}
              <span className="text-[#f0f0ee] font-medium">{total.toLocaleString('fr-FR')}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-[#888880] text-xs px-2">
                {page + 1} / {totalPages || 1}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
