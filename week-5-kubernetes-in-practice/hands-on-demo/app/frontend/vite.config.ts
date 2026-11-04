import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
    plugins: [
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),
        react(),
        tailwindcss()
    ],
    // For local development only (`npm run dev`): forward /api to a backend on port 8000,
    // the same job the Ingress does in the cluster.
    server: {
        proxy: {
            '/api': 'http://localhost:8000',
        },
    },
})
