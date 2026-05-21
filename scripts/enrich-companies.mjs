/**
 * Enrichissement des sociétés via l'API Recherche d'entreprises (api.gouv.fr)
 * Remplit : city, postal_code, region, siret, address (rue)
 * Concurrence : 20 requêtes parallèles → ~80–100 req/s
 * Reprend là où il s'était arrêté (filtre city IS NULL)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zdfaocljvgivthnmlhoc.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZmFvY2xqdmdpdnRobm1saG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg4OTAsImV4cCI6MjA5NDk0NDg5MH0.dJygZpJ8AfO1LYpnrB-EzJv_BkR6MpY1MiXM3aYiVvI'
const API_BASE   = 'https://recherche-entreprises.api.gouv.fr'
const CONCURRENCY = 5     // requêtes API parallèles (raisonnable pour une API gouvernementale)
const BATCH_SIZE  = 100   // lignes lues en DB par tour

// Code région INSEE → libellé
const REGION_CODES = {
  '11': 'Île-de-France',
  '24': 'Centre-Val de Loire',
  '27': 'Bourgogne-Franche-Comté',
  '28': 'Normandie',
  '32': 'Hauts-de-France',
  '44': 'Grand Est',
  '52': 'Pays de la Loire',
  '53': 'Bretagne',
  '75': 'Nouvelle-Aquitaine',
  '76': 'Occitanie',
  '84': 'Auvergne-Rhône-Alpes',
  '93': "Provence-Alpes-Côte d'Azur",
  '94': 'Corse',
  '01': 'Guadeloupe',
  '02': 'Martinique',
  '03': 'Guyane',
  '04': 'La Réunion',
  '06': 'Mayotte',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Appel API pour un SIREN ─────────────────────────────────────────────────
async function fetchEnrichment(siren) {
  try {
    const res = await fetch(`${API_BASE}/search?q=${siren}&page=1&per_page=1`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const r = json.results?.[0]
    if (!r || r.siren !== siren) return null

    const s = r.siege
    if (!s) return null

    return {
      city:        s.libelle_commune ?? null,
      postal_code: s.code_postal ?? null,
      region:      REGION_CODES[s.region] ?? null,
      siret:       s.siret ?? null,
    }
  } catch {
    return null
  }
}

// ─── Traite un lot de BATCH_SIZE entreprises ──────────────────────────────────
async function processBatch(rows) {
  // Chunker par CONCURRENCY requêtes simultanées
  let ok = 0, skip = 0
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      chunk.map(async row => {
        if (!row.siren) return { id: row.id, data: null }
        const data = await fetchEnrichment(row.siren)
        return { id: row.id, data }
      })
    )

    // Mise à jour des lignes enrichies
    const toUpdate = results.filter(r => r.data?.city)
    await Promise.all(
      toUpdate.map(r =>
        supabase.from('companies').update(r.data).eq('id', r.id)
      )
    )
    ok   += toUpdate.length
    skip += results.length - toUpdate.length
  }
  return { ok, skip }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log(' Enrichissement Sirene → API Recherche d\'entreprises')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`⚡ Concurrence : ${CONCURRENCY} req/batch`)
  console.log(`📦 Batch DB    : ${BATCH_SIZE} lignes\n`)

  // Vérifie qu'il y a des sociétés à enrichir (on évite count sur grande table)
  const { data: probe } = await supabase
    .from('companies')
    .select('id')
    .is('city', null)
    .not('siren', 'is', null)
    .limit(1)

  if (!probe || probe.length === 0) {
    console.log('✅ Toutes les sociétés sont déjà enrichies !')
    return
  }

  // Estimation via count total - enrichies
  const { count: totalAll } = await supabase.from('companies').select('id', { count: 'estimated', head: true })
  const total = totalAll ?? 0
  console.log(`🎯 Total en base : ${total.toLocaleString('fr-FR')} (enrichissement des sociétés sans ville)\n`)

  let offset = 0
  let totalOk = 0
  let totalSkip = 0
  const startTime = Date.now()
  let lastLog = Date.now()

  while (true) {
    const { data: rows, error } = await supabase
      .from('companies')
      .select('id, siren')
      .is('city', null)
      .not('siren', 'is', null)
      .order('id')   // id est toujours indexé → pas de timeout
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) { console.error('\n❌', error.message); break }
    if (!rows || rows.length === 0) break

    const { ok, skip } = await processBatch(rows)
    totalOk   += ok
    totalSkip += skip
    offset    += rows.length

    // Log toutes les 5s
    const now = Date.now()
    if (now - lastLog > 5000) {
      const elapsed = (now - startTime) / 1000
      const pct     = Math.min(((totalOk + totalSkip) / total * 100), 100).toFixed(1)
      const rate    = Math.round((totalOk + totalSkip) / elapsed)
      const eta     = Math.round((total - totalOk - totalSkip) / (rate || 1))
      const etaStr  = eta > 60 ? `${Math.floor(eta/60)}m${eta%60}s` : `${eta}s`
      process.stdout.write(
        `\r  [${pct}%] ✅ ${totalOk.toLocaleString('fr-FR')} enrichies | ` +
        `⏭ ${totalSkip.toLocaleString('fr-FR')} sans SIREN/résultat | ` +
        `${rate}/s | ETA ${etaStr}    `
      )
      lastLog = now
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const mins    = Math.floor(elapsed / 60)
  const secs    = elapsed % 60

  console.log('\n\n═══════════════════════════════════════════════════════')
  console.log(' ✅ Enrichissement terminé !')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  ✅ Enrichies        : ${totalOk.toLocaleString('fr-FR')}`)
  console.log(`  ⏭  Sans résultat   : ${totalSkip.toLocaleString('fr-FR')}`)
  console.log(`  ⏱  Durée           : ${mins}m${secs}s`)
  console.log('═══════════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('\n❌ Erreur fatale :', err.message)
  process.exit(1)
})
