'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { jajananAPI, pesananAPI } from '@/lib/api'
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
  total_orders?: number
  total_quantity?: number
}

interface Pesanan {
  _id: string
  pelanggan_id: string
  tanggal_pesan: string
  status_pesanan: string
  item_pesanan: Array<{
    jajanan_id: string
    qty: number
    harga_satuan: number
  }>
  pembayaran: {
    total_pembayaran: number
  }
}

export default function AdminDashboard() {
  const { isAdmin, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Jajanan[]>([])
  const [topProducts, setTopProducts] = useState<Jajanan[]>([])
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Jajanan | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [formData, setFormData] = useState({
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
    if (isAdmin()) {
      fetchData()
    }
  }, [isAdmin])

  const fetchData = async () => {
    try {
      const [productsData, ordersData, topProductsData] = await Promise.all([
        jajananAPI.getAll(),
        pesananAPI.getAll(),
        jajananAPI.getTopSelling(5),
      ])
      setProducts(productsData)
      setOrders(ordersData)
      setTopProducts(topProductsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoadingData(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nama: '',
      deskripsi: '',
      harga: 0,
      satuan: 'per buah',
      status_ketersediaan: 'ready_stok',
      waktu_preorder_hari: 0,
      foto_url: '',
    })
  }

  const handleAddProduct = async () => {
    if (!formData.nama.trim()) {
      toast.error('Nama produk harus diisi')
      return
    }
    if (!formData.deskripsi.trim()) {
      toast.error('Deskripsi harus diisi')
      return
    }
    if (formData.harga <= 0) {
      toast.error('Harga harus lebih dari 0')
      return
    }

    const loadingToast = toast.loading('Menambahkan produk...')
    
    try {
      await jajananAPI.create(formData)
      setShowAddModal(false)
      resetForm()
      fetchData()
      toast.success('✅ Produk berhasil ditambahkan!', { id: loadingToast })
    } catch (error) {
      console.error('Failed to add product:', error)
      toast.error('Gagal menambahkan produk', { id: loadingToast })
    }
  }

  const handleEditProduct = async () => {
    if (!selectedProduct) return

    const loadingToast = toast.loading('Mengupdate produk...')
    
    try {
      await jajananAPI.update(selectedProduct._id, formData)
      setShowEditModal(false)
      setSelectedProduct(null)
      resetForm()
      fetchData()
      toast.success('✅ Produk berhasil diupdate!', { id: loadingToast })
    } catch (error) {
      console.error('Failed to update product:', error)
      toast.error('Gagal mengupdate produk', { id: loadingToast })
    }
  }

  const handleDeleteProduct = async (id: string, nama: string) => {
    if (!confirm(`Hapus produk "${nama}"?`)) return
    
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

  const handleUploadPhoto = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    
    const file = e.target.files[0]
    
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    setUploadingPhoto(true)
    const loadingToast = toast.loading('Mengupload foto...')
    
    try {
      await jajananAPI.uploadFoto(productId, file)
      toast.success('✅ Foto berhasil diupload!', { id: loadingToast })
      fetchData()
    } catch (error) {
      console.error('Failed to upload photo:', error)
      toast.error('Gagal mengupload foto', { id: loadingToast })
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const openEditModal = (product: Jajanan) => {
    setSelectedProduct(product)
    setFormData({
      nama: product.nama,
      deskripsi: product.deskripsi,
      harga: product.harga,
      satuan: product.satuan,
      status_ketersediaan: product.status_ketersediaan,
      waktu_preorder_hari: product.waktu_preorder_hari,
      foto_url: product.foto_url || '',
    })
    setShowEditModal(true)
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
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
          <p className="text-neutral-600 mt-1">Kelola produk dan monitor penjualan</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/admin/pesanan" className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-800 transition font-medium">
            📦 Kelola Pesanan
          </Link>
          <button 
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition font-medium"
          >
            + Tambah Produk
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-6">
          <p className="text-neutral-600 text-sm font-medium mb-1">Total Pesanan</p>
          <p className="text-3xl font-bold text-primary">{stats.totalOrders}</p>
          <p className="text-xs text-neutral-500 mt-2">{stats.pendingOrders} pending</p>
        </div>
        
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-6">
          <p className="text-neutral-600 text-sm font-medium mb-1">Total Pendapatan</p>
          <p className="text-3xl font-bold text-secondary">Rp {(stats.totalRevenue / 1000).toFixed(0)}k</p>
          <p className="text-xs text-neutral-500 mt-2">Dari {stats.totalOrders} transaksi</p>
        </div>
        
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-6">
          <p className="text-neutral-600 text-sm font-medium mb-1">Total Produk</p>
          <p className="text-3xl font-bold text-primary">{stats.totalProducts}</p>
          <p className="text-xs text-neutral-500 mt-2">{products.filter(p => p.status_ketersediaan === 'ready_stok').length} ready stock</p>
        </div>
        
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-6">
          <p className="text-neutral-600 text-sm font-medium mb-1">Pelanggan Aktif</p>
          <p className="text-3xl font-bold text-primary">{new Set(orders.map(o => o.pelanggan_id)).size}</p>
          <p className="text-xs text-neutral-500 mt-2">Total pelanggan</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white border-2 border-neutral-300 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-primary mb-4">🏆 Produk Terlaris</h2>
        <div className="space-y-3">
          {topProducts.length > 0 ? (
            topProducts.map((product, index) => (
              <div key={product._id} className="flex items-center gap-4 p-3 border border-neutral-200 rounded hover:bg-neutral-50 transition">
                <span className="text-2xl font-bold text-neutral-400">#{index + 1}</span>
                <div className="w-12 h-12 bg-neutral-200 rounded flex-shrink-0 overflow-hidden">
                  {product.foto_url ? (
                    <img src={product.foto_url} alt={product.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">📦</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">{product.nama}</p>
                  <p className="text-sm text-neutral-600">Rp {product.harga.toLocaleString('id-ID')} • {product.satuan}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">Terjual: {product.total_quantity || 0}</p>
                  <p className="text-sm text-neutral-600">Rp {((product.total_quantity || 0) * product.harga).toLocaleString('id-ID')}</p>
                  <p className="text-xs text-neutral-500 mt-1">{product.total_orders || 0} pesanan</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <p>Belum ada data penjualan</p>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border-2 border-neutral-300 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-neutral-300">
          <h2 className="text-xl font-bold text-primary">Semua Produk ({products.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Harga</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Foto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-neutral-900">{product.nama}</p>
                    <p className="text-sm text-neutral-600">{product.satuan}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-700 line-clamp-2">{product.deskripsi}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-primary">Rp {product.harga.toLocaleString('id-ID')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.status_ketersediaan === 'ready_stok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status_ketersediaan === 'ready_stok' ? 'Ready Stock' : 'Pre-order'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {product.foto_url ? (
                        <img src={product.foto_url} alt={product.nama} className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-200 rounded flex items-center justify-center text-neutral-400">
                          No Image
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadPhoto(product._id, e)}
                          disabled={uploadingPhoto}
                          className="hidden"
                        />
                        <span className="text-xs text-primary hover:underline">
                          {uploadingPhoto ? 'Uploading...' : 'Upload'}
                        </span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-primary hover:text-primary/80 font-medium text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id, product.nama)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-bold text-primary">Tambah Produk Baru</h2>
              <p className="text-neutral-600 text-sm mt-1">Lengkapi semua informasi produk</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  placeholder="Contoh: Kue Lapis Legit"
                  className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Deskripsi *</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  placeholder="Jelaskan detail produk..."
                  rows={4}
                  className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Harga (Rp) *</label>
                  <input
                    type="number"
                    value={formData.harga || ''}
                    onChange={(e) => setFormData({...formData, harga: parseInt(e.target.value) || 0})}
                    placeholder="25000"
                    className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Satuan *</label>
                  <select
                    value={formData.satuan}
                    onChange={(e) => setFormData({...formData, satuan: e.target.value})}
                    className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="per buah">per buah</option>
                    <option value="per box">per box</option>
                    <option value="per loyang">per loyang</option>
                    <option value="per kg">per kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Status Ketersediaan *</label>
                  <select
                    value={formData.status_ketersediaan}
                    onChange={(e) => setFormData({...formData, status_ketersediaan: e.target.value})}
                    className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="ready_stok">Ready Stock</option>
                    <option value="pre_order">Pre-order</option>
                  </select>
                </div>

                {formData.status_ketersediaan === 'pre_order' && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Waktu Pre-order (hari)</label>
                    <input
                      type="number"
                      value={formData.waktu_preorder_hari}
                      onChange={(e) => setFormData({...formData, waktu_preorder_hari: parseInt(e.target.value) || 0})}
                      placeholder="3"
                      className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition font-medium"
              >
                Tambah Produk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-bold text-primary">Edit Produk</h2>
              <p className="text-neutral-600 text-sm mt-1">Update informasi produk</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Deskripsi *</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  rows={4}
                  className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Harga (Rp) *</label>
                  <input
                    type="number"
                    value={formData.harga || ''}
                    onChange={(e) => setFormData({...formData, harga: parseInt(e.target.value) || 0})}
                    className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Satuan *</label>
                  <select
                    value={formData.satuan}
                    onChange={(e) => setFormData({...formData, satuan: e.target.value})}
                    className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="per buah">per buah</option>
                    <option value="per box">per box</option>
                    <option value="per loyang">per loyang</option>
                    <option value="per kg">per kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Status Ketersediaan *</label>
                  <select
                    value={formData.status_ketersediaan}
                    onChange={(e) => setFormData({...formData, status_ketersediaan: e.target.value})}
                    className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="ready_stok">Ready Stock</option>
                    <option value="pre_order">Pre-order</option>
                  </select>
                </div>

                {formData.status_ketersediaan === 'pre_order' && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Waktu Pre-order (hari)</label>
                    <input
                      type="number"
                      value={formData.waktu_preorder_hari}
                      onChange={(e) => setFormData({...formData, waktu_preorder_hari: parseInt(e.target.value) || 0})}
                      className="w-full border border-neutral-300 rounded px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedProduct(null)
                  resetForm()
                }}
                className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleEditProduct}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition font-medium"
              >
                Update Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
