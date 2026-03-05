# SDM APIP — Sistem Penilaian Kinerja APIP

Aplikasi manajemen penilaian 360° untuk Kepala Tim (KT) APIP di lingkungan Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan.

---

## 🏗️ Arsitektur Sistem

```
Frontend (React + Vite)  ─┐
                           ├─► Nginx Reverse Proxy ─► Internet (HTTPS)
Backend (Go + Gin)       ─┘
     │
     └─► PostgreSQL
```

## 🚀 Cara Menjalankan (Development)

### Prasyarat
- Docker & Docker Compose
- Git

### Langkah

```bash
# 1. Clone repository
git clone <repo-url>
cd sdm-apip

# 2. Salin dan isi konfigurasi
cp .env.example .env
nano .env   # Isi dengan nilai development Anda

# 3. Jalankan semua service
docker compose up -d --build

# 4. Akses aplikasi
# Frontend : http://localhost:5173
# Backend  : http://localhost:8080
```

## 🌐 Cara Deploy ke Production (HTTPS)

Lihat panduan lengkap di [`ssl_deployment_guide.md`](ssl_deployment_guide.md) atau jalankan:

```bash
# Setup SSL otomatis (butuh domain + VPS)
chmod +x deploy-ssl.sh
./deploy-ssl.sh
```

## ⚙️ Environment Variables

Salin `.env.example` ke `.env` dan isi semua nilai. Variabel wajib:

| Variable | Keterangan |
|----------|-----------|
| `JWT_SECRET` | Secret key JWT (min. 32 karakter random) |
| `JWT_REFRESH_SECRET` | Secret key refresh token |
| `DB_PASSWORD` | Password database PostgreSQL |
| `ADMIN_DEFAULT_PASSWORD` | Password default admin pertama kali |
| `SMTP_*` | Konfigurasi email untuk verifikasi |
| `FRONTEND_URL` | URL frontend (`https://domain.com`) |
| `ALLOWED_ORIGINS` | Daftar origin CORS yang diizinkan |

## 📦 Struktur Project

```
sdm-apip/
├── backend/           # Go API Server (Gin + GORM)
│   ├── controllers/   # HTTP handlers
│   ├── services/      # Business logic
│   ├── models/        # Database models
│   ├── middleware/    # JWT, CORS, Rate Limit, RBAC
│   ├── routes/        # Route definitions
│   ├── utils/         # Helper functions
│   └── cmd/           # CLI tools (seed, emergency-reset)
├── frontend/          # React + TypeScript + Vite
│   ├── src/pages/     # Halaman aplikasi
│   ├── src/components/# Komponen reusable
│   ├── src/services/  # API service calls
│   └── src/context/   # React context (Auth)
├── database/
│   └── migrations/    # SQL schema (init.sql)
├── nginx/             # Konfigurasi Nginx (production)
├── docker-compose.yml             # Development
├── docker-compose.production.yml  # Production (SSL)
├── deploy-ssl.sh                  # Script otomatis SSL
└── .env.example                   # Template konfigurasi
```

## 🛡️ Fitur Keamanan

- **JWT Authentication** dengan silent refresh (access 15 menit, refresh 7 hari)
- **Account Lockout**: 5x login gagal → kunci 15 menit
- **RBAC**: Role-based access control (Super Admin / User)
- **MFA/TOTP**: Mendukung Google Authenticator
- **Rate Limiting**: Semua endpoint auth dilindungi
- **Audit Log**: Setiap aksi login, logout, dan ekspor data tercatat
- **bcrypt Password Hashing**
- **Security Headers**: HSTS, CSP, X-Frame, dll.
- **SQL Injection Protection**: GORM parameterized query

## 👤 Akun Default

Setelah pertama kali dijalankan, akun admin dibuat dengan:
- **Username**: `admin`
- **Password**: Nilai dari `ADMIN_DEFAULT_PASSWORD` di `.env`

> ⚠️ **Segera ganti password** setelah login pertama kali melalui menu **"Ganti Password"** di sidebar.

## 📊 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Go 1.24, Gin, GORM |
| Database | PostgreSQL 15 |
| Proxy | Nginx |
| Container | Docker, Docker Compose |
| SSL | Let's Encrypt (Certbot) |