'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jajananAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

interface Jajanan {
  _id: string
  nama: string
  harga: number
  satuan: string
  status_ketersediaan: string
  waktu_preorder_hari: number
  foto_url?: string
}

export default function Home() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [featuredProducts, setFeaturedProducts] = useState<Jajanan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && isAdmin()) {
      router.push('/admin')
    }
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    fetchFeaturedProducts()
  }, [])

  const fetchFeaturedProducts = async () => {
    try {
      const products = await jajananAPI.getAll()
      // Ambil 3 produk pertama sebagai featured
      setFeaturedProducts(products.slice(0, 3))
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-neutral-100 to-neutral-200 pt-20 pb-32 md:py-32">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-neutral-900">
            Cita Rasa Tradisional
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Nikmati autentisitas jajanan tradisional Indonesia yang dibuat dengan cinta dan bahan pilihan terbaik
          </p>
          <Link href="/produk" className="btn-primary inline-block text-lg">
            Jelajahi Koleksi
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-center mb-12">Produk Unggulan</h2>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Memuat produk...</p>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Belum ada produk tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProducts.map((produk) => (
              <div key={produk._id} className="product-card overflow-hidden hover:translate-y-1">
                <div className="h-48 bg-neutral-200 flex items-center justify-center overflow-hidden">
                  {produk.foto_url ? (
                    <img src={produk.foto_url} alt={produk.nama} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-neutral-500">Gambar Produk</span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-semibold mb-2">{produk.nama}</h3>
                  <p className="text-secondary font-semibold text-lg mb-4">
                    Rp {produk.harga.toLocaleString('id-ID')}
                  </p>
                  <div className="mb-4">
                    {produk.status_ketersediaan === 'pre_order' && (
                      <span className="badge-preorder">Pre-order {produk.waktu_preorder_hari} hari</span>
                    )}
                    {produk.status_ketersediaan === 'ready_stok' && (
                      <span className="badge-ready">Ready Stok</span>
                    )}
                  </div>
                  <Link href={`/produk/${produk._id}`} className="btn-primary w-full text-center block">
                    Lihat Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-neutral-100 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-center mb-12">Mengapa Memilih Kami?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="font-display text-xl font-semibold mb-3">Bahan Berkualitas</h3>
              <p className="text-neutral-600 leading-relaxed">Menggunakan bahan pilihan terbaik untuk setiap produk tanpa pengawet</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="font-display text-xl font-semibold mb-3">Pengiriman Cepat</h3>
              <p className="text-neutral-600 leading-relaxed">Pengiriman ke seluruh area dengan jaminan kesegaran</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="font-display text-xl font-semibold mb-3">Terpercaya</h3>
              <p className="text-neutral-600 leading-relaxed">Ribuan pelanggan puas dengan layanan kami</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
