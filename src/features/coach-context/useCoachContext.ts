'use client';

import { useContext } from 'react';
import { CoachContext, type CoachContextValue } from './CoachContext';

/** 코치 상태 컨텍스트 소비 훅 — CoachContextProvider 하위에서만 사용 */
export function useCoachContext(): CoachContextValue {
  const ctx = useContext(CoachContext);
  if (!ctx) {
    throw new Error('useCoachContext는 CoachContextProvider 하위에서만 사용 가능합니다.');
  }
  return ctx;
}
