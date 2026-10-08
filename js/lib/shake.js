import { rand, reducedMotion } from './dom.js?v=20261008165204';

/**
 * Shake an element for `duration` ms, intensity ramping from→to (px).
 * Calls onTick(i, progress) on a quickening rhythm (for rattle sounds / particles).
 * Resolves early when shouldStop() returns true.
 */
export function shake(el, { duration = 1200, from = 2, to = 6, onTick, shouldStop = () => false } = {}) {
  const scale = reducedMotion() ? 0.3 : 1;
  return new Promise((resolve) => {
    const t0 = performance.now();
    let lastTick = 0;
    let ticks = 0;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration);
      if (k >= 1 || shouldStop()) {
        el.style.translate = '';
        el.style.rotate = '';
        resolve();
        return;
      }
      const amp = (from + (to - from) * k * k) * scale;
      el.style.translate = `${rand(-amp, amp).toFixed(1)}px ${rand(-amp, amp * 0.5).toFixed(1)}px`;
      el.style.rotate = `${(rand(-amp, amp) * 0.6).toFixed(2)}deg`;
      if (now - lastTick > 120 - k * 60) {
        lastTick = now;
        onTick?.(ticks++, k);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
