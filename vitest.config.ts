import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Setup files
    globals: true,

    // Include test files
    include: ['tests/**/*.test.ts'],
  },
});
