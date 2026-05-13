# Deployment Guide: SDM APIP Kemenko Infra

Dokumen ini berisi langkah teknis untuk mendeploy aplikasi SDM APIP ke server produksi. Sistem sudah sepenuhnya dikemas (containerized).

## 1. Persyaratan Server
Pastikan server produksi telah terinstal:
- Docker Engine
- Docker Compose plugin

## 2. Konfigurasi Variabel Lingkungan (.env)
Seluruh kunci keamanan dan konfigurasi diatur dalam satu file. Jangan hardcode rahasia di dalam kode.

1. Salin template konfigurasi: 
   `cp backend/.env.example .env`
2. Buka `.env` dan isi variabel yang wajib (Wajib diisi sebelum deploy):
   - `JWT_SECRET` & `JWT_REFRESH_SECRET`: Isi dengan random string aman (minimal 64 karakter).
   - `ADMIN_DEFAULT_PASSWORD`: Password untuk akun Super Admin.
   - `SSO_CLIENT_ID` & `SSO_CLIENT_SECRET`: Kredensial dari IdP OIDC Kemenko Infra.
   - `SMTP_PASSWORD`: App Password untuk fitur email notifikasi.

## 3. Eksekusi Deployment
Jalankan perintah berikut di direktori utama proyek:
```bash
docker compose -f docker-compose.production.yml up -d --build
```
*Catatan: Port database dan backend diisolasi. Pastikan Reverse Proxy utama server mengarahkan trafik ke port container Frontend.*

## 4. Akses Administrator
Sistem akan membuat akun Super Admin secara otomatis pada saat deployment pertama:
- **Username:** `admin`
- **Password:** Sesuai dengan nilai `ADMIN_DEFAULT_PASSWORD` di `.env`

## 5. Catatan Arsitektur SSO
- **Login Pegawai:** Wajib melalui SSO. Tidak ada pendaftaran/login manual.
- **Master SDM:** Pembuatan akun otomatis (JIT Provisioning) hanya berhasil jika email pengguna dari SSO **cocok** dengan email yang terdaftar di Master Data SDM.
- **Login Darurat:** Akses Super Admin dipisahkan secara rute (bypass SSO) untuk mencegah lockout sistem.