import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wgslVitePlugin()],
})
