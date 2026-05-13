# Panduan Backend SDM APIP

Dokumen ringkas untuk panduan rilis (deployment) Backend ke server instansi.

---

## 1. Persiapan File .env
Sebelum server dinyalakan, wajib isi dan ubah file `.env`:

1. Kunci Keamanan:
   - `JWT_SECRET` & `JWT_REFRESH_SECRET`: Isi dengan teks acak panjang (minimal 64 karakter).
2. Akun Admin Utama:
   - `ADMIN_DEFAULT_PASSWORD`: Ganti password awal admin.
3. Koneksi Login SSO (Wajib):
   - `SSO_ISSUER_URL`: Link resmi SSO kementerian.
   - `SSO_CLIENT_ID` & `SSO_CLIENT_SECRET`: ID dan Password aplikasi dari tim IT pusat.
4. Email Sistem (Untuk Lupa Sandi):
   - `SMTP_USERNAME`: Email resmi instansi.
   - `SMTP_PASSWORD`: Password email tersebut.

---

## 2. Cara Menyalakan Server

Buka Terminal atau Command Prompt di server instansi pada folder aplikasi ini, lalu jalankan perintah:

```bash
docker compose up -d --build
```

Jika berhasil:
- Database, Backend, dan Website akan langsung menyala bersamaan.
- Akun Admin Utama otomatis dibuat dengan email `unerojamu@gmail.com`.

---

## 3. Catatan Penting
- Login Pegawai: Semua pegawai wajib login via SSO kementerian menggunakan Email. Pastikan ejaan email di SSO pusat sama dengan email di menu Master SDM.
- Lupa Sandi Admin: Tautan pemulihan akun akan dikirim ke `unerojamu@gmail.com` dan hanya aktif selama 5 menit.
