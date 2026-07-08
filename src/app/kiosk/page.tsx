'use client';

// /kiosk — idle 대기 화면 (docs/06 §3.1)
// 대형 시계/날짜 + 지점 공지 슬라이드 + "체크인 시작" 전면 터치 + 네트워크/오프라인 배지.
// Heartbeat·원격명령은 KioskProvider(앱 셸)가 상시 발신/수신.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKiosk } from '@/features/kiosk-shell';
import { useNotices } from '@/features/kiosk-shell/useNotices';
import styles from './kiosk.module.css';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function KioskIdlePage() {
  const router = useRouter();
  const { device, online, queued } = useKiosk();
  const notices = useNotices(device?.facilityId ?? null);
  const now = useClock();

  // 공지 슬라이드 (5초 회전)
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (notices.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % notices.length), 5000);
    return () => clearInterval(t);
  }, [notices.length]);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dateLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate(),
  ).padStart(2, '0')} (${DAYS[now.getDay()]})`;
  const notice = notices[slide];

  return (
    <button type="button" className={styles.idle} onClick={() => router.push('/kiosk/scan')} aria-label="체크인 시작">
      <div className={styles.statusRow}>
        <span className={[styles.badge, online ? styles.badgeOnline : styles.badgeOffline].join(' ')}>
          {online ? '온라인' : '오프라인'}
        </span>
        {queued > 0 ? <span className={[styles.badge, styles.badgeQueued].join(' ')}>동기화 대기 {queued}</span> : null}
      </div>

      <div className={styles.clockBlock}>
        <div className={styles.clock}>
          {hh}
          <span className={styles.colon}>:</span>
          {mm}
        </div>
        <div className={styles.date}>{dateLabel}</div>
      </div>

      {notice ? (
        <div className={styles.notice} aria-live="polite">
          <span className={styles.noticeTitle}>{notice.title}</span>
          <span className={styles.noticeBody}>{notice.content}</span>
        </div>
      ) : (
        <div className={styles.noticeSpacer} aria-hidden="true" />
      )}

      <div className={styles.cta}>
        <span className={styles.ctaText}>화면을 터치해 체크인을 시작하세요</span>
      </div>
    </button>
  );
}
