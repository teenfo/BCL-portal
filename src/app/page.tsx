export default function HomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center">
                <h1 className="text-5xl font-bold text-white mb-4">
                    BCL Portal
                </h1>
                <p className="text-xl text-slate-300 mb-8">
                    프로젝트 초기화 완료
                </p>
                <div className="text-sm text-slate-400">
                    <p>오프라인 피트니스 지점 운영 통합 플랫폼</p>
                    <p className="mt-2">Next.js + Supabase + Cloudflare</p>
                </div>
            </div>
        </main>
    );
}
