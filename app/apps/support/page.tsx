"use client";

import { MessageCircle, HelpCircle, Phone, Mail, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
    const faqs = [
        { q: "How do I cancel a booking?", a: "You can cancel up to 2 hours before the session starts." },
        { q: "Can I bring a guest?", a: "Elite and Pro members have guest passes included." },
        { q: "Where is the West Side Lab?", a: "Located at 123 Fitness St, map available in Facilities." },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Support Center</h1>
                <p className="text-muted text-sm font-medium">We&apos;re here to help you stay focused.</p>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                    type="text"
                    placeholder="Search for help..."
                    className="w-full bg-surface border border-border pl-12 pr-4 py-4 rounded-[1.5rem] shadow-soft outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col gap-3 text-left hover:border-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                        <MessageCircle size={20} />
                    </div>
                    <span className="text-sm font-bold tracking-tight">Live Chat</span>
                </button>
                <button className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col gap-3 text-left hover:border-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-2xl bg-surface2 text-muted flex items-center justify-center">
                        <Phone size={20} />
                    </div>
                    <span className="text-sm font-bold tracking-tight">Call Us</span>
                </button>
            </div>

            <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Common Questions</h3>
                <div className="bg-surface rounded-3xl border border-border divide-y divide-border overflow-hidden shadow-soft">
                    {faqs.map((faq, i) => (
                        <div key={i} className="p-5 hover:bg-surface2/30 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-bold tracking-tight">{faq.q}</p>
                                <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <p className="text-xs text-muted font-medium">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="p-6 bg-surface p-6 rounded-3xl border border-border border-dashed flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center">
                    <Mail size={18} className="text-muted" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold leading-tight">Need technical help?</p>
                    <p className="text-[10px] text-muted font-medium">support@bcl-fitness.com</p>
                </div>
                <button className="text-[10px] font-black uppercase text-primary">Email →</button>
            </div>
        </div>
    );
}
