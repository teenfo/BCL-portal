"use client";

import { HelpCircle, Mail, MessageSquare, ChevronRight, Link } from "lucide-react";

export default function UserSupportPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Support</h1>
                <p className="text-muted text-sm font-medium mt-1">We&apos;re here to help.</p>
            </header>

            <div className="bg-primary text-on-primary p-8 rounded-[2.5rem] text-center shadow-xl shadow-primary/30 space-y-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto text-white">
                    <MessageSquare size={32} />
                </div>
                <div>
                    <h2 className="text-lg font-black">Chat with Support</h2>
                    <p className="text-white/80 text-xs mt-2 px-8">Typical response time: Under 5 minutes.</p>
                </div>
                <button className="bg-white text-primary px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wide w-full active:scale-95 transition-transform">
                    Start Chat
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Self Service</h3>
                {[
                    { label: "FAQs & Guides", icon: HelpCircle },
                    { label: "Email Us", icon: Mail },
                ].map((item, i) => (
                    <div key={i} className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                                <item.icon size={20} />
                            </div>
                            <span className="font-bold text-sm tracking-tight">{item.label}</span>
                        </div>
                        <ChevronRight size={16} className="text-muted/50 group-hover:text-fg transition-colors" />
                    </div>
                ))}
            </div>
        </div>
    );
}
