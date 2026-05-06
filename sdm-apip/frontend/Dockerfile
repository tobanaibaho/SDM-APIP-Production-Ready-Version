# =============================================================
# Build stage — digunakan jika ada akses internet (normal flow)
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Salin file package
COPY package.json package-lock.json ./

# Instal dependensi
RUN npm install --legacy-peer-deps

# Salin kode sumber
COPY . .

# Bangun aplikasi
RUN npm run build

# =============================================================
# Run stage — Nginx melayani hasil build
# =============================================================
FROM nginx:alpine

# Salin aset hasil build dari tahap builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Salin konfigurasi nginx (dengan tipe MIME dan header CORS yang sesuai)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Buka port
EXPOSE 80

# Perintah untuk menjalankan nginx
CMD ["nginx", "-g", "daemon off;"]
