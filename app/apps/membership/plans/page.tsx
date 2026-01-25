"use client";

import { CreditCard, CheckCircle2, Zap, ArrowRight, ShieldCheck, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PlansPage() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const plans = [
        {
            id: 'iron-lite',
            name: 'Iron Pulse Lite',
            price: '49',
            features: ['2 Classes / Week', 'Gym Access (9am-5pm)', 'Community Access'],
            theme: 'bg-surface'
        },
        {
            id: 'iron-elite',
            name: 'Iron Pulse Elite',
            price: '99',
            features: ['Unlimited Classes', '24/7 Gym Access', 'Monthly Coaching Session', 'Nutrition Guide'],
            theme: 'bg-primary',
            popular: true
        },
        {
            id: 'iron-pro',
            name: 'Iron Pulse Pro',
            price: '199',
            features: ['Everything in Elite', '1-on-1 Personal Trainer', 'Private Locker', 'Unlimited Guest Passes'],
            theme: 'bg-surface'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="text-center">
                <h1 className="text-3xl font-black tracking-tighter">Level Up Your Journey</h1>
                <p className="text-muted text-sm font-medium mt-2">Pick the plan that fits your ambition</p>
            </header>

            <div className="space-y-6">
                {plans.map((plan) => (
                    <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full text-left rounded-[2.5rem] p-6 border transition-all active:scale-[0.98] relative overflow-hidden ${selectedPlan === plan.id ? 'border-primary ring-2 ring-primary/20 bg-surface' : 'border-border bg-surface'
                            } ${plan.popular && selectedPlan !== plan.id ? 'ring-1 ring-primary/10' : ''}`}
                    >
                        {plan.popular && (
                            <div className="absolute top-4 right-6 bg-primary text-on-primary text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">Most Popular</div>
                        )}

                        <div className="flex flex-col gap-1">
                            <h3 className="font-exrabold text-lg tracking-tight flex items-center gap-2">
                                {plan.name}
                                {selectedPlan === plan.id && <CheckCircle2 size={18} className="text-primary fill-primary/10" />}
                            </h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black">${plan.price}</span>
                                <span className="text-muted text-xs font-bold uppercase tracking-widest">/ Month</span>
                            </div>
                        </div>

                        <ul className="mt-6 space-y-2">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs font-medium text-muted">
                                    <BadgeCheck size={14} className="text-primary opacity-60" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </button>
                ))}
            </div>

            {/* Trust & Policy */}
            <div className="p-6 bg-surface2/30 rounded-3xl border border-dashed border-border text-center">
                <div className="flex items-center justify-center gap-4 text-muted mb-4">
                    <ShieldCheck size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Secure Checkout</span>
                </div>
                <p className="text-[10px] text-muted font-medium leading-relaxed italic">
                    All memberships include a 7-day money-back guarantee. Standard terms and conditions apply to all plan upgrades.
                </p>
            </div>

            {/* Persistent CTA */}
            <div className={`fixed bottom-6 left-6 right-6 transition-all duration-300 transform ${selectedPlan ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <Link href={`/apps/billing/payments`} className="block w-full bg-primary text-on-primary py-5 rounded-[2.25rem] font-black text-center shadow-2xl shadow-primary/30 flex items-center justify-center gap-3">
                    Secure Order
                    <ArrowRight size={20} />
                </Link>
            </div>
        </div>
    );
}
