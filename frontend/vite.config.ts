import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    headers: {
      // Delegate sensor access to Airwallex's checkout iframe so it can run its
      // device-fingerprint / risk SDK without throwing Permissions-Policy violations
      // (these are also harmless if denied — Airwallex degrades gracefully).
      'Permissions-Policy': [
        'bluetooth=(self "https://*.airwallex.com")',
        'accelerometer=(self "https://*.airwallex.com")',
        'gyroscope=(self "https://*.airwallex.com")',
        'magnetometer=(self "https://*.airwallex.com")',
        'payment=(self "https://*.airwallex.com")',
      ].join(', '),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
