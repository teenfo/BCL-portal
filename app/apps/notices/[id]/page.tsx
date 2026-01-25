"use client";

export const runtime = "edge";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, User, Eye, Share2 } from "lucide-react";

export default function NoticeDetailPage() {
    const params = useParams();
    const router = useRouter();

    const notice = {
        id: params.id,
        title: "Lunar New Year Special Class Schedule",
        category: "Operations",
        date: "Jan 25, 2026",
        author: "Admin Team",
        views: 124,
        content: `
      Dear Members,

      In celebration of Lunar New Year, we are adjusting our schedule for the upcoming weekend. 
      Most morning classes will proceed as normal, but evening slots will be consolidated.

      Please check the 'Schedule' tab for the most up-to-date availability for your favorite sessions.

      Wishing you a powerful and healthy new year!
      
      - BCL Management
    `
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-500 pb-20">
            <header className="flex items-center justify-between">
                <button onClick={() => router.back()} className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <button className="p-3 text-muted hover:text-primary transition-colors">
                    <Share2 size={20} />
                </button>
            </header>

            <div className="space-y-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {notice.category}
                </span>
                <h1 className="text-3xl font-black tracking-tighter leading-tight">
                    {notice.title}
                </h1>
                <div className="flex items-center gap-6 text-[10px] font-bold text-muted uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {notice.date}
                    </div>
                    <div className="flex items-center gap-2">
                        <Eye size={14} />
                        {notice.views} Views
                    </div>
                </div>
            </div>

            <div className="h-px bg-border shadow-sm"></div>

            <article className="prose prose-sm font-medium text-fg/80 leading-relaxed whitespace-pre-line p-1">
                {notice.content}
            </article>

            <div className="mt-12 p-6 bg-surface2/30 rounded-3xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-on-primary font-black">
                        B
                    </div>
                    <div>
                        <p className="text-[10px] text-muted font-bold uppercase">Published by</p>
                        <p className="text-sm font-black italic">{notice.author}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
