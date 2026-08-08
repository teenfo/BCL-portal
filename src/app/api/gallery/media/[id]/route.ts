// 갤러리 미디어 서빙 — 쿠키 세션 + RLS(gallery_photos SELECT = 같은 시설)로 인가 (docs/07 §8.3b v2)
// ?v=thumb → 동영상 포스터(thumb_path). 동영상 재생(iOS Safari 필수)을 위해 HTTP Range 지원.
import { createReadStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { query, rpc } from '@/lib/supabase/query';
import { GALLERY_SUBDIR, contentTypeOf, safeMediaPath } from '@/lib/gallery-media';

export const runtime = 'nodejs';

interface MediaRow {
  storage_path: string;
  thumb_path: string | null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  // RLS가 시설 스코프를 강제 — 타 시설 사진은 행 자체가 안 보임(404)
  const row = await query<MediaRow>(supabase, 'gallery_photos', (q) =>
    q.select('storage_path,thumb_path').eq('id', id).maybeSingle(),
  );
  if (!row.success || !row.data) return new NextResponse(null, { status: 404 });

  const wantThumb = req.nextUrl.searchParams.get('v') === 'thumb';
  const rel = wantThumb && row.data.thumb_path ? row.data.thumb_path : row.data.storage_path;
  const abs = safeMediaPath(GALLERY_SUBDIR, rel);
  if (!abs) return new NextResponse(null, { status: 400 });

  let size: number;
  try {
    size = (await stat(abs)).size;
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const headers: Record<string, string> = {
    'Content-Type': contentTypeOf(rel),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  };

  const range = req.headers.get('range');
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m) return new NextResponse(null, { status: 416 });
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    if (Number.isNaN(start) || start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
  return new NextResponse(stream, { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
}

// 본인 업로드 삭제 — 소유 검증·행 삭제는 RPC(fn_delete_gallery_photo), 파일 정리는 여기서.
// 파일 unlink 실패는 무시(고아 파일 무해 — 행이 없으면 서빙 라우트가 404).
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, data: null, error: 'unauthorized' }, { status: 401 });

  const res = await rpc<{ deleted: boolean; storage_path: string; thumb_path: string | null }>(
    supabase,
    'fn_delete_gallery_photo',
    { p_photo_id: id },
  );
  if (!res.success || !res.data) {
    const status = res.error === 'forbidden' ? 403 : res.error === 'not_found' ? 404 : 400;
    return NextResponse.json({ success: false, data: null, error: res.error ?? 'delete_failed' }, { status });
  }
  for (const rel of [res.data.storage_path, res.data.thumb_path]) {
    if (!rel) continue;
    const abs = safeMediaPath(GALLERY_SUBDIR, rel);
    if (abs) await unlink(abs).catch(() => {});
  }
  return NextResponse.json({ success: true, data: { deleted: true }, error: null });
}
