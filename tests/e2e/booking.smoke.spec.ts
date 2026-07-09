// 회원 수업 예약/취소 플로우 E2E — /apps/schedule (member-schedule §)
// 예약/취소/노쇼 정책은 facilities.booking_policy 단일 소스 — 여기선 UI 진입·시트 동작만 검증.
// CI 위임: 주간 세션 시드가 없을 수 있어 graceful skip. 예약 확정은 트리거하지 않는다.
import { test, expect, type Page } from '@playwright/test';

const PW = '0000';

async function login(page: Page, email: string, password = PW) {
  await page.goto('/auth/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: /로그인|sign in/i }).click();
}

test.describe('booking.smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'member@bcl.com');
    await page.waitForURL('**/apps/home', { timeout: 10_000 });
  });

  test('B1 수업 화면 진입 + 탭', async ({ page }) => {
    await page.goto('/apps/schedule');
    await expect(page.getByRole('heading', { name: '수업' })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('tab', { name: '내 예약' }).click();
    await expect(page.getByRole('tab', { name: '내 예약' })).toHaveAttribute('aria-selected', 'true');
  });

  test('B2 세션 상세 시트 열기 (세션 있을 때)', async ({ page }) => {
    await page.goto('/apps/schedule');
    await expect(page.getByRole('heading', { name: '수업' })).toBeVisible({ timeout: 8_000 });

    // 주간 목록의 세션 행(버튼). 없으면 시트 검증 불가 → skip.
    const sessionRow = page.getByRole('button', { name: /예약하기|대기 등록|예약 취소|예약$|대기/ }).first();
    // 세션 목록 행은 시트를 여는 진입점 — 존재 여부로 판단
    const anySession = await sessionRow.isVisible().catch(() => false);
    test.skip(!anySession, '이번 주 세션 시드가 없어 예약 시트 검증 생략');

    await sessionRow.click();
    // 시트에 예약/취소 CTA 중 하나가 노출되어야 한다(정원/본인 상태에 따라 분기).
    const cta = page.getByRole('button', { name: /예약하기|대기 등록|예약 취소/ });
    await expect(cta.first()).toBeVisible({ timeout: 8_000 });
  });
});
