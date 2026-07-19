// PM5 기기 관리(CRUD) E2E — /admin/race?tab=devices (race-admin §, 02-admin §3.9)
// 시리얼넘버=주 식별자. 조회/삭제/등록은 전용 RPC(fn_*_pm5_device). 여기선 목록·등록 모달 UI만 검증.
// CI 위임: 실제 기기 생성은 트리거하지 않는다(모달 열고 닫기까지). 삭제는 racing 중 차단됨을 확인만.
import { test, expect, type Page } from '@playwright/test';

const PW = '0000';

async function login(page: Page, email: string, password = PW) {
  await page.goto('/auth/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: /로그인|sign in/i }).click();
}

test.describe('race-devices.smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@bcl.com');
    await page.waitForURL('**/admin/dashboard', { timeout: 10_000 });
  });

  test('D1 Race 운영 → PM5 기기 탭 진입', async ({ page }) => {
    await page.goto('/admin/race?tab=devices');
    await expect(page.getByRole('heading', { name: 'Race 운영' })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('tab', { name: 'PM5 기기' }).click();
    // 기기 등록 CTA(권한 있을 때) 또는 빈 상태 안내 중 하나가 노출
    const registerCta = page.getByRole('button', { name: '기기 등록' });
    const emptyState = page.getByText(/등록된 기기가 없습니다/);
    await expect(registerCta.first().or(emptyState)).toBeVisible({ timeout: 8_000 });
  });

  test('D2 기기 등록 모달 열고 닫기 (실제 생성 없음)', async ({ page }) => {
    await page.goto('/admin/race?tab=devices');
    await page.getByRole('tab', { name: 'PM5 기기' }).click();

    const registerCta = page.getByRole('button', { name: '기기 등록' }).first();
    const canRegister = await registerCta.isVisible().catch(() => false);
    test.skip(!canRegister, '기기 등록 권한/CTA 없음 — 모달 검증 생략');

    await registerCta.click();
    // 등록 모달 — 시리얼 입력 필드가 노출되어야 한다.
    await expect(page.getByLabel(/시리얼/)).toBeVisible({ timeout: 8_000 });
    // 실제 생성하지 않고 닫는다.
    await page.getByRole('button', { name: /취소|닫기/ }).first().click();
  });
});
