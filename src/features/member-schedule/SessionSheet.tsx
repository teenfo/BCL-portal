'use client';

// 세션 상세 BottomSheet — WOD 미리보기(fn_get_class_display_wod) + WOD Prep(fn_get_my_wod_prep)
// + 코치 소개 + 예약/취소(fn_book_with_credit / fn_cancel_booking_with_credit). booking_policy 안내문 표시.
import { useState } from 'react';
import { Button, Badge, EmptyState, Skeleton, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { formatDate, formatTime, formatScore, RX_LABEL } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { BOOKING_ERROR_KO, type SessionItem } from './types';
import styles from './schedule.module.css';
import screen from '@/features/member-shell/screen.module.css';

interface WodDisplay {
  title: string | null;
  format: string | null;
  time_cap_minutes: number | null;
  description: string | null;
  class_display_notes: string | null;
}
interface WodPrepHistory {
  score: number;
  score_type: string;
  rx_status: string;
  session_date: string | null;
}
interface WodPrep {
  wod_title: string | null;
  is_benchmark: boolean;
  history: WodPrepHistory[];
}

interface BookingResult {
  status: 'confirmed' | 'waitlisted';
  credits_used?: number;
  remaining_credits?: number | null;
}

export function SessionSheet({
  session,
  myBookingId,
  myBookingStatus,
  onClose,
  onChanged,
}: {
  session: SessionItem;
  myBookingId: string | null;
  myBookingStatus: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const wod = useQuery<WodDisplay | null>(
    () => rpc<WodDisplay | null>(getSupabaseBrowserClient(), 'fn_get_class_display_wod', { p_session_id: session.id }),
    [session.id],
  );
  const prep = useQuery<WodPrep | null>(
    () => rpc<WodPrep | null>(getSupabaseBrowserClient(), 'fn_get_my_wod_prep', { p_session_id: session.id }),
    [session.id],
  );

  const coaches = (session.session_coaches ?? [])
    .map((sc) => sc.coaches?.name)
    .filter(Boolean) as string[];

  const book = async () => {
    setBusy(true);
    const res = await rpc<BookingResult>(getSupabaseBrowserClient(), 'fn_book_with_credit', {
      p_session_id: session.id,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(BOOKING_ERROR_KO[res.error ?? ''] ?? res.error ?? '예약에 실패했습니다.');
      return;
    }
    if (res.data?.status === 'waitlisted') {
      toast.warning('정원이 가득 차 대기 등록되었습니다. 자리가 나면 알려드릴게요.');
    } else {
      toast.success('예약이 확정되었습니다.');
    }
    onChanged();
    onClose();
  };

  const cancel = async () => {
    if (!myBookingId) return;
    setBusy(true);
    const res = await rpc<{ late_cancel: boolean; credit_refunded: boolean }>(
      getSupabaseBrowserClient(),
      'fn_cancel_booking_with_credit',
      { p_booking_id: myBookingId, p_reason: null },
    );
    setBusy(false);
    if (!res.success) {
      toast.error(BOOKING_ERROR_KO[res.error ?? ''] ?? res.error ?? '취소에 실패했습니다.');
      return;
    }
    if (res.data?.late_cancel && !res.data.credit_refunded) {
      toast.warning('취소 마감 이후 취소로 크레딧이 복구되지 않았습니다.');
    } else {
      toast.success('예약이 취소되었습니다.');
    }
    onChanged();
    onClose();
  };

  const footer = myBookingId ? (
    <Button variant="danger" block loading={busy} onClick={cancel}>
      예약 취소
    </Button>
  ) : (
    <Button variant="primary" block loading={busy} onClick={book}>
      예약하기
    </Button>
  );

  return (
    <BottomSheet variant="full" title={session.title} onClose={onClose} footer={footer}>
      <div className={styles.sheetSection}>
        <div className={screen.metaRow}>
          <Badge variant="neutral">{formatDate(session.session_date)}</Badge>
          <Badge variant="info">
            {formatTime(session.start_time)}–{formatTime(session.end_time)}
          </Badge>
          {myBookingStatus ? (
            <Badge variant={myBookingStatus === 'confirmed' ? 'success' : 'warning'}>
              {myBookingStatus === 'confirmed' ? '예약 확정' : '대기 중'}
            </Badge>
          ) : null}
        </div>
      </div>

      {coaches.length > 0 ? (
        <div className={styles.sheetSection}>
          <span className={styles.sheetLabel}>코치</span>
          <p className={styles.wodBody}>{coaches.join(', ')}</p>
        </div>
      ) : null}

      {/* WOD 미리보기 */}
      <div className={styles.sheetSection}>
        <span className={styles.sheetLabel}>오늘의 WOD</span>
        {wod.loading ? (
          <Skeleton variant="rect" height={80} />
        ) : wod.error ? (
          <EmptyState variant="error" title="WOD를 불러오지 못했습니다" description={wod.error} onRetry={wod.refetch} />
        ) : wod.data ? (
          <>
            {wod.data.title ? <p className={screen.strong}>{wod.data.title}</p> : null}
            <p className={styles.policyNote}>
              {[wod.data.format, wod.data.time_cap_minutes ? `${wod.data.time_cap_minutes}분 캡` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {wod.data.description ? <p className={styles.wodBody}>{wod.data.description}</p> : null}
          </>
        ) : (
          <p className={styles.policyNote}>아직 게시된 WOD가 없습니다.</p>
        )}
      </div>

      {/* WOD Prep — 본인 과거 베스트 병기 */}
      {prep.data && prep.data.history && prep.data.history.length > 0 ? (
        <div className={styles.sheetSection}>
          <span className={styles.sheetLabel}>내 과거 기록 (오늘 목표 참고)</span>
          {prep.data.history.map((h, i) => (
            <div key={i} className={styles.prepRow}>
              <span className={styles.wodBody}>{formatDate(h.session_date)}</span>
              <span>
                <Badge variant="neutral" size="sm">{RX_LABEL[h.rx_status] ?? h.rx_status}</Badge>{' '}
                <strong>{formatScore(h.score, h.score_type)}</strong>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </BottomSheet>
  );
}
