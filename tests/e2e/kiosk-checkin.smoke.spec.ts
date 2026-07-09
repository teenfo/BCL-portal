// 키오스크 체크인 진입 E2E — /kiosk (kiosk-checkin §, docs/06)
// 키오스크는 무인 단말(로그인 없음). 미등록 단말은 DeviceSetupOverlay를 띄운다.
// CI 위임: 단말 등록 상태에 따라 idle/setup 분기 — 어느 쪽이든 크래시 없이 렌더되면 통과.
import { test, expect } from '@playwright/test';

test.describe('kiosk-checkin.smoke', () => {
  test('K1 키오스크 idle 진입 — 등록/미등록 어느 상태든 안전 렌더', async ({ page }) => {
    await page.goto('/kiosk');
    // 등록 단말: "체크인 시작" 전면 터치 / 미등록 단말: 단말 등록 안내 오버레이
    const idle = page.getByRole('button', { name: '체크인 시작' });
    const setup = page.getByText(/아직 등록되지 않았습니다/);
    await expect(idle.or(setup)).toBeVisible({ timeout: 8_000 });
  });

  test('K2 스캔 화면 진입 (등록 단말일 때)', async ({ page }) => {
    await page.goto('/kiosk');
    const idle = page.getByRole('button', { name: '체크인 시작' });
    const registered = await idle.isVisible().catch(() => false);
    test.skip(!registered, '단말 미등록(setup 오버레이) — 스캔 화면 검증 생략');

    await idle.click();
    await expect(page).toHaveURL(/\/kiosk\/scan/, { timeout: 8_000 });
  });
});
