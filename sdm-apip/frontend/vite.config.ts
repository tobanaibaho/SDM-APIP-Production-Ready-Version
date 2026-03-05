import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
    build: {
        chunkSizeWarningLimit: 2000,
        // Biarkan Vite mengelola chunking secara otomatis
        // Manual chunks dihapus karena menyebabkan circular dependency
        // yang membuat React.forwardRef undefined di production build
    },
})
