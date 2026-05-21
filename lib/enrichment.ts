/**
 * Enrichissement d'une société via l'API Recherche d'entreprises (api.gouv.fr)
 * Retourne : city, postal_code, region, siret, adresse complète
 */

const API_BASE = 'https://recherche-entreprises.api.gouv.fr'

const REGION_CODES: Record<string, string> = {
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

export interface EnrichmentResult {
  city: string | null
  postal_code: string | null
  region: string | null
  siret: string | null
  address: string | null       // numéro + voie (ex: "33 RUE DES GRANDES ARCADES")
  nom_commercial: string | null
}

export async function enrichBySiren(siren: string): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(siren)}&page=1&per_page=1`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    const r = json.results?.[0]
    if (!r || r.siren !== siren) return null

    const s = r.siege
    if (!s) return null

    const adressePartielle = [
      s.numero_voie,
      s.type_voie,
      s.libelle_voie,
    ].filter(Boolean).join(' ') || null

    return {
      city:          s.libelle_commune ?? null,
      postal_code:   s.code_postal ?? null,
      region:        REGION_CODES[s.region] ?? null,
      siret:         s.siret ?? null,
      address:       adressePartielle,
      nom_commercial: s.nom_commercial ?? null,
    }
  } catch {
    return null
  }
}

/** Construit l'URL Pappers pour un SIREN */
export function pappersUrl(siren: string) {
  return `https://www.pappers.fr/entreprise/${siren}`
}

/** Construit l'URL Societe.com pour un SIREN */
export function societeUrl(siren: string) {
  return `https://www.societe.com/cgi-bin/search?champs=${siren}`
}

/** URL de recherche Google Maps pour retrouver le site web */
export function googleSearchUrl(name: string, city?: string | null) {
  const q = [name, city, 'site web'].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

/** URL Google Maps */
export function googleMapsUrl(name: string, city?: string | null) {
  const q = [name, city].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`
}
