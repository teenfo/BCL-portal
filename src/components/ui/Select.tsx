'use client';

// 표준 Select (docs/12-design-system §4.7)
// native(모바일 OS 피커) / custom(admin — 검색·다중선택 드롭다운)
// custom: role=listbox / aria-expanded / 키보드 ↑↓·Enter·ESC·타이핑 점프
// Input과 동일 셸 + 우측 셰브론
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectBaseProps {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  helper?: string;
  searchable?: boolean;
  /** true면 native OS 피커 강제 (모바일). searchable/multiple과 함께 쓰지 않음 */
  native?: boolean;
}

export interface SingleSelectProps extends SelectBaseProps {
  multiple?: false;
  value: string | null;
  onChange: (value: string) => void;
}

export interface MultiSelectProps extends SelectBaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type SelectProps = SingleSelectProps | MultiSelectProps;

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={[styles.chevron, open ? styles.chevronOpen : null].filter(Boolean).join(' ')}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export function Select(props: SelectProps) {
  const {
    label,
    options,
    placeholder = '선택',
    disabled,
    error,
    helper,
    searchable,
    native,
  } = props;
  const id = useId();
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  const meta = error ? (
    <p className={styles.error} id={`${id}-error`} role="alert">
      {error}
    </p>
  ) : helper ? (
    <p className={styles.helper} id={`${id}-helper`}>
      {helper}
    </p>
  ) : null;

  // ---- native ----
  if (native && props.multiple !== true) {
    const single = props as SingleSelectProps;
    return (
      <div className={styles.root}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <div className={styles.shell}>
          <select
            id={id}
            className={styles.nativeSelect}
            value={single.value ?? ''}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => single.onChange(e.target.value)}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <Chevron open={false} />
        </div>
        {meta}
      </div>
    );
  }

  return (
    <CustomSelect {...props} id={id} describedBy={describedBy} searchable={searchable} meta={meta} />
  );
}

function CustomSelect(
  props: SelectProps & { id: string; describedBy?: string; meta: React.ReactNode },
) {
  const { label, options, placeholder = '선택', disabled, error, id, describedBy, searchable, meta } =
    props;
  const multiple = props.multiple === true;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-list`;

  // 포털 플로팅 위치 — 뷰포트 기준 fixed. 아래 공간 부족 시 위로 플립.
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 4; // 트리거와 메뉴 간격(px)
    const margin = 8; // 뷰포트 가장자리 여백(px)
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin - gap;
    const desired = 280; // 선호 최대 높이(px)
    // 아래 공간이 충분하거나 위보다 넓으면 아래로, 아니면 위로 플립
    const openDown = spaceBelow >= Math.min(desired, spaceAbove) || spaceBelow >= 200;
    const maxHeight = Math.max(120, openDown ? spaceBelow : spaceAbove);
    const top = openDown ? rect.bottom + gap : Math.max(margin, rect.top - gap - maxHeight);
    const left = Math.max(margin, Math.min(rect.left, vw - rect.width - margin));
    setMenuPos({ left, top, width: rect.width, maxHeight });
  }, []);

  const selectedValues = useMemo<string[]>(() => {
    if (multiple) return (props.value as string[]) ?? [];
    const v = props.value as string | null;
    return v ? [v] : [];
  }, [multiple, props.value]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const commit = useCallback(
    (value: string) => {
      if (multiple) {
        const cur = (props.value as string[]) ?? [];
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        (props.onChange as (v: string[]) => void)(next);
      } else {
        (props.onChange as (v: string) => void)(value);
        setOpen(false);
      }
    },
    [multiple, props.value, props.onChange],
  );

  // 외부 클릭 닫기 — 포털 메뉴는 root 밖이므로 menuRef도 함께 검사
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // 열려 있는 동안 조상 스크롤(capture)·리사이즈에 맞춰 재배치
  useEffect(() => {
    if (!open) return;
    const onReflow = () => positionMenu();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, positionMenu]);

  // 트리거로 열기 — 즉시 위치 계산 후 오픈(effect 내 setState 금지 규약 → 이벤트 핸들러에서 배치)
  const openMenu = useCallback(() => {
    positionMenu();
    setOpen(true);
  }, [positionMenu]);

  // 타이핑 점프 (검색 비활성 시)
  const jumpRef = useRef('');
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt && !opt.disabled) commit(opt.value);
    } else if (!searchable && e.key.length === 1) {
      // 타이핑 점프
      jumpRef.current += e.key.toLowerCase();
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => (jumpRef.current = ''), 600);
      const idx = filtered.findIndex((o) => o.label.toLowerCase().startsWith(jumpRef.current));
      if (idx >= 0) setActiveIndex(idx);
    }
  };

  const triggerLabel = (() => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) {
      if (selectedValues.length === 1) {
        return options.find((o) => o.value === selectedValues[0])?.label ?? placeholder;
      }
      return `${selectedValues.length}개 선택됨`;
    }
    return options.find((o) => o.value === selectedValues[0])?.label ?? placeholder;
  })();

  return (
    <div className={styles.root} ref={rootRef}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={[styles.shell, styles.trigger, error ? styles.invalid : null]
          .filter(Boolean)
          .join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span
          className={[styles.triggerText, selectedValues.length === 0 ? styles.placeholder : null]
            .filter(Boolean)
            .join(' ')}
        >
          {triggerLabel}
        </span>
        <Chevron open={open} />
      </button>

      {open && menuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className={styles.menu}
              style={{
                position: 'fixed',
                left: menuPos.left,
                top: menuPos.top,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
              }}
            >
              {searchable ? (
                <input
                  className={styles.search}
                  type="text"
                  value={query}
                  placeholder="검색"
                  autoFocus
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onKeyDown}
                />
              ) : null}
              <ul className={styles.list} role="listbox" id={listId} aria-multiselectable={multiple}>
                {filtered.length === 0 ? (
                  <li className={styles.noResult}>결과 없음</li>
                ) : (
                  filtered.map((o, i) => {
                    const isSelected = selectedValues.includes(o.value);
                    return (
                      <li
                        key={o.value}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={o.disabled || undefined}
                        className={[
                          styles.option,
                          i === activeIndex ? styles.active : null,
                          isSelected ? styles.optionSelected : null,
                          o.disabled ? styles.optionDisabled : null,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!o.disabled) commit(o.value);
                        }}
                      >
                        {multiple ? (
                          <span className={styles.check} aria-hidden="true">
                            {isSelected ? '✓' : ''}
                          </span>
                        ) : null}
                        {o.label}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
      {meta}
    </div>
  );
}
