'use client'
export const dynamic = 'force-dynamic'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/prospects/StatusBadge'
import { Spinner } from '@/components/ui/Spinner'
import { ScoreStars } from '@/components/prospects/ScoreStars'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default function RelancesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [postponeId, setPostponeId] = useState<string | null>(null)
  const [postponeDate, setPostponeDate] = useState('')

  const load = useCallback(async () => {
    const cutoff = addDays(new Date(), 7).toISOString().split('T')[0]
    const { data } = await supabase
      .from('companies')
      .select('*')
      .not('next_followup_date', 'is', null)
      .lte('next_followup_date', cutoff)
      .neq('status', 'archived')
      .order('next_followup_date', { ascending: true })
    setCompanies(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markContacted = async (id: string) => {
    await supabase
      .from('companies')
      .update({ status: 'contacted', next_followup_date: null, last_contact_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  const postpone = async (id: string) => {
    if (!postponeDate) return
    await supabase.from('companies').update({ next_followup_date: postponeDate }).eq('id', id)
    setPostponeId(null)
    setPostponeDate('')
    load()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#f0f0ee]">Relances</h1>
        <p className="text-sm text-[#888880] mt-0.5">Entreprises à relancer dans les 7 prochains jours</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-[#c9a96e] w-6 h-6 border-2" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-12 text-center">
          <p className="text-[#555550]">Aucune relance prévue dans les 7 prochains jours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => {
            const isPast = c.next_followup_date! < today
            const isPostponing = postponeId === c.id

            return (
              <div
                key={c.id}
                className="bg-[#161616] border border-white/[0.07] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/prospects/${c.id}`}
                      className="font-medium text-[#f0f0ee] hover:text-[#c9a96e] transition-colors"
                    >
                      {c.name}
                    </Link>
                    {c.city && <p className="text-sm text-[#888880] mt-0.5">{c.city}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <ScoreStars score={c.score} size={12} />
                      <StatusBadge status={c.status} />
                      <span className={`text-xs font-medium ${isPast ? 'text-red-400' : 'text-amber-400'}`}>
                        {format(new Date(c.next_followup_date!), 'd MMM yyyy', { locale: fr })}
                        {isPast && ' (dépassé)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isPostponing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={postponeDate}
                          onChange={(e) => setPostponeDate(e.target.value)}
                          className="w-36 py-1 text-xs"
                          min={today}
                          autoFocus
                        />
                        <Button size="sm" variant="primary" onClick={() => postpone(c.id)}>
                          OK
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPostponeId(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPostponeId(c.id)
                            setPostponeDate(addDays(new Date(), 7).toISOString().split('T')[0])
                          }}
                        >
                          <CalendarDays size={13} />
                          Reporter
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => markContacted(c.id)}
                        >
                          <Check size={13} />
                          Contacté
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
