# SDM APIP — Sistem Penilaian Kinerja 360° APIP

Aplikasi enterprise berskala produksi untuk manajemen *360-degree assessment* khusus Tim Audit Aparat Pengawasan Intern Pemerintah (APIP) di lingkungan Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan. Sistem ini menjembatani pemantauan performa internal secara objektif melalui kuesioner digital berstandar "BerAKHLAK".

---

## 🏗️ Architecture Design (Production-Ready)

Sistem ini didesain sebagai arsitektur *decoupled* yang dideploy secara *containerized* melalui Docker Compose. Di lingkungan produksi, Nginx bertindak sebagai gerbang utama (*Reverse Proxy*) yang secara otomatis memproteksi traffic menggunakan SSL/TLS dari Let's Encrypt.

```text
[ Client Web Browser ] ──── HTTPS ────► [ Nginx Reverse Proxy & Certbot ]
                                             │          │
                                             ▼          ▼
                                     (Internal 80)   (Internal 8080)
                              [ React (Vite) SPA ]   [ Golang API Server ]
                                                                │
                                                                ▼
                                                     [ PostgreSQL 15 ]
```

## 🚀 Fitur Bisnis Utama
- **360° Assessment Engine (BerAKHLAK)**: Penilaian komprehensif dari Atasan, Bawahan, dan Rekan Sejawat. *Sistem saat ini sepenuhnya berfokus pada core values tanpa penilaian diri sendiri atau inovasi tambahan*.
- **Sistem Kalkulasi & Predikat Otomatis**: Perhitungan kuesioner secara algoritmik dari skor mentah hingga menghasilkan rentang predikat baku secara langsung.
- **Auto-Lock Temporal Governance**: Pemberlakuan periode penilaian yang ketat. Sistem akan **mengunci formulir secara otomatis (Auto-Lock)** pada pukul 23:59 di hari berakhirnya periode tanpa perlu campur tangan Admin. Admin tetap memiliki akses *Emergency Override* untuk keperluan mendesak.
- **Data Export & Reporting**: Generator *spreadsheet* (Excel) dan cetak PDF terintegrasi langsung untuk hasil pelaporan SKP (Sasaran Kinerja Pegawai).
- **Dynamic Frontend Monitoring**: Pemetaan rekap penilaian interaktif yang mengkalkulasi tenggat waktu dan menyajikannya dalam pengingat cerdas (Visual Hitung Mundur & Warning H-3).

## 🛡️ Standar Keamanan & Autentikasi Aplikasi (v2.0)
Infrastruktur keamanan telah diaudit dan diperkuat dengan standar modern (Skor Audit 94%):
- **Transport Security (SSL/TLS & HSTS)**: Semua traffic komunikasi wajib menggunakan HTTPS terenkripsi.
- **HttpOnly Secure Cookies**: Penyimpanan kredensial *Refresh Token* dilakukan di memori *Cookie* terproteksi demi menutup celah manipulasi script (XSS).
- **Rate Limiting & Anti-Brute-Force**: Akses berulang ke titik-titik rentan (Login, Token Refresh, Lupa Password) diawasi dan dibatasi ketat per alamat IP.
- **System-Level Audit Logging**: Pencatatan aktivitas reaktif tak terbantahkan (Immutable); merekam segala tindakan kunci mulai dari penguncian periode otomatis oleh sistem, percobaan login gagal, hingga perbaruan data krusial dengan cap waktu zona WIB.
- **Parameterized Queries**: Seluruh kueri basis data memanfaatkan *Object Relational Mapping* (GORM) guna meredam celah *SQL Injection*.

## 💻 Tech Stack
- **Frontend Layer**: React 18, TypeScript, Vite, React Router, TailwindCSS.
- **Backend Service**: Go 1.24+, Gin Web Framework.
- **Persistence DB**: PostgreSQL 15.
- **Deployment Build Tools**: Docker, Docker Compose, Nginx, Certbot.

---

## 🛠️ Panduan Developer & DevOps

Siklus *deployment* terbaik adalah dengan mengunci *dependencies* melalui *Docker*, baik untuk pengembangan lokal maupun rilis peluncuran.

### Prasyarat Sistem
1. Engine **Docker** dan **Docker Compose** aktif.
2. Binari Git CLI.

### Langkah Setup Lokal (Development)
1. **Clone dan Konfigurasi Environment**
   ```bash
   git clone <repository-url> sdm-apip
   cd sdm-apip
   cp .env.example .env
   # Wajib isi: JWT_SECRET, JWT_REFRESH_SECRET, SMTP credentials, ADMIN_DEFAULT_PASSWORD
   ```

2. **Jalankan Kontainer Lokal**
   ```bash
   docker compose up -d --build
   ```
   > Akses UI di `http://localhost:5173` | Akses API di `http://localhost:8080/api/health`.

### Langkah Deployment (Production)
Untuk perilisan publik, sangat direkomendasikan menyatukan berkas *override* production guna mengaktivasi SSL/TLS proxy:
```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```
> Profil produksi secara agresif menutup *port* internal dan hanya mengizinkan *traffic* sah melintasi `HTTPS:443`.

### 🧹 Skrip Utilitas (DB Wipe & Fresh Start)
Khusus di lingkungan pengujian (QA), jika tumpukan data rekayasa sudah terlalu banyak, tersedia *wiping tool* untuk mereset seluruh penilaian, relasi, periode, serta log, **namun tetap mempertahankan kerangka akun pegawai**:

```bash
go run backend/cmd/clean/main.go
```
> ⚠️ **Peringatan Operasional**: Skrip ini mereset sekuensial *Auto-Increment* ID tabel dan menghancurkan data transaksional selamanya. DILARANG KERAS mengeksekusinya pada peladen produksi!

---
*Developed securely for Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan.*