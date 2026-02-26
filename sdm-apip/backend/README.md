# 🏢 SDM APIP Backend System

Sistem Backend API untuk Manajemen SDM APIP (Aparatur Pengawas Internal Pemerintah) yang dibangun menggunakan **Go (Golang)** dengan **Gin Web Framework** dan **GORM**.

## ✨ Fitur Utama
- **Autentikasi Robust**: JWT (JSON Web Token) dengan Access & Refresh Token.
- **Manajemen User & SDM**: Integrasi data profil pegawai dengan akun sistem.
- **Sistem Grup**: Manajemen unit kerja dan kolaborasi tim.
- **Penilaian 360**: Sistem penilaian kinerja antar pegawai (Peer Assessment).
- **Notifikasi Email**: Verifikasi akun dan reset password via Gmail SMTP.
- **Logging**: Sistem pencatatan log terpusat (Console & File).

## 🛠️ Persyaratan Sistem
- **Go**: v1.21 ke atas
- **Docker & Docker Compose**: Untuk containerization database dan aplikasi.
- **PostgreSQL**: v15 (Opsional jika tidak menggunakan Docker).

## 🚀 Memulai Cepat

### 1. Persiapan Database
Pastikan Docker sudah berjalan, lalu jalankan:
```bash
docker-compose up -d postgres
```

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya:
```bash
cp .env.example .env
```
*Pastikan mengisi `SMTP_PASSWORD` dengan App Password Gmail yang valid.*

### 3. Menjalankan Aplikasi
```bash
cd backend
go mod download
go run main.go
```
Aplikasi akan berjalan di `http://localhost:8080`.

## 📚 Struktur API (Endpoint)

### 🔐 Autentikasi (Public)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/api/login` | Login user (NIP) |
| POST | `/api/super-admin/login` | Login khusus Super Admin |
| POST | `/api/register` | Registrasi awal user |
| POST | `/api/verify-email` | Verifikasi akun via OTP |
| POST | `/api/set-password` | Set password setelah verifikasi |
| POST | `/api/forgot-password` | Request reset password |
| POST | `/api/reset-password` | Reset password dengan OTP |

### 👤 User & Profile (Protected)
- `GET /api/profile` - Mengambil profil user aktif.
- `PUT /api/profile` - Update data profil (foto, HP, dll).

### 🛡️ Super Admin (Protected)
- **Manajemen SDM**: CRUD data pegawai (`/api/super-admin/sdm`).
- **Kelola Pengguna**: Aktivasi & Role management (`/api/super-admin/users`).
- **Grup & Unit**: Manajemen struktur organisasi (`/api/super-admin/groups`).
- **Periode Penilaian**: Setting jadwal penilaian 360 (`/api/super-admin/periods`).

## 🐳 Deployment (Docker)
Untuk menjalankan seluruh sistem (Frontend & Backend):
```bash
docker-compose up -d --build
```

---
© 2024 SDM APIP System - Inspektorat Infrastruktur
