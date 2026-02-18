import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
    title: 'BCL — Beyond CrossFit Limits | 프리미엄 피트니스',
    description: 'BCL과 함께 한계를 넘어서세요. 스마트 예약, QR 체크인, 실시간 기록 관리, 레이스 챌린지까지. 크로스핏 전문 피트니스 짐.',
    keywords: ['크로스핏', 'CrossFit', '피트니스', '짐', 'BCL', '운동', 'QR 체크인', '수업 예약'],
    openGraph: {
        title: 'BCL — Beyond CrossFit Limits',
        description: '프리미엄 크로스핏 피트니스. 스마트 예약, QR 체크인, 실시간 기록 관리.',
        type: 'website',
        locale: 'ko_KR',
        siteName: 'BCL Portal',
    },
    robots: { index: true, follow: true },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#D2691E" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="BCL" />
                <link rel="apple-touch-icon" href="/images/logo/bcl-logo.svg" />
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
            </head>
            <body suppressHydrationWarning>
                <AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>
            </body>
        </html>
    );
}

