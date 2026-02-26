# 🏗️ SDM APIP: Integrated Management System

Sistem Manajemen Terintegrasi untuk Aparatur Pengawasan Internal Pemerintah (APIP) yang dirancang khusus untuk meningkatkan efisiensi pengelolaan data pegawai dan objektivitas penilaian kinerja 360 derajat.

---

## 🌟 Fitur Unggulan
- **Single Source of Truth**: Sinkronisasi data kepegawaian master dengan akun operasional.
- **Penilaian 360° BerAKHLAK**: Metodologi penilaian modern yang melibatkan rekan sejawat, bawahan, dan atasan.
- **Dynamic Grouping**: Pengelompokan personil fleksibel untuk audit dan penugasan khusus.
- **Secure Authentication**: Sistem keamanan berlapis menggunakan JWT Access & Refresh token serta verifikasi email.
- **Premium UI/UX**: Antarmuka modern dengan Dark Mode support, Glassmorphism, dan animasi performa tinggi.

---

## 🚀 Panduan Memulai Cepat

### Persyaratan Utama
- **Docker Desktop** (Pilihan utama untuk deployment cepat)
- **Go v1.21+** (Untuk pengembangan backend manual)
- **Node.js v18+ & npm** (Untuk pengembangan frontend manual)

### 1. Deployment Seluruh Sistem (Rekomendasi)
Cukup satu perintah untuk menjalankan database, backend, dan frontend:
```bash
docker-compose up -d --build
```
Akses aplikasi di: [http://localhost](http://localhost)

### 2. Pengembangan Manual (Local Development)

#### Backend
```bash
cd backend
cp .env.example .env
go mod download
go run main.go
```
API akan tersedia di `http://localhost:8080`

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
Dashboard akan tersedia di `http://localhost:5173`

---

## 🔑 Akses Awal Administrator
Sistem telah dilengkapi dengan akun bootstrap untuk konfigurasi pertama:
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `Super Admin`

---

## 📁 Arsitektur Proyek
```text
sdm-apip/
├── backend/          # Gin Framework (Go) - API Service
├── frontend/         # React + Vite + TypeScript - SPA
├── database/         # SQL Migrations & Init Scripts
└── docker-compose.yml # Container Orchestration
```

---
© 2025 **Inspektorat Infrastruktur** - Solusi Digital untuk Integritas Bangsa