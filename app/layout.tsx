import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'Prospecteur B2B',
  description: 'Outil de prospection B2B pour vidéaste freelance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#0f0f0f]">
        <Sidebar />
        <main className="ml-[220px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
