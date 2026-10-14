import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ path: 'src/test-fixtures/.env.testing' })

export default defineConfig({
  test: {
    include: ['src/*.test.js'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/test-fixtures/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    }
  }
})