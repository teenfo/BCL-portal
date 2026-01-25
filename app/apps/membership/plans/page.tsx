"use client";

import { Check, Zap, CreditCard } from "lucide-react";

export default function UserPlansPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Available Plans</h1>
                <p className="text-muted text-sm font-medium mt-1">Upgrade your fitness experience.</p>
            </header>

            <div className="space-y-6">
                {[
                    { name: "Iron Pulse Lite", price: "49", period: "/mo", popular: false, features: ["Gym Access"] },
                    { name: "Iron Pulse Elite", price: "99", period: "/mo", popular: true, features: ["Gym Access", "Group Classes", "Sauna"] },
                    { name: "Iron Pulse Pro", price: "199", period: "/mo", popular: false, features: ["All Access", "Priority Booking", "2 PT Sessions"] },
                ].map((plan, i) => (
                    <div key={i} className={`rounded-[2.5rem] p-8 border ${plan.popular ? 'bg-primary text-on-primary border-primary shadow-xl shadow-primary/30 scale-105' : 'bg-surface border-border shadow-soft'}`}>
                        {plan.popular && (
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                                Most Popular
                            </span>
                        )}
                        <h3 className="font-extrabold text-xl tracking-tight">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mt-2 mb-6">
                            <span className="text-3xl font-black">${plan.price}</span>
                            <span className={`text-xs font-bold uppercase tracking-widest ${plan.popular ? 'text-white/70' : 'text-muted'}`}>{plan.period}</span>
                        </div>

                        <div className="space-y-4 mb-8">
                            {plan.features.map((f, j) => (
                                <div key={j} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-primary/10'}`}>
                                        <Check size={10} className={plan.popular ? 'text-white' : 'text-primary'} strokeWidth={3} />
                                    </div>
                                    <span className={`text-sm font-bold ${plan.popular ? 'text-white/90' : 'text-fg'}`}>{f}</span>
                                </div>
                            ))}
                        </div>

                        <button className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 ${plan.popular ? 'bg-white text-primary' : 'bg-primary text-on-primary'}`}>
                            {plan.popular ? 'Current Plan' : 'Select Plan'}
                            {!plan.popular && <CreditCard size={14} />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
