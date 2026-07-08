'use client';

// 표준 Input (docs/12-design-system §4.6)
// label-htmlFor 연결 필수 · error는 aria-invalid + aria-describedby · password 표시 토글 내장
import { useId, useState } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputBaseProps {
  label: string; // 라벨 없는 필드 금지 (placeholder를 label 대용 금지)
  error?: string | null;
  helper?: string;
  /** type="password"일 때 표시 토글(기본 켜짐) — 끄려면 false */
  passwordToggle?: boolean;
}

export interface InputProps
  extends InputBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  multiline?: false;
}

export interface TextareaProps
  extends InputBaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  multiline: true;
}

const OWN_PROPS = ['label', 'error', 'helper', 'passwordToggle', 'multiline', 'id'] as const;

function fieldProps(props: InputProps | TextareaProps): Record<string, unknown> {
  const rest = { ...props } as Record<string, unknown>;
  for (const key of OWN_PROPS) delete rest[key];
  return rest;
}

export function Input(props: InputProps | TextareaProps) {
  const autoId = useId();
  const [revealed, setRevealed] = useState(false);

  const { label, error, helper } = props;
  const id = props.id ?? autoId;
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

  if (props.multiline) {
    return (
      <div className={styles.root}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <textarea
          {...(fieldProps(props) as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          className={`${styles.field} ${styles.textarea}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {meta}
      </div>
    );
  }

  const isPassword = props.type === 'password';
  const withToggle = isPassword && props.passwordToggle !== false;
  const resolvedType = withToggle && revealed ? 'text' : props.type;

  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.fieldWrap}>
        <input
          {...(fieldProps(props) as InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          type={resolvedType}
          className={`${styles.field}${withToggle ? ` ${styles.hasToggle}` : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {withToggle ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? '비밀번호 숨기기' : '비밀번호 표시'}
            aria-pressed={revealed}
          >
            {revealed ? '숨김' : '표시'}
          </button>
        ) : null}
      </div>
      {meta}
    </div>
  );
}
