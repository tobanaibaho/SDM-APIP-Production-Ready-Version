# Tahap Build (Kompilasi)
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Salin file konfigurasi modul Go
COPY backend/go.mod backend/go.sum ./

# Unduh dependensi (pustaka yang dibutuhkan)
RUN go mod download

# Salin seluruh kode sumber
COPY backend/ .

# Lakukan kompilasi aplikasi (membuat file binary statis, ukurannya diperkecil)
RUN CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -ldflags="-w -s" -o main .

# Tahap Jalankan (Run) — menggunakan sistem Alpine Linux murni yang sangat kecil
FROM alpine:latest

# Pasang sertifikat CA untuk keamanan TLS/SMTP, dan tzdata untuk mengatur zona waktu
RUN apk --no-cache add ca-certificates tzdata

# Atur zona waktu ke WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta

WORKDIR /app

# Salin file binary yang sudah matang dari tahap "builder"
COPY --from=builder /app/main .

# Salin file migrasi database (dibutuhkan agar sistem bisa melakukan update tabel otomatis)
COPY database/migrations ./database/migrations

# Buat folder khusus untuk menyimpan catatan aktivitas (logs)
RUN mkdir -p logs

# Buka akses port
EXPOSE 8080

# Cek kesehatan aplikasi secara berkala (Penting untuk Docker Compose / Kubernetes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/health || exit 1

# CATATAN: Konfigurasi sistem disuntikkan secara dinamis saat aplikasi dijalankan.
# JANGAN PERNAH menyalin file .env rahasia ke dalam Docker Image — gunakan docker-compose.yml.
CMD ["./main"]
