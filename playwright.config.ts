import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    // 샌드박스 전용: 브라우저 아웃바운드(supabase.co)를 에이전트 프록시로 (CI에서는 미설정)
    ...(process.env.PW_PROXY
      ? { proxy: { server: process.env.PW_PROXY, bypass: 'localhost,127.0.0.1' }, ignoreHTTPSErrors: true }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 샌드박스 프리인스톨 Chromium 사용(버전 고정 다운로드 회피). CI에서는
        // `npx playwright install chromium` 후 이 env 없이 기본 경로 사용.
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
