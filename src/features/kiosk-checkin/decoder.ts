// QR 자동 디코딩 계층 (docs/06 §5 — 정식 요구).
//  1차: BarcodeDetector(네이티브, Chromium 키오스크 표준) — detect() per frame
//  2차: jsQR 폴백 — ※ jsQR 미설치(무거운 외부 의존 추가 금지 지침). loadJsqrDecoder는
//       설치 시 활성화되도록 자리를 비워두고, 현재는 null 반환 → 3차(수동 입력)로 격하. FLAG.
//  3차: 수동 입력(전화 뒤 4자리)은 scan 화면 UI가 담당.

export interface QrDecoder {
  /** 프레임에서 QR 문자열 1건 디코딩. 실패 시 null */
  decode(source: CanvasImageSource): Promise<string | null>;
  /** 리소스 해제 */
  dispose(): void;
}

/** 1차 — BarcodeDetector 지원 시 반환, 미지원 시 null */
export async function createBarcodeDetectorDecoder(): Promise<QrDecoder | null> {
  if (typeof window === 'undefined' || !window.BarcodeDetector) return null;
  try {
    const formats = await BarcodeDetector.getSupportedFormats();
    if (!formats.includes('qr_code')) return null;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    return {
      async decode(source) {
        try {
          const results = await detector.detect(source);
          return results[0]?.rawValue ?? null;
        } catch {
          return null; // 프레임 디코딩 실패는 조용히 무시(다음 프레임 재시도)
        }
      },
      dispose() {
        /* BarcodeDetector는 명시적 해제 불필요 */
      },
    };
  } catch {
    return null;
  }
}

/**
 * 2차 — jsQR Web Worker 폴백 자리. jsQR 미설치로 현재 null.
 * 활성화하려면: `npm i jsqr` 후 canvas ImageData → worker(jsQR) 경로 구현. (설치는 FLAG로 승인 요청)
 */
export async function createJsqrDecoder(): Promise<QrDecoder | null> {
  return null;
}

/** 가용한 최상위 디코더 선택. 둘 다 없으면 null → scan 화면은 수동 입력만 노출 */
export async function createDecoder(): Promise<QrDecoder | null> {
  return (await createBarcodeDetectorDecoder()) ?? (await createJsqrDecoder());
}
