import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    env: {
      COOKIE_SECRET: 'test-secret-for-vitest-do-not-use-in-production',
      ADMIN_PASSWORD: 'test-password',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
