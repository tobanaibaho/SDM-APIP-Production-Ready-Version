# =============================================================
# Build stage — digunakan jika ada akses internet (normal flow)
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# =============================================================
# Run stage — Nginx melayani hasil build
# =============================================================
FROM nginx:alpine

# Copy build assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (dengan proper MIME types & CORS headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Command to run nginx
CMD ["nginx", "-g", "daemon off;"]
