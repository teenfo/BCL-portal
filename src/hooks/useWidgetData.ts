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
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    switch (queryKey) {
        // ── 회원 ──
        case 'members_active_count': {
            const { count } = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active');
            return count ?? 0;
        }
        case 'members_total_count': {
            const { count } = await supabase.from('members').select('id', { count: 'exact', head: true });
            return count ?? 0;
        }
        case 'members_today_new': {
            const { count } = await supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'members_expiring_soon': {
            const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true })
                .eq('status', 'active').lte('end_date', in7days).gte('end_date', today);
            return count ?? 0;
        }

        // ── 수업 ──
        case 'schedule_remaining_today': {
            const now = new Date().toISOString();
            const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
                .gte('booking_date', today).lte('booking_date', today);
            return count ?? 0;
        }
        case 'schedule_total_today': {
            const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
                .gte('booking_date', today).lte('booking_date', today);
            return count ?? 0;
        }
        case 'schedule_next_session_time':
            return '--:--';
        case 'schedule_avg_booking_rate':
            return 0;
        case 'schedule_upcoming_sessions': {
            const { data } = await supabase.from('bookings').select('*')
                .gte('booking_date', today).order('booking_date', { ascending: true }).limit(2);
            return data || [];
        }

        // ── 체크인 ──
        case 'checkins_today_count': {
            const { count } = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'checkins_today_qr': {
            const { count } = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00').eq('checkin_method', 'qr');
            return count ?? 0;
        }
        case 'checkins_today_kiosk': {
            const { count } = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00').eq('checkin_method', 'kiosk');
            return count ?? 0;
        }
        case 'checkins_today_manual': {
            const { count } = await supabase.from('checkins').select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00').eq('checkin_method', 'manual');
            return count ?? 0;
        }
        case 'checkins_recent': {
            const { data } = await supabase.from('checkins')
                .select('id, checkin_time, checkin_method, member_id, members(name)')
                .gte('checkin_time', today + 'T00:00:00')
                .order('checkin_time', { ascending: false }).limit(3);
            return (data || []).map((c: any) => ({
                member_name: c.members?.name || 'Unknown',
                checkin_method: c.checkin_method,
                checkin_time: c.checkin_time,
            }));
        }

        // ── 결제 ──
        case 'transactions_today_total': {
            const { data } = await supabase.from('transactions').select('amount')
                .gte('created_at', today + 'T00:00:00').eq('payment_status', 'completed');
            return data?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) ?? 0;
        }
        case 'transactions_today_count': {
            const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
                .gte('created_at', today + 'T00:00:00');
            return count ?? 0;
        }
        case 'transactions_pending_count': {
            const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
                .eq('payment_status', 'pending');
            return count ?? 0;
        }
        case 'transactions_month_total': {
            const { data } = await supabase.from('transactions').select('amount')
                .gte('created_at', startOfMonth + 'T00:00:00').eq('payment_status', 'completed');
            return data?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) ?? 0;
        }
        case 'transactions_recent': {
            const { data } = await supabase.from('transactions')
                .select('id, amount, category, created_at, member_id, members(name)')
                .order('created_at', { ascending: false }).limit(2);
            return (data || []).map((t: any) => ({
                member_name: t.members?.name || 'Unknown',
                amount: `₩${Number(t.amount).toLocaleString()}`,
                created_at: t.created_at,
            }));
        }

        // ── 알림 ──
        case 'notifications_unread_count':
            return 0; // TODO: notifications 테이블 연동
        case 'notifications_today_sent':
            return 0;
        case 'notifications_scheduled_count':
            return 0;

        // ── 멤버십 ──
        case 'memberships_active_count': {
            const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true })
                .eq('status', 'active');
            return count ?? 0;
        }
        case 'memberships_expiring_7days': {
            const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true })
                .eq('status', 'active').lte('end_date', in7days).gte('end_date', today);
            return count ?? 0;
        }
        case 'memberships_popular_plan':
            return '-'; // TODO: aggregate query

        // ── 코치 ──
        case 'coaches_active_count': {
            const { count } = await supabase.from('coaches').select('id', { count: 'exact', head: true })
                .eq('status', 'active');
            return count ?? 0;
        }
        case 'coaches_assigned_today':
            return 0; // TODO: sessions join
        case 'coaches_unassigned_sessions':
            return 0; // TODO: sessions where coach_id is null

        // ── 고객지원 ──
        case 'support_pending_count':
            return 0; // TODO: support_tickets 테이블
        case 'support_today_count':
            return 0;
        case 'support_urgent_count':
            return 0;
        case 'support_recent_tickets':
            return [];

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
