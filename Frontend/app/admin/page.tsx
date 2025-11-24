'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { jajananAPI, pesananAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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

export default function AdminDashboard() {
  const { isAdmin, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Jajanan[]>([])
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    nama: '',
    deskripsi: '',
    harga: 0,
    satuan: 'per buah',
    status_ketersediaan: 'ready_stok',
    waktu_preorder_hari: 0,
    foto_url: '',
  })

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push('/login')
    } else if (!loading && !isAdmin()) {
      router.push('/')
    }
  }, [loading, isAuthenticated, isAdmin, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsData, ordersData] = await Promise.all([
        jajananAPI.getAll(),
        pesananAPI.getAll(),
      ])
      setProducts(productsData)
      setOrders(ordersData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoadingData(false)
    }
  }

  const handleAddProduct = async () => {
    // Validation
    if (!newProduct.nama.trim()) {
      toast.error('Nama produk harus diisi')
      return
    }
    if (!newProduct.deskripsi.trim()) {
      toast.error('Deskripsi produk harus diisi')
      return
    }
    if (newProduct.harga <= 0) {
      toast.error('Harga harus lebih dari 0')
      return
    }
    if (newProduct.status_ketersediaan === 'pre_order' && newProduct.waktu_preorder_hari <= 0) {
      toast.error('Waktu pre-order harus lebih dari 0 hari')
      return
    }

    const loadingToast = toast.loading('Menambahkan produk...')
    
    try {
      await jajananAPI.create(newProduct)
      setIsAddDialogOpen(false)
      setNewProduct({
        nama: '',
        deskripsi: '',
        harga: 0,
        satuan: 'per buah',
        status_ketersediaan: 'ready_stok',
        waktu_preorder_hari: 0,
        foto_url: '',
      })
      fetchData()
      toast.success(' Produk berhasil ditambahkan!', { id: loadingToast })
    } catch (error) {
      console.error('Failed to add product:', error)
      toast.error('Gagal menambahkan produk', { id: loadingToast })
    }
  }

  const handleDeleteProduct = async (id: string, nama: string) => {
    const confirmDelete = confirm(`Hapus produk "${nama}"?`)
    if (!confirmDelete) return
    
    const loadingToast = toast.loading('Menghapus produk...')
    
    try {
      await jajananAPI.delete(id)
      fetchData()
      toast.success('Produk berhasil dihapus', { id: loadingToast })
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast.error('Gagal menghapus produk', { id: loadingToast })
    }
  }

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Memuat dashboard...</div>
        </div>
      </div>
    )
  }

  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + order.pembayaran.total_pembayaran, 0),
    totalProducts: products.length,
    pendingOrders: orders.filter(o => o.status_pesanan === 'Menunggu Pembayaran').length,
    completedOrders: orders.filter(o => o.status_pesanan === 'Selesai').length,
    processingOrders: orders.filter(o => o.status_pesanan === 'Diproses').length,
    totalCustomers: new Set(orders.map(o => o.pelanggan_id)).size,
    readyStock: products.filter(p => p.status_ketersediaan === 'ready_stok').length,
    preOrder: products.filter(p => p.status_ketersediaan === 'pre_order').length,
  }

  // Top selling products (based on orders)
  const productSales = orders.flatMap(o => o.item_pesanan).reduce((acc, item) => {
    acc[item.jajanan_id] = (acc[item.jajanan_id] || 0) + item.qty
    return acc
  }, {} as Record<string, number>)

  const topProducts = products
    .map(p => ({ ...p, sold: productSales[p._id] || 0 }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-neutral-600 mt-1">Kelola produk dan monitor penjualan</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-neutral-50 shadow-md">+ Tambah Produk</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-50 border-2 border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">Tambah Produk Jajanan Baru</DialogTitle>
              <DialogDescription className="text-neutral-600">
                Lengkapi semua informasi produk dengan detail. Semua field wajib diisi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nama" className="text-base font-semibold text-primary">Nama Produk *</Label>
                  <Input
                    id="nama"
                    placeholder="Contoh: Kue Lapis Legit"
                    value={newProduct.nama}
                    onChange={(e) => setNewProduct({ ...newProduct, nama: e.target.value })}
                    className="mt-1 border-neutral-300 focus:border-primary text-neutral-900"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="deskripsi" className="text-base font-semibold text-primary">Deskripsi Lengkap *</Label>
                  <Textarea
                    id="deskripsi"
                    placeholder="Jelaskan detail produk, bahan, rasa, dan keunikan produk ini..."
                    value={newProduct.deskripsi}
                    onChange={(e) => setNewProduct({ ...newProduct, deskripsi: e.target.value })}
                    className="mt-1 min-h-[100px] border-neutral-300 focus:border-primary text-neutral-900"
                  />
                  <p className="text-xs text-neutral-600 mt-1">{newProduct.deskripsi.length} karakter</p>
                </div>

                <div>
                  <Label htmlFor="harga" className="text-base font-semibold text-primary">Harga (Rp) *</Label>
                  <Input
                    id="harga"
                    type="number"
                    placeholder="25000"
                    value={newProduct.harga || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, harga: parseInt(e.target.value) || 0 })}
                    className="mt-1 border-neutral-300 focus:border-primary text-neutral-900"
                  />
                </div>

                <div>
                  <Label htmlFor="satuan" className="text-base font-semibold text-primary">Satuan *</Label>
                  <select
                    id="satuan"
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 mt-1 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newProduct.satuan}
                    onChange={(e) => setNewProduct({ ...newProduct, satuan: e.target.value })}
                  >
                    <option value="per buah">Per Buah</option>
                    <option value="per loyang">Per Loyang</option>
                    <option value="per porsi">Per Porsi</option>
                    <option value="per box">Per Box</option>
                    <option value="per pack">Per Pack</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-base font-semibold text-primary">Status Ketersediaan *</Label>
                  <select
                    id="status"
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 mt-1 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newProduct.status_ketersediaan}
                    onChange={(e) => setNewProduct({ ...newProduct, status_ketersediaan: e.target.value })}
                  >
                    <option value="ready_stok">Ready Stok</option>
                    <option value="pre_order">Pre Order</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="waktu" className="text-base font-semibold text-primary">
                    Waktu Pre-order (hari) {newProduct.status_ketersediaan === 'pre_order' && '*'}
                  </Label>
                  <Input
                    id="waktu"
                    type="number"
                    placeholder="3"
                    value={newProduct.waktu_preorder_hari || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, waktu_preorder_hari: parseInt(e.target.value) || 0 })}
                    disabled={newProduct.status_ketersediaan === 'ready_stok'}
                    className="mt-1 border-neutral-300 focus:border-primary text-neutral-900"
                  />
                  {newProduct.status_ketersediaan === 'ready_stok' && (
                    <p className="text-xs text-neutral-600 mt-1">Tidak perlu untuk ready stok</p>
                  )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="foto" className="text-base font-semibold text-primary">URL Foto (opsional)</Label>
                  <Input
                    id="foto"
                    placeholder="https://example.com/image.jpg"
                    value={newProduct.foto_url}
                    onChange={(e) => setNewProduct({ ...newProduct, foto_url: e.target.value })}
                    className="mt-1 border-neutral-300 focus:border-primary text-neutral-900"
                  />
                </div>
              </div>

              {/* Preview */}
              {newProduct.nama && (
                <div className="border-t border-neutral-300 pt-4">
                  <p className="font-semibold mb-2 text-primary">Preview:</p>
                  <div className="bg-white rounded-lg p-4 border-2 border-neutral-200">
                    <h3 className="font-bold text-lg text-primary">{newProduct.nama}</h3>
                    {newProduct.deskripsi && <p className="text-sm text-neutral-600 mt-1">{newProduct.deskripsi}</p>}
                    <p className="text-primary font-bold text-xl mt-2">Rp {newProduct.harga.toLocaleString('id-ID')}</p>
                    <p className="text-sm text-neutral-600">{newProduct.satuan}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded text-xs ${
                      newProduct.status_ketersediaan === 'ready_stok' 
                        ? 'badge-ready' 
                        : 'badge-preorder'
                    }`}>
                      {newProduct.status_ketersediaan === 'ready_stok' ? 'Ready Stok' : `Pre-order ${newProduct.waktu_preorder_hari} hari`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={handleAddProduct} className="flex-1 bg-primary hover:bg-primary/90 text-neutral-50">
                   Tambahkan Produk
                </Button>
                <Button 
                  onClick={() => setIsAddDialogOpen(false)} 
                  variant="outline"
                  className="flex-1 border-primary text-primary hover:bg-primary hover:text-neutral-50"
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-neutral-50 rounded-lg p-6 shadow-lg border-2 border-primary/20">
          <p className="text-neutral-100 text-sm font-medium">Total Pesanan</p>
          <p className="text-4xl font-bold mt-2">{stats.totalOrders}</p>
          <p className="text-neutral-200 text-xs mt-2">
            {stats.pendingOrders} pending • {stats.processingOrders} diproses • {stats.completedOrders} selesai
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-success to-success/80 text-neutral-50 rounded-lg p-6 shadow-lg border-2 border-success/20">
          <p className="text-neutral-100 text-sm font-medium">Total Pendapatan</p>
          <p className="text-3xl font-bold mt-2">Rp {(stats.totalRevenue / 1000).toFixed(0)}K</p>
          <p className="text-neutral-200 text-xs mt-2">Dari {stats.totalOrders} transaksi</p>
        </div>
        
        <div className="bg-gradient-to-br from-secondary to-secondary/80 text-neutral-900 rounded-lg p-6 shadow-lg border-2 border-secondary/30">
          <p className="text-neutral-700 text-sm font-medium">Total Produk</p>
          <p className="text-4xl font-bold mt-2">{stats.totalProducts}</p>
          <p className="text-neutral-700 text-xs mt-2">
            {stats.readyStock} ready • {stats.preOrder} pre-order
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-warning to-warning/80 text-neutral-50 rounded-lg p-6 shadow-lg border-2 border-warning/20">
          <p className="text-neutral-100 text-sm font-medium">Total Pelanggan</p>
          <p className="text-4xl font-bold mt-2">{stats.totalCustomers}</p>
          <p className="text-neutral-200 text-xs mt-2">Pelanggan aktif</p>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products */}
        <div className="border border-neutral-300 rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🏆 Produk Terlaris
          </h2>
          <div className="space-y-3">
            {topProducts.map((p, idx) => (
              <div key={p._id} className="flex justify-between items-center pb-3 border-b border-neutral-200 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-neutral-300">#{idx + 1}</span>
                  <div>
                    <p className="font-semibold">{p.nama}</p>
                    <p className="text-sm text-neutral-600">Rp {p.harga.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{p.sold} terjual</p>
                  <p className="text-xs text-neutral-600">{p.status_ketersediaan === 'ready_stok' ? 'Ready' : 'Pre-order'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="border border-neutral-300 rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📦 Pesanan Terbaru
          </h2>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order._id} className="flex justify-between items-center pb-3 border-b border-neutral-200 last:border-0">
                <div>
                  <p className="font-semibold">#{order._id.substring(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-neutral-600">
                    {new Date(order.tanggal_pesan).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">Rp {order.pembayaran.total_pembayaran.toLocaleString('id-ID')}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    order.status_pesanan === 'Selesai' ? 'bg-green-100 text-green-800' :
                    order.status_pesanan === 'Diproses' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status_pesanan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-neutral-300 rounded-lg overflow-hidden bg-white shadow">
        <div className="bg-neutral-100 px-6 py-4 border-b border-neutral-300">
          <h2 className="text-xl font-semibold">Semua Produk ({products.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-300">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Deskripsi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Harga</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Terjual</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-neutral-200 hover:bg-neutral-50">
                  <td className="px-6 py-4 font-semibold">{product.nama}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate">{product.deskripsi}</td>
                  <td className="px-6 py-4 text-primary font-bold">Rp {product.harga.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      product.status_ketersediaan === 'ready_stok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status_ketersediaan === 'ready_stok' ? 'Ready Stok' : `Pre-order ${product.waktu_preorder_hari}h`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold">{productSales[product._id] || 0}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleDeleteProduct(product._id, product.nama)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
