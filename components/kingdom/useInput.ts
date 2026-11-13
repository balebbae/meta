'use client';
/** Keyboard + touch input as one mutable snapshot. Scenes read `ref.current` every frame; the games compute edges. */
import {useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent, type SyntheticEvent} from 'react';
import {NO_INPUT, type Input} from '@/lib/kingdom/games/common';

const KEYS: Record<string, keyof Input> = {ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump', Enter: 'action', KeyJ: 'action'};

export type TouchBind = {onPointerDown: (e: PointerEvent) => void; onPointerUp: (e: PointerEvent) => void; onPointerLeave: () => void; onPointerCancel: () => void; onContextMenu: (e: SyntheticEvent) => void};

export function useInput(active: boolean): {ref: MutableRefObject<Input>; bind: (name: keyof Input | (keyof Input)[]) => TouchBind} {
  const ref = useRef<Input>({...NO_INPUT});
  useEffect(() => {
    if (!active) return;
    const setKey = (e: KeyboardEvent, down: boolean) => {
      const name = KEYS[e.code]; if (!name) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      e.preventDefault(); ref.current[name] = down;
      if (name === 'jump') ref.current.action = down; // Space is "the button" in every game
    };
    const down = (e: KeyboardEvent) => setKey(e, true), up = (e: KeyboardEvent) => setKey(e, false), blur = () => { ref.current = {...NO_INPUT}; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); ref.current = {...NO_INPUT}; };
  }, [active]);
  const bind = useMemo(() => (name: keyof Input | (keyof Input)[]): TouchBind => {
    const names = Array.isArray(name) ? name : [name];
    const set = (v: boolean) => { for (const n of names) ref.current[n] = v; };
    return {
      onPointerDown: (e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); set(true); },
      onPointerUp: (e) => { e.preventDefault(); set(false); },
      onPointerLeave: () => set(false),
      onPointerCancel: () => set(false),
      onContextMenu: (e) => e.preventDefault(),
    };
  }, []);
  return {ref, bind};
}
