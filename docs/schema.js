// --- setup_schema.js ---

// 1. Pilih database yang akan digunakan. Database akan dibuat jika belum ada.
use('jajanan_db');

// 2. Buat koleksi 'users' (pengguna) dengan validasi
db.createCollection("users", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["nama_lengkap", "email", "password_hash", "peran"],
         properties: {
            nama_lengkap: {
               bsonType: "string",
               description: "harus berupa string dan wajib diisi"
            },
            email: {
               bsonType: "string",
               description: "harus berupa string dan wajib diisi"
            },
            password_hash: {
               bsonType: "string",
               description: "harus berupa string dan wajib diisi"
            },
            peran: {
               enum: ["pelanggan", "admin"],
               description: "hanya boleh 'pelanggan' atau 'admin'"
            },
            alamat: {
               bsonType: "array"
            }
         }
      }
   }
});

// 3. Buat koleksi 'jajanan' (produk) dengan validasi
db.createCollection("jajanan", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["nama", "harga", "satuan", "status_ketersediaan", "waktu_preorder_hari"],
         properties: {
            nama: {
               bsonType: "string",
               description: "harus berupa string dan wajib diisi"
            },
            harga: {
               bsonType: "int",
               description: "harus berupa integer dan wajib diisi"
            },
            satuan: {
               bsonType: "string",
               description: "harus berupa string (cth: 'per loyang') dan wajib diisi"
            },
            status_ketersediaan: {
               enum: ["pre_order", "ready_stok"],
               description: "hanya boleh 'pre_order' atau 'ready_stok'"
            },
            waktu_preorder_hari: {
               bsonType: "int",
               description: "harus berupa integer (cth: 3 untuk H-3)"
            },
               foto_url: {
                  bsonType: "string",
                  description: "harus berupa string URL ke file gambar"
               }
         }
      }
   }
});

// 4a. Buat koleksi 'ulasan' (reviews) terpisah dari 'jajanan'
db.createCollection("ulasan", {
    validator: {
        $jsonSchema: {
        bsonType: "object",
        required: ["jajanan_id", "user_id", "rating", "komentar", "tanggal"],
         properties: {
            jajanan_id: { bsonType: "objectId", description: "referensi ke koleksi jajanan" },
            user_id: { bsonType: "objectId", description: "referensi ke koleksi users" },
            rating: { bsonType: "int", minimum: 1, maximum: 5 },
            komentar: { bsonType: "string" },
            tanggal: { bsonType: "date" },
            foto_url: { bsonType: "string", description: "opsional: URL foto yang dilampirkan pada ulasan" }
         }
        }
    }
});

// 4. Buat koleksi 'carts' (keranjang) dengan validasi
db.createCollection("carts", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["user_id", "items"],
         properties: {
            user_id: {
               bsonType: "objectId",
               description: "harus berupa ObjectId yang terhubung ke koleksi users"
            },
            items: {
               bsonType: "array",
               description: "harus berupa array berisi item keranjang"
            },
            last_updated: {
               bsonType: "date"
            }
         }
      }
   }
});

// 5. Buat koleksi 'pesanan' (order) dengan validasi
db.createCollection("pesanan", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["pelanggan_id", "tanggal_pesan", "tanggal_pengiriman_diminta", "status_pesanan", "item_pesanan", "alamat_pengiriman", "pembayaran"],
         properties: {
            pelanggan_id: {
               bsonType: "objectId",
               description: "ID pengguna yang membayar (pembeli)"
            },
            tanggal_pesan: {
               bsonType: "date"
            },
            tanggal_pengiriman_diminta: {
               bsonType: "date"
            },
            status_pesanan: {
               bsonType: "string",
               enum: [
                  "Menunggu Pembayaran",
                  "Diproses",
                  "Siap Dikirim",
                  "Selesai",
                  "Batal"
               ],
               description: "Hanya boleh berisi nilai dari daftar enum"
            },
            item_pesanan: {
               bsonType: "array"
            },
            alamat_pengiriman: {
               bsonType: "object",
               required: ["nama_penerima", "telepon_penerima", "jalan", "kota"],
               description: "Alamat penerima (tujuan pengiriman)",
               properties: {
                  nama_penerima: { bsonType: "string" },
                  telepon_penerima: { bsonType: "string" },
                  jalan: { bsonType: "string" },
                  kota: { bsonType: "string" }
               }
            },
            pembayaran: {
               bsonType: "object",
               required: ["metode", "status_pembayaran", "total_pembayaran"],
               description: "Berisi semua detail transaksi pembayaran",
               properties: {
                  metode: {
                     bsonType: "string",
                     description: "cth: 'Transfer Bank', 'E-Wallet'"
                  },
                  status_pembayaran: {
                     bsonType: "string",
                     enum: ["Pending", "Paid", "Failed", "Expired"],
                     description: "Status dari pembayaran"
                  },
                  ongkos_kirim: {
                     bsonType: "int"
                  },
                  total_pembayaran: {
                     bsonType: "int",
                     description: "Total harga + ongkos kirim"
                  }
               }
            }
         }
      }
   }
});

print(" Schema berhasil dibuat untuk 'jajanan_db' dengan 4 koleksi.");