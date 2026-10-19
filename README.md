# 🛒 Smart Grocery & Budget Safety Tracker (PWA)

Aplikasi web mobile **Progressive Web App (PWA)** bergaya *native app* yang dirancang khusus untuk **siswa rantau** yang sedang belanja bulanan sambil mendorong troli supermarket dengan satu tangan.

---

## 📱 Standar Arsitektur & Ergonomi Mobile

- **Format Layar Smartphone:** Lebar maksimal **430px** (terpusat/centered di desktop dengan mockup bezel & status notch, full-screen alami 100vw di layar smartphone).
- **Floating Bottom Navigation Bar:** Navigasi melayang di bagian bawah dengan ikon Lucide untuk berpindah antar 3 tab utama:
  - 🛒 **Belanja** (Keranjang aktif, stepper +/- kuantitas, floating action button)
  - 📜 **Riwayat** (Arsip belanja sesi lalu & struk digital untuk WhatsApp)
  - 📊 **Anggaran** (Analitik pengeluaran per kategori & batas dompet)
- **Ergonomi Ramah Jempol (Thumb-Friendly):**
  - Komponen input angka besar.
  - Stepper kuantitas jumbo (`+` / `-`) mudah dijangkau saat mendorong troli.
  - Bebas dari tabel desktop yang melebar ke samping; menggunakan susunan kartu produk (*mobile cards*) yang adaptif.
- **Dukungan PWA Standalone:**
  - Viewport meta tags `viewport-fit=cover`, `mobile-web-app-capable`.
  - File manifest `manifest.webmanifest` & ikon resolusi tinggi.
  - `sw.js` (Service Worker) dengan strategi *Cache-First* agar aplikasi tetap berjalan 100% lancar di lorong supermarket atau basement tanpa sinyal internet.

---

## 📋 Pemenuhan Spesifikasi & Kebutuhan Fungsional (SRS)

| Kode | Kebutuhan Fungsional | Status | Penjelasan Implementasi |
| :--- | :--- | :---: | :--- |
| **[F-01]** | **Pencatatan Item Belanja Lengkap** | ✅ Terpenuhi | Menyimpan nama produk, kategori barang (Makanan Pokok, Bumbu, Mandi, Kebersihan, Snack), satuan (`kg`, `liter`, `pcs`, `pack`, `botol`), kuantitas beli, dan harga satuan per item. |
| **[F-02]** | **Perhitungan Kuantitas Otomatis** | ✅ Terpenuhi | Setiap perubahan angka Qty via stepper maupun ketik langsung mengalikan harga satuan secara realtime ke total baris item tanpa tombol kalkulator manual. |
| **[F-03]** | **Kalkulator Diskon Bertingkat** | ✅ Terpenuhi | Menangani input diskon tunggal (contoh: `25%`) maupun diskon bertumpuk (contoh: `50% + 20%` atau format `50+20`) dengan rumus matematis yang tepat: $\text{Harga Akhir} = \text{Harga Awal} \times (1 - d_1) \times (1 - d_2)$ (bukan potongan 70%). |
| **[F-04]** | **Komparator Harga Realtime vs Bulan Lalu** | ✅ Terpenuhi | Menampilkan indikator visual seketika saat harga diinput:<br>• **Panah Merah Naik ($\uparrow$)**: Jika harga naik dibanding bulan lalu.<br>• **Panah Hijau Turun ($\downarrow$)**: Jika harga promo/turun.<br>• **Tanda Setara ($=$)**: Jika harga stabil/tetap. |
| **[F-05]** | **Pengendali Anggaran (Safety Cap)** | ✅ Terpenuhi | Input batas dompet dengan visual gauge dinamis:<br>• **Hijau (Aman)**: `< 75%`<br>• **Kuning (Siaga)**: `75% - 90%`<br>• **Merah Berdenyut (Over Budget)**: `≥ 100%` dengan alarm visual. |
| **[F-06]** | **Riwayat & Database Belanja** | ✅ Terpenuhi | Tersimpan rapi di penyimpanan data lokal (`localStorage`). Tombol "Selesaikan Belanja" mengarsipkan sesi belanja dan secara otomatis memperbarui katalog referensi harga bulan lalu untuk belanja berikutnya. Fitur salin struk WhatsApp juga tersedia. |

