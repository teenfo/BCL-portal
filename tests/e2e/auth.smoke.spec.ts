// 인증 E2E 스모크 S1~S8 — docs/01-auth §7. CI 필수 게이트: 실패 시 배포 차단.
// 시드 계정(비밀번호 전부 '0000'): admin@ / coach@ / member@ / pending@bcl.com
import { test, expect, type Page } from '@playwright/test';

const PW = '0000';
const ROLES = [
  { email: 'admin@bcl.com', dashboard: '/admin/dashboard' },
  { email: 'coach@bcl.com', dashboard: '/coach/dashboard' },
  { email: 'member@bcl.com', dashboard: '/apps/home' },
] as const;

async function login(page: Page, email: string, password = PW) {
  await page.goto('/auth/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  // exact: 비밀번호 input 라벨만 매치 — "비밀번호 표시" 토글 버튼(aria-label)과의 strict 충돌 방지
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: /로그인|sign in/i }).click();
}

test.describe('auth.smoke', () => {
  for (const { email, dashboard } of ROLES) {
    test(`S1 역할별 로그인 진입 — ${email}`, async ({ page }) => {
      const started = Date.now();
      await login(page, email);
      await page.waitForURL(`**${dashboard}`, { timeout: 10_000 });
      // 장애 #1 회귀 감지선: 로그인 클릭 → 대시보드 5초 이내
      expect(Date.now() - started).toBeLessThan(5_000 + 5_000 /* 폼 입력 여유 */);
      await expect(page).toHaveURL(new RegExp(dashboard));
    });
  }

  test('S2 새로고침 세션 유지', async ({ page }) => {
    await login(page, 'member@bcl.com');
    await page.waitForURL('**/apps/home');
    await page.reload();
    await expect(page).toHaveURL(/\/apps\/home/, { timeout: 8_000 });
  });

  test('S3 앱 전환 세션 유지 (admin — 장애 #3 회귀 감지선)', async ({ page }) => {
    await login(page, 'admin@bcl.com');
    await page.waitForURL('**/admin/dashboard');
    await page.goto('/apps/home');
    await expect(page).toHaveURL(/\/apps\/home/, { timeout: 8_000 });
    await page.goto('/coach/dashboard');
    await expect(page).toHaveURL(/\/coach\/dashboard/, { timeout: 8_000 });
    // 쿠키명 단일 확인 (bcl-portal-auth)
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.startsWith('bcl-portal-auth'))).toBe(true);
  });

  test('S4 승인 게이트 — pending 계정 보호경로 차단', async ({ page }) => {
    await login(page, 'pending@bcl.com');
    await page.waitForURL('**/auth/pending-approval', { timeout: 10_000 });
    await page.goto('/apps/dashboard');
    await expect(page).toHaveURL(/\/auth\/pending-approval/, { timeout: 8_000 });
  });

  test('S5 역할 경계 — member의 /admin 직접 진입', async ({ page }) => {
    await login(page, 'member@bcl.com');
    await page.waitForURL('**/apps/home');
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/apps\/home/, { timeout: 8_000 });
  });

  test('S6 비인증 보호경로 + redirect 복귀', async ({ page }) => {
    await page.goto('/coach/dashboard');
    await expect(page).toHaveURL(/\/auth\/login\?redirect=/, { timeout: 8_000 });
    await page.getByLabel(/이메일|email/i).fill('coach@bcl.com');
    await page.getByLabel('비밀번호', { exact: true }).fill(PW);
    await page.getByRole('button', { name: /로그인|sign in/i }).click();
    await expect(page).toHaveURL(/\/coach\/dashboard/, { timeout: 10_000 });
  });

  test('S7 로그아웃 — 세션 잔존 없음', async ({ page }) => {
    await login(page, 'member@bcl.com');
    await page.waitForURL('**/apps/home');
    await page.goto('/auth/logout');
    await page.waitForURL('**/auth/login**', { timeout: 8_000 });
    await page.goto('/apps/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8_000 });
  });

  test('S8 로그인 실패 표면화 — 무한 스피너 금지 (F-5 회귀 감지선)', async ({ page }) => {
    await login(page, 'member@bcl.com', 'wrong-password');
    // 3초 내 자격 증명 오류 메시지 렌더 — 네트워크 오류("Failed to fetch")는 통과로 치지 않는다
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 3_000 });
    await expect(alert).toHaveText(/invalid|올바르지|로그인에 실패|rate limit/i);
  });
});
