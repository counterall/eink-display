import { useState } from 'react';

// One split-flap card. When `value` changes, the top half of the old value folds down over the
// hinge and the bottom half of the new value drops into place (CSS animations, 150 ms + 150 ms).
// The resting layers already show the new value, so a browser without animations or 3D
// transforms, or with prefers-reduced-motion, simply shows the new digits. Each change restarts
// the flaps (new keys), so a big jump after sleep is one flip, never a queue of catch-up flips.
// Pure state step: a new value starts a new turn (remembering the old value); the same value keeps the state.
export const nextFlipState = (state, value) => (state.value === value ? state : { value, previous: state.value, turn: state.turn + 1 });

export default function FlipCard({ value, kind, children }) {
  const [state, setState] = useState({ value, previous: value, turn: 0 });
  // Derived state: update during render, so the flip starts in the same commit as the new value.
  if (state.value !== value) setState(nextFlipState(state, value));
  const turning = state.turn > 0 ? ' flip-flap--turn' : '';
  const digits = (text) => <span className="flip-digits">{text}</span>;
  return <span className={`flip-card flip-card--${kind}`}>
    {children}
    <span className="flip-half flip-top" aria-hidden="true">{digits(state.value)}</span>
    <span className="flip-half flip-bottom" aria-hidden="true">{digits(state.previous)}</span>
    {state.turn > 0 && <span key={`top-${state.turn}`} className={`flip-half flip-top flip-flap flip-flap--top${turning}`} aria-hidden="true">{digits(state.previous)}</span>}
    <span key={`bottom-${state.turn}`} className={`flip-half flip-bottom flip-flap flip-flap--bottom${turning}`} aria-hidden="true">{digits(state.value)}</span>
    <span className="flip-hinge" aria-hidden="true" />
  </span>;
}
