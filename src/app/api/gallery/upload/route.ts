// 갤러리 미디어 업로드 — multipart 1파일/요청 (docs/07 §8.3b v2)
// 쿠키 세션 인증 → 볼륨 저장({facility}/{yyyymm}/{uuid}.ext) → fn_register_gallery_photo(RLS·경로 검증).
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { query, rpc } from '@/lib/supabase/query';
import {
  GALLERY_SUBDIR,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  mediaKindOf,
  safeMediaPath,
} from '@/lib/gallery-media';

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

  // 시설 해석 — 회원 우선, 코치 폴백(RLS 스코프 내 조회)
  const mem = await query<{ facility_id: string | null }>(supabase, 'members', (q) =>
    q.select('facility_id').eq('user_id', user.id).maybeSingle(),
  );
  let facility = mem.data?.facility_id ?? null;
  if (!facility) {
    const coach = await query<{ facility_id: string | null }>(supabase, 'coaches', (q) =>
      q.select('facility_id').eq('user_id', user.id).maybeSingle(),
    );
    facility = coach.data?.facility_id ?? null;
  }
  if (!facility) return err(403, 'facility_required');

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return err(400, 'file_required');

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const kind = mediaKindOf(ext);
  if (!kind) return err(400, 'unsupported_type');
  const maxBytes = kind === 'video' ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (file.size <= 0 || file.size > maxBytes) return err(400, 'file_too_large');

  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const rel = `${facility}/${ym}/${randomUUID()}.${ext}`;
  const dest = safeMediaPath(GALLERY_SUBDIR, rel);
  if (!dest) return err(400, 'invalid_path');

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));

  const res = await rpc<{ photo_id: string; face_status: string; media_type: string }>(
    supabase,
    'fn_register_gallery_photo',
    { p_payload: { storage_path: rel, media_type: kind } },
  );
  if (!res.success || !res.data) {
    await unlink(dest).catch(() => {}); // 등록 실패 시 고아 파일 정리
    return err(400, res.error ?? 'register_failed');
  }
  return NextResponse.json({ success: true, data: res.data, error: null });
}
