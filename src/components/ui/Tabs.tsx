'use client';

// 표준 Tabs (docs/12-design-system §4.8)
// variant line(하단 accent 인디케이터) / segmented(surface-raised 트랙)
// role=tablist/tab/tabpanel · 방향키 이동 · aria-selected
// 선택 상태를 ?tab= URL 쿼리와 동기 (syncUrl 기본 true, 쿼리키 'tab')
import { useCallback, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Tabs.module.css';

export interface TabItem {
  key: string;
  label: ReactNode;
  disabled?: boolean;
}

export type TabsVariant = 'line' | 'segmented';

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: TabsVariant;
  /** ?tab= URL 쿼리와 동기 (기본 true) */
  syncUrl?: boolean;
  /** 동기 쿼리 키 (기본 'tab') */
  queryKey?: string;
  /** tabpanel 연결용 aria-label */
  'aria-label'?: string;
}

export function Tabs({
  tabs,
  value,
  onChange,
  variant = 'line',
  syncUrl = true,
  queryKey = 'tab',
  'aria-label': ariaLabel,
}: TabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = useCallback(
    (key: string) => {
      onChange(key);
      if (syncUrl && typeof window !== 'undefined') {
        const params = new URLSearchParams(searchParams?.toString());
        params.set(queryKey, key);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    },
    [onChange, syncUrl, searchParams, queryKey, router],
  );

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabled = tabs.map((t, i) => ({ t, i })).filter(({ t }) => !t.disabled);
    const pos = enabled.findIndex(({ i }) => i === index);
    let nextPos = pos;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPos = (pos + 1) % enabled.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      nextPos = (pos - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') nextPos = 0;
    else if (e.key === 'End') nextPos = enabled.length - 1;
    else return;
    e.preventDefault();
    const target = enabled[nextPos];
    if (!target) return;
    tabRefs.current[target.i]?.focus();
    select(target.t.key);
  };

  return (
    <div
      className={[styles.tablist, styles[variant]].join(' ')}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab, index) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            className={[styles.tab, selected ? styles.selected : null]
              .filter(Boolean)
              .join(' ')}
            onClick={() => select(tab.key)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
