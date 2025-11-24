'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { pesananAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

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
    bukti_pembayaran_url?: string
    qris_url?: string
  }
}

export default function AdminPesananPage() {
  const { isAdmin, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push('/login')
    } else if (!loading && !isAdmin()) {
      router.push('/')
    }
  }, [loading, isAuthenticated, isAdmin, router])

  useEffect(() => {
    if (isAdmin() && isAuthenticated()) {
      fetchOrders()
    }
  }, [isAdmin, isAuthenticated])

  const fetchOrders = async () => {
    try {
      const data = await pesananAPI.getAll()
      setOrders(data.sort((a: Pesanan, b: Pesanan) => 
        new Date(b.tanggal_pesan).getTime() - new Date(a.tanggal_pesan).getTime()
      ))
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Gagal memuat pesanan')
    } finally {
      setLoadingData(false)
    }
  }

  const handleConfirmPayment = async (orderId: string) => {
    const loadingToast = toast.loading('Mengkonfirmasi pembayaran...')
    try {
      await pesananAPI.confirmPayment(orderId)
      toast.success('✅ Pembayaran dikonfirmasi!', { id: loadingToast })
      fetchOrders()
    } catch (error) {
      console.error('Failed to confirm payment:', error)
      toast.error('Gagal mengkonfirmasi pembayaran', { id: loadingToast })
    }
  }

  const handleShipOrder = async (orderId: string) => {
    const loadingToast = toast.loading('Memproses pengiriman...')
    try {
      await pesananAPI.shipOrder(orderId)
      toast.success('✅ Pesanan dikirim!', { id: loadingToast })
      fetchOrders()
    } catch (error) {
      console.error('Failed to ship order:', error)
      toast.error('Gagal memproses pengiriman', { id: loadingToast })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Menunggu Pembayaran':
        return 'bg-yellow-100 text-yellow-800'
      case 'Diproses':
        return 'bg-blue-100 text-blue-800'
      case 'Dikirim':
        return 'bg-purple-100 text-purple-800'
      case 'Selesai':
        return 'bg-green-100 text-green-800'
      case 'Batal':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Memuat pesanan...</p>
      </div>
    )
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status_pesanan === filter)

  const pendingPayment = orders.filter(o => o.pembayaran.bukti_pembayaran_url && o.pembayaran.status_pembayaran === 'Pending')

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Kelola Pesanan</h1>
          <p className="text-neutral-600 mt-1">Konfirmasi pembayaran dan kelola pengiriman</p>
        </div>
        <Link href="/admin" className="btn-secondary">
          ← Kembali ke Dashboard
        </Link>
      </div>

      {/* Pending Payment Alert */}
      {pendingPayment.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-yellow-800">
            ⚠️ {pendingPayment.length} pesanan menunggu konfirmasi pembayaran
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'Semua' },
          { value: 'Menunggu Pembayaran', label: 'Menunggu Pembayaran' },
          { value: 'Diproses', label: 'Diproses' },
          { value: 'Dikirim', label: 'Dikirim' },
          { value: 'Selesai', label: 'Selesai' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`px-4 py-2 rounded font-medium whitespace-nowrap transition ${
              filter === item.value
                ? 'bg-primary text-white'
                : 'border border-neutral-300 text-neutral-700 hover:border-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border border-neutral-300 rounded">
          <p className="text-neutral-600">Tidak ada pesanan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="border border-neutral-300 rounded-lg p-6 bg-white hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-neutral-600">Order ID</p>
                  <p className="font-bold text-lg">#{order._id.substring(0, 12).toUpperCase()}</p>
                  <p className="text-sm text-neutral-600 mt-1">
                    {new Date(order.tanggal_pesan).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status_pesanan)}`}>
                  {order.status_pesanan}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-neutral-50 rounded">
                <div>
                  <p className="text-xs text-neutral-600">Penerima</p>
                  <p className="font-semibold">{order.alamat_pengiriman.nama_penerima}</p>
                  <p className="text-sm text-neutral-600">{order.alamat_pengiriman.telepon_penerima}</p>
                  <p className="text-sm text-neutral-600">{order.alamat_pengiriman.jalan}, {order.alamat_pengiriman.kota}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Pembayaran</p>
                  <p className="font-semibold">{order.pembayaran.metode}</p>
                  <p className="text-sm">Total: <span className="font-bold text-primary">Rp {order.pembayaran.total_pembayaran.toLocaleString('id-ID')}</span></p>
                  <p className="text-sm">Status: <span className={`font-semibold ${
                    order.pembayaran.status_pembayaran === 'Paid' ? 'text-green-600' : 'text-yellow-600'
                  }`}>{order.pembayaran.status_pembayaran}</span></p>
                </div>
              </div>

              {/* Bukti Pembayaran */}
              {order.pembayaran.bukti_pembayaran_url && (
                <div className="mb-4 p-4 border border-neutral-200 rounded bg-blue-50">
                  <p className="font-semibold text-sm mb-2">📷 Bukti Pembayaran:</p>
                  <img 
                    src={order.pembayaran.bukti_pembayaran_url} 
                    alt="Bukti Pembayaran" 
                    className="max-w-xs rounded border border-neutral-300 cursor-pointer hover:opacity-90"
                    onClick={() => window.open(order.pembayaran.bukti_pembayaran_url, '_blank')}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {order.pembayaran.status_pembayaran === 'Pending' && order.pembayaran.bukti_pembayaran_url && (
                  <button
                    onClick={() => handleConfirmPayment(order._id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition"
                  >
                    ✓ Konfirmasi Pembayaran
                  </button>
                )}
                
                {order.status_pesanan === 'Diproses' && order.pembayaran.status_pembayaran === 'Paid' && (
                  <button
                    onClick={() => handleShipOrder(order._id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition"
                  >
                    📦 Kirim Pesanan
                  </button>
                )}

                <Link 
                  href={`/admin/pesanan/${order._id}`}
                  className="border border-primary text-primary px-4 py-2 rounded font-medium hover:bg-primary hover:text-white transition"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
