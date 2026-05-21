'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { calculateScore } from '@/lib/scoring'
import { NAF_LABELS, NAF_SECTEUR } from '@/lib/naf-codes'
import { Button } from '@/components/ui/Button'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
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

// Détection automatique du type de fichier Sirene
type SireneFileType = 'unite_legale' | 'etablissement' | 'unknown'

function detectFileType(headers: string[]): SireneFileType {
  if (headers.includes('siren') && headers.includes('denominationUniteLegale') && !headers.includes('siret')) {
    return 'unite_legale'
  }
  if (headers.includes('siret') && headers.includes('activitePrincipaleEtablissement')) {
    return 'etablissement'
  }
  return 'unknown'
}

// Mapping StockUniteLegale → Company
function mapUniteLegale(r: Record<string, string>) {
  const naf = r.activitePrincipaleUniteLegale?.replace('.', '') ?? ''
  const name = r.denominationUniteLegale || r.nomUsageUniteLegale || r.nomUniteLegale || `SIREN ${r.siren}`
  return {
    name,
    naf_code: naf || null,
    sector: NAF_SECTEUR[naf] ?? null,
    city: null,      // pas disponible dans StockUniteLegale
    postal_code: null,
    siret: null,     // pas de SIRET dans ce fichier
    siren: r.siren || null,
    employees_count: TRANCHE_EFFECTIFS[r.trancheEffectifsUniteLegale] ?? null,
    status: 'to_contact' as const,
    source: 'sirene_ul',
  }
}

