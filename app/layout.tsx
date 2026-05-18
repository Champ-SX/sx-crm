import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({ variable: '--font-sans', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'SX CRM',
  description: 'SIXSHEET Sales Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex font-sans">
        <TooltipProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen bg-muted/20 overflow-hidden">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  )
}
