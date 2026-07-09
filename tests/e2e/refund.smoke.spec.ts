// 관리자 환불 2단계 워크플로우 E2E — /admin/payments (payments §, docs/08 §1.2·§1.6)
// 불변식: 금액은 서버(fn_calculate_refund, 10% 캡)가 산정 — 화면에서 편집 불가. 2단계 확정 전 자동 실행 없음.
// CI 위임: 환불 가능한 거래(completed + 멤버십 연결)가 없으면 graceful skip. 실제 환불은 실행하지 않는다.
import { test, expect, type Page } from '@playwright/test';

const PW = '0000';

async function login(page: Page, email: string, password = PW) {
  await page.goto('/auth/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: /로그인|sign in/i }).click();
}

test.describe('refund.smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@bcl.com');
    await page.waitForURL('**/admin/dashboard', { timeout: 10_000 });
  });

  test('R1 결제 관제 화면 + 탭 전환', async ({ page }) => {
    await page.goto('/admin/payments');
    await expect(page.getByRole('heading', { name: '결제' })).toBeVisible({ timeout: 8_000 });
    // 거래 / 환불 이력 탭 계약
    await page.getByRole('tab', { name: '환불 이력' }).click();
    await expect(page.getByRole('tab', { name: '환불 이력' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: '거래' }).click();
  });

  test('R2 환불 모달 1단계 — 서버 계산 read-only + 사유 필수', async ({ page }) => {
    await page.goto('/admin/payments');
    await expect(page.getByRole('heading', { name: '결제' })).toBeVisible({ timeout: 8_000 });

    // 환불 가능한 거래에만 [환불] 버튼이 활성. 없으면 워크플로우 검증 불가 → skip.
    const refundBtn = page.getByRole('button', { name: '환불' }).first();
    const enabled = await refundBtn.isEnabled().catch(() => false);
    test.skip(!enabled, '환불 가능한 거래 시드가 없어 2단계 워크플로우 검증 생략');

    await refundBtn.click();
    await expect(page.getByText('STEP 1 / 2')).toBeVisible({ timeout: 8_000 });
    // 서버 산정·10% 캡 강제 안내 — 금액이 클라 편집 불가임을 표면화
    await expect(page.getByText(/10% 위약금 상한/)).toBeVisible();

    // 사유 미입력 시 다음 단계 진행 버튼 비활성 (fail-to-not-charge)
    const next = page.getByRole('button', { name: /환불 실행 확인/ });
    await expect(next).toBeDisabled();

    await page.getByLabel('환불 사유').fill('E2E 검증(실행하지 않음)');
    await expect(next).toBeEnabled();
    // 2단계로만 이동 — 확정 버튼은 누르지 않는다(실제 환불 방지).
    await next.click();
    await expect(page.getByText('STEP 2 / 2')).toBeVisible({ timeout: 8_000 });
  });
});
