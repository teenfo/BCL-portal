# BCL Portal – Agent Checklist

Agent는 작업 전/후 반드시 이 체크리스트를 기준으로 판단한다.

---

## ✅ 작업 시작 전 (Before)
- [ ] 요청한 기능이 **Sitemap에 존재하는가?**
- [ ] apps / admin 중 어느 영역인가?
- [ ] 제외 범위(레이스, 키오스크, 센서 등)에 해당하지 않는가?
- [ ] CSR 기준으로 설계 가능한가?
- [ ] Supabase RLS로 보안이 가능한 구조인가?

---

## 🧱 구조 점검 (During)
- [ ] 라우트가 `/apps/*` 또는 `/admin/*` 규칙을 따르는가?
- [ ] 사용자 화면에서 Admin 데이터는 Read-only인가?
- [ ] Service Role Key가 클라이언트에 사용되지 않았는가?
- [ ] Auth 흐름이 명확한가? (login → callback → session)

---

## 🔐 보안 점검
- [ ] 모든 DB 접근은 RLS를 전제로 하는가?
- [ ] 권한 판단을 UI에만 의존하지 않았는가?
- [ ] 외부 API Secret은 Worker/Edge Function에만 있는가?

---

## 🧪 완료 후 (After)
- [ ] Sitemap과 실제 구현이 불일치하지 않는가?
- [ ] User/Admin 간 책임이 섞이지 않았는가?
- [ ] 추후 확장이 가능한 구조인가?
- [ ] 문서 수정이 필요한 변경은 없는가?

---

## ❌ 즉시 중단 조건
- Sitemap에 없는 기능 구현 요청
- 제외 범위 기능 제안
- CSR 전제를 깨는 설계
- Supabase RLS 없이 보안 설명 시도
