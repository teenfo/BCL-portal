'use client';

// 표준 Checkbox — 12종 명세 외 보조 컴포넌트.
// reset.css(appearance:none)로 네이티브 체크박스가 렌더되지 않아 ui/ 표준으로 제공
// (화면별 재구현 금지 원칙 준수를 위해 컴포넌트化 — docs/12 §4 공통 규칙).
import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.root, className ?? null].filter(Boolean).join(' ')}>
      <input type="checkbox" className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
