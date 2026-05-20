import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env.local')) loadEnv({ path: '.env.local' });
if (existsSync('.env.e2e.local')) loadEnv({ path: '.env.e2e.local' });

const E2E_SUPABASE_URL = 'https://e2e-test.supabase.co';
const E2E_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlc2V0ZXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.e2e-test-key';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'login',
      testMatch: /login\.spec\.ts|authenticated\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3000',
      },
    },
    {
      name: 'setup-warn',
      testMatch: /setup-warn\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3001',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 3000 --strictPort',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || E2E_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || E2E_SUPABASE_ANON_KEY,
        E2E_EMAIL: process.env.E2E_EMAIL || '',
        E2E_PASSWORD: process.env.E2E_PASSWORD || '',
      },
    },
    {
      command: 'npm run dev -- --port 3001 --strictPort',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
      },
    },
  ],
});
