'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { pesananAPI, jajananAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Pesanan {
  _id: string
  pelanggan_id: string
  tanggal_pesan: string
  tanggal_pengiriman_diminta: string
  status_pesanan: string
  item_pesanan: Array<{
    jajanan_id: string
    qty: number
    harga_satuan: number
  }>
  alamat_pengiriman: {
    nama_penerima: string
    telepon_penerima: string
    jalan: string
    kota: string
  }
  pembayaran: {
    metode: string
    status_pembayaran: string
    ongkos_kirim: number
    total_pembayaran: number
  }
}

interface ItemWithDetails {
  jajanan_id: string
  qty: number
  harga_satuan: number
  nama?: string
  satuan?: string
  foto_url?: string
}

export default function PesananDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pesanan, setPesanan] = useState<Pesanan | null>(null)
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingBukti, setUploadingBukti] = useState(false)

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
    if (id && isAuthenticated() && !isAdmin()) {
      fetchPesanan()
    }
  }, [id, isAuthenticated, isAdmin])

  const fetchPesanan = async () => {
    try {
      const data = await pesananAPI.getById(id)
      setPesanan(data)
      
      // Fetch product details
      const itemsWithDetails = await Promise.all(
        data.item_pesanan.map(async (item: any) => {
          try {
            const product = await jajananAPI.getById(item.jajanan_id)
            return {
              ...item,
              nama: product.nama,
              satuan: product.satuan,
              foto_url: product.foto_url,
            }
          } catch (error) {
            return item
          }
        })
      )
      setItems(itemsWithDetails)
    } catch (error) {
      console.error('Failed to fetch order:', error)
      toast.error('Gagal memuat detail pesanan')
      router.push('/pesanan')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReceived = async () => {
    if (!pesanan) return
    
    const loadingToast = toast.loading('Mengkonfirmasi penerimaan...')
    try {
      await pesananAPI.confirmReceived(pesanan._id)
      toast.success('✅ Pesanan dikonfirmasi diterima!', { id: loadingToast })
      fetchPesanan() // Reload data
    } catch (error) {
      console.error('Failed to confirm received:', error)
      toast.error('Gagal mengkonfirmasi penerimaan', { id: loadingToast })
    }
  }

  const handleUploadBukti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pesanan || !e.target.files || !e.target.files[0]) return
    
    const file = e.target.files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (jpg, png, dll)')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }
    
    setUploadingBukti(true)
    const loadingToast = toast.loading('Mengupload bukti pembayaran...')
    
    try {
      await pesananAPI.uploadBukti(pesanan._id, file)
      toast.success('✅ Bukti pembayaran berhasil diupload!', { id: loadingToast })
      fetchPesanan() // Reload data
    } catch (error) {
      console.error('Failed to upload bukti:', error)
      toast.error('Gagal mengupload bukti pembayaran', { id: loadingToast })
    } finally {
      setUploadingBukti(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const getStatusSteps = () => {
    const statuses = ['Menunggu Pembayaran', 'Diproses', 'Dikirim', 'Selesai']
    const currentIndex = pesanan ? statuses.indexOf(pesanan.status_pesanan) : -1
    
    return statuses.map((status, index) => ({
      label: status,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Memuat detail pesanan...</p>
      </div>
    )
  }

  if (!pesanan) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Pesanan tidak ditemukan</p>
        <Link href="/pesanan" className="btn-primary inline-block mt-4">
          Kembali ke Daftar Pesanan
        </Link>
      </div>
    )
  }

  const statusSteps = getStatusSteps()
  const subtotal = items.reduce((sum, item) => sum + (item.harga_satuan * item.qty), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link href="/pesanan" className="text-primary hover:underline mb-4 inline-block">
          ← Kembali ke Pesanan
        </Link>
        <h1 className="text-3xl font-bold">Detail Pesanan</h1>
        <p className="text-neutral-600">Order ID: #{pesanan._id.substring(0, 12).toUpperCase()}</p>
      </div>

      {/* Status Tracking */}
      {pesanan.status_pesanan !== 'Batal' && (
        <div className="bg-white border border-neutral-300 rounded-lg p-6 mb-8">
          <h2 className="font-display text-xl font-semibold mb-6">Status Pesanan</h2>
          <div className="flex justify-between items-center relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-neutral-200 -z-10">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ 
                  width: `${(statusSteps.filter(s => s.completed).length - 1) / (statusSteps.length - 1) * 100}%` 
                }}
              />
            </div>
            
            {statusSteps.map((step, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-2 ${
                  step.completed ? 'bg-primary' : 'bg-neutral-300'
                }`}>
                  {step.completed ? '✓' : index + 1}
                </div>
                <p className={`text-sm text-center font-medium ${
                  step.active ? 'text-primary' : step.completed ? 'text-neutral-700' : 'text-neutral-400'
                }`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Cancelled */}
      {pesanan.status_pesanan === 'Batal' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <p className="text-red-800 font-semibold text-center">❌ Pesanan Dibatalkan</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-neutral-300 rounded-lg p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Produk yang Dipesan</h2>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b border-neutral-200 last:border-0">
                  <div className="w-20 h-20 bg-neutral-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.foto_url ? (
                      <img src={item.foto_url} alt={item.nama} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-neutral-400 text-xs">No Image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.nama || 'Produk'}</h3>
                    <p className="text-sm text-neutral-600">{item.satuan || 'per buah'}</p>
                    <p className="text-sm text-neutral-600">
                      {item.qty} x Rp {item.harga_satuan.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      Rp {(item.harga_satuan * item.qty).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white border border-neutral-300 rounded-lg p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Alamat Pengiriman</h2>
            <div className="space-y-2">
              <p className="font-semibold">{pesanan.alamat_pengiriman.nama_penerima}</p>
              <p className="text-neutral-600">{pesanan.alamat_pengiriman.telepon_penerima}</p>
              <p className="text-neutral-600">{pesanan.alamat_pengiriman.jalan}</p>
              <p className="text-neutral-600">{pesanan.alamat_pengiriman.kota}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white border border-neutral-300 rounded-lg p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Informasi Pembayaran</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-600">Metode</span>
                <span className="font-semibold">{pesanan.pembayaran.metode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Status</span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  pesanan.pembayaran.status_pembayaran === 'Paid' 
                    ? 'bg-green-100 text-green-800'
                    : pesanan.pembayaran.status_pembayaran === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {pesanan.pembayaran.status_pembayaran}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div>
          <div className="bg-white border border-neutral-300 rounded-lg p-6 sticky top-24">
            <h2 className="font-display text-xl font-semibold mb-4">Ringkasan</h2>
            
            <div className="space-y-3 mb-4 pb-4 border-b border-neutral-300">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Ongkos Kirim</span>
                <span className="font-semibold">Rp {pesanan.pembayaran.ongkos_kirim.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex justify-between font-display text-xl font-semibold mb-6">
              <span>Total</span>
              <span className="text-secondary">Rp {pesanan.pembayaran.total_pembayaran.toLocaleString('id-ID')}</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Tanggal Pesan</span>
                <span className="font-semibold">
                  {new Date(pesanan.tanggal_pesan).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Estimasi Pengiriman</span>
                <span className="font-semibold">
                  {new Date(pesanan.tanggal_pengiriman_diminta).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {pesanan.pembayaran.status_pembayaran === 'Pending' && pesanan.status_pesanan === 'Menunggu Pembayaran' && (
              <div className="mt-6 space-y-4">
                {/* QR Code untuk pembayaran */}
                {pesanan.pembayaran.qris_url && (
                  <div className="border-2 border-dashed border-primary rounded-lg p-4 text-center bg-neutral-50">
                    <p className="text-sm font-semibold text-primary mb-2">Scan QRIS untuk Bayar</p>
                    <img 
                      src={pesanan.pembayaran.qris_url} 
                      alt="QRIS Payment" 
                      className="w-48 h-48 mx-auto mb-2"
                    />
                    <p className="text-xs text-neutral-600">Scan dengan aplikasi e-wallet</p>
                  </div>
                )}
                
                {/* Upload Bukti Pembayaran */}
                <div className="border border-neutral-300 rounded-lg p-4 bg-white">
                  <p className="font-semibold text-sm mb-2">Upload Bukti Pembayaran</p>
                  
                  {pesanan.pembayaran.bukti_pembayaran_url ? (
                    <div>
                      <img 
                        src={pesanan.pembayaran.bukti_pembayaran_url} 
                        alt="Bukti Pembayaran" 
                        className="w-full rounded border border-neutral-200 mb-2"
                      />
                      <p className="text-xs text-green-600 mb-2">✓ Bukti sudah diupload, menunggu konfirmasi admin</p>
                      <label className="block">
                        <span className="sr-only">Upload ulang bukti</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadBukti}
                          disabled={uploadingBukti}
                          className="block w-full text-sm text-neutral-600
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-neutral-100 file:text-neutral-700
                            hover:file:bg-neutral-200
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="block">
                        <span className="sr-only">Pilih file bukti pembayaran</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadBukti}
                          disabled={uploadingBukti}
                          className="block w-full text-sm text-neutral-600
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary file:text-white
                            hover:file:bg-primary/90
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </label>
                      <p className="text-xs text-neutral-500 mt-2">Format: JPG, PNG (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pesanan.status_pesanan === 'Dikirim' && (
              <button 
                onClick={handleConfirmReceived}
                className="btn-primary w-full mt-6"
              >
                ✅ Konfirmasi Diterima
              </button>
            )}

            {pesanan.status_pesanan === 'Selesai' && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded text-center">
                <p className="text-green-800 font-semibold">✓ Pesanan Selesai</p>
                <p className="text-sm text-green-600 mt-1">Terima kasih atas pesanannya!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
