'use client'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { STATUS_OPTIONS } from './StatusBadge'
import { ALL_SECTEURS } from '@/lib/naf-codes'
import { X } from 'lucide-react'

const REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire',
  'Corse', 'Grand Est', 'Guadeloupe', 'Guyane', 'Hauts-de-France',
  'Île-de-France', 'La Réunion', 'Martinique', 'Mayotte', 'Normandie',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
]

export interface Filters {
  search: string
  status: string
  sector: string
  region: string
  followupOnly: boolean
}

interface ProspectFiltersProps {
  filters: Filters
  onChange: (f: Filters) => void
}

export function ProspectFilters({ filters, onChange }: ProspectFiltersProps) {
  const update = (key: keyof Filters, value: string | boolean) =>
    onChange({ ...filters, [key]: value })

  const reset = () =>
    onChange({ search: '', status: '', sector: '', region: '', followupOnly: false })

  const hasActive =
    filters.search || filters.status || filters.sector || filters.region || filters.followupOnly

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Rechercher…"
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
        className="w-48"
      />

      <Select
        value={filters.status}
        onChange={(e) => update('status', e.target.value)}
        className="w-40"
      >
        <option value="">Tous les statuts</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.sector}
        onChange={(e) => update('sector', e.target.value)}
        className="w-44"
      >
        <option value="">Tous les secteurs</option>
        {ALL_SECTEURS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        value={filters.region}
        onChange={(e) => update('region', e.target.value)}
        className="w-52"
      >
        <option value="">Toutes les régions</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>

      <label className="flex items-center gap-2 text-sm text-[#888880] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.followupOnly}
          onChange={(e) => update('followupOnly', e.target.checked)}
          className="accent-[#c9a96e]"
        />
        Relances uniquement
      </label>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
          <X size={13} />
          Reset
        </Button>
      )}
    </div>
  )
}