---

## 🧮 Rumus Matematis Diskon Bertumpuk [F-03]

Supermarket sering memasang label diskon bertumpuk seperti **50% + 20%**. Aplikasi menghitung potongan harga sesungguhnya:

$$\text{Harga Akhir} = \text{Harga Awal} \times \prod_{i=1}^{n} (1 - \frac{d_i}{100})$$

**Contoh Kasus:**
- Harga Awal: Rp 100.000
- Diskon 1 (50%): $\text{Rp } 100.000 \times (1 - 0.50) = \text{Rp } 50.000$
- Diskon 2 (20%): $\text{Rp } 50.000 \times (1 - 0.20) = \text{Rp } 40.000$
- **Total Penghematan:** Rp 60.000 (diskon efektif **60%**, bukan 70%).

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi dibangun menggunakan teknologi web standar tanpa dependensi eksternal, sehingga sangat ringan dan cepat.

### 1. Jalankan Server Lokal
Buka terminal pada direktori proyek dan jalankan:
```bash
node dev-server.js
```
Aplikasi akan aktif di:
```
http://localhost:3000
```

### 2. Mengakses & Memasang di Smartphone (PWA)
1. Sambungkan smartphone ke jaringan Wi-Fi yang sama dengan komputer.
2. Buka browser smartphone (Chrome di Android atau Safari di iOS) dan akses IP komputer Anda, misalnya: `http://192.168.1.xxx:3000`.
3. Tekan menu browser lalu pilih **"Add to Home Screen"** / **"Tambahkan ke Layar Utama"**.
4. Aplikasi akan terpasang sebagai aplikasi mandiri (*standalone*) tanpa bilah URL browser.

---

## 📂 Struktur Berkas
```
Smart-Grocery/
├── index.html            # Antarmuka Mobile UI, PWA shell, dan modal dialog
├── manifest.webmanifest  # Metadata PWA (Add to Home screen)
├── sw.js                 # Service worker untuk mode offline di lorong supermarket
├── dev-server.js         # Server HTTP static zero-dependency berbasis Node.js
├── css/
│   └── style.css         # Desain sistem mobile, kartu ergonomis, dan animasi
├── js/
│   ├── icons.js          # Pustaka ikon Lucide SVG offline
│   ├── calculator.js     # Engine perhitungan diskon bertingkat & fluktuasi
│   ├── storage.js        # Manajemen database lokal & hooks sinkronisasi
│   ├── firebase.js       # Integrasi Firebase Cloud Firestore (1 Akun Bersama)
│   ├── ui.js             # Render DOM komponen keranjang, badge, dan modal
│   └── app.js            # Controller utama, event tab, dan PWA installer
└── icons/
    ├── icon-192.svg      # Ikon aplikasi ukuran 192px
    └── icon-512.svg      # Ikon aplikasi ukuran 512px
```

---

## 🔥 Integrasi Firebase Cloud Firestore (1 User Shared)

Aplikasi telah terhubung ke Firebase Cloud Firestore dengan model **1 User Bersama (Shared Workspace)**:
- **Project ID:** `smart-grocery-d5a97`
- **Koleksi & Dokumen:** `smart_grocery/shared_workspace`
- **Konsep:** Siapapun yang membuka aplikasi di perangkat mana pun (laptop, HP 1, HP 2) akan langsung berbagi keranjang belanja, batas anggaran, dan riwayat yang sama secara **real-time** tanpa memerlukan formulir login.
- **Penyelarasan Cerdas (Debounce & Anti-Loop):** Perubahan lokal disimpan seketika di peramban, lalu disinkronkan ke Cloud Firestore tanpa memicu lag atau pergeseran kursor.
- **Indikator Status:** Terdapat tombol/indikator status di *header* aplikasi yang menampilkan status koneksi Firebase secara langsung (`1 User Synced`, `Menyimpan...`, atau `Mode Offline`).