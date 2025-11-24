'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cartAPI, jajananAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface CartItem {
  jajanan_id: string
  qty: number
  harga_satuan: number
}

interface JajananDetail {
  _id: string
  nama: string
  deskripsi: string
  harga: number
  satuan: string
  status_ketersediaan: string
  foto_url?: string
}

interface CartItemWithDetails extends CartItem {
  details?: JajananDetail
}

export default function CartPage() {
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && isAdmin()) {
      router.push('/admin')
      return
    }
    if (!authLoading && !isAuthenticated()) {
      router.push('/login')
      return
    }
  }, [authLoading, isAdmin, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated() && !isAdmin()) {
      fetchCart()
    }
  }, [isAuthenticated, isAdmin])

  const fetchCart = async () => {
    try {
      const cart = await cartAPI.getMyCart()
      
      // Fetch details untuk setiap item
      const itemsWithDetails = await Promise.all(
        cart.items.map(async (item: CartItem) => {
          try {
            const details = await jajananAPI.getById(item.jajanan_id)
            return { ...item, details }
          } catch (error) {
            console.error(`Failed to fetch product ${item.jajanan_id}:`, error)
            return item
          }
        })
      )
      
      setCartItems(itemsWithDetails)
    } catch (error) {
      console.error('Failed to fetch cart:', error)
      setCartItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (jajanan_id: string) => {
    const loadingToast = toast.loading('Menghapus item...')
    
    try {
      const updatedItems = cartItems.filter(item => item.jajanan_id !== jajanan_id)
      await cartAPI.updateCart(updatedItems.map(({ details, ...item }) => item))
      setCartItems(updatedItems)
      toast.success('Item dihapus dari keranjang', { id: loadingToast })
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error('Gagal menghapus item', { id: loadingToast })
    }
  }

  const handleQtyChange = async (jajanan_id: string, newQty: number) => {
    if (newQty <= 0) return
    
    const loadingToast = toast.loading('Mengupdate jumlah...')
    
    try {
      const updatedItems = cartItems.map(item =>
        item.jajanan_id === jajanan_id ? { ...item, qty: newQty } : item
      )
      
      await cartAPI.updateCart(updatedItems.map(({ details, ...item }) => item))
      setCartItems(updatedItems)
      toast.success('Jumlah diupdate', { id: loadingToast })
    } catch (error) {
      console.error('Failed to update quantity:', error)
      toast.error('Gagal mengupdate jumlah', { id: loadingToast })
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Memuat keranjang...</p>
      </div>
    )
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const harga = item.details?.harga || item.harga_satuan
    return sum + (harga * item.qty)
  }, 0)
  const ongkosKirim = cartItems.length > 0 ? 10000 : 0
  const total = subtotal + ongkosKirim

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="mb-12">Keranjang Belanja</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 border border-neutral-300 rounded">
              <p className="text-neutral-600 mb-6 text-lg">Keranjang belanja Anda kosong</p>
              <Link href="/produk" className="btn-primary inline-block">
                Lanjut Belanja
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const productName = item.details?.nama || 'Produk'
                const productPrice = item.details?.harga || item.harga_satuan
                const productUnit = item.details?.satuan || 'per buah'
                const productImage = item.details?.foto_url
                const productStatus = item.details?.status_ketersediaan

                return (
                  <div key={item.jajanan_id} className="border border-neutral-200 rounded-lg p-4 flex gap-4 hover:shadow-md transition">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-neutral-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {productImage ? (
                        <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-neutral-400 text-xs text-center">No Image</span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900 mb-1">{productName}</h3>
                      <p className="text-sm text-neutral-600 mb-2">{productUnit}</p>
                      {productStatus && (
                        <span className={`inline-block px-2 py-1 rounded text-xs mb-2 ${
                          productStatus === 'ready_stok' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {productStatus === 'ready_stok' ? 'Ready Stok' : 'Pre-order'}
                        </span>
                      )}
                      <p className="text-secondary font-semibold">Rp {productPrice.toLocaleString('id-ID')}</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex flex-col items-end justify-between">
                      <div className="flex border border-neutral-300 rounded">
                        <button
                          onClick={() => handleQtyChange(item.jajanan_id, item.qty - 1)}
                          className="px-3 py-1 hover:bg-neutral-100 font-semibold"
                        >
                          −
                        </button>
                        <span className="px-4 py-1 font-medium min-w-[3rem] text-center">{item.qty}</span>
                        <button
                          onClick={() => handleQtyChange(item.jajanan_id, item.qty + 1)}
                          className="px-3 py-1 hover:bg-neutral-100 font-semibold"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item.jajanan_id)}
                        className="text-red-600 hover:text-red-700 font-semibold text-sm mt-2"
                      >
                        🗑️ Hapus
                      </button>
                      <p className="text-sm font-semibold text-neutral-700 mt-2">
                        Rp {(productPrice * item.qty).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-neutral-100 rounded-lg p-6 h-fit sticky top-24">
          <h2 className="font-display text-lg font-semibold mb-6">Ringkasan Belanja</h2>
          <div className="space-y-3 mb-6 pb-6 border-b border-neutral-300">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal ({cartItems.length} item)</span>
              <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Ongkos Kirim</span>
              <span className="font-semibold">Rp {ongkosKirim.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="flex justify-between font-display text-lg font-semibold mb-6 pb-6 border-b border-neutral-300">
            <span>Total Pembayaran</span>
            <span className="text-secondary">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          
          {cartItems.length > 0 && (
            <>
              <Link href="/checkout" className="btn-primary w-full text-center block mb-3">
                Lanjut ke Pembayaran
              </Link>
              <Link href="/produk" className="btn-secondary w-full text-center block">
                Lanjut Belanja
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
