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
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        // Pisahkan vendor libraries besar ke chunk tersendiri
                        if (id.includes('lucide-react')) return 'icons';
                        if (id.includes('react')) return 'vendor-react';
                        if (id.includes('axios')) return 'vendor-api';
                        return 'vendor';
                    }
                },
            },
        },
    },
})
