import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'

// Settings from the repository's .env (e.g. FOODORA_URL for the Battle). A variable set in the
// terminal wins over the file.
try {
  process.loadEnvFile(join(__dirname, '../..', '.env'))
} catch {}

export default defineConfig({
  testDir: './tests',
  // The app is live and remote. One retry absorbs a cold start.
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // FOODORA_URL points the same tests at another build of the app (the Battle uses this).
    baseURL: process.env.FOODORA_URL || 'https://foodora.lovable.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Keep the project named `chromium`: the Playwright agents look it up by name.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
