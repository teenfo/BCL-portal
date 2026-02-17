'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconCreditCard } from '@/components/icons/AdminIcons';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    credits: number;
    created_at: string;
}

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', duration_days: '', credits: '' });

    useEffect(() => { loadPlans(); }, []);

    async function loadPlans() {
        const supabase = createClient();
        setLoading(true);
        const { data } = await supabase.from('membership_plans').select('*').order('price', { ascending: true });
        if (data) setPlans(data);
        setLoading(false);
    }

    function openModal(plan?: Plan) {
        if (plan) {
            setEditingPlan(plan);
            setForm({ name: plan.name, description: plan.description || '', price: String(plan.price), duration_days: String(plan.duration_days), credits: String(plan.credits) });
        } else {
            setEditingPlan(null);
            setForm({ name: '', description: '', price: '', duration_days: '', credits: '0' });
        }
        setShowModal(true);
    }

    async function savePlan() {
        const supabase = createClient();
        const planData = {
            name: form.name,
            description: form.description,
            price: Number(form.price),
            duration_days: Number(form.duration_days),
            credits: Number(form.credits),
        };

        if (editingPlan) {
            await supabase.from('membership_plans').update(planData).eq('id', editingPlan.id);
        } else {
            await supabase.from('membership_plans').insert(planData);
        }
        setShowModal(false);
        loadPlans();
    }

    async function deletePlan(id: string) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('membership_plans').delete().eq('id', id);
        loadPlans();
    }

    const tierColors = ['#FF6B00', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="User & Finance"
                title="Plans"
                subtitle="Management"
                actions={<button onClick={() => openModal()} className="admin-action-btn">+ 신규 요금제</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                {/* Stats row */}
                <div className="flex gap-4 mb-10">
                    {[
                        { label: 'Total Plans', value: plans.length, unit: '개', color: 'var(--primary)' },
                        { label: 'Lowest Price', value: plans.length > 0 ? `₩${Math.min(...plans.map(p => p.price)).toLocaleString()}` : '-', unit: '', color: '#22C55E' },
                        { label: 'Highest Price', value: plans.length > 0 ? `₩${Math.max(...plans.map(p => p.price)).toLocaleString()}` : '-', unit: '', color: '#8B5CF6' },
                    ].map((stat, i) => (
                        <div key={i} className="flex-1 p-5 rounded-2xl transition-all"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</p>
                            <p className="text-2xl font-black text-white">{stat.value}<span className="text-sm ml-1" style={{ color: stat.color }}>{stat.unit}</span></p>
                        </div>
                    ))}
                </div>

                {/* Plans Grid */}
                {loading ? (
                    <div className="flex justify-center py-32">
                        <div className="w-10 h-10 rounded-xl border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)' }}></div>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                        <span className="text-4xl mb-4"><IconCreditCard size={40} /></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.4)' }}>No plans found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {plans.map((plan, idx) => {
                            const accentColor = tierColors[idx % tierColors.length];
                            return (
                                <div key={plan.id}
                                    className="relative group p-6 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    {/* Top accent bar */}
                                    <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full" style={{ background: accentColor }}></div>

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4 mt-2">
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{plan.name}</h3>
                                            <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{plan.description || '설명 없음'}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => openModal(plan)}
                                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                                                수정
                                            </button>
                                            <button onClick={() => deletePlan(plan.id)}
                                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                                                삭제
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-6">
                                        <span className="text-3xl font-black" style={{ color: accentColor }}>
                                            ₩{Number(plan.price).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>기간</p>
                                            <p className="text-sm font-bold text-white">{plan.duration_days}일</p>
                                        </div>
                                        {plan.credits > 0 && (
                                            <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>횟수</p>
                                                <p className="text-sm font-bold text-white">{plan.credits}회</p>
                                            </div>
                                        )}
                                        {plan.credits === 0 && (
                                            <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>횟수</p>
                                                <p className="text-sm font-bold" style={{ color: '#22C55E' }}>무제한</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modal */}
                <AdminModal show={showModal} onClose={() => setShowModal(false)} title={editingPlan ? '요금제 수정' : '새 요금제 추가'}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>요금제 이름</label>
                            <input className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: All Access Unlimited" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>설명</label>
                            <textarea className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all resize-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="요금제 설명" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>가격 (원)</label>
                                <input type="number" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>기간 (일)</label>
                                <input type="number" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>횟수 (0 = 무제한)</label>
                            <input type="number" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowModal(false)}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all hover:bg-white/[0.06]"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            취소
                        </button>
                        <button onClick={savePlan}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                            style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>
                            저장
                        </button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
