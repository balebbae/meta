export type CallMode = 'voice' | 'video';
export type CallState = {
  id: string;
  from: number;
  mode: CallMode;
  phase: 'ringing' | 'active';
  offer: string;
  answer: string | null;
  ice: {from: number; candidate: string}[];
};

export type CallAction =
  | {type: 'start'; from: number; mode: CallMode; offer: string; id: string}
  | {type: 'answer'; from: number; answer: string}
  | {type: 'ice'; from: number; candidate: string}
  | {type: 'end'};

export function isCallState(value: unknown): value is CallState {
  if (!value || typeof value !== 'object') return false;
  const row = value as CallState;
  return typeof row.id === 'string' && typeof row.from === 'number' && (row.mode === 'voice' || row.mode === 'video')
    && (row.phase === 'ringing' || row.phase === 'active') && typeof row.offer === 'string'
    && (row.answer === null || typeof row.answer === 'string') && Array.isArray(row.ice);
}

/** Pure call-state transitions. 'busy' and 'gone' are refusals; null means the call ended. */
export function reduceCall(state: CallState | null, action: CallAction): CallState | null | 'busy' | 'gone' {
  if (action.type === 'end') return null;
  if (action.type === 'start') {
    if (state) return 'busy';
    return {id: action.id, from: action.from, mode: action.mode, phase: 'ringing', offer: action.offer, answer: null, ice: []};
  }
  if (!state) return 'gone';
  if (action.type === 'answer') {
    if (state.phase !== 'ringing' || action.from === state.from) return 'gone';
    return {...state, phase: 'active', answer: action.answer};
  }
  const ice = [...state.ice, {from: action.from, candidate: action.candidate}].slice(-40);
  return {...state, ice};
}
