import { defineConfig } from 'vitest/config';
import * as dotenv from 'dotenv';

// Load test-specific environment first (.env.test.local), then fall back to .env.local
// This allows testing against local Supabase (via .env.test.local) or remote (via .env.local)
dotenv.config({ path: '.env.test.local' });
dotenv.config({ path: '.env.local' });

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Timeout for integration tests (database operations can be slow)
    testTimeout: 30000,

    // Setup files
    globals: true,

    // Include test files
    include: ['tests/**/*.test.ts'],

    // Sequential execution to avoid race conditions with shared test data
    sequence: {
      concurrent: false,
    },
  },
});
