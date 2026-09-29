import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // O navegador chama /api/... no proprio endereco do site e o Vite repassa ao backend.
    // Assim funciona tanto em localhost quanto por um tunel (Cloudflare/ngrok).
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // Pelo proxy, site e API ficam no mesmo endereco. Sem remover o cabecalho Origin,
        // o backend trata o endereco do tunel como site estranho e recusa com 403 (CORS).
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
    // Enderecos de tunel liberados (o Vite bloqueia hosts desconhecidos).
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
  },
})
