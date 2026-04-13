# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY backend/go.mod backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY backend/ .

# Build the application (static binary, stripped for smaller size)
RUN CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -ldflags="-w -s" -o main .

# Run stage — minimal Alpine image
FROM alpine:latest

# Install CA certificates for TLS/SMTP, and tzdata for timezone
RUN apk --no-cache add ca-certificates tzdata

# Set timezone to WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

# Copy database migrations (needed for --migrate flag)
COPY database/migrations ./database/migrations

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8080

# Health check for container orchestration (Docker Compose / Kubernetes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/health || exit 1

# NOTE: Configuration is injected via environment variables at runtime.
# DO NOT copy .env files into the image — use docker-compose env_file or K8s secrets.
CMD ["./main"]
