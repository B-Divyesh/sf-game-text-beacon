import { defineConfig } from 'vite'
import packageInfo from './package.json'

const applicationVersion = packageInfo.version

export default defineConfig({
  clearScreen: false,
  define: { __BEACON_VERSION__: JSON.stringify(applicationVersion) },
  build: { target: 'es2022', cssCodeSplit: false },
  // OCR and speech payloads are generated for the native package. They never
  // affect the web shell, and recursively watching their language/voice files
  // can exhaust a constrained machine's inotify budget after a package build.
  server: { watch: { ignored: ['**/src-tauri/resources/**', '**/src-tauri/target/**'] } },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'tests/**/*.test.mjs'] }
})
