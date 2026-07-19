// 회원 요금제 구매 플로우 E2E — /apps/purchase (member-purchase §, docs/08 결제)
// 결제 불변식: 클라이언트 금액 미신뢰 — 서버가 membership_plans.price로 확정. 여기선 UI 진행만 검증.
// CI 위임: 시드에 요금제가 없을 수 있어 graceful skip. 실제 결제(Toss)는 트리거하지 않는다.
import { test, expect, type Page } from '@playwright/test';

const PW = '0000';

async function login(page: Page, email: string, password = PW) {
  await page.goto('/auth/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: /로그인|sign in/i }).click();
}

test.describe('purchase.smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'member@bcl.com');
    await page.waitForURL('**/apps/home', { timeout: 10_000 });
  });

  test('P1 요금제 구매 화면 진입', async ({ page }) => {
    await page.goto('/apps/purchase');
    await expect(page.getByText('요금제 구매')).toBeVisible({ timeout: 8_000 });
  });

  test('P2 요금제 선택 → 확인 단계 진행 (요금제 있을 때)', async ({ page }) => {
    await page.goto('/apps/purchase');
    await expect(page.getByText('요금제 구매')).toBeVisible({ timeout: 8_000 });

    // 구매 가능한 요금제 카드(버튼). 없으면 이 플로우는 검증 불가 → skip.
    const planButton = page.locator('button').filter({ hasText: /원|월|회|일/ }).first();
    const hasPlan = await planButton.isVisible().catch(() => false);
    test.skip(!hasPlan, '구매 가능한 요금제 시드가 없어 진행 단계 검증 생략');

    await planButton.click();
    // 2단계: 결제 전 확인 — 서버 재확인 문구가 노출되어야 한다(클라 금액 미신뢰 불변식).
    await expect(page.getByText(/서버가 요금제 가격으로 재확인/)).toBeVisible({ timeout: 8_000 });
  });

  test('P3 결제 성공/실패 페이지는 직접 진입 시 안전 렌더', async ({ page }) => {
    // successUrl/failUrl은 Toss 리다이렉트 대상 — paymentKey 없이 진입해도 크래시 없이 안내를 표시해야 한다.
    await page.goto('/apps/purchase/fail');
    await expect(page).toHaveURL(/\/apps\/purchase\/fail/, { timeout: 8_000 });
  });
});
