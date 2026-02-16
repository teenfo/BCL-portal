import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'BCL Portal',
    description: 'BCL Portal - 오프라인 피트니스 지점 운영 통합 플랫폼',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
