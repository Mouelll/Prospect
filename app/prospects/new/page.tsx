import { ProspectForm } from '@/components/prospects/ProspectForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProspectPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/prospects"
          className="inline-flex items-center gap-1 text-sm text-[#888880] hover:text-[#f0f0ee] transition-colors mb-3"
        >
          <ChevronLeft size={16} />
          Retour
        </Link>
        <h1 className="text-xl font-semibold text-[#f0f0ee]">Nouveau prospect</h1>
      </div>

      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-6">
        <ProspectForm />
      </div>
    </div>
  )
}
