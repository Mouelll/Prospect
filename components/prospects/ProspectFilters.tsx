'use client'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { STATUS_OPTIONS } from './StatusBadge'
import { ALL_SECTEURS } from '@/lib/naf-codes'
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire',
  'Corse', 'Grand Est', 'Guadeloupe', 'Guyane', 'Hauts-de-France',
  'Île-de-France', 'La Réunion', 'Martinique', 'Mayotte', 'Normandie',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
]

const EFFECTIFS_OPTIONS = [
  { value: '', label: 'Tous les effectifs' },
  { value: '1-9', label: '1 – 9 salariés' },
  { value: '10-49', label: '10 – 49 salariés' },
  { value: '50-199', label: '50 – 199 salariés' },
  { value: '200-999', label: '200 – 999 salariés' },
  { value: '1000-', label: '1 000+ salariés' },
]

export interface Filters {
  search: string
  status: string
  sector: string
  region: string
  city: string
  followupOnly: boolean
  effectifs: string
  googleRatingMin: string
  hasVideo: string
  scoreMin: string
  source: string
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  status: '',
  sector: '',
  region: '',
  city: '',
  followupOnly: false,
  effectifs: '',
  googleRatingMin: '',
  hasVideo: '',
  scoreMin: '',
  source: '',
}

interface ProspectFiltersProps {
  filters: Filters
  onChange: (f: Filters) => void
  total: number
}

export function ProspectFilters({ filters, onChange, total }: ProspectFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const update = (key: keyof Filters, value: string | boolean) =>
    onChange({ ...filters, [key]: value })

  const reset = () => onChange(EMPTY_FILTERS)

  const activeCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'search' && (v !== '' && v !== false)
  ).length + (filters.search ? 1 : 0)

  return (
    <div className="space-y-3">
      {/* Ligne principale */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher par nom, ville…"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="w-52"
        />
        <Select value={filters.status} onChange={(e) => update('status', e.target.value)} className="w-40">
          <option value="">Tous statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <Select value={filters.sector} onChange={(e) => update('sector', e.target.value)} className="w-44">
          <option value="">Tous secteurs</option>
          {ALL_SECTEURS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>

        <Button
          variant={expanded ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="gap-1.5"
        >
          <SlidersHorizontal size={13} />
          Filtres avancés
          {activeCount > 0 && (
            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{activeCount}</span>
          )}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X size={13} />
            Reset
          </Button>
        )}

        <span className="ml-auto text-sm text-[#555550]">
          {total.toLocaleString('fr-FR')} résultat{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtres avancés */}
      {expanded && (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">Région</label>
            <Select value={filters.region} onChange={(e) => update('region', e.target.value)}>
              <option value="">Toutes régions</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          <div>
            <label className="label">Ville</label>
            <Input
              placeholder="Ex: Lyon"
              value={filters.city}
              onChange={(e) => update('city', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Effectifs</label>
            <Select value={filters.effectifs} onChange={(e) => update('effectifs', e.target.value)}>
              {EFFECTIFS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="label">Note Google min.</label>
            <Select value={filters.googleRatingMin} onChange={(e) => update('googleRatingMin', e.target.value)}>
              <option value="">Toutes notes</option>
              <option value="3">≥ 3 ⭐</option>
              <option value="4">≥ 4 ⭐</option>
              <option value="4.5">≥ 4.5 ⭐</option>
            </Select>
          </div>

          <div>
            <label className="label">Présence vidéo</label>
            <Select value={filters.hasVideo} onChange={(e) => update('hasVideo', e.target.value)}>
              <option value="">Indifférent</option>
              <option value="no">Sans vidéo (opportunité)</option>
              <option value="yes">Avec vidéo</option>
            </Select>
          </div>

          <div>
            <label className="label">Score minimum</label>
            <Select value={filters.scoreMin} onChange={(e) => update('scoreMin', e.target.value)}>
              <option value="">Tous scores</option>
              <option value="2">≥ 2 ★</option>
              <option value="3">≥ 3 ★</option>
              <option value="4">≥ 4 ★</option>
              <option value="5">5 ★ seulement</option>
            </Select>
          </div>

          <div>
            <label className="label">Source</label>
            <Select value={filters.source} onChange={(e) => update('source', e.target.value)}>
              <option value="">Toutes sources</option>
              <option value="sirene">Sirene (Établissement)</option>
              <option value="sirene_ul">Sirene (Unité légale)</option>
              <option value="manual">Saisi manuellement</option>
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-[#888880] cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={filters.followupOnly}
                onChange={(e) => update('followupOnly', e.target.checked)}
                className="accent-[#c9a96e]"
              />
              Relances uniquement
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
