// 갤러리 미디어 서버 헬퍼 (라우트 핸들러 전용 — docs/07 §8.3b v2)
// 원본 미디어는 실서버 볼륨(gallery-media)에 저장, 업로드/서빙은 /api/gallery/*가
// 쿠키 세션 + RLS(gallery_photos SELECT)로 수행. Supabase Storage 미사용.
import path from 'node:path';

export const MEDIA_ROOT = process.env.MEDIA_ROOT ?? '/media';
export const GALLERY_SUBDIR = 'gallery';
export const SELFIES_SUBDIR = 'selfies';

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024; // 클라이언트 리사이즈(≤1600px) 후 여유
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // nginx client_max_body_size(500m)와 정합

const PHOTO_EXTS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const VIDEO_EXTS: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
};

export function mediaKindOf(ext: string): 'photo' | 'video' | null {
  const e = ext.toLowerCase();
  if (e in PHOTO_EXTS) return 'photo';
  if (e in VIDEO_EXTS) return 'video';
  return null;
}

export function contentTypeOf(relPath: string): string {
  const ext = relPath.split('.').pop()?.toLowerCase() ?? '';
  return PHOTO_EXTS[ext] ?? VIDEO_EXTS[ext] ?? 'application/octet-stream';
}

/** 경로 탈출 방지 조인 — 볼륨 루트 밖이면 null */
export function safeMediaPath(subdir: string, relPath: string): string | null {
  const root = path.normalize(path.join(MEDIA_ROOT, subdir));
  const p = path.normalize(path.join(root, relPath));
  return p.startsWith(root + path.sep) ? p : null;
}
