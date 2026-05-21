'use client'
export const dynamic = 'force-dynamic'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Template } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Plus, Trash2, Copy, Edit2 } from 'lucide-react'

const VARS = ['{{nom_entreprise}}', '{{ville}}', '{{prenom_contact}}']

function interpolate(body: string, vals: Record<string, string>) {
  return body
    .replace(/\{\{nom_entreprise\}\}/g, vals.nom_entreprise ?? '')
    .replace(/\{\{ville\}\}/g, vals.ville ?? '')
    .replace(/\{\{prenom_contact\}\}/g, vals.prenom_contact ?? '')
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [useModal, setUseModal] = useState<Template | null>(null)
  const [useVals, setUseVals] = useState({ nom_entreprise: '', ville: '', prenom_contact: '' })
  const [form, setForm] = useState({ name: '', type: 'email', subject: '', body: '' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openForm = (t?: Template) => {
    if (t) {
      setEditing(t)
      setForm({ name: t.name, type: t.type, subject: t.subject ?? '', body: t.body })
    } else {
      setEditing(null)
      setForm({ name: '', type: 'email', subject: '', body: '' })
    }
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.body.trim()) return
    setSaving(true)
    const payload = { ...form, subject: form.subject || null }
    if (editing) {
      await supabase.from('templates').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('templates').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const handleCopy = async () => {
    if (!useModal) return
    const text = interpolate(useModal.body, useVals)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f0f0ee]">Templates</h1>
          <p className="text-sm text-[#888880] mt-0.5">Modèles de messages</p>
        </div>
        <Button variant="primary" onClick={() => openForm()}>
          <Plus size={15} />
          Nouveau
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-12 text-center">
          <p className="text-[#555550]">Aucun template. Créez-en un !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#f0f0ee]">{t.name}</span>
                    <span className="text-xs bg-white/5 text-[#888880] px-2 py-0.5 rounded">
                      {t.type}
                    </span>
                  </div>
                  {t.subject && (
                    <p className="text-xs text-[#888880] mb-1">Sujet : {t.subject}</p>
                  )}
                  <p className="text-sm text-[#555550] truncate">{t.body}</p>
                  <p className="text-xs text-[#333330] mt-1">
                    Variables : {VARS.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => { setUseModal(t); setUseVals({ nom_entreprise: '', ville: '', prenom_contact: '' }) }}
                  >
                    Utiliser
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openForm(t)}>
                    <Edit2 size={13} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm('Supprimer ce template ?')) return
                      await supabase.from('templates').delete().eq('id', t.id)
                      load()
                    }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Modifier le template' : 'Nouveau template'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nom *</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Type</label>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
            </Select>
          </div>
          {form.type === 'email' && (
            <div>
              <label className="label">Sujet</label>
              <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Corps *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={8}
              required
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f0f0ee] placeholder-[#555550] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/50 resize-none"
              placeholder={`Variables disponibles :\n{{nom_entreprise}}\n{{ville}}\n{{prenom_contact}}`}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving && <Spinner className="text-[#0f0f0f]" />}
              Enregistrer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* Use modal */}
      <Modal open={!!useModal} onClose={() => setUseModal(null)} title={`Utiliser : ${useModal?.name}`} className="max-w-2xl">
        {useModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {VARS.map((v) => {
                const key = v.replace(/\{\{|\}\}/g, '') as keyof typeof useVals
                return (
                  <div key={v}>
                    <label className="label">{v}</label>
                    <Input
                      value={useVals[key]}
                      onChange={(e) => setUseVals((u) => ({ ...u, [key]: e.target.value }))}
                      placeholder={key}
                    />
                  </div>
                )
              })}
            </div>

            {useModal.subject && (
              <div>
                <label className="label">Sujet</label>
                <div className="text-sm text-[#f0f0ee] bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2">
                  {interpolate(useModal.subject, useVals)}
                </div>
              </div>
            )}

            <div>
              <label className="label">Aperçu</label>
              <div className="text-sm text-[#f0f0ee] bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-3 whitespace-pre-wrap min-h-[8rem]">
                {interpolate(useModal.body, useVals)}
              </div>
            </div>

            <Button variant="primary" onClick={handleCopy} className="w-full">
              <Copy size={14} />
              {copied ? 'Copié !' : 'Copier dans le presse-papier'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
