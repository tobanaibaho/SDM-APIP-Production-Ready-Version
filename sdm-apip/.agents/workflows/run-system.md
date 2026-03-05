---
description: Menjalankan sistem SDM APIP (backend Docker + frontend lokal atau full Docker)
---

# Cara Menjalankan Sistem SDM APIP

## Opsi 1: Full Docker (Cara Normal)

### Langkah-langkah

1. Pastikan Docker Desktop sudah berjalan
2. Build frontend terlebih dahulu secara lokal (untuk menghindari timeout npm di Docker):
```
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..
```

3. Build image frontend menggunakan Dockerfile.prebuilt:
```
docker build -f frontend/Dockerfile.prebuilt -t sdm-apip-frontend ./frontend
```

4. Jalankan semua container:
```
docker compose up -d
```

5. Verifikasi semua container berjalan:
```
docker compose ps
```

6. Akses sistem:
   - **Frontend:** http://localhost:5173
   - **Backend API:** http://localhost:8080/api/health
   - **Login Admin:** admin@sdm-apip.id / admin123

---

## Opsi 2: Hybrid (Backend Docker + Frontend Dev Server)

Gunakan opsi ini untuk development atau jika Docker frontend bermasalah.

### Langkah-langkah

1. Jalankan backend dan database via Docker:
```
docker compose up -d postgres backend
```

2. Jalankan frontend dev server secara lokal:
```
cd frontend
npm install --legacy-peer-deps
npm run dev
```

3. Akses sistem:
   - **Frontend:** http://localhost:5173 (atau 5174 jika port sudah dipakai)
   - **Backend API:** http://localhost:8080/api/health

---

## Catatan Penting

- File `.env` harus ada di root project (bukan `.env.example`)
- JWT_SECRET dan JWT_REFRESH_SECRET wajib diisi di `.env`
- ADMIN_DEFAULT_PASSWORD di `.env` adalah password awal admin
- Jika Docker Desktop crash, restart dari system tray Windows

## Troubleshooting

### Frontend whitescreen di port 5173 (Docker)
Ini disebabkan build image lama. Solusi:
1. Build dist lokal: `cd frontend && npm run build`
2. Rebuild image: `docker build -f frontend/Dockerfile.prebuilt -t sdm-apip-frontend ./frontend`
3. Restart container: `docker compose restart frontend`

### Docker engine 500 error
Restart Docker Desktop dari system tray Windows (klik kanan icon Docker → Restart).
