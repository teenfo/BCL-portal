'use client';

// 인증 컨텍스트 소비 훅 — 구독은 AuthProvider 1곳뿐 (F-9), 소비는 이 훅으로만
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth는 <AuthProvider> 내부에서만 사용할 수 있습니다 (src/app/layout.tsx 참조).');
  }
  return ctx;
}
