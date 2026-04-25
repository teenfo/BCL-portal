'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WidgetData, WidgetDefinition } from '@/types/widget';

const POLLING_INTERVAL = 60_000; // 60s

/**
 * 위젯별 필요한 queryKey를 전부 추출
 */
function extractQueryKeys(widget: WidgetDefinition): string[] {
    const keys: string[] = [];
    // hero metric
    keys.push(widget.heroMetric.queryKey);
    if (widget.heroMetric.denominatorKey) keys.push(widget.heroMetric.denominatorKey);
    // context items
    widget.contextItems.forEach(ci => keys.push(ci.queryKey));
    // progress bar
    if (widget.progressBar) {
        keys.push(widget.progressBar.valueKey, widget.progressBar.maxKey);
    }
    // badge
    if (widget.badgeKey) keys.push(widget.badgeKey);
    // mini list
    if (widget.miniList) keys.push(widget.miniList.queryKey);
    return [...new Set(keys)];
}

/**
 * queryKey → Supabase 쿼리 실행
 * 실 DB 연동 시 이 함수에 쿼리 매핑을 추가합니다.
 */
async function executeQuery(queryKey: string): Promise<number | string | unknown[] | null> {
    const supabase: any = createClient();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    switch (queryKey) {
        // ── 회원 ──
        case 'members_active_count': {
            const { count }: any = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active');
            return count ?? 0;
        }
        case 'members_total_count': {
            const { count }: any = await supabase.from('members').select('id', { count: 'exact', head: true });
            return count ?? 0;
        }
        case 'members_today_new': {
            const { count }: any = await supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'members_expiring_soon': {
            const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            const { count }: any = await supabase.from('memberships').select('id', { count: 'exact', head: true })
                .eq('status', 'active').lte('end_date', in7days).gte('end_date', today);
            return count ?? 0;
        }

        // ── 수업 ──
        case 'schedule_remaining_today': {
            const now = new Date();
            const timeStr = now.toTimeString().slice(0, 8);
            const { count }: any = await supabase.from('sessions').select('id', { count: 'exact', head: true })
                .eq('session_date', today).gte('end_time', timeStr);
            return count ?? 0;
        }
        case 'schedule_total_today': {
            const { count }: any = await supabase.from('sessions').select('id', { count: 'exact', head: true })
                .eq('session_date', today);
            return count ?? 0;
        }
        case 'schedule_next_session_time': {
            const now = new Date();
            const timeStr = now.toTimeString().slice(0, 8);
            const { data: nextSession }: any = await supabase.from('sessions').select('start_time')
                .eq('session_date', today).gt('start_time', timeStr)
                .order('start_time', { ascending: true }).limit(1).single();
            return nextSession?.start_time?.slice(0, 5) || '--:--';
        }
        case 'schedule_avg_booking_rate': {
            const { data: sessions }: any = await supabase.from('sessions').select('capacity')
                .eq('session_date', today);
            if (!sessions || sessions.length === 0) return 0;
            const { count: bookingCount }: any = await supabase.from('bookings').select('id', { count: 'exact', head: true })
                .gte('created_at', today + 'T00:00:00');
            const totalCapacity = sessions.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0);
            return totalCapacity > 0 ? Math.round(((bookingCount || 0) / totalCapacity) * 100) : 0;
        }
        case 'schedule_upcoming_sessions': {
            const { data }: any = await supabase.from('bookings').select('*')
                .gte('created_at', today + 'T00:00:00').order('created_at', { ascending: true }).limit(2);
            return data || [];
        }

        // ── 체크인 ──
        case 'checkins_today_count': {
            const { count }: any = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'checkins_today_qr': {
            const { count }: any = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00').eq('checkin_method', 'qr');
            return count ?? 0;
        }
        case 'checkins_today_kiosk': {
            const { count }: any = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00').eq('checkin_method', 'kiosk');
            return count ?? 0;
        }
        case 'checkins_today_manual': {
            const { count }: any = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00').eq('checkin_method', 'manual');
            return count ?? 0;
        }
        case 'checkins_recent': {
            const { data }: any = await supabase.from('checkins')
                .select('id, checkin_time, time, checkin_method, member_id, member_name, members!checkins_member_id_fkey(name)')
                .gte('checkin_time', today + 'T00:00:00')
                .order('checkin_time', { ascending: false }).limit(3);
            return (data || []).map((c: any) => ({
                member_name: c.members?.name || c.member_name || 'Unknown',
                checkin_method: c.checkin_method || 'manual',
                checkin_time: c.checkin_time || c.time,
            }));
        }

        // ── 결제 ──
        case 'transactions_today_total': {
            const { data }: any = await supabase.from('transactions').select('amount')
                .gte('created_at', today + 'T00:00:00').or('payment_status.eq.completed,status.eq.completed');
            return data?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) ?? 0;
        }
        case 'transactions_today_count': {
            const { count }: any = await supabase.from('transactions').select('id', { count: 'exact', head: true })
                .gte('created_at', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'transactions_pending_count': {
            const { count }: any = await supabase.from('transactions').select('id', { count: 'exact', head: true })
                .eq('payment_status', 'pending');
            return count ?? 0;
        }
        case 'transactions_month_total': {
            const { data }: any = await supabase.from('transactions').select('amount')
                .gte('created_at', startOfMonth + 'T00:00:00').or('payment_status.eq.completed,status.eq.completed');
            return data?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) ?? 0;
        }
        case 'transactions_recent': {
            const { data }: any = await supabase.from('transactions')
                .select('id, amount, category, created_at, member_id, members!transactions_member_id_fkey(name)')
                .order('created_at', { ascending: false }).limit(2);
            return (data || []).map((t: any) => ({
                member_name: t.members?.name || 'Unknown',
                amount: `₩${Number(t.amount).toLocaleString()}`,
                created_at: t.created_at,
            }));
        }

        // ── 알림 ──
        case 'notifications_unread_count': {
            const { count }: any = await supabase.from('notification_logs').select('id', { count: 'exact', head: true })
                .eq('read', false);
            return count ?? 0;
        }
        case 'notifications_today_sent': {
            const { count }: any = await supabase.from('notification_logs').select('id', { count: 'exact', head: true })
                .gte('sent_at', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'notifications_scheduled_count': {
            const { count }: any = await supabase.from('notification_rules').select('id', { count: 'exact', head: true })
                .eq('active', true);
            return count ?? 0;
        }

        // ── 멤버십 ──
        case 'memberships_active_count': {
            const { count }: any = await supabase.from('memberships').select('id', { count: 'exact', head: true })
                .eq('status', 'active');
            return count ?? 0;
        }
        case 'memberships_expiring_7days': {
            const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            const { count }: any = await supabase.from('memberships').select('id', { count: 'exact', head: true })
                .eq('status', 'active').lte('end_date', in7days).gte('end_date', today);
            return count ?? 0;
        }
        case 'memberships_popular_plan': {
            const { data: plans }: any = await supabase.from('memberships')
                .select('membership_plans(name)')
                .eq('status', 'active');
            if (!plans || plans.length === 0) return '-';
            const countMap: Record<string, number> = {};
            plans.forEach((p: any) => {
                const name = p.membership_plans?.name || 'Unknown';
                countMap[name] = (countMap[name] || 0) + 1;
            });
            const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
            return sorted[0]?.[0] || '-';
        }

        // ── 코치 ──
        case 'coaches_active_count': {
            const { count }: any = await supabase.from('coaches').select('id', { count: 'exact', head: true })
                .eq('status', 'active');
            return count ?? 0;
        }
        case 'coaches_assigned_today': {
            const { data: todaySessions }: any = await supabase.from('sessions')
                .select('coach_id').eq('session_date', today).not('coach_id', 'is', null);
            const uniqueCoaches = new Set((todaySessions || []).map((s: any) => s.coach_id));
            return uniqueCoaches.size;
        }
        case 'coaches_unassigned_sessions': {
            const { count }: any = await supabase.from('sessions').select('id', { count: 'exact', head: true })
                .eq('session_date', today).is('coach_id', null);
            return count ?? 0;
        }

        // ── 고객지원 ──
        case 'support_pending_count': {
            const { count }: any = await supabase.from('support_tickets').select('id', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress']);
            return count ?? 0;
        }
        case 'support_today_count': {
            const { count }: any = await supabase.from('support_tickets').select('id', { count: 'exact', head: true })
                .gte('created_at', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'support_urgent_count': {
            const { count }: any = await supabase.from('support_tickets').select('id', { count: 'exact', head: true })
                .eq('priority', 'urgent').in('status', ['open', 'in_progress']);
            return count ?? 0;
        }
        case 'support_recent_tickets': {
            const { data }: any = await supabase.from('support_tickets')
                .select('id, subject, category, priority, created_at, member_id, members!support_tickets_member_id_fkey(name)')
                .in('status', ['open', 'in_progress'])
                .order('created_at', { ascending: false }).limit(2);
            return (data || []).map((t: any) => ({
                subject: t.subject || '제목 없음',
                member_name: t.members?.name || 'Unknown',
                created_at: t.created_at,
            }));
        }

        default:
            console.warn(`[useWidgetData] Unknown queryKey: ${queryKey}`);
            return null;
    }
}

/**
 * 단일 위젯 데이터 훅
 */
export function useWidgetData(widget: WidgetDefinition) {
    const [data, setData] = useState<WidgetData>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        const keys = extractQueryKeys(widget);
        try {
            const results = await Promise.all(
                keys.map(async (key) => {
                    const value = await executeQuery(key);
                    return { key, value };
                })
            );
            if (!mountedRef.current) return;
            const newData: WidgetData = {};
            results.forEach(({ key, value }) => { newData[key] = value; });
            setData(newData);
            setError(null);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Query failed');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [widget]);

    useEffect(() => {
        mountedRef.current = true;
        fetchData();
        const interval = setInterval(fetchData, POLLING_INTERVAL);
        return () => {
            mountedRef.current = false;
            clearInterval(interval);
        };
    }, [fetchData]);

    // 외부에서 호출하여 강제 refresh
    const refresh = useCallback(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh };
}