// Mapping StockEtablissement → Company
function mapEtablissement(r: Record<string, string>) {
  const naf = r.activitePrincipaleEtablissement?.replace('.', '') ?? ''
  return {
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
  }
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [nafFilter, setNafFilter] = useState<string[]>(ALL_NAF)
  const [deptFilter, setDeptFilter] = useState<string[]>([])
  const [activeOnly, setActiveOnly] = useState(true)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [detectedType, setDetectedType] = useState<SireneFileType | null>(null)

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
    setDetectedType(null)

    let imported = 0
    let skipped = 0
    let errors = 0
    const CHUNK = 5000
    let fileType: SireneFileType = 'unknown'
    let headersDetected = false

    const processChunk = async (rows: Record<string, string>[]) => {
      const toInsert = rows
        .filter((r) => {
          // Filtre statut actif
          const statut = r.etatAdministratifUniteLegale || r.etatAdministratifEtablissement
          if (activeOnly && statut !== 'A') return false

          // Filtre NAF
          const naf = (r.activitePrincipaleUniteLegale || r.activitePrincipaleEtablissement || '')
            .replace('.', '')
          if (!nafFilter.includes(naf)) return false

          // Filtre département (uniquement pour StockEtablissement)
          if (fileType === 'etablissement' && deptFilter.length > 0) {
            const cp = r.codePostalEtablissement ?? ''
            if (!deptFilter.includes(cp.slice(0, 2))) return false
          }

          return true
        })
        .map((r) => {
          const partial = fileType === 'unite_legale'
            ? mapUniteLegale(r)
            : mapEtablissement(r)
          return { ...partial, score: calculateScore(partial) }
        })

      if (toInsert.length === 0) return

      if (fileType === 'etablissement') {
        // Upsert sur SIRET
        const { error, data } = await supabase
          .from('companies')
          .upsert(toInsert, { onConflict: 'siret', ignoreDuplicates: true })
          .select('id')
        if (error) { errors += toInsert.length }
        else { imported += data?.length ?? 0; skipped += toInsert.length - (data?.length ?? 0) }
      } else {
        // Pour StockUniteLegale : insert classique (pas de SIRET unique)
        // On filtre les SIREN déjà existants d'abord
        const sirens = toInsert.map(r => r.siren).filter(Boolean)
        const { data: existing } = await supabase
          .from('companies')
          .select('siren')
          .in('siren', sirens as string[])
        const existingSirens = new Set((existing ?? []).map(r => r.siren))
        const newRows = toInsert.filter(r => !existingSirens.has(r.siren))
        if (newRows.length > 0) {
          const { error, data } = await supabase
            .from('companies')
            .insert(newRows)
            .select('id')
          if (error) { errors += newRows.length }
          else { imported += data?.length ?? 0 }
        }
        skipped += toInsert.length - newRows.length
      }
    }

    let buffer: Record<string, string>[] = []
    let total = 0

    await new Promise<void>((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        chunk: async (results: { data: Record<string, string>[], meta: { fields?: string[] } }, parser) => {
          parser.pause()

          // Détection du type sur le premier chunk
          if (!headersDetected && results.meta.fields) {
            fileType = detectFileType(results.meta.fields)
            setDetectedType(fileType)
            headersDetected = true
          }

          buffer.push(...results.data)
          total += results.data.length
          setProgress(Math.min((total / 1500000) * 100, 95))

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
  }

  const FILE_TYPE_LABELS: Record<SireneFileType, string> = {
    unite_legale: '📋 StockUniteLegale détecté — données entreprises (SIREN)',
    etablissement: '🏢 StockEtablissement détecté — données établissements (SIRET)',
    unknown: '⚠️ Format non reconnu',
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#f0f0ee]">Import Sirene</h1>
        <p className="text-sm text-[#888880] mt-0.5">
          Compatible avec <span className="text-[#c9a96e]">StockUniteLegale_utf8.csv</span> et <span className="text-[#c9a96e]">StockEtablissement_utf8.csv</span>
        </p>
      </div>

      {/* Info fichiers */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-[#c9a96e]" />
            <span className="text-xs font-semibold text-[#f0f0ee]">StockUniteLegale</span>
          </div>
          <p className="text-xs text-[#555550]">Données entreprises (SIREN). Pas d&apos;adresse, mais toutes les sociétés françaises.</p>
        </div>
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-[#c9a96e]" />
            <span className="text-xs font-semibold text-[#f0f0ee]">StockEtablissement</span>
          </div>
          <p className="text-xs text-[#555550]">Données établissements (SIRET). Inclut ville et code postal.</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4">1. Filtres</h2>

        <div className="mb-4">
          <label className="label">Codes NAF ciblés</label>
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
            <button onClick={() => setNafFilter(ALL_NAF)} className="text-xs text-[#c9a96e] hover:underline">
              Tout sélectionner
            </button>
            <button onClick={() => setNafFilter([])} className="text-xs text-[#888880] hover:underline">
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Départements <span className="text-[#444440] normal-case">(StockEtablissement uniquement — vide = tous)</span></label>
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
            <button onClick={() => setDeptFilter([])} className="text-xs text-[#888880] hover:underline mt-1">
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
          Entreprises/établissements actifs uniquement
        </label>
      </div>

      {/* Upload */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4">2. Fichier CSV</h2>

        {detectedType && (
          <div className="mb-3 text-xs text-[#c9a96e] bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-lg px-3 py-2">
            {FILE_TYPE_LABELS[detectedType]}
          </div>
        )}

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
            <p className="text-xs text-[#444440] mt-1">StockUniteLegale_utf8.csv ou StockEtablissement_utf8.csv</p>
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

      {/* Résultat */}
      {result && (
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            Import terminé
          </h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-[#888880]">Importées</span>
              <span className="text-green-400 font-medium">{result.imported.toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888880]">Ignorées (déjà présentes)</span>
              <span className="text-[#888880]">{result.skipped.toLocaleString('fr-FR')}</span>
            </div>
            {result.errors > 0 && (
              <div className="flex justify-between">
                <span className="text-[#888880]">Erreurs</span>
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {result.errors.toLocaleString('fr-FR')}
                </span>
              </div>
            )}
          </div>
          <Link href="/prospects">
            <Button variant="primary" className="w-full">
              Voir les prospects →
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
