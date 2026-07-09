'use client';

// wod 모드 — 오늘의 WOD 보드 (docs/05 §3.2). fn_get_class_display_wod(anon).
// Display-Safe: WOD 스냅샷은 공개 데이터(개인정보 미포함). published만 반환됨.
// 표시 마크업은 WodBoard(공유 프레젠테이션)로 위임 — SplitMode 좌측 페인과 공용.
import { usePolling } from '@/features/class-common';
import { fetchDisplayWod } from '../data';
import { WodBoard } from './WodBoard';
import styles from '../console.module.css';

export function WodMode({ facilityId }: { facilityId: string }) {
  const { data, initialLoading } = usePolling(
    () => fetchDisplayWod(facilityId),
    60_000,
    [facilityId],
  );

  if (initialLoading) {
    return <div className={styles.modePad} />;
  }
  if (!data) {
    return (
      <div className={styles.wodEmpty}>
        <div className={styles.wodEmptyTitle}>오늘 등록된 WOD가 없습니다</div>
      </div>
    );
  }

  return <WodBoard data={data} />;
}
