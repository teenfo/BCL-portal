'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WidgetDefinition, ModalDefinition } from '@/types/widget';
import { defaultWidgetRegistry } from '@/config/widget-registry';
import { defaultModalRegistry } from '@/config/modal-registry';

/**
 * DB + 코드 레지스트리 통합 훅
 * - 시스템 위젯: 코드의 defaultWidgetRegistry
 * - AI/커스텀 위젯: DB의 widget_definitions (source: ai_generated | custom)
 * - 두 소스를 합쳐서 전체 위젯 레지스트리를 반환
 */
export function useWidgetRegistry() {
    const [dbWidgets, setDbWidgets] = useState<WidgetDefinition[]>([]);
    const [dbModals, setDbModals] = useState<ModalDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDbDefinitions = useCallback(async () => {
        try {
            const supabase = createClient();

            // AI/커스텀 위젯 로드
            const { data: widgetRows } = await supabase
                .from('widget_definitions')
                .select('*')
                .in('source', ['ai_generated', 'custom'])
                .order('default_order', { ascending: true });

            if (widgetRows) {
                const mapped: WidgetDefinition[] = widgetRows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    category: row.category,
                    icon: row.icon,
                    iconColor: row.icon_color,
                    defaultEnabled: row.default_enabled,
                    defaultOrder: row.default_order,
                    heroMetric: row.hero_metric,
                    contextItems: row.context_items || [],
                    progressBar: row.progress_bar || undefined,
                    badgeKey: row.badge_key || undefined,
                    miniList: row.mini_list || undefined,
                    actions: row.actions || [],
                    detailHref: row.detail_href || undefined,
                }));
                setDbWidgets(mapped);
            }

            // AI/커스텀 모달 로드
            const { data: modalRows } = await supabase
                .from('modal_definitions')
                .select('*')
                .in('source', ['ai_generated', 'custom']);

            if (modalRows) {
                const mapped: ModalDefinition[] = modalRows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    fields: row.fields || [],
                    submitAction: row.submit_action || {},
                }));
                setDbModals(mapped);
            }
        } catch (err) {
            console.error('[useWidgetRegistry] DB fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDbDefinitions();
    }, [fetchDbDefinitions]);

    // 코드 레지스트리 + DB 레지스트리 합치기 (DB가 우선)
    const allWidgets: WidgetDefinition[] = [
        ...defaultWidgetRegistry,
        ...dbWidgets.filter(dw => !defaultWidgetRegistry.some(sw => sw.id === dw.id)),
    ];

    const allModals: ModalDefinition[] = [
        ...defaultModalRegistry,
        ...dbModals.filter(dm => !defaultModalRegistry.some(sm => sm.id === dm.id)),
    ];

    return {
        widgets: allWidgets,
        modals: allModals,
        dbWidgets,
        dbModals,
        loading,
        refresh: fetchDbDefinitions,
    };
}
