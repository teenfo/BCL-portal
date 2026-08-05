'use client';

// 비탭 gallery (/apps/gallery) — 시설 갤러리(사진·동영상) + 셀피 얼굴 매칭 "내 사진" 필터 (docs/03).
// 미디어 원본은 실서버 볼륨 — 업로드/서빙은 /api/gallery/*(쿠키 세션+RLS), 목록·상태는 RPC/RLS.
// 얼굴 분석·매칭은 face-service 워커가 비동기 수행 — 화면은 face_status만 표시.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Checkbox, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { BottomSheet, StackHeader, useMemberId } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './gallery.module.css';

interface GalleryItem {
  id: string;
  storage_path: string;
  media_type: 'photo' | 'video';
  thumb_path: string | null;
  duration_s: number | null;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  face_status: string;
  face_count: number;
  uploader_name: string | null;
  mine: boolean;
}

interface FaceProfile {
  status: 'pending' | 'ready' | 'failed';
}

const PAGE = 30;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

const mediaUrl = (p: GalleryItem) => `/api/gallery/media/${p.id}`;
const thumbUrl = (p: GalleryItem) =>
  p.media_type === 'video' ? `${mediaUrl(p)}?v=thumb` : mediaUrl(p);

function formatDuration(s: number | null): string {
  if (!s || s <= 0) return '';
  const m = Math.floor(s / 60);
  const ss = Math.round(s % 60);
  return `${m}:${ss < 10 ? '0' + ss : ss}`;
}

/** 사진 업로드 전 리사이즈(최대 변 1600px, JPEG) — 전송량·분석 시간 절감. 실패 시 원본 폴백 */
async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85),
  );
}

