'use client';

// 주간/일간 캘린더 (02-admin §3.6) — 요일 컬럼 + 시간순 세션 카드.
// ⏳ DnD 이동/시간 매트릭스 그리드는 과설계 위험 → 시간순 정렬 카드로 대체(생성/이동은 Modal 폼).
import { Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { type ScheduleSession, type SessionStatus, SESSION_STATUS_LABEL } from './types';
import styles from './schedule.module.css';

export interface DayCol {
  date: string; // yyyy-mm-dd
  label: string; // 요일
  dayNum: string; // 일
  isToday: boolean;
}
export interface SessionCounts {
  confirmed: number;
  waitlisted: number;
}
interface Props {
  view: 'week' | 'day';
  days: DayCol[];
  sessionsByDate: Map<string, ScheduleSession[]>;
  counts: Map<string, SessionCounts>;
  coachColorClass: (coachId: string) => string;
  onSelect: (session: ScheduleSession) => void;
}

const STATUS_BADGE: Record<SessionStatus, BadgeVariant> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const hhmm = (t: string) => t.slice(0, 5);

function SessionCard({
  session,
  counts,
  coachColorClass,
  onSelect,
}: {
  session: ScheduleSession;
  counts?: SessionCounts;
  coachColorClass: (coachId: string) => string;
  onSelect: (s: ScheduleSession) => void;
}) {
  const confirmed = counts?.confirmed ?? 0;
  const waitlisted = counts?.waitlisted ?? 0;
  const pct = Math.min(100, session.capacity > 0 ? (confirmed / session.capacity) * 100 : 0);
  const full = confirmed >= session.capacity;
  return (
    <div
      className={`${styles.sessionCard}${session.status === 'cancelled' ? ` ${styles.sessionCardCancelled}` : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(session)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(session);
        }
      }}
    >
      <div className={styles.sessionTop}>
        <span className={styles.sessionTime}>
          {hhmm(session.start_time)}–{hhmm(session.end_time)}
        </span>
        <Badge variant={STATUS_BADGE[session.status]} size="sm">
          {SESSION_STATUS_LABEL[session.status]}
        </Badge>
      </div>
      <div className={styles.sessionTitle}>{session.title}</div>
      <div className={styles.gauge}>
        <div className={styles.gaugeTrack}>
          <div
            className={`${styles.gaugeFill}${full ? ` ${styles.gaugeFillFull}` : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={styles.gaugeText}>
          {confirmed}/{session.capacity}
          {waitlisted > 0 ? ` · 대기 ${waitlisted}` : ''}
        </span>
      </div>
      {session.session_coaches.length > 0 ? (
        <div className={styles.coachTags}>
          {[...session.session_coaches]
            .sort((a, b) => a.display_order - b.display_order)
            .map((c) => (
              <span key={c.coach_id} className={styles.coachTag}>
                <span className={`${styles.coachDot} ${coachColorClass(c.coach_id)}`} />
                {c.coaches?.name ?? '코치'}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function ScheduleCalendar({ view, days, sessionsByDate, counts, coachColorClass, onSelect }: Props) {
  return (
    <div className={view === 'week' ? styles.weekGrid : styles.dayView}>
      {days.map((d) => {
        const list = sessionsByDate.get(d.date) ?? [];
        return (
          <div key={d.date} className={styles.dayColumn}>
            <div className={`${styles.dayHeader}${d.isToday ? ` ${styles.dayHeaderToday}` : ''}`}>
              <span className={styles.dayName}>{d.label}</span> {d.dayNum}
            </div>
            {list.length === 0 ? (
              <div className={styles.emptyDay}>세션 없음</div>
            ) : (
              list.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  counts={counts.get(s.id)}
                  coachColorClass={coachColorClass}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
