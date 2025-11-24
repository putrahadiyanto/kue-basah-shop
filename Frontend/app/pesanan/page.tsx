'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { pesananAPI } from '@/lib/api'
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
  pembayaran: {
    metode: string
    status_pembayaran: string
    ongkos_kirim: number
    total_pembayaran: number
  }
}

export default function PesananPage() {
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  
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
    if (isAuthenticated() && !isAdmin()) {
      fetchOrders()
    }
  }, [isAuthenticated, isAdmin])

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
      setLoading(false)
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p>Memuat pesanan...</p>
      </div>
    )
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status_pesanan === filter)

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="mb-8">Pesanan Saya</h1>

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

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border border-neutral-300 rounded">
          <p className="text-neutral-600 mb-6 text-lg">
            {filter === 'all' ? 'Belum ada pesanan' : `Tidak ada pesanan dengan status "${filter}"`}
          </p>
          <Link href="/produk" className="btn-primary inline-block">
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="border border-neutral-300 rounded-lg p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-neutral-600">Order ID</p>
                  <p className="font-bold text-lg">#{order._id.substring(0, 12).toUpperCase()}</p>
                  <p className="text-sm text-neutral-600 mt-1">
                    Dipesan: {new Date(order.tanggal_pesan).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status_pesanan)}`}>
                    {order.status_pesanan}
                  </span>
                  <p className="text-sm text-neutral-600 mt-2">Pembayaran:</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.pembayaran.status_pembayaran)}`}>
                    {order.pembayaran.status_pembayaran}
                  </span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-600">Total Item</p>
                    <p className="font-semibold">{order.item_pesanan.length} produk</p>
                  </div>
                  <div>
                    <p className="text-neutral-600">Total Pembayaran</p>
                    <p className="font-semibold text-primary">Rp {order.pembayaran.total_pembayaran.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-neutral-600">Metode Pembayaran</p>
                    <p className="font-semibold">{order.pembayaran.metode}</p>
                  </div>
                  <div>
                    <p className="text-neutral-600">Estimasi Pengiriman</p>
                    <p className="font-semibold">
                      {new Date(order.tanggal_pengiriman_diminta).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link 
                  href={`/pesanan/${order._id}`}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Lihat Detail
                </Link>
                
                {order.status_pesanan === 'Menunggu Pembayaran' && (
                  <button className="btn-secondary text-sm px-4 py-2">
                    Bayar Sekarang
                  </button>
                )}
                
                {order.status_pesanan === 'Dikirim' && (
                  <button className="border border-primary text-primary px-4 py-2 rounded text-sm font-medium hover:bg-primary hover:text-white transition">
                    Lacak Paket
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
