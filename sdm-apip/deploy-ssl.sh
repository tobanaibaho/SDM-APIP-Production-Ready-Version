#!/bin/bash
# =================================================
# deploy-ssl.sh
# Script otomatis untuk setup SSL pertama kali
# di VPS/server production
#
# CARA PAKAI:
# 1. Upload ke server
# 2. chmod +x deploy-ssl.sh
# 3. ./deploy-ssl.sh
# =================================================

set -e  # Berhenti jika ada error

# ─── WARNA UNTUK OUTPUT ─────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── INPUT KONFIGURASI ──────────────────────────
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SDM APIP — Setup SSL Production     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

read -p "Masukkan nama domain Anda (contoh: sdm.example.com): " DOMAIN_NAME
read -p "Masukkan email untuk notifikasi SSL (contoh: admin@example.com): " ADMIN_EMAIL

echo ""
echo -e "${YELLOW}Domain : ${DOMAIN_NAME}${NC}"
echo -e "${YELLOW}Email  : ${ADMIN_EMAIL}${NC}"
read -p "Apakah sudah benar? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo -e "${RED}Dibatalkan.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}[1/6] Membuat direktori yang diperlukan...${NC}"
mkdir -p ./nginx/ssl
mkdir -p ./nginx/certbot

echo -e "${GREEN}[2/6] Mengganti 'YOUR_DOMAIN.com' dengan domain Anda di nginx.conf...${NC}"
sed -i "s/YOUR_DOMAIN.com/${DOMAIN_NAME}/g" ./nginx/nginx.conf

echo -e "${GREEN}[3/6] Menyimpan konfigurasi domain ke .env.production...${NC}"
cat > .env.production << EOF
DOMAIN_NAME=${DOMAIN_NAME}
ADMIN_EMAIL=${ADMIN_EMAIL}

# Isi sesuai konfigurasi Anda:
DB_USER=sdm_admin
DB_PASSWORD=GANTI_INI_DENGAN_PASSWORD_KUAT
DB_NAME=sdm_apip_db
JWT_SECRET=GANTI_INI_DENGAN_SECRET_MINIMAL_32_KARAKTER
JWT_REFRESH_SECRET=GANTI_INI_DENGAN_REFRESH_SECRET_MINIMAL_32_KARAKTER
ADMIN_DEFAULT_PASSWORD=GANTI_INI_DENGAN_PASSWORD_ADMIN
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=email_anda@gmail.com
SMTP_PASSWORD=app_password_gmail
SMTP_FROM=email_anda@gmail.com
SMTP_FROM_NAME=SDM APIP System
EOF

echo -e "${YELLOW}⚠️  PENTING: Edit file .env.production sebelum lanjut!${NC}"
echo -e "${YELLOW}   nano .env.production${NC}"
read -p "Tekan ENTER setelah mengisi .env.production..."

echo ""
echo -e "${GREEN}[4/6] Menjalankan sistem tanpa SSL dulu (untuk verifikasi domain)...${NC}"
# Jalankan nginx sementara hanya dengan port 80 untuk certbot challenge
docker compose -f docker-compose.yml up -d --build
docker run --rm \
    -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
    -v "$(pwd)/nginx/certbot:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --agree-tos \
    --no-eff-email \
    -m "${ADMIN_EMAIL}" \
    -d "${DOMAIN_NAME}" \
    -d "www.${DOMAIN_NAME}"

echo ""
echo -e "${GREEN}[5/6] SSL berhasil! Menjalankan sistem lengkap dengan HTTPS...${NC}"
docker compose down
docker compose \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    --env-file .env.production \
    up -d --build

echo ""
echo -e "${GREEN}[6/6] Verifikasi deployment...${NC}"
sleep 5
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Deployment Berhasil!                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   🌐 HTTPS: https://${DOMAIN_NAME}      ${NC}"
echo -e "${GREEN}║   📋 Cek status: docker compose ps      ${NC}"
echo -e "${GREEN}║   📝 Lihat log: docker compose logs -f  ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
