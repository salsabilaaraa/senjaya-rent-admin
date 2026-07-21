# Portal Admin - Senjaya Rent

Proyek ini adalah sistem pengelolaan armada terpisah untuk **Senjaya Rent**, yang dirancang khusus untuk administrator mengelola katalog mobil secara aman dan instan tanpa mencampuradukkan kode admin di sisi pengguna.

## 🔐 Panduan Keamanan & Anti-Hacker

Pemisahan ini adalah langkah awal yang sangat krusial untuk melindungi data dan reputasi bisnis Anda dari serangan siber (hacker). Berikut adalah panduan keamanan wajib untuk menjaga database tetap aman:

### 1. Keamanan dari Kode Client (Selesai!)
Dengan memindahkan portal admin ke proyek terpisah ini, file bundle JavaScript di website utama pelanggan **bersih 100%** dari logika admin, formulir CRUD, password default (`admin123`), dan endpoint pengelolaan database. Hacker tidak akan bisa menemukan celah admin pada website publik.

### 2. Konfigurasi Row-Level Security (RLS) di Supabase (Sangat Penting!)
Untuk mencegah hacker melakukan modifikasi data langsung ke API Supabase, Anda wajib mengaktifkan **Row-Level Security (RLS)** pada tabel `cars` di dashboard Supabase Anda.

Langkah-langkah setup RLS di Supabase Dashboard:
1. Buka dashboard Supabase Anda -> **Database** -> **RLS Policies**.
2. Pilih tabel `cars` dan aktifkan **Enable RLS**.
3. Buat kebijakan baru (**New Policy**):
   - **Kebijakan 1: Membaca Data (SELECT)**
     - Berikan izin `SELECT` untuk semua pengguna (`public` atau `anon`).
     - Ini memungkinkan website utama pelanggan menampilkan daftar mobil secara otomatis.
   - **Kebijakan 2: Modifikasi Data (INSERT, UPDATE, DELETE)**
     - **PENTING:** Jangan pernah memberikan izin ini ke peran `anon` atau `public`.
     - Batasi izin modifikasi hanya untuk pengguna terautentikasi (`authenticated` role) via Supabase Auth, ATAU jika Anda masih menggunakan PIN lokal sederhana, buat filter kebijakan RLS yang sangat ketat menggunakan service role.

### 3. Rekomendasi Peningkatan: Migrasi ke Supabase Auth
Saat ini portal menggunakan validasi PIN lokal (`admin123`). Untuk perlindungan tingkat tinggi di masa depan:
- Daftarkan akun email administrator di menu **Authentication** di Supabase.
- Ganti logika form login di `App.jsx` menggunakan API resmi Supabase:
  ```javascript
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@senjayarent.com',
    password: password
  });
  ```
- Dengan cara ini, Supabase akan menolak semua permintaan tulis (Write) kecuali jika dikirimkan oleh token JWT admin yang valid dan terdaftar.

---

## 🛠️ Cara Menjalankan Proyek

1. **Instal Dependensi:**
   ```bash
   npm install
   ```

2. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```

3. **Build untuk Produksi:**
   ```bash
   npm run build
   ```
