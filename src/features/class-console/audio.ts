// WebAudio 비프음 — 3-2-1 카운트·페이즈 전환·종료 (docs/05 §3.2 timer 모드).
// 무인 자동재생 제약: 사용자 상호작용 없이도 대개 재생되나 실패는 조용히 무시(연출 부가물).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, gain = 0.18): void {
  const ac = getCtx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ac.destination);
    const now = ac.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    /* 무시 */
  }
}

/** 카운트다운 저음 비프(3-2-1) */
export function beepLow(): void {
  tone(660, 160);
}
/** GO / 페이즈 시작 고음 비프 */
export function beepHigh(): void {
  tone(1040, 220);
}
/** 종료 알림음(2연) */
export function beepEnd(): void {
  tone(880, 200);
  setTimeout(() => tone(1320, 320), 220);
}
