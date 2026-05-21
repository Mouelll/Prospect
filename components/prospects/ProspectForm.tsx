'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ScoreStars } from './ScoreStars'
import { STATUS_OPTIONS } from './StatusBadge'
import { supabase } from '@/lib/supabase'
import { calculateScore } from '@/lib/scoring'
import { NAF_LABELS, NAF_SECTEUR } from '@/lib/naf-codes'
import { Company } from '@/lib/types'
import { Spinner } from '@/components/ui/Spinner'

type FormData = Omit<Company, 'id' | 'created_at' | 'updated_at' | 'last_contact_at' | 'in_prospect_list'>

const EMPTY: FormData = {
  name: '',
  sector: null,
  naf_code: null,
  city: null,
  region: null,
  postal_code: null,
  website: null,
  email: null,
  phone: null,
  siret: null,
  siren: null,
  employees_count: null,
  instagram_handle: null,
  google_rating: null,
  has_video: false,
  score: null,
  status: 'to_contact',
  source: null,
  notes: null,
  next_followup_date: null,
}

interface ProspectFormProps {
  initial?: Partial<FormData>
  companyId?: string
}

export function ProspectForm({ initial, companyId }: ProspectFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleNafChange = (code: string) => {
    set('naf_code', code || null)
    set('sector', NAF_SECTEUR[code] ?? null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Le nom est requis')
    setLoading(true)
    setError(null)

    const autoScore = calculateScore(form)
    const payload = { ...form, score: form.score ?? autoScore, in_prospect_list: true }

    let id = companyId
    if (companyId) {
      const { error: err } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', companyId)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { data, error: err } = await supabase
        .from('companies')
        .insert(payload)
        .select('id')
        .single()
      if (err || !data) { setError(err?.message ?? 'Erreur'); setLoading(false); return }
      id = data.id
    }

    router.push(`/prospects/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555550] mb-4">
          Identité
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nom *</label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Nom de l'entreprise"
              required
            />
          </div>
          <div>
            <label className="label">Code NAF</label>
            <Select
              value={form.naf_code ?? ''}
              onChange={(e) => handleNafChange(e.target.value)}
            >
              <option value="">Sélectionner…</option>
              {Object.entries(NAF_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {code} — {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Secteur</label>
            <Input
              value={form.sector ?? ''}
              onChange={(e) => set('sector', e.target.value || null)}
              placeholder="Ex: Automobile"
            />
          </div>
          <div>
            <label className="label">SIRET</label>
            <Input
              value={form.siret ?? ''}
              onChange={(e) => set('siret', e.target.value || null)}
              placeholder="14 chiffres"
            />
          </div>
          <div>
            <label className="label">Site web</label>
            <Input
              value={form.website ?? ''}
              onChange={(e) => set('website', e.target.value || null)}
              placeholder="https://…"
              type="url"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555550] mb-4">
          Localisation
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label">Ville</label>
            <Input
              value={form.city ?? ''}
              onChange={(e) => set('city', e.target.value || null)}
            />
          </div>
          <div>
            <label className="label">Code postal</label>
            <Input
              value={form.postal_code ?? ''}
              onChange={(e) => set('postal_code', e.target.value || null)}
            />
          </div>
          <div className="col-span-3">
            <label className="label">Région</label>
            <Input
              value={form.region ?? ''}
              onChange={(e) => set('region', e.target.value || null)}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555550] mb-4">
          Contact
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <Input
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value || null)}
              type="email"
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <Input
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value || null)}
              type="tel"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555550] mb-4">
          Digital
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Instagram</label>
            <Input
              value={form.instagram_handle ?? ''}
              onChange={(e) => set('instagram_handle', e.target.value || null)}
              placeholder="@handle"
            />
          </div>
          <div>
            <label className="label">Note Google</label>
            <Input
              value={form.google_rating ?? ''}
              onChange={(e) =>
                set('google_rating', e.target.value ? parseFloat(e.target.value) : null)
              }
              type="number"
              step="0.1"
              min="1"
              max="5"
              placeholder="4.5"
            />
          </div>
          <div>
            <label className="label">Effectifs</label>
            <Input
              value={form.employees_count ?? ''}
              onChange={(e) =>
                set('employees_count', e.target.value ? parseInt(e.target.value) : null)
              }
              type="number"
              placeholder="10"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="has_video"
              type="checkbox"
              checked={form.has_video ?? false}
              onChange={(e) => set('has_video', e.target.checked)}
              className="accent-[#c9a96e] w-4 h-4"
            />
            <label htmlFor="has_video" className="text-sm text-[#888880] cursor-pointer">
              A déjà une vidéo de présentation
            </label>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555550] mb-4">
          Prospection
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Score</label>
            <div className="mt-2">
              <ScoreStars
                score={form.score}
                interactive
                onChange={(s) => set('score', s)}
                size={20}
              />
            </div>
          </div>
          <div>
            <label className="label">Statut</label>
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value as Company['status'])}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Prochaine relance</label>
            <Input
              value={form.next_followup_date ?? ''}
              onChange={(e) => set('next_followup_date', e.target.value || null)}
              type="date"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || null)}
              rows={4}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f0f0ee] placeholder-[#555550] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/50 resize-none"
              placeholder="Notes libres…"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading && <Spinner className="text-[#0f0f0f]" />}
          {companyId ? 'Enregistrer' : 'Créer le prospect'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
