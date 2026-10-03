import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Cross-origin isolation, so the ONNX runtime can use multithreaded WASM
// (SharedArrayBuffer). Render serves the same headers in production.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
})
