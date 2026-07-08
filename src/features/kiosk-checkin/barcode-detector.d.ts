// BarcodeDetector 앰비언트 타입 — lib.dom.d.ts에 아직 미포함(2026). docs/06 §5 1차 계층.
// Chromium 계열(키오스크 표준 런타임)에서 네이티브 QR 디코딩에 사용.
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
