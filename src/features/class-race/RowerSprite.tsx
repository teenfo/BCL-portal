// 카툰 로워 스프라이트(레퍼런스 캐릭터 디자인) — 이모지 대체 벡터 SVG.
//   보트에 올린 로잉머신(헐+레일+플라이휠) 위 치비 로워. 팀컬러(--team-color)는 탱크탑·캡·헐 스트라이프,
//   피부/메탈 등 고정 팔레트는 --bcl-race-char-* 토큰만 사용(hex는 tokens.css).
//   스트로크 사이클(캐치→드라이브→피니시→리커버리)은 CSS 키프레임 — 주기는 애니메이터가
//   --stroke-dur(실측 SPM)로 주입, data-idle 시 일시정지. 1위(.kart[data-rank='1'])는 헬멧+고글 표시.
import styles from './race.module.css';

export function RowerSprite() {
  return (
    <svg viewBox="0 0 210 132" className={styles.rower} aria-hidden="true">
      {/* 물보라(선미/선수) — 고정 주기 플러터 */}
      <ellipse className={styles.splashA} cx="18" cy="108" rx="14" ry="7" />
      <ellipse className={styles.splashB} cx="198" cy="103" rx="11" ry="6" />

      {/* 헐(보트) + 팀 스트라이프 */}
      <path
        d="M10 88 L190 88 L204 94 Q202 108 180 112 L34 112 Q12 112 10 98 Z"
        fill="var(--bcl-race-char-dark)"
      />
      <rect x="16" y="99" width="174" height="6" rx="3" fill="var(--team-color)" opacity="0.9" />

      {/* 레일(슬라이드) + 풋레스트 */}
      <rect x="40" y="80" width="112" height="6" rx="3" fill="var(--bcl-race-char-metal)" />
      <rect x="138" y="62" width="9" height="20" rx="4" fill="var(--bcl-race-char-metal)" transform="rotate(18 142 72)" />

      {/* 플라이휠 — 스트로크 주기로 회전 */}
      <g className={styles.rowFly}>
        <circle cx="164" cy="59" r="21" fill="var(--bcl-race-char-metal)" />
        <circle cx="164" cy="59" r="14" fill="var(--bcl-race-char-dark)" />
        <rect x="163" y="42" width="2.4" height="14" rx="1.2" fill="var(--bcl-race-char-metal-hi)" />
        <rect x="163" y="42" width="2.4" height="14" rx="1.2" fill="var(--bcl-race-char-metal-hi)" transform="rotate(120 164 59)" />
        <rect x="163" y="42" width="2.4" height="14" rx="1.2" fill="var(--bcl-race-char-metal-hi)" transform="rotate(240 164 59)" />
        <circle cx="164" cy="59" r="5" fill="var(--bcl-race-char-metal-hi)" />
      </g>

      {/* 체인 — 핸들↔플라이휠(당김에 맞춰 신축) */}
      <rect className={styles.rowChain} x="134" y="56" width="14" height="3" rx="1.5" fill="var(--bcl-race-char-metal-hi)" />

      {/* 시트 그룹(슬라이드 왕복): 시트+힙+다리 */}
      <g className={styles.rowSeat}>
        <rect x="78" y="75" width="24" height="8" rx="4" fill="var(--bcl-race-char-metal-hi)" />
        <path d="M92 70 L126 58" stroke="var(--bcl-race-char-dark)" strokeWidth="13" strokeLinecap="round" />
        <path d="M126 58 L142 72" stroke="var(--bcl-race-char-skin)" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="145" cy="74" rx="7" ry="5" fill="var(--bcl-race-char-dark)" />
        <rect x="79" y="61" width="23" height="17" rx="8" fill="var(--bcl-race-char-dark)" />
      </g>

      {/* 상체 그룹(스윙): 탱크탑+머리+캡 (+리더 헬멧) */}
      <g className={styles.rowBody}>
        <rect x="73" y="35" width="29" height="37" rx="12" fill="var(--team-color)" />
        <circle cx="100" cy="23" r="15" fill="var(--bcl-race-char-skin)" />
        <circle cx="107" cy="20" r="2.1" fill="var(--bcl-race-char-dark)" />
        <path d="M104 28 Q108 31 112 27" stroke="var(--bcl-race-char-dark)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* 캡(팀컬러) + 챙 */}
        <path d="M85 21 A15 15 0 0 1 115 21 L115 23 L85 23 Z" fill="var(--team-color)" />
        <rect x="106" y="18" width="13" height="4.5" rx="2.2" fill="var(--team-color)" />
        {/* 리더 전용 헬멧+고글 — data-rank=1에서만 표시 */}
        <g className={styles.helmet}>
          <path d="M83 22 A17 17 0 0 1 117 22 L117 25 L83 25 Z" fill="var(--bcl-race-char-light)" />
          <rect x="93" y="16" width="24" height="8" rx="4" fill="var(--bcl-race-char-metal)" />
          <rect x="95" y="18" width="20" height="4" rx="2" fill="var(--bcl-race-glow, var(--bcl-race-char-metal-hi))" />
        </g>
      </g>

      {/* 팔 그룹(당김 왕복): 팔+손+핸들 */}
      <g className={styles.rowArm}>
        <path d="M90 44 L133 55" stroke="var(--bcl-race-char-skin)" strokeWidth="9" strokeLinecap="round" />
        <circle cx="134" cy="56" r="5.2" fill="var(--bcl-race-char-skin-shade)" />
        <rect x="131" y="47" width="5.5" height="17" rx="2.5" fill="var(--bcl-race-char-dark)" />
      </g>
    </svg>
  );
}
