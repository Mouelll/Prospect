/**
 * Import StockUniteLegale_utf8.csv → Supabase
 * Filtre par codes NAF ciblés + entreprises actives uniquement
 * Lecture en streaming ligne par ligne (pas de RAM explosion sur 3.9 Go)
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://zdfaocljvgivthnmlhoc.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZmFvY2xqdmdpdnRobm1saG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg4OTAsImV4cCI6MjA5NDk0NDg5MH0.dJygZpJ8AfO1LYpnrB-EzJv_BkR6MpY1MiXM3aYiVvI'
const CSV_PATH = new URL('../StockUniteLegale_utf8.csv', import.meta.url).pathname
const BATCH_SIZE = 300
const TOTAL_LINES = 29572773

// ─── Codes NAF ciblés ─────────────────────────────────────────────────────────
const NAF_SECTEUR = {
  '4511Z': 'Automobile',   '4519Z': 'Automobile',
  '4540Z': 'Sport & loisirs',
  '6810Z': 'Immobilier',   '6820A': 'Immobilier',
  '5510Z': 'Hôtellerie',
  '5610A': 'Restauration', '5610C': 'Restauration',
  '8230Z': 'Événementiel',
  '9319Z': 'Sport & loisirs',
  '7311Z': 'Communication','7312Z': 'Communication',
  '9311Z': 'Sport & loisirs','9312Z': 'Sport & loisirs',
}
const TARGET_NAFS = new Set(Object.keys(NAF_SECTEUR))

const TRANCHE_EFFECTIFS = {
  '00': 0, 'NN': 0, '01': 1, '02': 3, '03': 6,
  '11': 10, '12': 20, '21': 50, '22': 75,
  '31': 100, '32': 150, '41': 200, '42': 250,
  '51': 500, '52': 750, '53': 1000, '54': 2000,
  '55': 5000, '56': 10000, '57': 50000, '58': 100000,
}

const PREMIUM = new Set(['4511Z','4519Z','4540Z','5510Z','6810Z','6820A','8230Z'])

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function score(naf, emp) {
  let s = 1
  if (PREMIUM.has(naf)) s++
  if (emp && emp >= 5 && emp <= 200) s++
  return Math.min(s, 5)
}

// Insert par batch — si erreur, réessaie en demi-batches
async function insertBatch(rows, depth = 0) {
  if (rows.length === 0 || depth > 3) return { ok: 0, err: rows.length }

  const { error } = await supabase.from('companies').insert(rows)

  if (!error) return { ok: rows.length, err: 0 }

  // Erreur → split en deux et réessayer
  if (rows.length === 1) {
    // Ligne unique en erreur → log et skip
    return { ok: 0, err: 1 }
  }

  await new Promise(r => setTimeout(r, 500))
  const mid = Math.floor(rows.length / 2)
  const a = await insertBatch(rows.slice(0, mid), depth + 1)
  const b = await insertBatch(rows.slice(mid), depth + 1)
  return { ok: a.ok + b.ok, err: a.err + b.err }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log(' Import Sirene → Supabase')
  console.log('═══════════════════════════════════════════════════')
  console.log(`📂 Fichier : StockUniteLegale_utf8.csv (3.9 Go)`)
  console.log(`🎯 NAF ciblés : ${[...TARGET_NAFS].join(' · ')}`)
  console.log(`📦 Batch size : ${BATCH_SIZE}`)
  console.log('')

  // Test de connexion Supabase
  const { error: pingErr } = await supabase.from('companies').select('id').limit(1)
  if (pingErr) {
    console.error('❌ Impossible de se connecter à Supabase :', pingErr.message)
    process.exit(1)
  }
  console.log('✅ Connexion Supabase OK\n')

  const stream = createReadStream(CSV_PATH, { encoding: 'utf8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  let headers = null
  let batch = []
  let lineNum = 0
  let totalImported = 0
  let totalErrors = 0
  let totalSkipped = 0
  let totalFiltered = 0
  const startTime = Date.now()
  let lastLog = Date.now()

  for await (const line of rl) {
    lineNum++

    if (lineNum === 1) {
      headers = parseLine(line)
      console.log(`📋 Colonnes détectées : ${headers.length}`)
      console.log('⏳ Démarrage du traitement…\n')
      continue
    }

    // Progression toutes les 5s
    const now = Date.now()
    if (now - lastLog > 5000) {
      const elapsed = (now - startTime) / 1000
      const pct = ((lineNum / TOTAL_LINES) * 100).toFixed(1)
      const rate = Math.round(lineNum / elapsed)
      const eta = Math.round((TOTAL_LINES - lineNum) / rate)
      const etaStr = eta > 60 ? `${Math.floor(eta/60)}m${eta%60}s` : `${eta}s`
      process.stdout.write(
        `\r  [${pct}%] ${lineNum.toLocaleString()} lignes | ` +
        `✅ ${totalImported.toLocaleString()} importées | ` +
        `${rate.toLocaleString()} lignes/s | ETA ${etaStr}   `
      )
      lastLog = now
    }

    const values = parseLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })

    // Filtre : actif uniquement
    if (row.etatAdministratifUniteLegale !== 'A') { totalSkipped++; continue }

    // Filtre : NAF ciblé
    const naf = (row.activitePrincipaleUniteLegale ?? '').replace('.', '')
    if (!TARGET_NAFS.has(naf)) { totalFiltered++; continue }

    // Filtre : dénomination sociale obligatoire (exclut auto-entrepreneurs et données masquées)
    const denomination = row.denominationUniteLegale?.trim()
    if (!denomination || denomination.startsWith('[')) { totalSkipped++; continue }

    const emp = TRANCHE_EFFECTIFS[row.trancheEffectifsUniteLegale] ?? null
    const name = denomination

    batch.push({
      name,
      siren: row.siren || null,
      siret: null,
      naf_code: naf,
      sector: NAF_SECTEUR[naf] ?? null,
      employees_count: emp,
      status: 'to_contact',
      source: 'sirene_ul',
      in_prospect_list: false,
      score: score(naf, emp),
      city: null,
      postal_code: null,
      region: null,
    })

    if (batch.length >= BATCH_SIZE) {
      const result = await insertBatch(batch)
      totalImported += result.ok
      totalErrors += result.err
      batch = []
    }
  }

  // Dernier batch
  if (batch.length > 0) {
    const result = await insertBatch(batch)
    totalImported += result.ok
    totalErrors += result.err
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  console.log('\n\n═══════════════════════════════════════════════════')
  console.log(' ✅ Import terminé !')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  ✅ Importées        : ${totalImported.toLocaleString()}`)
  console.log(`  ⏭  Inactives (skip) : ${totalSkipped.toLocaleString()}`)
  console.log(`  🔽 NAF hors cible   : ${totalFiltered.toLocaleString()}`)
  if (totalErrors > 0)
    console.log(`  ❌ Erreurs          : ${totalErrors.toLocaleString()}`)
  console.log(`  ⏱  Durée            : ${mins}m${secs}s`)
  console.log('═══════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('\n❌ Erreur fatale :', err.message)
  process.exit(1)
})
