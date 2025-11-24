// API Service untuk Frontend Next.js
// Letakkan file ini di: Frontend/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Helper function untuk handle response
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

// Helper function untuk get auth header
function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===== Authentication API =====

export const authAPI = {
  // Register new user
  register: async (data: {
    nama_lengkap: string;
    email: string;
    password: string;
    peran?: string;
    alamat?: Array<{ jalan: string; kota: string; kode_pos?: string }>;
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Login
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    // Save token to localStorage (only in browser)
    if (typeof window !== 'undefined' && data.access_token) {
      localStorage.setItem('token', data.access_token);
    }
    return data;
  },

  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  },
};

// ===== User API =====

export const userAPI = {
  // Get current user info
  getCurrentUser: async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/users/me`, { headers });
    return handleResponse(response);
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, { headers });
    return handleResponse(response);
  },
};

// ===== Jajanan (Products) API =====

export const jajananAPI = {
  // Get all products
  getAll: async (status_ketersediaan?: string) => {
    const url = status_ketersediaan 
      ? `${API_BASE_URL}/api/jajanan/?status_ketersediaan=${status_ketersediaan}`
      : `${API_BASE_URL}/api/jajanan/`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const response = await fetch(url, { headers });
    return handleResponse(response);
  },

  // Get top selling products
  getTopSelling: async (limit: number = 10) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE_URL}/api/jajanan/top-selling?limit=${limit}`, { headers });
    return handleResponse(response);
  },

  // Get product by ID
  getById: async (jajananId: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE_URL}/api/jajanan/${jajananId}`, { headers });
    return handleResponse(response);
  },

  // Create new product (admin only)
  create: async (data: {
    nama: string;
    harga: number;
    satuan: string;
    status_ketersediaan: string;
    waktu_preorder_hari: number;
    foto_url?: string;
  }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/jajanan/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update product (admin only)
  update: async (jajananId: string, data: Partial<{
    nama: string;
    harga: number;
    satuan: string;
    status_ketersediaan: string;
    waktu_preorder_hari: number;
    foto_url: string;
  }>) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/jajanan/${jajananId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete product (admin only)
  delete: async (jajananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/jajanan/${jajananId}`, {
      method: 'DELETE',
      headers,
    });
    if (response.status === 204) return { success: true };
    return handleResponse(response);
  },

  // Upload product photo (admin only)
  uploadFoto: async (jajananId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = { ...getAuthHeader() };
    const response = await fetch(`${API_BASE_URL}/api/jajanan/${jajananId}/upload-foto`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(response);
  },
};

// ===== Cart API =====

export const cartAPI = {
  // Get my cart
  getMyCart: async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/carts/me`, { headers });
    return handleResponse(response);
  },

  // Update cart
  updateCart: async (items: Array<{
    jajanan_id: string;
    qty: number;
    harga_satuan: number;
  }>) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/carts/me`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items }),
    });
    return handleResponse(response);
  },

  // Clear cart
  clearCart: async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/carts/me`, { method: 'DELETE', headers });
    if (response.status === 204) return { success: true };
    return handleResponse(response);
  },

  // Remove item from cart
  removeItem: async (jajananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/carts/me/items/${jajananId}`, { method: 'DELETE', headers });
    if (response.status === 204) return { success: true };
    return handleResponse(response);
  },
};

// ===== Pesanan (Orders) API =====

export const pesananAPI = {
  // Get all orders
  getAll: async (status_pesanan?: string) => {
    const url = status_pesanan 
      ? `${API_BASE_URL}/api/pesanan/?status_pesanan=${status_pesanan}`
      : `${API_BASE_URL}/api/pesanan/`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(url, { headers });
    return handleResponse(response);
  },

  // Get order by ID
  getById: async (pesananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}`, { headers });
    return handleResponse(response);
  },

  // Create new order
  create: async (data: {
    tanggal_pengiriman_diminta: string;
    item_pesanan: Array<{
      jajanan_id: string;
      qty: number;
      harga_satuan: number;
    }>;
    alamat_pengiriman: {
      nama_penerima: string;
      telepon_penerima: string;
      jalan: string;
      kota: string;
    };
    pembayaran: {
      metode: string;
      status_pembayaran: string;
      ongkos_kirim: number;
      total_pembayaran: number;
    };
  }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update order
  update: async (pesananId: string, data: {
    status_pesanan?: string;
    pembayaran?: {
      metode: string;
      status_pembayaran: string;
      ongkos_kirim: number;
      total_pembayaran: number;
    };
  }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Cancel order
  cancel: async (pesananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}`, { method: 'DELETE', headers });
    if (response.status === 204) return { success: true };
    return handleResponse(response);
  },

  // Confirm payment (admin only)
  confirmPayment: async (pesananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}/confirm-payment`, { method: 'POST', headers });
    return handleResponse(response);
  },

  // Ship order (admin only)
  shipOrder: async (pesananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}/ship`, { method: 'POST', headers });
    return handleResponse(response);
  },

  // Confirm received (customer)
  confirmReceived: async (pesananId: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}/confirm-received`, { method: 'POST', headers });
    return handleResponse(response);
  },

  // Upload bukti pembayaran (customer)
  uploadBukti: async (pesananId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = { ...getAuthHeader() };
    const response = await fetch(`${API_BASE_URL}/api/pesanan/${pesananId}/upload-bukti`, { method: 'POST', headers, body: formData });
    return handleResponse(response);
  },
};

// ===== Ulasan (Reviews) API =====

export const ulasanAPI = {
  // Get reviews for a product
  getByJajanan: async (jajananId: string) => {
    // append timestamp to avoid caching stale responses
    const ts = Date.now()
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    const response = await fetch(`${API_BASE_URL}/api/ulasan/jajanan/${jajananId}?_=${ts}`, {
      headers,
      // ensure browser doesn't serve a cached response
      cache: 'no-store',
      // always use CORS mode so cross-origin requests follow CORS rules
      mode: 'cors',
    });
    return handleResponse(response);
  },

  // Get review by ID
  getById: async (ulasanId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/ulasan/${ulasanId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  // Create review
  create: async (data: {
    jajanan_id: string;
    rating: number;
    komentar: string;
    foto_url?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/ulasan/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete review
  delete: async (ulasanId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/ulasan/${ulasanId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (response.status === 204) return { success: true };
    return handleResponse(response);
  },
};

// Export all APIs
export default {
  auth: authAPI,
  user: userAPI,
  jajanan: jajananAPI,
  cart: cartAPI,
  pesanan: pesananAPI,
  ulasan: ulasanAPI,
};
