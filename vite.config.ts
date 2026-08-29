import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  build: { target: 'es2022', cssCodeSplit: false },
  // OCR and speech payloads are generated for the native package. They never
  // affect the web shell, and recursively watching their language/voice files
  // can exhaust a constrained machine's inotify budget after a package build.
  server: { watch: { ignored: ['**/src-tauri/resources/**', '**/src-tauri/target/**'] } },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'tests/**/*.test.mjs'] }
})
