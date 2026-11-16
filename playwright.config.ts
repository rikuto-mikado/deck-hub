import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests in a real browser. Uses the Chrome installed on this machine
 * (no browser download) and starts the dev server on its own port.
 */
const PORT = 5181;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    colorScheme: 'dark',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 860 } } },
    {
      name: 'phone-landscape',
      use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
      testMatch: /layout\.spec\.ts/,
    },
    {
      name: 'phone-portrait',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
      testMatch: /layout\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
  },
});
