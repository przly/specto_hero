import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'

// Local dev serves the dev favicon straight in the HTML. Swapping the <link>
// from JS after load was unreliable: the browser had often already fetched
// (and cached) the prod icon, so the tab showed either one.
const devFavicon = (): Plugin => ({
  name: 'dev-favicon',
  apply: 'serve',
  transformIndexHtml: (html) => html.replaceAll('href="/favicon.png"', 'href="/favicon-dev.png"'),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [devFavicon(), react(), tailwindcss(), wgslVitePlugin()],
})
