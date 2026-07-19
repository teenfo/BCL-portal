'use client';

import { useContext } from 'react';
import { PermissionsContext, type PermissionsContextValue } from './PermissionsContext';

// 권한 컨텍스트 소비 훅 — PermissionsProvider(admin 레이아웃) 하위에서만 사용
export function useMyPermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('useMyPermissions는 PermissionsProvider 하위에서만 사용할 수 있습니다.');
  }
  return ctx;
}
