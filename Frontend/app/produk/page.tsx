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

export default function ProdukPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [filter, setFilter] = useState('semua')
  const [produk, setProduk] = useState<Jajanan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && isAdmin()) {
      router.push('/admin')
    }
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await jajananAPI.getAll()
      setProduk(data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'semua' 
    ? produk 
    : produk.filter(p => p.status_ketersediaan === filter)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Memuat produk...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="mb-12">Katalog Produk</h1>

      {/* Filter */}
      <div className="flex gap-4 mb-12 flex-wrap">
        {['semua', 'ready_stok', 'pre_order'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-6 py-2 rounded font-medium transition ${
              filter === filterType 
                ? 'bg-primary text-white' 
                : 'border border-neutral-300 text-neutral-700 hover:border-primary'
            }`}
          >
            {filterType === 'semua' ? 'Semua Produk' : filterType === 'ready_stok' ? 'Ready Stok' : 'Pre-order'}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-neutral-600">Tidak ada produk</p>
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p._id} className="product-card overflow-hidden group hover:translate-y-1">
              <div className="h-40 bg-neutral-200 flex items-center justify-center overflow-hidden">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nama} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-neutral-500 text-sm">Gambar: {p.nama}</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display font-semibold text-base mb-1">{p.nama}</h3>
                <p className="text-xs text-neutral-600 mb-3">{p.satuan}</p>
                <p className="text-secondary font-bold text-lg mb-3">
                  Rp {p.harga.toLocaleString('id-ID')}
                </p>
                <div className="mb-4">
                  {p.status_ketersediaan === 'ready_stok' && (
                    <span className="badge-ready">Ready Stok</span>
                  )}
                  {p.status_ketersediaan === 'pre_order' && (
                    <span className="badge-preorder">Pre-order {p.waktu_preorder_hari} hari</span>
                  )}
                </div>
                <Link 
                  href={`/produk/${p._id}`} 
                  className="btn-primary w-full text-center block text-sm"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
