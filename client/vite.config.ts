import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Vitest v3 uses thresholds via CLI or config.coverage.thresholds
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
      all: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...configDefaults.exclude,
        'src/App.tsx',
        'src/main.tsx',
        'src/assets/**',
        '**/*.d.ts'
      ],
    },
  },
})
