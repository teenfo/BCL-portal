'use client';

// 비탭 purchase (/apps/purchase) — docs/03 §3.6
// 요금제 선택 → 3단계 확인 → (결제 확정). 결제 불변식: 클라이언트가 금액을 절대 보내지 않는다 —
// 서버가 membership_plans.price로 확정. 자동결제/빌링키/재시도 금지.
// FLAG: 회원 결제 RPC 부재(fn_create_payment_order / fn_confirm_payment). 결제 확정 단계는 서버 RPC 대기.
import { useMemo, useState } from 'react';
import { Card, Button, Badge, Checkbox, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { StackHeader, BottomSheet, krw } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './purchase.module.css';

interface Plan {
  id: string;
  name: string;
  type: string;
  plan_kind: string;
  duration_days: number | null;
  credit_count: number | null;
  price: number;
  discount_price: number | null;
  description: string | null;
}

const KIND_LABEL: Record<string, string> = { standard: '정기권', drop_in: '일일권', trial: '체험권' };

export function PurchaseScreen() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [step, setStep] = useState(1);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreePay, setAgreePay] = useState(false);

  const plans = useQuery<Plan[]>(
    () =>
      query<Plan[]>(getSupabaseBrowserClient(), 'membership_plans', (q) =>
        q
          .select('id, name, type, plan_kind, duration_days, credit_count, price, discount_price, description')
          .eq('is_active', true)
          .order('price', { ascending: true }),
      ),
    [],
  );

  const effectivePrice = (p: Plan) => (p.discount_price != null ? p.discount_price : p.price);
  const rows = plans.data ?? [];

  const open = (p: Plan) => {
    setSelected(p);
    setStep(1);
    setAgreeRefund(false);
    setAgreePay(false);
  };

  const detail = useMemo(() => {
    if (!selected) return '';
    if (selected.type === 'count') return `${selected.credit_count}회`;
    return `${selected.duration_days}일`;
  }, [selected]);

  return (
    <>
      <StackHeader title="요금제 구매" />
      <div className={screen.page}>
        {plans.error ? (
          <Card>
            <EmptyState variant="error" title="요금제를 불러오지 못했습니다" description={plans.error} onRetry={plans.refetch} />
          </Card>
        ) : plans.loading && !plans.data ? (
          <>
            <Skeleton variant="rect" height={96} />
            <Skeleton variant="rect" height={96} />
          </>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState title="구매 가능한 요금제가 없습니다" description="잠시 후 다시 확인해주세요." />
          </Card>
        ) : (
          rows.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.planCard} ${selected?.id === p.id ? styles.planSelected : ''}`}
              onClick={() => open(p)}
            >
              <div className={styles.planTop}>
                <span className={styles.planName}>{p.name}</span>
                <span>
                  {p.discount_price != null ? <span className={styles.planStrike}>{krw(p.price)}</span> : null}
                  <span className={styles.planPrice}>{krw(effectivePrice(p))}</span>
                </span>
              </div>
              <div className={screen.metaRow}>
                <Badge variant="neutral" size="sm">{KIND_LABEL[p.plan_kind] ?? p.plan_kind}</Badge>
                <Badge variant="info" size="sm">{p.type === 'count' ? `${p.credit_count}회` : `${p.duration_days}일`}</Badge>
              </div>
              {p.description ? <p className={styles.planDesc}>{p.description}</p> : null}
            </button>
          ))
        )}
      </div>

      {selected ? (
        <BottomSheet
          variant="auto"
          title={step === 1 ? '요금제 확인' : step === 2 ? '결제 전 확인' : '결제 진행'}
          onClose={() => setSelected(null)}
          footer={
            step === 1 ? (
              <Button variant="primary" block onClick={() => setStep(2)}>
                다음
              </Button>
            ) : step === 2 ? (
              <Button variant="primary" block disabled={!agreeRefund} onClick={() => setStep(3)}>
                다음
              </Button>
            ) : (
              <Button variant="primary" block disabled={!agreePay}>
                결제하기
              </Button>
            )
          }
        >
          {/* 1단계: 상품 요약 */}
          {step >= 1 ? (
            <div className={screen.section}>
              <div className={styles.confirmLine}>
                <span className={screen.muted}>상품</span>
                <span className={screen.strong}>{selected.name}</span>
              </div>
              <div className={styles.confirmLine}>
                <span className={screen.muted}>구성</span>
                <span className={screen.strong}>{detail}</span>
              </div>
              <hr className={screen.divider} />
              <div className={styles.confirmLine}>
                <span className={screen.muted}>결제 금액</span>
                <span className={styles.confirmTotal}>{krw(effectivePrice(selected))}</span>
              </div>
              <p className={screen.muted}>* 최종 결제 금액은 서버가 요금제 가격으로 재확인합니다.</p>
            </div>
          ) : null}

          {/* 2단계: 환불 규정 동의 */}
          {step >= 2 ? (
            <div className={screen.section}>
              <Checkbox
                label="환불 규정을 확인했으며 이에 동의합니다."
                checked={agreeRefund}
                onChange={(e) => setAgreeRefund(e.target.checked)}
              />
            </div>
          ) : null}

          {/* 3단계: 결제 진행 동의 + 서버 연동 안내 */}
          {step >= 3 ? (
            <div className={screen.section}>
              <Checkbox
                label="위 내용을 확인했으며 결제를 진행합니다."
                checked={agreePay}
                onChange={(e) => setAgreePay(e.target.checked)}
              />
              <p className={styles.noteBox}>
                결제 서버(Toss) 연동은 서버 RPC로 처리됩니다. 클라이언트는 금액을 전송하지 않으며,
                서버가 요금제 가격을 재조회해 승인합니다.
              </p>
            </div>
          ) : null}
        </BottomSheet>
      ) : null}
    </>
  );
}
