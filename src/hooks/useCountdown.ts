import { useEffect, useState } from 'react';
import { computeCountdown, type CountdownParts } from '../utils/countdown';

export function useCountdown(targetMs: number, nowFn: () => number = Date.now): CountdownParts {
  const [parts, setParts] = useState(() => computeCountdown(nowFn(), targetMs));
  useEffect(() => {
    let id: number;
    const tick = () => {
      const next = computeCountdown(nowFn(), targetMs);
      setParts(next);
      if (!next.done) id = window.setTimeout(tick, 1000 - (nowFn() % 1000) + 5);
    };
    tick();
    return () => clearTimeout(id);
  }, [targetMs, nowFn]);
  return parts;
}
