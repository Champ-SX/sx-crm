import type { Metadata } from 'next'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataInitializer } from '@/components/data-initializer'
import { AuthProvider } from '@/components/auth-provider'
import { AuthGuard } from '@/components/auth-guard'
import { RealtimeSync } from '@/components/layout/realtime-sync'
import { ThemeProvider } from '@/components/layout/theme-provider'

// Applies the saved/system theme before first paint to avoid a light flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })
// Thai webfont — Inter has no Thai glyphs, so Thai text was falling back to the
// OS default (rendered small + inconsistent). Noto Sans Thai handles Thai glyphs
// via the font stack in globals.css (Latin → Inter, Thai → Noto Sans Thai).
const notoThai = Noto_Sans_Thai({ variable: '--font-thai', subsets: ['thai'], display: 'swap' })

export const metadata: Metadata = {
  title: 'SX CRM',
  description: 'SIXSHEET Sales Operating System',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SX CRM' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoThai.variable} h-full antialiased`}
      // themeInitScript adds the `dark` class before hydration to avoid a
      // light-mode flash; the server can't know the visitor's theme, so the
      // <html> className legitimately differs on first paint. Suppress the
      // (benign) hydration warning for this element only.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex font-sans">
        <ThemeProvider>
        <AuthProvider>
          <AuthGuard>
            <TooltipProvider>
              <MobileNavProvider>
                {/* Initialize CRM data once at app startup */}
                <DataInitializer />
                {/* Keep activity feed live via Realtime + visibilitychange */}
                <RealtimeSync />

                <Sidebar />
                <main className="flex-1 flex flex-col min-h-screen bg-background overflow-hidden">
                  {children}
                </main>
              </MobileNavProvider>
            </TooltipProvider>
          </AuthGuard>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
