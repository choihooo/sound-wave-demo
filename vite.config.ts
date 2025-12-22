import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // 개발 환경에서는 base를 '/'로 설정하여 VAD 라이브러리의 WASM 파일 로드 문제 해결
  base: process.env.NODE_ENV === 'production' ? '/sound-wave-demo/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'configure-response-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // WASM 파일에 대한 올바른 MIME 타입 설정
          if (_req.url?.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm')
          }
          next()
        })
      },
    },
  ],
  server: {
    fs: {
      allow: ['..'],
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    exclude: ['web-voice-detection'],
  },
})
