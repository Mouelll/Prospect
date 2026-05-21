'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company, Contact, Interaction, InteractionType } from '@/lib/types'
import { StatusBadge, STATUS_OPTIONS } from '@/components/prospects/StatusBadge'
import { ScoreStars } from '@/components/prospects/ScoreStars'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Tab = 'infos' | 'contacts' | 'historique' | 'notes'

const INTERACTION_LABELS: Record<InteractionType, string> = {
  email: 'Email',
  call: 'Appel',
  linkedin: 'LinkedIn',
  meeting: 'Réunion',
  other: 'Autre',
}

function EditableField({
  label,
  value,
  onSave,
  type = 'text',
}: {
  label: string
  value: string | number | null
  onSave: (v: string) => Promise<void>
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  const handleBlur = async () => {
    setEditing(false)
    if (draft !== String(value ?? '')) await onSave(draft)
  }

  if (editing) {
    return (
      <div>
        <label className="label">{label}</label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          type={type}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer group"
      onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
    >
      <label className="label">{label}</label>
      <div className="text-sm text-[#f0f0ee] py-2 px-3 rounded-lg border border-transparent group-hover:border-white/10 group-hover:bg-white/[0.02] transition-all min-h-[2.25rem]">
        {value ?? <span className="text-[#444440]">—</span>}
      </div>
    </div>
  )
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [tab, setTab] = useState<Tab>('infos')
  const [loading, setLoading] = useState(true)

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadAll = useCallback(async () => {
    const [{ data: co }, { data: ct }, { data: inter }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('contacts').select('*').eq('company_id', id).order('created_at'),
      supabase.from('interactions').select('*').eq('company_id', id).order('date', { ascending: false }),
    ])
    setCompany(co)
    setContacts(ct ?? [])
    setInteractions(inter ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const updateField = async (field: keyof Company, value: unknown) => {
    await supabase.from('companies').update({ [field]: value || null }).eq('id', id)
    setCompany((c) => c ? { ...c, [field]: value } : c)
  }

  const handleNotesChange = (v: string) => {
    setCompany((c) => c ? { ...c, notes: v } : c)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      supabase.from('companies').update({ notes: v }).eq('id', id)
    }, 800)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6 text-[#888880]">Entreprise introuvable.</div>
    )
  }

  return (
    <div className="p-6">
      <Link
        href="/prospects"
        className="inline-flex items-center gap-1 text-sm text-[#888880] hover:text-[#f0f0ee] transition-colors mb-4"
      >
        <ChevronLeft size={16} />
        Retour
      </Link>

      {/* Bandeau */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-[#f0f0ee] truncate">{company.name}</h1>
          {company.city && <p className="text-sm text-[#888880] mt-0.5">{company.city}</p>}
        </div>

        <div className="flex items-center gap-3">
          <ScoreStars
            score={company.score}
            interactive
            size={18}
            onChange={(s) => updateField('score', s)}
          />

          <Select
            value={company.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="w-44"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>

          <Button variant="danger" size="sm" onClick={async () => {
            if (!confirm('Supprimer cette entreprise ?')) return
            await supabase.from('companies').delete().eq('id', id)
            router.push('/prospects')
          }}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.07]">
        {(['infos', 'contacts', 'historique', 'notes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[#c9a96e] text-[#c9a96e]'
                : 'border-transparent text-[#888880] hover:text-[#f0f0ee]'
            }`}
          >
            {t}
            {t === 'contacts' && contacts.length > 0 && (
              <span className="ml-1 text-xs text-[#555550]">({contacts.length})</span>
            )}
            {t === 'historique' && interactions.length > 0 && (
              <span className="ml-1 text-xs text-[#555550]">({interactions.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Infos */}
      {tab === 'infos' && (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <EditableField label="Code NAF" value={company.naf_code} onSave={(v) => updateField('naf_code', v)} />
            <EditableField label="Secteur" value={company.sector} onSave={(v) => updateField('sector', v)} />
            <EditableField label="SIRET" value={company.siret} onSave={(v) => updateField('siret', v)} />
            <EditableField label="SIREN" value={company.siren} onSave={(v) => updateField('siren', v)} />
            <EditableField label="Site web" value={company.website} onSave={(v) => updateField('website', v)} type="url" />
            <EditableField label="Email" value={company.email} onSave={(v) => updateField('email', v)} type="email" />
            <EditableField label="Téléphone" value={company.phone} onSave={(v) => updateField('phone', v)} type="tel" />
            <EditableField label="Ville" value={company.city} onSave={(v) => updateField('city', v)} />
            <EditableField label="Code postal" value={company.postal_code} onSave={(v) => updateField('postal_code', v)} />
            <EditableField label="Région" value={company.region} onSave={(v) => updateField('region', v)} />
            <EditableField label="Effectifs" value={company.employees_count} onSave={(v) => updateField('employees_count', v ? parseInt(v) : null)} type="number" />
            <EditableField label="Instagram" value={company.instagram_handle} onSave={(v) => updateField('instagram_handle', v)} />
            <EditableField label="Note Google" value={company.google_rating} onSave={(v) => updateField('google_rating', v ? parseFloat(v) : null)} type="number" />
            <div>
              <label className="label">A une vidéo</label>
              <div className="py-2 px-3">
                <input
                  type="checkbox"
                  checked={company.has_video ?? false}
                  onChange={(e) => updateField('has_video', e.target.checked)}
                  className="accent-[#c9a96e] w-4 h-4"
                />
              </div>
            </div>
            <EditableField label="Source" value={company.source} onSave={(v) => updateField('source', v)} />
            <EditableField label="Prochaine relance" value={company.next_followup_date} onSave={(v) => updateField('next_followup_date', v)} type="date" />
          </div>
        </div>
      )}

      {/* Tab: Contacts */}
      {tab === 'contacts' && (
        <ContactsTab contacts={contacts} companyId={id} onRefresh={loadAll} />
      )}

      {/* Tab: Historique */}
      {tab === 'historique' && (
        <InteractionsTab interactions={interactions} companyId={id} onRefresh={loadAll} />
      )}

      {/* Tab: Notes */}
      {tab === 'notes' && (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-6">
          <textarea
            value={company.notes ?? ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={16}
            className="w-full bg-transparent text-[#f0f0ee] text-sm resize-none focus:outline-none placeholder-[#444440]"
            placeholder="Notes libres… (sauvegarde automatique)"
          />
        </div>
      )}
    </div>
  )
}

function ContactsTab({
  contacts,
  companyId,
  onRefresh,
}: {
  contacts: Contact[]
  companyId: string
  onRefresh: () => void
}) {
  const [form, setForm] = useState({ first_name: '', last_name: '', role: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.last_name.trim()) return
    setSaving(true)
    await supabase.from('contacts').insert({ ...form, company_id: companyId })
    setForm({ first_name: '', last_name: '', role: '', email: '', phone: '' })
    setSaving(false)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {contacts.map((c) => (
        <div key={c.id} className="bg-[#161616] border border-white/[0.07] rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="font-medium text-[#f0f0ee]">
              {c.first_name} {c.last_name}
            </p>
            {c.role && <p className="text-sm text-[#888880]">{c.role}</p>}
            <div className="mt-1 flex gap-4 text-xs text-[#555550]">
              {c.email && <span>{c.email}</span>}
              {c.phone && <span>{c.phone}</span>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.from('contacts').delete().eq('id', c.id)
              onRefresh()
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}

      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#f0f0ee] mb-4">Ajouter un contact</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Prénom"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
          />
          <Input
            placeholder="Nom *"
            value={form.last_name}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            required
          />
          <Input
            placeholder="Rôle"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Spinner /> : <Plus size={14} />}
            Ajouter
          </Button>
        </form>
      </div>
    </div>
  )
}

function InteractionsTab({
  interactions,
  companyId,
  onRefresh,
}: {
  interactions: Interaction[]
  companyId: string
  onRefresh: () => void
}) {
  const [form, setForm] = useState<{ type: InteractionType; date: string; content: string }>({
    type: 'email',
    date: new Date().toISOString().split('T')[0],
    content: '',
  })
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content.trim()) return
    setSaving(true)
    await supabase.from('interactions').insert({
      ...form,
      company_id: companyId,
      date: new Date(form.date).toISOString(),
    })
    setForm({ type: 'email', date: new Date().toISOString().split('T')[0], content: '' })
    setSaving(false)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#f0f0ee] mb-4">Ajouter une interaction</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-3">
            <Select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as InteractionType }))}
              className="w-40"
            >
              {Object.entries(INTERACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-44"
            />
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Contenu de l'interaction…"
            rows={3}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f0f0ee] placeholder-[#555550] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/50 resize-none"
            required
          />
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Spinner /> : <Plus size={14} />}
            Enregistrer
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        {interactions.map((inter) => (
          <div key={inter.id} className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#c9a96e] bg-[#c9a96e]/10 px-2 py-0.5 rounded">
                  {INTERACTION_LABELS[inter.type]}
                </span>
                <span className="text-xs text-[#555550]">
                  {format(new Date(inter.date), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.from('interactions').delete().eq('id', inter.id)
                  onRefresh()
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <p className="text-sm text-[#f0f0ee] whitespace-pre-wrap">{inter.content}</p>
          </div>
        ))}

        {interactions.length === 0 && (
          <p className="text-center text-[#555550] text-sm py-8">Aucune interaction enregistrée</p>
        )}
      </div>
    </div>
  )
}
