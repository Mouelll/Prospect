import { Company } from './types'

const SECTEURS_PREMIUM = ['4511Z', '4519Z', '4540Z', '5510Z', '6810Z', '6820A', '8230Z']

export function calculateScore(c: Partial<Company>): number {
  let score = 1
  if (c.naf_code && SECTEURS_PREMIUM.includes(c.naf_code)) score++
  if (c.google_rating && c.google_rating >= 4.5) score++
  if (c.instagram_handle) score++
  if (c.has_video === false) score++ // opportunité directe
  if (c.employees_count && c.employees_count >= 5 && c.employees_count <= 200) score++
  return Math.min(score, 5)
}
