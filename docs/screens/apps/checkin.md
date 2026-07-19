# apps/checkin — 체크인 QR (탭3)

> 라우트: `/apps/checkin` (하단탭3) · 상태 🟡
> 상위 설계: 03-user-app §3.3 · 구현: `src/features/member-checkin/`
> 검증/INSERT는 키오스크(06-kiosk SSOT, `docs/screens/kiosk/scan.md`). 이 화면은 QR 발급/조회만.

## ① 목적
회원이 입구 키오스크에 스캔할 동적 QR을 발급받고, 월간 출석 캘린더·통계를 확인한다.

## ② 핵심 기능
- **동적 QR**: 페이로드 `{mid, fid, ts, v:1}` — TTL 5분, 만료 30초 전 자동 재발급. 카운트다운 링(SVG) 표시. 외부 의존성 없는 자체 인코더(`qr.ts`, ECC Level Q)로 canvas 렌더.
- **체크인 성공 반영**: `checkins` INSERT Realtime 구독 → 수업/시설 구분 성공 토스트 + QR 즉시 재발급 + 이력 refetch.
- **통계**: 이번 주 출석 · 연속 출석(streak) StatCard.
- **월간 출석 캘린더**: 이번 달 체크인 일자 하이라이트 + 오늘 표시 + 총 출석 횟수.

## ③ 데이터 소스
- 테이블(조회, own RLS): `members`(facility_id — QR payload용) · `checkins`(월 범위, member_id 기준)
- Realtime: `checkins` INSERT (filter `member_id=eq.{id}`)
- 판정·기록 RPC(`fn_kiosk_checkin`)는 키오스크 측 — 이 화면에서 호출하지 않음.

## ④ 상태·권한 규칙
- `useMemberId()`로 member_id 확보 — facility_id 없으면 QR 발급 불가(에러 표면화).
- QR 미발급/로드 실패 → EmptyState(error) + 재시도(무한 스피너 금지).
- **Display-Safe 무관(본인 표면)**이나 QR은 만료·재발급으로 재사용 위험 최소화. 멤버십 검증은 서버 단독.
- 표준 컴포넌트(Card/StatCard/EmptyState/Skeleton) + `--bcl-*` 토큰만. canvas QR은 자체 렌더.

## ⑤ 수용 시나리오
1. member → `/apps/checkin` → QR + 카운트다운 링(5:00부터 감소).
2. 4:30 경과(만료 30초 전) → QR 자동 재발급(ts 갱신).
3. 키오스크 스캔 성공 → Realtime로 "수업/시설 체크인 완료" 토스트 + 캘린더 당일 반영.
4. facility_id 없는 회원 → "QR을 발급하지 못했습니다" + 재시도.
