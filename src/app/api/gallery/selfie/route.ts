// 셀피 업로드(얼굴 프로필 등록) — 동의 필수 (docs/07 §8.3b v2)
// 볼륨 selfies/{uid}/에 저장 → fn_enroll_face_selfie. 워커가 임베딩 추출 후 파일 삭제.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/query';
import { MAX_PHOTO_BYTES, SELFIES_SUBDIR, mediaKindOf, safeMediaPath } from '@/lib/gallery-media';

export const runtime = 'nodejs';

function err(status: number, error: string) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, 'unauthorized');

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return err(400, 'file_required');
  if (form.get('consent') !== 'true') return err(400, 'consent_required');

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (mediaKindOf(ext) !== 'photo') return err(400, 'unsupported_type');
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) return err(400, 'file_too_large');

  const rel = `${user.id}/selfie-${Date.now()}.${ext}`;
  const dest = safeMediaPath(SELFIES_SUBDIR, rel);
  if (!dest) return err(400, 'invalid_path');
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));

  const res = await rpc<{ status: string }>(supabase, 'fn_enroll_face_selfie', {
    p_payload: { selfie_path: rel, consent: true },
  });
  if (!res.success) return err(400, res.error ?? 'enroll_failed');
  return NextResponse.json({ success: true, data: res.data, error: null });
}
