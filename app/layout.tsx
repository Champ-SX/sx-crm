import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/components/auth-provider'

const inter = Inter({ variable: '--font-sans', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'SX CRM',
  description: 'SIXSHEET Sales Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex font-sans">
        <AuthProvider>
          <TooltipProvider>
            <MobileNavProvider>
              <Sidebar />
              <main className="flex-1 flex flex-col min-h-screen bg-background overflow-hidden">
                {children}
              </main>
            </MobileNavProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
