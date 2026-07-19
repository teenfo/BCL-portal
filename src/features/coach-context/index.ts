// 코치 상태머신 컨텍스트 + 게이트 배럴 (docs/04 §4)
export { CoachContextProvider, CoachContext } from './CoachContext';
export type {
  CoachContextValue,
  CoachContextData,
  CoachContextStatus,
} from './CoachContext';
export { useCoachContext } from './useCoachContext';
export { CoachStateGate } from './CoachStateGate';
export { CoachStateScreen } from './CoachStateScreen';
