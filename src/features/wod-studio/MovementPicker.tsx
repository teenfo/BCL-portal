'use client';

// 동작 검색 위젯 — fn_search_wod_movements (library 탭과 동일 소스, 인라인 검색) (02-admin §3.8)
// 라인별 movement 참조 선택. 선택 시 movement_id + 표시명 부모로 전달.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Button } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MovementSearchResult } from './types';
import styles from './wod-studio.module.css';

interface Props {
  /** 현재 선택된 동작 표시명 (movement 참조 시) */
  currentName: string | null;
  onPick: (m: MovementSearchResult) => void;
  onClear: () => void;
}

export function MovementPicker({ currentName, onPick, onClear }: Props) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 300ms 디바운스 (02 §3 공통)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const results = useQuery<MovementSearchResult[]>(
    () =>
      rpc<MovementSearchResult[]>(getSupabaseBrowserClient(), 'fn_search_wod_movements', {
        p_query: debounced || null,
        p_limit: 30,
      }),
    [debounced],
  );

  // 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const list = useMemo(() => results.data ?? [], [results.data]);

  return (
    <div className={styles.picker} ref={rootRef}>
      {currentName ? (
        <div className={styles.pickerCurrent}>
          <span>선택됨: {currentName}</span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            해제
          </Button>
        </div>
      ) : null}
      <Input
        label="동작 검색 (라이브러리)"
        value={term}
        placeholder="이름·slug로 검색"
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open ? (
        <div className={styles.pickerResults}>
          {results.loading ? (
            <div className={styles.pickerEmpty}>검색 중…</div>
          ) : results.error ? (
            <div className={styles.pickerEmpty}>{results.error}</div>
          ) : list.length === 0 ? (
            <div className={styles.pickerEmpty}>결과 없음</div>
          ) : (
            list.map((m) => (
              <button
                key={m.id}
                type="button"
                className={styles.pickerOption}
                onClick={() => {
                  onPick(m);
                  setOpen(false);
                  setTerm('');
                }}
              >
                <span>{m.name_ko}</span>
                <span className={styles.pickerOptionSub}>
                  {m.name_en} · {m.category}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
