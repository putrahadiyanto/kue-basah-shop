'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout, isAdmin, isAuthenticated } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Admin hanya lihat navbar sederhana
  if (isAdmin()) {
    return (
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-display text-2xl font-semibold text-primary">
            ADMIN DASHBOARD
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">
              <span className="font-medium">{user?.nama_lengkap}</span> (Admin)
            </span>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              size="sm"
            >
              Logout
            </Button>
          </div>
        </nav>
      </header>
    )
  }

  // Navbar normal untuk customer
  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-semibold text-primary">
          JAJANAN
        </Link>
        
        <div className="flex gap-6 items-center">
          <Link href="/" className="text-neutral-600 hover:text-primary transition font-medium">
            Beranda
          </Link>
          <Link href="/produk" className="text-neutral-600 hover:text-primary transition font-medium">
            Produk
          </Link>
          
          {isAuthenticated() && (
            <>
              <Link href="/cart" className="text-neutral-600 hover:text-primary transition font-medium">
                Keranjang
              </Link>
              <Link href="/pesanan" className="text-neutral-600 hover:text-primary transition font-medium">
                Pesanan
              </Link>
            </>
          )}
          
          {isAuthenticated() ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600">
                Halo, <span className="font-medium">{user?.nama_lengkap}</span>
              </span>
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Daftar
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
