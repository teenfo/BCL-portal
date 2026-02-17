'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
            <main className="flex-1 ml-64 p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">요금제 관리</h1>
                        <p style={{ color: 'var(--foreground-secondary)' }}>{plans.length}개 요금제</p>
                    </div>
                    <button onClick={() => openModal()} className="px-4 py-2 rounded-lg font-semibold transition-colors" style={{ background: 'var(--bcl-orange)', color: '#fff' }}>
                        + 요금제 추가
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-3 text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto" style={{ borderColor: 'var(--bcl-orange)' }}></div>
                        </div>
                    ) : (
                        plans.map((plan) => (
                            <div key={plan.id} className="glass-card p-6 rounded-xl relative group">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button onClick={() => openModal(plan)} className="text-sm px-3 py-1 rounded" style={{ background: 'rgba(59,130,246,0.2)', color: '#3B82F6' }}>수정</button>
                                        <button onClick={() => deletePlan(plan.id)} className="text-sm px-3 py-1 rounded" style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>삭제</button>
                                    </div>
                                </div>
                                <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>{plan.description || '설명 없음'}</p>
                                <div className="text-3xl font-bold mb-1" style={{ color: 'var(--bcl-orange)' }}>
                                    ₩{Number(plan.price).toLocaleString()}
                                </div>
                                <div className="flex gap-4 mt-3" style={{ color: 'var(--foreground-secondary)' }}>
                                    <span className="text-sm">📅 {plan.duration_days}일</span>
                                    {plan.credits > 0 && <span className="text-sm">🎫 {plan.credits}회</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                        <div className="glass-card p-8 rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold text-white mb-6">{editingPlan ? '요금제 수정' : '새 요금제 추가'}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>요금제 이름</label>
                                    <input className="bcl-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: All Access Unlimited" />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>설명</label>
                                    <textarea className="bcl-input w-full" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="요금제 설명" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>가격 (원)</label>
                                        <input type="number" className="bcl-input w-full" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>기간 (일)</label>
                                        <input type="number" className="bcl-input w-full" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>횟수 (0 = 무제한)</label>
                                    <input type="number" className="bcl-input w-full" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--foreground-secondary)' }}>취소</button>
                                <button onClick={savePlan} className="flex-1 py-2 rounded-lg font-semibold" style={{ background: 'var(--bcl-orange)', color: '#fff' }}>저장</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
