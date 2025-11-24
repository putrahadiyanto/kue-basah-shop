import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Outfit } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/navbar'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Jajanan Tradisional - Pesan Jajanan Enak',
  description: 'Toko online jajanan tradisional Indonesia dengan sistem pre-order dan ready stok',
  generator: 'v0.app'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${playfair.variable} ${outfit.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={outfit.className}>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <Navbar />

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>

          {/* Footer */}
          <footer className="bg-neutral-900 text-neutral-50 py-12 mt-16">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
              <div>
                <h3 className="font-display text-lg font-semibold mb-4 text-secondary">Tentang Kami</h3>
                <p className="text-neutral-300 text-sm leading-relaxed">Menyediakan jajanan tradisional berkualitas dengan bahan pilihan, dibuat segar setiap hari untuk kepuasan Anda.</p>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold mb-4 text-secondary">Layanan</h3>
                <ul className="text-neutral-300 text-sm space-y-2">
                  <li><a href="#" className="hover:text-secondary transition">Pre-order</a></li>
                  <li><a href="#" className="hover:text-secondary transition">Ready Stok</a></li>
                  <li><a href="#" className="hover:text-secondary transition">Pengiriman</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold mb-4 text-secondary">Kontak</h3>
                <p className="text-neutral-300 text-sm">Email: info@jajanan.com</p>
                <p className="text-neutral-300 text-sm">Telp: 0812-3456-7890</p>
              </div>
            </div>
            <div className="border-t border-neutral-700 pt-8 text-center text-neutral-400 text-sm">
              <p>&copy; 2025 Jajanan Tradisional. Semua hak cipta dilindungi.</p>
            </div>
          </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
