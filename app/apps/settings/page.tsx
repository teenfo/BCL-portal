"use client";

import { Moon, Bell, Shield, Smartphone, ChevronRight, Globe } from "lucide-react";

export default function SettingsPage() {
    interface SettingItem {
        label: string;
        icon: React.ElementType;
        value?: string;
        active?: boolean;
    }

    const sections: { title: string; items: SettingItem[] }[] = [
        {
            title: "Preferences", items: [
                { label: "Dark Mode", icon: Moon, value: "System", active: true },
                { label: "Notifications", icon: Bell, value: "Enabled", active: true },
                { label: "Language", icon: Globe, value: "English", active: false },
            ]
        },
        {
            title: "Legal & About", items: [
                { label: "Privacy Policy", icon: Shield },
                { label: "App Version", icon: Smartphone, value: "1.0.0 (Public Beta)" },
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Preferences</h1>
                <p className="text-muted text-sm font-medium">Tailor your BCL experience.</p>
            </header>

            <div className="space-y-8">
                {sections.map((section, i) => (
                    <section key={i} className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted px-1">{section.title}</h3>
                        <div className="bg-surface rounded-3xl border border-border divide-y divide-border overflow-hidden shadow-soft">
                            {section.items.map((item, j) => (
                                <div key={j} className="p-5 flex items-center justify-between hover:bg-surface2/30 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.active ? 'bg-primary-soft text-primary' : 'bg-surface2 text-muted'}`}>
                                            <item.icon size={20} />
                                        </div>
                                        <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {item.value && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted opacity-60">
                                                {item.value}
                                            </span>
                                        )}
                                        <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="text-center pt-8">
                <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] opacity-30">Iron Pulse Systems © 2026</p>
            </div>
        </div>
    );
}