async function postMedia(url: string, file: Blob, name: string, extra?: Record<string, string>) {
  const form = new FormData();
  form.append('file', file, name);
  for (const [k, v] of Object.entries(extra ?? {})) form.append(k, v);
  const res = await fetch(url, { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!res.ok || !json?.success) throw new Error(json?.error ?? `업로드 실패 (${res.status})`);
}

export function GalleryScreen() {
  const toast = useToast();
  const memberId = useMemberId();
  const client = getSupabaseBrowserClient();

  const [mine, setMine] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<GalleryItem | null>(null);

  // 셀피 등록 시트
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [selfieBusy, setSelfieBusy] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  // 얼굴 프로필 상태(본인 행 RLS) — 미등록이면 null
  const face = useQuery<FaceProfile | null>(
    () =>
      memberId
        ? query<FaceProfile>(client, 'member_face_profiles', (q) =>
            q.select('status').eq('member_id', memberId).maybeSingle(),
          )
        : Promise.resolve({ success: true, data: null, error: null }),
    [memberId],
  );
  const faceStatus = face.data?.status ?? null;

  const load = useCallback(
    async (append: boolean, before?: string) => {
      if (!append) {
        setLoading(true);
        setLoadError(null);
      }
      const res = await rpc<{ photos: GalleryItem[] }>(client, 'fn_get_gallery', {
        p_payload: { mine, limit: PAGE, before: before ?? null },
      });
      setLoading(false);
      if (!res.success || !res.data) {
        // 로딩 실패 표면화(무한 스피너 금지 규약)
        setLoadError(res.error ?? '갤러리를 불러오지 못했습니다.');
        return;
      }
      const rows = res.data.photos;
      setItems((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length >= PAGE);
    },
    [client, mine],
  );

  // 이펙트 본문 직접 setState 금지 규약 — 비동기 콜백으로 지연(courseParam 패턴과 동일)
  useEffect(() => {
    const id = setTimeout(() => void load(false), 0);
    return () => clearTimeout(id);
  }, [load]);

  const onPickUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    let lastErr: string | null = null;
    for (const f of Array.from(files).slice(0, 10)) {
      try {
        const isVideo = f.type.startsWith('video/');
        if (isVideo) {
          if (f.size > MAX_VIDEO_BYTES) throw new Error('동영상은 300MB 이하만 가능합니다.');
          await postMedia('/api/gallery/upload', f, f.name);
        } else {
          const blob = await compressImage(f).catch(() => f);
          await postMedia('/api/gallery/upload', blob, 'photo.jpg');
        }
        ok += 1;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : '업로드 실패';
      }
    }
    setUploading(false);
    if (uploadRef.current) uploadRef.current.value = '';
    if (ok > 0) {
      toast.success(`${ok}건 업로드 완료 — 얼굴 분석이 끝나면 자동으로 매칭됩니다.`);
      void load(false);
    }
    if (lastErr) toast.error(lastErr);
  };

  const onPickSelfie = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!consent) {
      toast.error('얼굴 정보 이용 동의가 필요합니다.');
      return;
    }
    setSelfieBusy(true);
    try {
      const blob = await compressImage(f).catch(() => f);
      await postMedia('/api/gallery/selfie', blob, 'selfie.jpg', { consent: 'true' });
      toast.success('셀피 등록 완료 — 분석이 끝나면 내 사진이 자동으로 모입니다.');
      setSelfieOpen(false);
      face.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '셀피 등록에 실패했습니다.');
    } finally {
      setSelfieBusy(false);
      if (selfieRef.current) selfieRef.current.value = '';
    }
  };

  const removeProfile = async () => {
    const res = await rpc(client, 'fn_delete_face_profile', {});
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('얼굴 정보를 삭제했습니다.');
    setSelfieOpen(false);
    face.refetch();
    if (mine) setMine(false);
  };

  const switchMine = (next: boolean) => {
    if (next && faceStatus !== 'ready') {
      setSelfieOpen(true); // 프로필 없이는 매칭 불가 — 등록 유도
      return;
    }
    setMine(next);
  };

  return (
    <>
      <StackHeader
        title="갤러리"
        action={
          <Button variant="ghost" size="sm" onClick={() => setSelfieOpen(true)}>
            내 얼굴
          </Button>
        }
      />
      <div className={screen.page}>
        {/* 필터 + 업로드 */}
        <div className={styles.toolbar}>
          <div className={screen.chipRow}>
            <Button variant={!mine ? 'soft' : 'ghost'} size="sm" onClick={() => switchMine(false)}>
              전체
            </Button>
            <Button variant={mine ? 'soft' : 'ghost'} size="sm" onClick={() => switchMine(true)}>
              내 사진
            </Button>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={uploading}
            onClick={() => uploadRef.current?.click()}
          >
            올리기
          </Button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => void onPickUpload(e.target.files)}
          />
        </div>

        {/* 얼굴 프로필 안내 배너 */}
        {memberId && !face.loading && faceStatus !== 'ready' ? (
          <Card variant="accent">
            <div className={screen.rowBetween}>
              <div>
                <p className={screen.strong}>
                  {faceStatus === 'pending'
                    ? '셀피 분석 중입니다'
                    : faceStatus === 'failed'
                      ? '셀피에서 얼굴을 찾지 못했습니다'
                      : '내 사진을 자동으로 모아보세요'}
                </p>
                <p className={screen.muted}>
                  {faceStatus === 'pending'
                    ? '분석이 끝나면 "내 사진" 필터가 열립니다.'
                    : '셀피 1장을 등록하면 내 얼굴이 나온 사진·영상만 골라 보여드립니다.'}
                </p>
              </div>
              {faceStatus !== 'pending' ? (
                <Button variant="soft" size="sm" onClick={() => setSelfieOpen(true)}>
                  {faceStatus === 'failed' ? '다시 등록' : '셀피 등록'}
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* 목록 */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={110} />
            ))}
          </div>
        ) : loadError ? (
          <Card>
            <EmptyState variant="error" title="갤러리를 불러오지 못했습니다" description={loadError} onRetry={() => void load(false)} />
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              title={mine ? '내 얼굴이 나온 사진이 아직 없어요' : '첫 사진을 올려보세요'}
              description={
                mine
                  ? '새 사진·영상이 올라오면 자동으로 여기에 모입니다.'
                  : '수업·이벤트 사진과 영상을 올리면 시설 회원 모두가 볼 수 있습니다.'
              }
            />
          </Card>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.cell}
                  onClick={() => setViewer(p)}
                  aria-label={p.caption ?? (p.media_type === 'video' ? '동영상 보기' : '사진 보기')}
                >
                  {p.media_type === 'video' && !p.thumb_path ? (
                    <span className={styles.cellPending} aria-hidden />
                  ) : (
                    // 실서버 미디어 라우트(쿠키 인증) — next/image 외부 로더 미구성이라 img 사용
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl(p)} alt={p.caption ?? ''} loading="lazy" />
                  )}
                  {p.media_type === 'video' ? (
                    <span className={styles.playBadge} aria-hidden>
                      ▶{p.duration_s ? ` ${formatDuration(p.duration_s)}` : ''}
                    </span>
                  ) : null}
                  {p.mine ? <span className={styles.mineDot} aria-label="내 사진" /> : null}
                  {p.face_status === 'pending' || p.face_status === 'processing' ? (
                    <span className={styles.analyzing}>분석 중</span>
                  ) : null}
                </button>
              ))}
            </div>
            {hasMore ? (
              <Button
                variant="soft"
                block
                onClick={() => void load(true, items[items.length - 1]?.created_at)}
              >
                더 보기
              </Button>
            ) : null}
          </>
        )}
      </div>

      {/* 뷰어 */}
      {viewer ? (
        <BottomSheet open onClose={() => setViewer(null)} title={viewer.caption ?? (viewer.media_type === 'video' ? '동영상' : '사진')} variant="full">
          <div className={styles.viewer}>
            {viewer.media_type === 'video' ? (
              <video controls playsInline preload="metadata" poster={viewer.thumb_path ? thumbUrl(viewer) : undefined} src={mediaUrl(viewer)} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(viewer)} alt={viewer.caption ?? ''} />
            )}
            <div className={styles.viewerMeta}>
              {viewer.mine ? <Badge variant="accent" size="sm">내 사진</Badge> : null}
              <span className={screen.muted}>
                {viewer.uploader_name ? `${viewer.uploader_name} · ` : ''}
                {new Date(viewer.taken_at ?? viewer.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </BottomSheet>
      ) : null}

      {/* 셀피 등록/관리 시트 */}
      {selfieOpen ? (
        <BottomSheet open onClose={() => setSelfieOpen(false)} title="내 얼굴 등록">
          <div className={styles.selfieBody}>
            <p className={screen.muted}>
              셀피 1장으로 얼굴 특징값만 추출해 저장합니다. 원본 셀피는 분석 직후 삭제되며,
              특징값은 &ldquo;내 사진&rdquo; 필터에만 사용됩니다. 언제든 삭제할 수 있습니다.
            </p>
            <Checkbox
              label="얼굴 정보(특징값) 수집·이용에 동의합니다"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <Button
              variant="primary"
              block
              loading={selfieBusy}
              disabled={!consent}
              onClick={() => selfieRef.current?.click()}
            >
              셀피 촬영·선택
            </Button>
            <input
              ref={selfieRef}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(e) => void onPickSelfie(e.target.files)}
            />
            {faceStatus ? (
              <Button variant="ghost" block onClick={() => void removeProfile()}>
                등록된 얼굴 정보 삭제
              </Button>
            ) : null}
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
}
