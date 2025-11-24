'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { jajananAPI, ulasanAPI, cartAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'

interface Jajanan {
  _id: string
  nama: string
  deskripsi: string
  harga: number
  satuan: string
  status_ketersediaan: string
  waktu_preorder_hari: number
  foto_url?: string
}

interface Ulasan {
  _id: string
  user_id: string
  user_name?: string
  jajanan_id: string
  rating: number
  komentar: string
  tanggal: string
  foto_url?: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [product, setProduct] = useState<Jajanan | null>(null)
  const [ulasan, setUlasan] = useState<Ulasan[]>([])
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!id) return
    fetchProductData()
  }, [id])

  // Re-fetch product and reviews when the window/tab regains focus
  useEffect(() => {
    const onFocus = () => {
      if (id) fetchProductData()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
      }
    }
  }, [id])

  const fetchProductData = async () => {
    if (!id) return
    
    try {
      const [productData, ulasanData] = await Promise.all([
        jajananAPI.getById(id),
        ulasanAPI.getByJajanan(id).catch((e) => {
          console.error('Error fetching reviews:', e)
          return []
        }),
      ])
      console.log('Fetched reviews for product', id, ulasanData)
      setProduct(productData)
      setUlasan(ulasanData)
    } catch (error) {
      console.error('Failed to fetch product:', error)
      toast.error('Gagal memuat data produk')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated()) {
      toast.error('Silakan login terlebih dahulu')
      router.push('/login')
      return
    }

    if (!product) return

    const loadingToast = toast.loading('Menambahkan ke keranjang...')

    try {
      // Get current cart
      const currentCart = await cartAPI.getMyCart().catch(() => ({ items: [] }))
      
      // Check if item already exists in cart
      const existingItemIndex = currentCart.items.findIndex(
        (item: any) => item.jajanan_id === product._id
      )

      let updatedItems
      if (existingItemIndex >= 0) {
        // Update existing item
        updatedItems = [...currentCart.items]
        updatedItems[existingItemIndex].qty += qty
      } else {
        // Add new item
        updatedItems = [
          ...currentCart.items,
          {
            jajanan_id: product._id,
            qty: qty,
            harga_satuan: product.harga,
          },
        ]
      }

      await cartAPI.updateCart(updatedItems)
      toast.success(`${qty} ${product.nama} ditambahkan ke keranjang`, {
        id: loadingToast,
      })
    } catch (error) {
      console.error('Failed to add to cart:', error)
      toast.error('Gagal menambahkan ke keranjang', {
        id: loadingToast,
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Memuat produk...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Produk tidak ditemukan</p>
        <Link href="/produk" className="text-primary hover:underline">
          Kembali ke halaman produk
        </Link>
      </div>
    )
  }

  const ratingAverage = ulasan.length > 0
    ? (ulasan.reduce((sum, u) => sum + u.rating, 0) / ulasan.length).toFixed(1)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="mb-8 text-sm text-neutral-600">
        <Link href="/produk" className="hover:text-primary">Produk</Link>
        <span> / {product.nama}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Product Image */}
        <div className="bg-neutral-200 rounded-lg h-96 flex items-center justify-center overflow-hidden">
          {product.foto_url ? (
            <img src={product.foto_url} alt={product.nama} className="w-full h-full object-cover" />
          ) : (
            <span className="text-neutral-600 text-xl">Gambar: {product.nama}</span>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.nama}</h1>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-lg">
                  {i < Math.round(Number(ratingAverage)) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <span className="text-neutral-600">{ratingAverage} ({ulasan.length} ulasan)</span>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            {product.status_ketersediaan === 'ready_stok' && (
              <span className="badge-ready">Ready Stok</span>
            )}
            {product.status_ketersediaan === 'pre_order' && (
              <span className="badge-preorder">Pre-order {product.waktu_preorder_hari} hari</span>
            )}
          </div>

          {/* Price */}
          <div className="mb-6">
            <span className="text-neutral-600 text-sm">{product.satuan}</span>
            <p className="text-4xl font-bold text-primary">Rp {product.harga.toLocaleString('id-ID')}</p>
          </div>

          {/* Description */}
          <p className="text-neutral-700 mb-6 leading-relaxed">
            {product.deskripsi}
          </p>

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Jumlah</label>
            <div className="flex items-center gap-4">
              <div className="flex border border-neutral-300 rounded">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-2 hover:bg-neutral-100 font-semibold"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-l border-r border-neutral-300 py-2"
                />
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-4 py-2 hover:bg-neutral-100 font-semibold"
                >
                  +
                </button>
              </div>
              <span className="text-neutral-600">
                Total: Rp {(product.harga * qty).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="btn-primary w-full py-3 mb-3 font-semibold"
          >
            Tambah ke Keranjang
          </button>
          
          <Link href="/produk" className="btn-secondary w-full text-center block py-3 font-semibold">
            Lanjut Belanja
          </Link>
        </div>
      </div>

      {/* Detailed Description */}
      <div className="bg-neutral-100 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold mb-4">Detail Produk</h2>
        <div className="space-y-3 text-neutral-700">
          <div className="border-b border-neutral-300 pb-2">
            <p className="text-sm text-neutral-500">Nama Produk</p>
            <p className="font-semibold">{product.nama}</p>
          </div>
          <div className="border-b border-neutral-300 pb-2">
            <p className="text-sm text-neutral-500">Deskripsi</p>
            <p className="leading-relaxed">{product.deskripsi}</p>
          </div>
          <div className="border-b border-neutral-300 pb-2">
            <p className="text-sm text-neutral-500">Harga</p>
            <p className="font-semibold text-primary">Rp {product.harga.toLocaleString('id-ID')}</p>
          </div>
          <div className="border-b border-neutral-300 pb-2">
            <p className="text-sm text-neutral-500">Satuan</p>
            <p>{product.satuan}</p>
          </div>
          <div className="border-b border-neutral-300 pb-2">
            <p className="text-sm text-neutral-500">Ketersediaan</p>
            <p>{product.status_ketersediaan === 'ready_stok' ? ' Ready Stok - Siap dikirim' : `⏰ Pre-order - Estimasi ${product.waktu_preorder_hari} hari`}</p>
          </div>
          {product.status_ketersediaan === 'pre_order' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>Info Pre-order:</strong> Produk ini memerlukan waktu pembuatan {product.waktu_preorder_hari} hari setelah pesanan dikonfirmasi. Pastikan untuk memesan lebih awal!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Ulasan Pelanggan ({ulasan.length})</h2>
        {ulasan.length === 0 ? (
          <p className="text-neutral-600">Belum ada ulasan untuk produk ini.</p>
        ) : (
          <div className="space-y-4">
            {ulasan.map((review) => (
              <div key={review._id} className="border border-neutral-300 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                      {review.user_name ? review.user_name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-semibold">{review.user_name || 'User'}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(review.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500 text-lg">
                        {i < review.rating ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-neutral-700 mt-3 leading-relaxed">{review.komentar}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
