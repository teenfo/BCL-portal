// 카툰 로워 스프라이트(레퍼런스 2.5D 캐릭터) — 3/4 정면 뷰(관객쪽), 플라이휠 왼쪽(선미 방향).
//   로잉은 뒤를 보고 젓는다: 보트는 오른쪽(진행)으로, 로워는 왼쪽(플라이휠)을 향함 — 레퍼런스 동일.
//   팀컬러(--team-color)=탱크탑·캡·헐 스트라이프, 고정 팔레트는 --bcl-race-char-*(hex는 tokens.css).
//   스트로크 사이클은 CSS 키프레임 — 주기는 애니메이터의 --stroke-dur(실측 SPM), data-idle 시 정지.
//   1위(.kart[data-rank='1'])는 흰 헬멧+고글 표시.
import styles from './race.module.css';

export function RowerSprite() {
  return (
    <svg viewBox="0 0 214 160" className={styles.rower} aria-hidden="true">
      {/* 물보라 — 선수(우)·선미(좌)·플라이휠 하단 */}
      <ellipse className={styles.splashA} cx="18" cy="136" rx="15" ry="7" />
      <ellipse className={styles.splashB} cx="200" cy="120" rx="12" ry="6" />
      <ellipse className={styles.splashB} cx="48" cy="128" rx="10" ry="5" />

      {/* 헐(원근 평행사변형) + 팀 스트라이프 + 측면 두께 */}
      <path
        d="M16 126 L192 108 L206 116 Q202 130 178 134 L36 146 Q18 142 16 126 Z"
        fill="var(--bcl-race-char-dark)"
      />
      <path d="M24 128 L188 112 L192 116 L30 134 Z" fill="var(--team-color)" opacity="0.9" />

      {/* 레일(뒤-오른쪽 → 앞-왼쪽) + 풋플레이트 */}
      <path d="M152 96 L60 112" stroke="var(--bcl-race-char-metal)" strokeWidth="7" strokeLinecap="round" />
      <rect x="62" y="96" width="9" height="18" rx="4" fill="var(--bcl-race-char-metal)" transform="rotate(-20 66 105)" />

      {/* 플라이휠(왼쪽·정면) — 스트로크 주기 회전 */}
      <g className={styles.rowFly}>
        <ellipse cx="48" cy="90" rx="20" ry="23" fill="var(--bcl-race-char-metal)" />
        <ellipse cx="48" cy="90" rx="13" ry="15" fill="var(--bcl-race-char-dark)" />
        <rect x="46.8" y="72" width="2.4" height="15" rx="1.2" fill="var(--bcl-race-char-metal-hi)" />
        <rect x="46.8" y="72" width="2.4" height="15" rx="1.2" fill="var(--bcl-race-char-metal-hi)" transform="rotate(120 48 90)" />
        <rect x="46.8" y="72" width="2.4" height="15" rx="1.2" fill="var(--bcl-race-char-metal-hi)" transform="rotate(240 48 90)" />
        <circle cx="48" cy="90" r="5" fill="var(--bcl-race-char-metal-hi)" />
      </g>

      {/* 체인 — 플라이휠 허브 ↔ 핸들(당김 신축) */}
      <rect
        className={styles.rowChain}
        x="52"
        y="87"
        width="34"
        height="3"
        rx="1.5"
        fill="var(--bcl-race-char-metal-hi)"
        transform="rotate(-24 52 89)"
      />

      {/* 시트 그룹(슬라이드 왕복): 시트+힙+다리(발은 풋플레이트 방향) */}
      <g className={styles.rowSeat}>
        <ellipse cx="120" cy="96" rx="12" ry="5" fill="var(--bcl-race-char-metal-hi)" />
        <path d="M118 88 L88 72" stroke="var(--bcl-race-char-dark)" strokeWidth="13" strokeLinecap="round" />
        <path d="M88 72 L70 96" stroke="var(--bcl-race-char-skin)" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="69" cy="100" rx="7" ry="5" fill="var(--bcl-race-char-dark)" />
        <path d="M122 90 L94 76" stroke="var(--bcl-race-char-dark)" strokeWidth="9" strokeLinecap="round" opacity="0.75" />
        <rect x="108" y="78" width="23" height="17" rx="8" fill="var(--bcl-race-char-dark)" />

        {/* 상체 그룹(스윙): 탱크탑+머리(3/4 얼굴)+캡 (+리더 헬멧) */}
        <g className={styles.rowBody}>
          <rect x="100" y="46" width="27" height="38" rx="11" fill="var(--team-color)" transform="rotate(-6 113 65)" />
          <circle cx="117" cy="34" r="15" fill="var(--bcl-race-char-skin)" />
          {/* 3/4 얼굴 — 왼쪽(진행 반대, 플라이휠쪽)을 본다 */}
          <circle cx="109" cy="32" r="2.2" fill="var(--bcl-race-char-dark)" />
          <circle cx="117" cy="31" r="2.2" fill="var(--bcl-race-char-dark)" />
          <path d="M107 40 Q111 43 116 41" stroke="var(--bcl-race-char-dark)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* 캡(팀컬러) — 챙은 왼쪽 */}
          <path d="M102 28 A15 15 0 0 1 132 30 L132 33 L102 31 Z" fill="var(--team-color)" />
          <rect x="94" y="27" width="15" height="4.5" rx="2.2" fill="var(--team-color)" transform="rotate(-8 101 29)" />
          {/* 리더 헬멧+고글 */}
          <g className={styles.helmet}>
            <path d="M100 30 A17 17 0 0 1 134 32 L134 36 L100 34 Z" fill="var(--bcl-race-char-light)" />
            <rect x="101" y="26" width="26" height="8" rx="4" fill="var(--bcl-race-char-metal)" />
            <rect x="103" y="28" width="22" height="4" rx="2" fill="var(--bcl-race-glow, var(--bcl-race-char-metal-hi))" />
          </g>
        </g>

        {/* 팔 그룹(당김): 양팔 → 핸들(플라이휠 방향) */}
        <g className={styles.rowArm}>
          <path d="M108 54 L86 72" stroke="var(--bcl-race-char-skin-shade)" strokeWidth="7.5" strokeLinecap="round" />
          <path d="M120 56 L88 74" stroke="var(--bcl-race-char-skin)" strokeWidth="8.5" strokeLinecap="round" />
          <circle cx="86" cy="73" r="5.2" fill="var(--bcl-race-char-skin-shade)" />
          <rect x="80" y="64" width="5.5" height="17" rx="2.5" fill="var(--bcl-race-char-dark)" transform="rotate(-18 83 72)" />
        </g>
      </g>
    </svg>
  );
}
