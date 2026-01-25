"use client";

import { CreditCard, Plus, ArrowRight, Shield, Zap, BadgeCheck, MoreVertical } from "lucide-react";
import { useState } from "react";

export default function AdminMembershipPlansPage() {
    const [plans, setPlans] = useState([
        { id: 1, name: 'Iron Pulse Lite', price: '49', members: 124, status: 'Active' },
        { id: 2, name: 'Iron Pulse Elite', price: '99', members: 452, status: 'Active' },
        { id: 3, name: 'Iron Pulse Pro', price: '199', members: 89, status: 'Active' },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Membership Products</h1>
                    <p className="text-muted text-sm font-medium mt-1">Configure pricing tiers and subscription benefits.</p>
                </div>
                <button className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
                    <Plus size={18} />
                    Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-surface rounded-[2.5rem] border border-border p-8 shadow-soft relative overflow-hidden group hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 rounded-2xl bg-primary-soft text-primary">
                                <Shield size={20} />
                            </div>
                            <button className="p-2 text-muted hover:bg-surface2 rounded-xl"><MoreVertical size={16} /></button>
                        </div>

                        <h3 className="font-extrabold text-lg tracking-tight">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-black">${plan.price}</span>
                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">/mo</span>
                        </div>

                        <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
                            <div>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Subscribers</p>
                                <p className="text-sm font-black">{plan.members}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-success/10 text-success">
                                {plan.status}
                            </span>
                        </div>

                        {/* Decorative pulse for active plans */}
                        <div className="absolute top-2 right-2 w-1 h-1 bg-success rounded-full"></div>
                    </div>
                ))}
            </div>

            <section className="bg-surface p-10 rounded-[3rem] border border-border shadow-soft flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center">
                    <BadgeCheck size={32} className="text-muted opacity-30" />
                </div>
                <div>
                    <h3 className="text-lg font-black tracking-tight">Policy Management</h3>
                    <p className="text-xs text-muted font-medium max-w-sm mx-auto mt-2 leading-relaxed">
                        Configure refund policies, cancellation windows, and guest pass rules globally across all plans.
                    </p>
                </div>
                <button className="bg-fg text-bg px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                    Update Global Policies
                </button>
            </section>
        </div>
    );
}
