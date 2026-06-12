/**
 * Playwright E2E設定
 *
 * 静的ファイル構成（ADR-0001）のためWebサーバーは起動せず、
 * 実際の利用形態と同じ file:// でページを直接開いてテストする。
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
