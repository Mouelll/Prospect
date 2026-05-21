'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { calculateScore } from '@/lib/scoring'
import { NAF_LABELS, NAF_SECTEUR } from '@/lib/naf-codes'
import { Button } from '@/components/ui/Button'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const TRANCHE_EFFECTIFS: Record<string, number> = {
  '00': 0, 'NN': 0, '01': 1, '02': 3, '03': 6, '11': 10, '12': 20,
  '21': 50, '22': 75, '31': 100, '32': 150, '41': 200, '42': 250,
  '51': 500, '52': 750, '53': 1000, '54': 2000, '55': 5000,
  '56': 10000, '57': 50000, '58': 100000,
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

const ALL_NAF = Object.keys(NAF_LABELS)

const DEPARTEMENTS = Array.from({ length: 95 }, (_, i) => {
  const n = i + 1
  if (n === 20) return null
  return n < 10 ? `0${n}` : `${n}`
}).filter(Boolean) as string[]

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [nafFilter, setNafFilter] = useState<string[]>(ALL_NAF)
  const [deptFilter, setDeptFilter] = useState<string[]>([])
  const [activeOnly, setActiveOnly] = useState(true)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const toggleNaf = (code: string) =>
    setNafFilter((f) => (f.includes(code) ? f.filter((c) => c !== code) : [...f, code]))

  const toggleDept = (d: string) =>
    setDeptFilter((f) => (f.includes(d) ? f.filter((x) => x !== d) : [...f, d]))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRunning(true)
    setResult(null)
    setProgress(0)
    setStep(2)

    let imported = 0
    let skipped = 0
    let errors = 0
    const CHUNK = 10000

    const processChunk = async (rows: Record<string, string>[]) => {
      const toInsert = rows
        .filter((r) => {
          const naf = r.activitePrincipaleEtablissement?.replace('.', '')
          if (!nafFilter.includes(naf)) return false
          if (activeOnly && r.etatAdministratifEtablissement !== 'A') return false
          if (deptFilter.length > 0) {
            const cp = r.codePostalEtablissement ?? ''
            const dept = cp.slice(0, 2)
            if (!deptFilter.includes(dept)) return false
          }
          return true
        })
        .map((r) => {
          const naf = r.activitePrincipaleEtablissement?.replace('.', '')
          const partial = {
            name: r.denominationUniteLegale || r.enseigne1Etablissement || `SIRET ${r.siret}`,
            naf_code: naf || null,
            sector: NAF_SECTEUR[naf] ?? null,
            city: r.libelleCommuneEtablissement || null,
            postal_code: r.codePostalEtablissement || null,
            siret: r.siret || null,
            siren: r.siren || null,
            employees_count: TRANCHE_EFFECTIFS[r.trancheEffectifsEtablissement] ?? null,
            status: 'to_contact' as const,
            source: 'sirene',
            score: null as number | null,
          }
          partial.score = calculateScore(partial)
          return partial
        })

      if (toInsert.length === 0) return

      const { error, data } = await supabase
        .from('companies')
        .upsert(toInsert, { onConflict: 'siret', ignoreDuplicates: true })
        .select('id')

      if (error) {
        errors += toInsert.length
      } else {
        imported += data?.length ?? 0
        skipped += toInsert.length - (data?.length ?? 0)
      }
    }

    let buffer: Record<string, string>[] = []
    let total = 0

    await new Promise<void>((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        chunk: async (results: { data: Record<string, string>[] }, parser) => {
          parser.pause()
          buffer.push(...results.data)
          total += results.data.length
          setProgress(Math.min(total / 1000000 * 100, 95))

          while (buffer.length >= CHUNK) {
            const chunk = buffer.splice(0, CHUNK)
            await processChunk(chunk)
          }
          parser.resume()
        },
        complete: async () => {
          if (buffer.length > 0) await processChunk(buffer)
          resolve()
        },
      })
    })

    setProgress(100)
    setResult({ imported, skipped, errors })
    setRunning(false)
    setStep(3)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#f0f0ee]">Import Sirene</h1>
        <p className="text-sm text-[#888880] mt-0.5">
          Importez le fichier StockEtablissement_utf8.csv de la Base Sirene INSEE
        </p>
      </div>

      {/* Step 1: Filters */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4">
          1. Filtres d&apos;import
        </h2>

        <div className="mb-4">
          <label className="label">Codes NAF</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ALL_NAF.map((code) => (
              <button
                key={code}
                onClick={() => toggleNaf(code)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  nafFilter.includes(code)
                    ? 'bg-[#c9a96e]/20 border-[#c9a96e]/50 text-[#c9a96e]'
                    : 'bg-white/5 border-white/10 text-[#888880] hover:text-[#f0f0ee]'
                }`}
              >
                {code} — {NAF_LABELS[code]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setNafFilter(ALL_NAF)}
              className="text-xs text-[#c9a96e] hover:underline"
            >
              Tout sélectionner
            </button>
            <button
              onClick={() => setNafFilter([])}
              className="text-xs text-[#888880] hover:underline"
            >
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Départements (vide = tous)</label>
          <div className="flex flex-wrap gap-1.5 mt-1 max-h-28 overflow-y-auto">
            {DEPARTEMENTS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDept(d)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  deptFilter.includes(d)
                    ? 'bg-[#c9a96e]/20 border-[#c9a96e]/50 text-[#c9a96e]'
                    : 'bg-white/5 border-white/10 text-[#888880] hover:text-[#f0f0ee]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {deptFilter.length > 0 && (
            <button
              onClick={() => setDeptFilter([])}
              className="text-xs text-[#888880] hover:underline mt-1"
            >
              Effacer la sélection
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-[#888880] cursor-pointer">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="accent-[#c9a96e]"
          />
          Établissements actifs uniquement
        </label>
      </div>

      {/* Step 2: Upload */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4">
          2. Fichier CSV Sirene
        </h2>

        {running ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#888880]">
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              Import en cours…
            </div>
            <div className="bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#c9a96e] h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[#555550]">{Math.round(progress)}%</p>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-white/20 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mx-auto mb-3 text-[#555550]" size={28} />
            <p className="text-sm text-[#888880]">Cliquez pour sélectionner le fichier</p>
            <p className="text-xs text-[#444440] mt-1">StockEtablissement_utf8.csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Step 3: Result */}
      {result && (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            Import terminé
          </h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-[#888880]">Importées</span>
              <span className="text-green-400 font-medium">{result.imported}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888880]">Ignorées (doublons)</span>
              <span className="text-[#888880]">{result.skipped}</span>
            </div>
            {result.errors > 0 && (
              <div className="flex justify-between">
                <span className="text-[#888880]">Erreurs</span>
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {result.errors}
                </span>
              </div>
            )}
          </div>
          <Link href="/prospects">
            <Button variant="primary" className="w-full">
              Voir les prospects
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
