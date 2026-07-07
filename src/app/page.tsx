// 랜딩 셸 — Phase 1(인증)에서 /auth/login 리다이렉트로 교체 예정 (docs/01-auth §1)
export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--bcl-pad-page)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>BCL Portal</h1>
        <p style={{ color: 'var(--bcl-text-muted)', marginTop: 'var(--bcl-space-2)' }}>
          재구축 스캐폴드 — Phase 1(스키마·인증) 대기 중
        </p>
      </div>
    </main>
  );
}
