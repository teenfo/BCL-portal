// 레이스 TV 관전 화면 E2E 스모크 — /class/race/view?event=demo (docs/15 ⑤-b)
// 데모 모드(useDemoRace): Supabase/네트워크 미사용 로컬 드라이버 — 시드·로그인 불필요(/class는 공개 경로).
// 사이클: 로비(3s) → 카운트다운(3s) → 레이스(300m, ~50~65s) → 피니시(5s) → 리셋 루프.
// CI 필수 게이트는 auth.smoke만 — 이 스펙은 로컬/수동 실행 대상(코스 2모드 동등 규칙의 최소 게이트).
import { test, expect, type Page } from '@playwright/test';

// 데모 편성 6레인 (useDemoRace NAMES와 동기)
const DEMO_NAMES = ['김도현', '이서준', '박민재', '정하윤', '최유나', '강태오'];

// WebGL 소프트웨어 렌더링(SwiftShader) — 헤드리스에서 RaceStage3D 캔버스 구동용.
// playwright.config은 수정하지 않고 스펙 단위로만 적용(PW_CHROMIUM_PATH 경로 지정은 그대로 승계).
test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

async function gotoDemo(page: Page, query = 'event=demo') {
  // dev 첫 컴파일(three.js 포함) 여유 — 기본 내비게이션 타임아웃 상향
  await page.goto(`/class/race/view?${query}`, { timeout: 60_000 });
}

/** 경과 타이머(topbar, m:ss) — 레이스 시작 전에는 0:00 고정.
 *  header 스코프 필수: 레이싱 중 HUD 페이스(예 1:48)도 m:ss 패턴이라 전역 매치는 strict 충돌. */
function raceTimer(page: Page) {
  return page.locator('header').getByText(/^\d+:\d\d$/);
}

function timerSeconds(text: string): number {
  const [mm, ss] = text.split(':');
  return Number(mm) * 60 + Number(ss);
}

test.describe('race-view.smoke', () => {
  test('S1 로비 — STARTING PEN 오버레이 노출', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoDemo(page);
    // 마운트 직후 로비 3초 구간(리셋 루프로 재노출되므로 여유 타임아웃)
    await expect(page.getByText('STARTING PEN')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('DEMO RACE')).toBeVisible();
  });

  test('S2 레이싱 전환 — HUD 6레인 이름 + 스테이지 canvas', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoDemo(page);
    // 로비(3s)+카운트다운(3s) 통과 → 레이싱 진입은 타이머가 0:00에서 벗어나는 것으로 판정
    await expect(raceTimer(page)).not.toHaveText('0:00', { timeout: 30_000 });
    for (const name of DEMO_NAMES) {
      await expect(page.getByText(name)).toBeVisible();
    }
    // RaceStage3D(three.js WebGL) 캔버스 — 미지원 시 append 자체가 생략되므로 존재=렌더 성립
    await expect(page.locator('canvas')).toHaveCount(1);
  });

  test('S3 레이스 타이머 증가 (0:NN → +2s 이상)', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoDemo(page);
    const timer = raceTimer(page);
    await expect(timer).not.toHaveText('0:00', { timeout: 30_000 });
    const before = timerSeconds((await timer.textContent()) ?? '0:00');
    // 레이스 구간은 ~50초 이상 지속 — 3초 대기 후 증가 확인(리셋 루프 교차 위험 없음)
    await page.waitForTimeout(3_000);
    const after = timerSeconds((await timer.textContent()) ?? '0:00');
    expect(after).toBeGreaterThanOrEqual(before + 2);
  });

  test('S4 가로 코스(?course=h) — 화면 로드 + canvas (코스 2모드 동등 스모크)', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoDemo(page, 'event=demo&course=h');
    await expect(page.getByText('DEMO RACE')).toBeVisible({ timeout: 20_000 });
    // URL 오버라이드는 마운트 후 반영 — data-course=h 전환을 폴링으로 확인
    await expect(page.locator('[data-race-theme]')).toHaveAttribute('data-course', 'h', {
      timeout: 10_000,
    });
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 20_000 });
  });
});
