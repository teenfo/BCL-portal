'use client';

// 회원 상세 — overview 탭 (02-admin §3.2)
// 프로필 + 현재 멤버십 요약(잔여·D-Day) + 경고 플래그(member_alert_flags) + 블랙리스트 토글
import { useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  StatCard,
  EmptyState,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type MemberDetail,
  type MemberAlertFlag,
  type Membership,
  type AlertFlagType,
  type AlertSeverity,
  ALERT_FLAG_LABEL,
  ALERT_SEVERITY_LABEL,
  MEMBERSHIP_STATUS_LABEL,
  fmtDate,
  daysUntil,
  primaryMembership,
  rpcError,
} from '../types';
import styles from '../detail.module.css';

const SEVERITY_BADGE: Record<AlertSeverity, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

interface Props {
  memberId: string;
  member: MemberDetail | null;
  loading: boolean;
  onMemberChanged: () => void;
}

export function OverviewTab({ memberId, member, loading, onMemberChanged }: Props) {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('members', 'edit');
  const canDelete = can('members', 'delete');
  const client = getSupabaseBrowserClient();

  const memberships = useQuery<Membership[]>(
    () =>
      query<Membership[]>(client, 'memberships', (q) =>
        q
          .select('*, membership_plans(name,type,max_pauses,duration_days,credit_count)')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false }),
      ),
    [memberId],
  );

  const flags = useQuery<MemberAlertFlag[]>(
    () =>
      query<MemberAlertFlag[]>(client, 'member_alert_flags', (q) =>
        q
          .select('*')
          .eq('member_id', memberId)
          .is('resolved_at', null)
          .order('created_at', { ascending: false }),
      ),
    [memberId],
  );

  // 플래그 추가 모달
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagType, setFlagType] = useState<AlertFlagType>('injury');
  const [flagSeverity, setFlagSeverity] = useState<AlertSeverity>('warning');
  const [flagNote, setFlagNote] = useState('');
  const [flagBusy, setFlagBusy] = useState(false);

  // 블랙리스트 모달
  const [blOpen, setBlOpen] = useState(false);
  const [blReason, setBlReason] = useState('');
  const [blBusy, setBlBusy] = useState(false);

  const addFlag = async () => {
    setFlagBusy(true);
    const res = await rpc(client, 'fn_upsert_member_alert_flag', {
      p_member_id: memberId,
      p_payload: { flag_type: flagType, severity: flagSeverity, note: flagNote.trim() || null },
    });
    setFlagBusy(false);
    if (!res.success) {
      toast.error(rpcError(res.error));
      return;
    }
    toast.success('플래그를 추가했습니다.');
    setFlagOpen(false);
    setFlagNote('');
    flags.refetch();
  };

  const resolveFlag = async (flag: MemberAlertFlag) => {
    const res = await rpc(client, 'fn_upsert_member_alert_flag', {
      p_member_id: memberId,
      p_payload: { id: flag.id, resolved: true },
    });
    if (!res.success) {
      toast.error(rpcError(res.error));
      return;
    }
    toast.success('플래그를 해제했습니다.');
    flags.refetch();
  };

  const toggleBlacklist = async () => {
    if (!member) return;
    const turningOn = !member.is_blacklisted;
    if (turningOn && !blReason.trim()) return;
    setBlBusy(true);
    const res = await query(client, 'members', (q) =>
      q
        .update({
          is_blacklisted: turningOn,
          blacklist_reason: turningOn ? blReason.trim() : null,
        })
        .eq('id', memberId),
    );
    setBlBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '처리에 실패했습니다.');
      return;
    }
    toast.success(turningOn ? '블랙리스트로 지정했습니다.' : '블랙리스트를 해제했습니다.');
    setBlOpen(false);
    setBlReason('');
    onMemberChanged();
  };

  const pm = primaryMembership(memberships.data ?? []);
  const dday = pm ? daysUntil(pm.end_date) : null;

  return (
    <div className={styles.cardGrid}>
      {/* 프로필 */}
      <Card title="프로필">
        {loading || !member ? (
          <Skeleton variant="text" width="100%" height="80px" />
        ) : (
          <div className={styles.profileGrid}>
            <Field label="연락처" value={member.phone ?? '-'} />
            <Field label="이메일" value={member.email ?? '-'} />
            <Field label="생일" value={fmtDate(member.birthday)} />
            <Field
              label="성별"
              value={
                member.gender === 'male'
                  ? '남성'
                  : member.gender === 'female'
                    ? '여성'
                    : member.gender === 'other'
                      ? '기타'
                      : '-'
              }
            />
            <Field label="비상 연락처" value={member.emergency_contact ?? '-'} />
            <Field label="가입일" value={fmtDate(member.created_at)} />
            <Field label="의료 메모" value={member.medical_notes ?? '-'} />
          </div>
        )}
      </Card>

      {/* 현재 멤버십 요약 */}
      <Card title="현재 멤버십">
        {memberships.loading ? (
          <Skeleton variant="text" width="100%" height="60px" />
        ) : memberships.error ? (
          <EmptyState
            variant="error"
            title="멤버십을 불러오지 못했습니다"
            description={memberships.error}
            onRetry={memberships.refetch}
          />
        ) : !pm ? (
          <EmptyState title="활성 멤버십이 없습니다" description="멤버십 탭에서 발급할 수 있습니다." />
        ) : (
          <div className={styles.summaryGrid}>
            <StatCard label="상태" value={MEMBERSHIP_STATUS_LABEL[pm.status]} />
            <StatCard label="요금제" value={pm.membership_plans?.name ?? '-'} />
            {pm.remaining_credits != null ? (
              <StatCard label="잔여 크레딧" value={`${pm.remaining_credits}회`} />
            ) : (
              <StatCard
                label="종료일 (D-Day)"
                value={
                  pm.end_date
                    ? dday != null && dday >= 0
                      ? `D-${dday}`
                      : `만료 ${dday != null ? -dday : 0}일`
                    : '무기한'
                }
                hint={fmtDate(pm.end_date)}
              />
            )}
          </div>
        )}
      </Card>

      {/* 경고 플래그 */}
      <Card
        title="경고 플래그"
        action={
          canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setFlagOpen(true)}>
              + 추가
            </Button>
          ) : undefined
        }
      >
        {flags.loading ? (
          <Skeleton variant="text" width="100%" height="40px" />
        ) : (flags.data ?? []).length === 0 ? (
          <EmptyState title="활성 플래그 없음" description="주의가 필요한 상태를 플래그로 표시할 수 있습니다." />
        ) : (
          <div className={styles.flagList}>
            {(flags.data ?? []).map((f) => (
              <div key={f.id} className={styles.flagItem}>
                <div className={styles.flagMeta}>
                  <Badge variant={SEVERITY_BADGE[f.severity]}>
                    {ALERT_FLAG_LABEL[f.flag_type]}
                  </Badge>
                  <span className={styles.flagNote}>{f.note ?? ALERT_SEVERITY_LABEL[f.severity]}</span>
                </div>
                {canEdit ? (
                  <Button variant="ghost" size="sm" onClick={() => resolveFlag(f)}>
                    해제
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 블랙리스트 */}
      <Card title="블랙리스트">
        {loading || !member ? (
          <Skeleton variant="text" width="100%" height="40px" />
        ) : (
          <div className={styles.msCard}>
            {member.is_blacklisted ? (
              <>
                <div className={styles.flagMeta}>
                  <Badge variant="danger">지정됨</Badge>
                  <span className={styles.flagNote}>{member.blacklist_reason ?? '사유 없음'}</span>
                </div>
                {canDelete ? (
                  <Button variant="soft" size="sm" onClick={() => setBlOpen(true)}>
                    해제
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <p className={styles.hint}>
                  블랙리스트 지정 시 즉시 예약이 차단됩니다.
                </p>
                {canDelete ? (
                  <Button variant="danger" size="sm" onClick={() => setBlOpen(true)}>
                    블랙리스트 지정
                  </Button>
                ) : null}
              </>
            )}
          </div>
        )}
      </Card>

      {/* 플래그 추가 모달 */}
      <Modal
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        title="경고 플래그 추가"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFlagOpen(false)} disabled={flagBusy}>
              취소
            </Button>
            <Button variant="primary" onClick={addFlag} loading={flagBusy}>
              추가
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <Select
            label="유형"
            value={flagType}
            onChange={(v) => setFlagType(v as AlertFlagType)}
            options={(Object.keys(ALERT_FLAG_LABEL) as AlertFlagType[]).map((k) => ({
              value: k,
              label: ALERT_FLAG_LABEL[k],
            }))}
          />
          <Select
            label="심각도"
            value={flagSeverity}
            onChange={(v) => setFlagSeverity(v as AlertSeverity)}
            options={(Object.keys(ALERT_SEVERITY_LABEL) as AlertSeverity[]).map((k) => ({
              value: k,
              label: ALERT_SEVERITY_LABEL[k],
            }))}
          />
          <Input
            label="메모 (선택)"
            multiline
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* 블랙리스트 모달 */}
      <Modal
        open={blOpen}
        onClose={() => setBlOpen(false)}
        title={member?.is_blacklisted ? '블랙리스트 해제' : '블랙리스트 지정'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBlOpen(false)} disabled={blBusy}>
              취소
            </Button>
            <Button
              variant={member?.is_blacklisted ? 'soft' : 'danger'}
              onClick={toggleBlacklist}
              loading={blBusy}
              disabled={!member?.is_blacklisted && !blReason.trim()}
            >
              {member?.is_blacklisted ? '해제' : '지정'}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          {member?.is_blacklisted ? (
            <p className={styles.hint}>블랙리스트를 해제하면 예약 차단이 풀립니다.</p>
          ) : (
            <>
              <p className={styles.hint}>지정 시 즉시 예약이 차단됩니다. 사유를 입력하세요.</p>
              <Input
                label="사유"
                multiline
                value={blReason}
                onChange={(e) => setBlReason(e.target.value)}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}
