import { Badge } from '@/components/ui/Badge'
import { ProspectStatus } from '@/lib/types'

const STATUS_CONFIG: Record<ProspectStatus, { label: string; variant: 'slate' | 'blue' | 'amber' | 'purple' | 'green' }> = {
  to_contact: { label: 'À contacter', variant: 'slate' },
  contacted: { label: 'Contacté', variant: 'blue' },
  in_discussion: { label: 'En discussion', variant: 'amber' },
  quote_sent: { label: 'Devis envoyé', variant: 'purple' },
  client: { label: 'Client', variant: 'green' },
  archived: { label: 'Archivé', variant: 'slate' },
}

export function StatusBadge({ status }: { status: ProspectStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={status === 'archived' ? 'opacity-50' : ''}>
      {config.label}
    </Badge>
  )
}

export const STATUS_OPTIONS: { value: ProspectStatus; label: string }[] = Object.entries(STATUS_CONFIG).map(
  ([value, { label }]) => ({ value: value as ProspectStatus, label })
)
