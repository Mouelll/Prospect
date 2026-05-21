export type ProspectStatus =
  | 'to_contact'
  | 'contacted'
  | 'in_discussion'
  | 'quote_sent'
  | 'client'
  | 'archived'

export type InteractionType = 'email' | 'call' | 'linkedin' | 'meeting' | 'other'

export interface Company {
  id: string
  name: string
  sector: string | null
  naf_code: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  website: string | null
  email: string | null
  phone: string | null
  siret: string | null
  siren: string | null
  employees_count: number | null
  instagram_handle: string | null
  google_rating: number | null
  has_video: boolean | null
  score: number | null
  status: ProspectStatus
  source: string | null
  notes: string | null
  next_followup_date: string | null
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  company_id: string
  first_name: string | null
  last_name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export interface Interaction {
  id: string
  company_id: string
  type: InteractionType
  date: string
  content: string
  created_at: string
}

export interface Template {
  id: string
  name: string
  type: string
  subject: string | null
  body: string
  created_at: string
}
