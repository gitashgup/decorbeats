import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/catalogue-e2e', fullyParallel: false, workers: 1,
  timeout: 30000, reporter: 'list', outputDir: 'test-results/catalogue',
  use: { baseURL: 'http://127.0.0.1:4173', ...devices['iPhone 13'], browserName: 'chromium', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
