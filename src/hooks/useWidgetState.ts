'use client';

import { useState, useCallback, useEffect } from 'react';
import { WidgetUserState } from '@/types/widget';
import { defaultWidgetRegistry } from '@/config/widget-registry';

const STORAGE_KEY_PREFIX = 'bcl_dashboard_widgets_';

function getStorageKey(userId?: string): string {
    return `${STORAGE_KEY_PREFIX}${userId || 'anonymous'}`;
}

function getDefaultState(): WidgetUserState {
    return {
        activeWidgets: defaultWidgetRegistry
            .filter(w => w.defaultEnabled)
            .sort((a, b) => a.defaultOrder - b.defaultOrder)
            .map(w => w.id),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Widget 사용자 상태 관리 훅
 * - localStorage 기반 persist
 * - 위젯 추가/제거/순서 변경
 */
export function useWidgetState(userId?: string) {
    const [state, setState] = useState<WidgetUserState>(getDefaultState);

    // 마운트 시 localStorage에서 로드
    useEffect(() => {
        try {
            const key = getStorageKey(userId);
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed: WidgetUserState = JSON.parse(saved);
                // 유효한 위젯 ID만 필터링 (Registry에서 삭제된 위젯 대응)
                const validIds = new Set(defaultWidgetRegistry.map(w => w.id));
                parsed.activeWidgets = parsed.activeWidgets.filter(id => validIds.has(id));
                setState(parsed);
            }
        } catch {
            // localStorage 접근 불가 시 기본값 유지
        }
    }, [userId]);

    // 상태 저장 헬퍼
    const persist = useCallback((newState: WidgetUserState) => {
        setState(newState);
        try {
            const key = getStorageKey(userId);
            localStorage.setItem(key, JSON.stringify(newState));
        } catch {
            // localStorage 접근 불가 시 무시
        }
    }, [userId]);

    // 위젯 순서 변경 (DnD 후 호출)
    const reorderWidgets = useCallback((newOrder: string[]) => {
        persist({
            activeWidgets: newOrder,
            updatedAt: new Date().toISOString(),
        });
    }, [persist]);

    // 위젯 추가
    const addWidget = useCallback((widgetId: string) => {
        if (state.activeWidgets.includes(widgetId)) return;
        persist({
            activeWidgets: [...state.activeWidgets, widgetId],
            updatedAt: new Date().toISOString(),
        });
    }, [state.activeWidgets, persist]);

    // 위젯 제거
    const removeWidget = useCallback((widgetId: string) => {
        persist({
            activeWidgets: state.activeWidgets.filter(id => id !== widgetId),
            updatedAt: new Date().toISOString(),
        });
    }, [state.activeWidgets, persist]);

    // 전체 초기화
    const resetToDefault = useCallback(() => {
        persist(getDefaultState());
    }, [persist]);

    // 사용 가능하지만 활성화되지 않은 위젯 목록
    const availableWidgets = defaultWidgetRegistry.filter(
        w => !state.activeWidgets.includes(w.id)
    );

    // 활성 위젯 Definition 목록 (순서대로)
    const activeWidgetDefinitions = state.activeWidgets
        .map(id => defaultWidgetRegistry.find(w => w.id === id))
        .filter(Boolean) as typeof defaultWidgetRegistry;

    return {
        state,
        activeWidgetDefinitions,
        availableWidgets,
        reorderWidgets,
        addWidget,
        removeWidget,
        resetToDefault,
    };
}
