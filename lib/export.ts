import Papa from 'papaparse'
import { Company } from './types'

export function exportCompaniesToCSV(companies: Company[], filename = 'prospects.csv') {
  const data = companies.map((c) => ({
    Nom: c.name,
    Secteur: c.sector ?? '',
    'Code NAF': c.naf_code ?? '',
    Ville: c.city ?? '',
    'Code postal': c.postal_code ?? '',
    Région: c.region ?? '',
    Site: c.website ?? '',
    Email: c.email ?? '',
    Téléphone: c.phone ?? '',
    SIRET: c.siret ?? '',
    Effectifs: c.employees_count ?? '',
    Instagram: c.instagram_handle ?? '',
    'Note Google': c.google_rating ?? '',
    'A une vidéo': c.has_video ? 'Oui' : 'Non',
    Score: c.score ?? '',
    Statut: c.status,
    Notes: c.notes ?? '',
    'Prochaine relance': c.next_followup_date ?? '',
    Source: c.source ?? '',
    'Créé le': c.created_at,
  }))

  const csv = Papa.unparse(data, { delimiter: ';' })
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
