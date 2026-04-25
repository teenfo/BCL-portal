'use client';

import type { CoachContextStatus } from './types';

interface CoachStateScreenProps {
    status: Exclude<CoachContextStatus, 'linked_active'>;
    coachName?: string | null;
}

const STATE_CONFIG: Record<Exclude<CoachContextStatus, 'linked_active'>, {
    icon: string;
    title: string;
    description: string;
    cta?: { label: string; href: string };
    accent: string;
}> = {
    unauthenticated: {
        icon: '🔒',
        title: '로그인이 필요합니다',
        description: '코치 운영 화면을 사용하려면 먼저 로그인해 주세요.',
        cta: { label: '로그인 화면으로 이동', href: '/auth/login' },
        accent: '#F59E0B',
    },
    unlinked: {
        icon: '🔗',
        title: '코치 계정 연결이 필요합니다',
        description: '관리자에게 코치 계정 연결을 요청해 주세요. 연결이 완료되면 운영 보드, 출결 관리, Race 운영 기능을 사용할 수 있습니다.',
        cta: { label: '관리자에게 연결 요청', href: 'mailto:admin@bcl.local?subject=코치 계정 연결 요청' },
        accent: '#F59E0B',
    },
    linked_unassigned: {
        icon: '⏳',
        title: '배정 대기 중입니다',
        description: '코치 계정은 연결되었지만 아직 활성 수업 배정이 없습니다. 관리자에게 수업 배정을 요청해 주세요.',
        cta: { label: '프로필 보기', href: '/coach/profile' },
        accent: '#3B82F6',
    },
    on_leave: {
        icon: '🌙',
        title: '휴직/비활성 상태입니다',
        description: '현재 휴직(또는 비활성) 상태로 운영 화면이 제한됩니다. 운영 복귀가 필요하시면 관리자에게 문의해 주세요.',
        cta: { label: '프로필 보기', href: '/coach/profile' },
        accent: '#A78BFA',
    },
};

export default function CoachStateScreen({ status, coachName }: CoachStateScreenProps) {
    const cfg = STATE_CONFIG[status];

    return (
        <div className="app-page" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="app-glass-card" style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                width: '100%',
                maxWidth: 420,
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }} aria-hidden>
                    {cfg.icon}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '0.5rem' }}>
                    {cfg.title}
                </h2>
                {coachName && status !== 'unauthenticated' && status !== 'unlinked' && (
                    <p style={{ fontSize: '0.8125rem', color: cfg.accent, fontWeight: 600, marginBottom: '0.5rem' }}>
                        Coach {coachName}
                    </p>
                )}
                <p style={{ fontSize: '0.875rem', color: 'var(--app-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {cfg.description}
                </p>
                {cfg.cta && (
                    <a
                        href={cfg.cta.href}
                        style={{
                            display: 'inline-block',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--app-radius-lg)',
                            background: cfg.accent,
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textDecoration: 'none',
                        }}
                    >
                        {cfg.cta.label}
                    </a>
                )}
            </div>
        </div>
    );
}
