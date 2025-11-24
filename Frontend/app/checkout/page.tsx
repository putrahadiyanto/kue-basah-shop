'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cartAPI, pesananAPI, jajananAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface CartItem {
  jajanan_id: string
  qty: number
  harga_satuan: number
}

interface JajananDetail {
  _id: string
  nama: string
  harga: number
  satuan: string
}

interface CartItemWithDetails extends CartItem {
  details?: JajananDetail
}

export default function CheckoutPage() {
  const { isAdmin, isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<Array<{jalan: string, kota: string, kode_pos?: string}>>([])
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    nama_penerima: '',
    telepon_penerima: '',
    jalan: '',
    kota: '',
    metode_pembayaran: 'Transfer Bank',
    tanggal_pengiriman: '',
  })

  useEffect(() => {
    if (!authLoading && isAdmin()) {
      router.push('/admin')
      return
    }
    if (!authLoading && !isAuthenticated()) {
      toast.error('Silakan login terlebih dahulu')
      router.push('/login')
      return
    }
  }, [authLoading, isAdmin, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated() && !isAdmin() && user) {
      setFormData(prev => ({
        ...prev,
        nama_penerima: user.nama_lengkap || '',
      }))
      
      // Load saved addresses
      if (user.alamat && user.alamat.length > 0) {
        setSavedAddresses(user.alamat)
        // Auto select first address if available
        setSelectedAddressIndex(0)
          setFormData(prev => ({
            ...prev,
            jalan: user.alamat?.[0]?.jalan || "",
            kota: user.alamat?.[0]?.kota || "",
          }))
      } else {
        setUseNewAddress(true)
      }
      
      fetchCart()
    }
  }, [isAuthenticated, isAdmin, user])

  const fetchCart = async () => {
    try {
      const cart = await cartAPI.getMyCart()
      
      if (!cart.items || cart.items.length === 0) {
        toast.error('Keranjang belanja kosong')
        router.push('/cart')
        return
      }

      // Fetch details untuk setiap item
      const itemsWithDetails = await Promise.all(
        cart.items.map(async (item: CartItem) => {
          try {
            const details = await jajananAPI.getById(item.jajanan_id)
            return { ...item, details }
          } catch (error) {
            return item
          }
        })
      )
      
      setCartItems(itemsWithDetails)
    } catch (error) {
      console.error('Failed to fetch cart:', error)
      toast.error('Gagal memuat keranjang')
      router.push('/cart')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectAddress = (index: number) => {
    setSelectedAddressIndex(index)
    setUseNewAddress(false)
    const address = savedAddresses[index]
    setFormData(prev => ({
      ...prev,
      jalan: address.jalan,
      kota: address.kota,
    }))
  }

  const handleUseNewAddress = () => {
    setUseNewAddress(true)
    setSelectedAddressIndex(null)
    setFormData(prev => ({
      ...prev,
      jalan: '',
      kota: '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.nama_penerima.trim()) {
      toast.error('Nama penerima harus diisi')
      return
    }
    if (!formData.telepon_penerima.trim()) {
      toast.error('Nomor telepon harus diisi')
      return
    }
    if (!formData.jalan.trim()) {
      toast.error('Alamat lengkap harus diisi')
      return
    }
    if (!formData.kota.trim()) {
      toast.error('Kota harus diisi')
      return
    }
    if (!formData.tanggal_pengiriman) {
      toast.error('Tanggal pengiriman harus dipilih')
      return
    }

    const loadingToast = toast.loading('Memproses pesanan...')
    setSubmitting(true)

    try {
      const subtotal = cartItems.reduce((sum, item) => {
        const harga = item.details?.harga || item.harga_satuan
        return sum + (harga * item.qty)
      }, 0)
      const ongkosKirim = 10000
      const total = subtotal + ongkosKirim

      // Create order
      const orderData = {
        tanggal_pengiriman_diminta: new Date(formData.tanggal_pengiriman).toISOString(),
        item_pesanan: cartItems.map(item => ({
          jajanan_id: item.jajanan_id,
          qty: item.qty,
          harga_satuan: item.details?.harga || item.harga_satuan,
        })),
        alamat_pengiriman: {
          nama_penerima: formData.nama_penerima,
          telepon_penerima: formData.telepon_penerima,
          jalan: formData.jalan,
          kota: formData.kota,
        },
        pembayaran: {
          metode: formData.metode_pembayaran,
          status_pembayaran: 'Pending',
          ongkos_kirim: ongkosKirim,
          total_pembayaran: total,
        },
      }

      const createdOrder = await pesananAPI.create(orderData)
      
      // Clear cart setelah order berhasil
      await cartAPI.updateCart([])
      
      toast.success('✅ Pesanan berhasil dibuat!', { id: loadingToast })
      
      // Redirect ke halaman detail pesanan
      router.push(`/pesanan/${createdOrder._id}`)
      
    } catch (error) {
      console.error('Failed to create order:', error)
      toast.error('Gagal membuat pesanan', { id: loadingToast })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Memuat data checkout...</p>
      </div>
    )
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const harga = item.details?.harga || item.harga_satuan
    return sum + (harga * item.qty)
  }, 0)
  const ongkosKirim = 10000
  const total = subtotal + ongkosKirim

  // Get minimum date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informasi Penerima */}
            <div className="bg-white border border-neutral-300 rounded-lg p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Informasi Penerima</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nama Penerima *</label>
                  <input
                    type="text"
                    name="nama_penerima"
                    value={formData.nama_penerima}
                    onChange={handleChange}
                    className="w-full border border-neutral-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nomor Telepon *</label>
                  <input
                    type="tel"
                    name="telepon_penerima"
                    value={formData.telepon_penerima}
                    onChange={handleChange}
                    placeholder="08123456789"
                    className="w-full border border-neutral-300 rounded px-3 py-2"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Alamat Pengiriman */}
            <div className="bg-white border border-neutral-300 rounded-lg p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Alamat Pengiriman</h2>
              
              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-3">Pilih alamat tersimpan:</p>
                  <div className="space-y-2">
                    {savedAddresses.map((address, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectAddress(index)}
                        className={`w-full text-left border-2 rounded-lg p-3 transition ${
                          selectedAddressIndex === index && !useNewAddress
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            selectedAddressIndex === index && !useNewAddress
                              ? 'border-primary bg-primary'
                              : 'border-neutral-300'
                          }`}>
                            {selectedAddressIndex === index && !useNewAddress && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{address.jalan}</p>
                            <p className="text-sm text-neutral-600">{address.kota}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    {/* Add New Address Option */}
                    <button
                      type="button"
                      onClick={handleUseNewAddress}
                      className={`w-full text-left border-2 rounded-lg p-3 transition ${
                        useNewAddress
                          ? 'border-primary bg-primary/5'
                          : 'border-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          useNewAddress
                            ? 'border-primary bg-primary'
                            : 'border-neutral-300'
                        }`}>
                          {useNewAddress && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-primary">+ Gunakan alamat baru</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Address Form (shown when new address or no saved addresses) */}
              {(useNewAddress || savedAddresses.length === 0) && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Alamat Lengkap *</label>
                    <input
                      type="text"
                      name="jalan"
                      value={formData.jalan}
                      onChange={handleChange}
                      placeholder="Jl. Contoh No. 123"
                      className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Kota *</label>
                    <input
                      type="text"
                      name="kota"
                      value={formData.kota}
                      onChange={handleChange}
                      placeholder="Jakarta"
                      className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pengiriman */}
            <div className="bg-white border border-neutral-300 rounded-lg p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Tanggal Pengiriman</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Pilih Tanggal *</label>
                <input
                  type="date"
                  name="tanggal_pengiriman"
                  value={formData.tanggal_pengiriman}
                  onChange={handleChange}
                  min={minDate}
                  className="w-full border border-neutral-300 rounded px-3 py-2"
                  required
                />
                <p className="text-xs text-neutral-600 mt-2">Minimal 1 hari dari sekarang</p>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="bg-white border border-neutral-300 rounded-lg p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Metode Pembayaran</h2>
              <select
                name="metode_pembayaran"
                value={formData.metode_pembayaran}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded px-3 py-2"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="E-Wallet">E-Wallet</option>
              </select>
            </div>
          </div>

          {/* Summary Section */}
          <div>
            <div className="bg-white border border-neutral-300 rounded-lg p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold mb-4">Ringkasan Pesanan</h2>
              
              {/* Order Items */}
              <div className="space-y-3 mb-4 pb-4 border-b border-neutral-300 max-h-64 overflow-y-auto">
                {cartItems.map((item) => {
                  const productName = item.details?.nama || 'Produk'
                  const productPrice = item.details?.harga || item.harga_satuan
                  
                  return (
                    <div key={item.jajanan_id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{productName}</p>
                        <p className="text-neutral-600">{item.qty} x Rp {productPrice.toLocaleString('id-ID')}</p>
                      </div>
                      <p className="font-semibold">Rp {(productPrice * item.qty).toLocaleString('id-ID')}</p>
                    </div>
                  )
                })}
              </div>

              {/* Pricing */}
              <div className="space-y-3 mb-4 pb-4 border-b border-neutral-300">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal ({cartItems.length} item)</span>
                  <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Ongkos Kirim</span>
                  <span className="font-semibold">Rp {ongkosKirim.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex justify-between font-display text-xl font-semibold mb-6">
                <span>Total</span>
                <span className="text-secondary">Rp {total.toLocaleString('id-ID')}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full text-center mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Memproses...' : 'Buat Pesanan'}
              </button>
              
              <Link href="/cart" className="btn-secondary w-full text-center block">
                Kembali ke Keranjang
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
