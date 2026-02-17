'use client';

import React from 'react';
import { WidgetDefinition, WidgetData, WidgetAction } from '@/types/widget';

interface WidgetCardContentProps {
    definition: WidgetDefinition;
    data: WidgetData;
    loading: boolean;
    error: string | null;
}

/**
 * 위젯 카드 내부 콘텐츠 (Hero Metric + Context Items + Progress Bar)
 */
export default function WidgetCardContent({ definition, data, loading, error }: WidgetCardContentProps) {
    if (error) {
        return (
            <div className="py-8 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/60">Error</p>
                <p className="text-[9px] text-white/30 mt-1">{error}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-white/[0.05] rounded-lg w-1/2" />
                <div className="space-y-2">
                    <div className="h-3 bg-white/[0.03] rounded w-3/4" />
                    <div className="h-3 bg-white/[0.03] rounded w-1/2" />
                </div>
            </div>
        );
    }

    const { heroMetric, contextItems, progressBar } = definition;

    // Hero Metric 값 포매팅
    const formatValue = (val: unknown, format: string, currencySymbol?: string, denominatorKey?: string): string => {
        if (val === null || val === undefined) return '-';
        switch (format) {
            case 'number':
                return Number(val).toLocaleString();
            case 'currency':
                return `${currencySymbol || '₩'}${Number(val).toLocaleString()}`;
            case 'percentage':
                return `${Number(val).toFixed(1)}%`;
            case 'fraction': {
                const denominator = denominatorKey ? data[denominatorKey] : null;
                return `${Number(val).toLocaleString()} / ${denominator !== null ? Number(denominator).toLocaleString() : '-'}`;
            }
            default:
                return String(val);
        }
    };

    const heroValue = data[heroMetric.queryKey];
    const badgeValue = definition.badgeKey ? data[definition.badgeKey] : null;

    return (
        <div className="space-y-5">
            {/* Hero Metric */}
            <div>
                <p className="text-2xl font-black text-white tracking-tight leading-none">
                    {formatValue(heroValue, heroMetric.format, heroMetric.currencySymbol, heroMetric.denominatorKey)}
                </p>
                {badgeValue && Number(badgeValue) > 0 && (
                    <span
                        className="inline-block mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase"
                        style={{
                            background: `${definition.iconColor}20`,
                            color: definition.iconColor,
                            border: `1px solid ${definition.iconColor}30`,
                        }}
                    >
                        +{String(badgeValue)}
                    </span>
                )}
            </div>

            {/* Context Items */}
            <div className="space-y-2">
                {contextItems.map((ci) => {
                    const val = data[ci.queryKey];
                    const isAlert = ci.alertThreshold !== undefined && Number(val) >= ci.alertThreshold;
                    return (
                        <div key={ci.queryKey} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide">{ci.label}</span>
                            <span className={`text-[11px] font-black ${isAlert ? 'text-red-400' : 'text-white/70'}`}>
                                {ci.format === 'currency'
                                    ? `₩${Number(val || 0).toLocaleString()}`
                                    : ci.format === 'time'
                                        ? String(val || '--:--')
                                        : Number(val || 0).toLocaleString()
                                }
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Progress Bar */}
            {progressBar && (
                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${Math.min(((Number(data[progressBar.valueKey] || 0)) / Math.max(Number(data[progressBar.maxKey] || 1), 1)) * 100, 100)}%`,
                            background: `linear-gradient(90deg, ${progressBar.color}, ${progressBar.color}cc)`,
                            boxShadow: `0 0 12px ${progressBar.color}40`,
                        }}
                    />
                </div>
            )}
        </div>
    );
}
