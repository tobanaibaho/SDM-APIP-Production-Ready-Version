# SDM APIP — Sistem Penilaian Kinerja 360° APIP

Aplikasi enterprise berskala produksi untuk manajemen *360-degree assessment* khusus Kepala Tim (KT) Audit Aparat Pengawasan Intern Pemerintah (APIP) di lingkungan Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan. Sistem ini menjembatani pemantauan performa internal lintas hierarki divisi melalui kuesioner digital.

---

## 🏗️ Architecture Design

Sistem ini didesain sebagai arsitektur *decoupled* yang dideploy secara *containerized* melalui Docker Compose.

```text
[ Client Web Browser ] ──── HTTP/S ────► [ Nginx Reverse Proxy ]
                                             │          │
                                             ▼          ▼
                                  (Port 5173 / 80)   (Port 8080 / /api/*)
                              [ React (Vite) SPA ]   [ Golang API Server ]
                                                                │
                                                                ▼
                                                     [ PostgreSQL 15 ]
```

## 🚀 Fitur Bisnis Utama
- **360° Assessment Engine**: Logika penilaian paralel multijenjang dari Atasan, Bawahan, dan Rekan Sejawat.
- **Sistem Kalkulasi & Predikat Otomatis**: Perhitungan nilai kuesioner mentah secara langsung menjadi rentang predikat baku.
- **Assessment Period Control**: Fitur penetapan masa berlaku periode secara terikat. Admin dapat mengunci periode dan menyediakan periode tenggang (*grace period* 7 Hari).
- **Data Export & Reporting**: Generator *spreadsheet* (Excel) dan dokumen PDF terintegrasi langsung untuk hasil cetak SKP.
- **Dynamic Frontend Monitoring**: Pemetaan data periodik dengan parsing nama hari lokal (`ID`), serta status metrik riwayat assessment (*Relative Time formatter* terbina).

## 🛡️ Standar Keamanan & Autentikasi Aplikasi (Production Ready)
Infrastruktur *auth flow* telah di-_harden_ menggunakan standar modern:
- **HttpOnly Cookies untuk JWT Refresh Tokens**: Penympanan string *Refresh Token* digeser sepenuhnya melalu HTTP-Only Cookie. Hal ini mencegah XSS untuk membobol persistensi sesi.
- **Klien Axios Interceptor**: Menyokong perputaran kredensial klien secara tersembunyi (*silent token rotation*) via header `withCredentials: true`.
- **Brute-Force & Lockout Mitigation**: Pembatasan jumlah hit IP (*Rate limit*) dan mekanisme *freeze* 15 menit jika akun gagal mencoba masuk selama 5 kali beruntun.
- **RBAC Strict Routing**: Perlindungan *endpoints* berbasis lapisan peran (Super Admin vs User Pegawai).
- **Sistem Audit Log Immutability**: Semua pergerakan vital seperti ekspor data dan perubahan hierarki pegawai tak akan luput dan terecord dengan stempel waktu UTC terstandarisasi.
- **Database Sanitizations**: Modul GORM menunda celah SQL Injection secara natif.

## 💻 Tech Stack
- **Frontend Layer**: React 18, TypeScript, Vite, React Router, TailwindCSS, Axios (Interceptors).
- **Backend Service**: Go 1.24, Gin Web Framework, GORM.
- **Persistence DB**: PostgreSQL 15.
- **Deployment Build Tools**: Docker, Docker Compose, Nginx.

---

## 🛠️ Panduan Developer untuk Envinronment Lokal

Siklus *deployment* terbaik adalah dengan mengunci *dependencies* melalui *Docker*.

### Prasyarat Sistem
1. Engine **Docker** dan **Docker Compose** aktif (*Contoh: Docker Desktop Windows / Mac*).
2. Binari Git CLI.

### Langkah Setup
1. **Repository Wiring**
   ```bash
   git clone <repository-url> sdm-apip
   cd sdm-apip
   ```

2. **Environment File Configuration**
   Duplikat kerangka file variabel bawaan, ganti isinya dengan parameter server anda:
   ```bash
   cp .env.example .env
   # Pastikan parameter kunci (JWT_SECRET, JWT_REFRESH_SECRET, SMTP) tidak kosong!
   ```

3. **Running Docker Containers**
   Bangun ulang dan jalankan arsitektur penuh *(Frontend, Backend API, Database)* sekaligus.
   ```bash
   docker compose up -d --build
   ```
   > **Note Troubleshooting HMR/Vite**: Di varian pengembangan, bila kontainer layar UI statis / *whitescreen*, matikan node, compile `dist/` dengan mode lokal (`cd frontend && npm run build`), baru bangun *(build)* kontainernya ulang.

4. **Boot Verifications**
   Silahkan pastikan semua berjalan lancar melalui tautan:
   - Akses Portal UI: `http://localhost:5173`
   - Monitor Healthcheck API: `http://localhost:8080/api/health`
   - Akun *Bootstrap* Admin: `admin@sdm-apip.id` (Silahkan cek `ADMIN_DEFAULT_PASSWORD`  di fail .env untuk *Password* lokalnya).

### Skrip Utilitas (DB Wipe & Fresh Start)
Dalam *lifecycle* Quality Assurance (QA) testing, adakalanya tumpukan hasil *Assessment* percobaan menjadi kotor.
Apabila anda ingin membersihkan ulang seluruh relasi antar pengguna, kuesioner, periode, dan *logs*, tetapi **tetap membiarkan kerangka akun master pegawai utuh**, jalankan *wiping tool* yang telah kami bangun ini di terminal root anda:

```bash
go run backend/cmd/clean/main.go
```
> ⚠️ **Peringatan**: Kode di atas akan me-reset nomor ID urut (*Sequence*) transaksi. Pastikan TIDAK diketikan pada environment produksi publik (*live server*).

---
*Developed inside the local scope of Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan.* 