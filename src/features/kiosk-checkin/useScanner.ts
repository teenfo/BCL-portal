'use client';

// 카메라 스캐너 훅 (docs/06 §5) — getUserMedia(후면 1280×720) + rAF 디코드 루프(~10/s).
// 동일 페이로드 3초 디바운스(단말 로컬), idle 복귀 시 스트림 해제(24h 누수 방지 수용기준).
import { useEffect, useRef, useState } from 'react';
import { createDecoder } from './decoder';

export type CameraState = 'idle' | 'starting' | 'streaming' | 'denied' | 'unsupported' | 'error';

interface UseScannerOptions {
  /** 디코딩 성공 콜백 — QR 원문 1건. 처리 중 재진입 방지는 호출측 책임 */
  onDecode: (raw: string) => void;
  /** 활성 여부 — false면 스트림 해제 */
  active: boolean;
}

const DECODE_INTERVAL_MS = 100; // ~10회/초 스로틀
const DEBOUNCE_MS = 3000; // 동일 페이로드 재판독 무시

export function useScanner({ onDecode, active }: UseScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>('idle');
  const [hasDecoder, setHasDecoder] = useState(true);

  const onDecodeRef = useRef(onDecode);
  useEffect(() => {
    onDecodeRef.current = onDecode;
  });

  useEffect(() => {
    if (!active) return;

    let stream: MediaStream | null = null;
    let disposed = false;
    let raf: number | null = null;
    let lastDecodeAt = 0;
    let lastRaw: { value: string; at: number } | null = null;
    let decode: ((s: CanvasImageSource) => Promise<string | null>) | null = null;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastDecodeAt < DECODE_INTERVAL_MS) return;
      lastDecodeAt = now;
      const video = videoRef.current;
      if (!video || !decode || video.readyState < 2) return;
      void decode(video).then((raw) => {
        if (disposed || !raw) return;
        if (lastRaw && lastRaw.value === raw && Date.now() - lastRaw.at < DEBOUNCE_MS) return; // 디바운스
        lastRaw = { value: raw, at: Date.now() };
        onDecodeRef.current(raw);
      });
    };

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        return;
      }
      setState('starting');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (disposed) return;
        const decoder = await createDecoder();
        if (disposed) return;
        decode = decoder ? (s) => decoder.decode(s) : null;
        setHasDecoder(decoder !== null);
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play().catch(() => {});
        }
        setState('streaming');
        if (decoder) raf = requestAnimationFrame(loop);
      } catch (err) {
        const name = (err as DOMException)?.name;
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      }
    };

    void start();

    const videoEl = videoRef.current;
    return () => {
      disposed = true;
      if (raf !== null) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, [active]);

  return { videoRef, state, hasDecoder };
}
