// Pointer-driven 3D tilt. Sets CSS vars the card styles read:
//   --rx / --ry  rotation, --mx / --my  pointer position (for holo + glare),
//   --hyp        0 at centre → 1 at the edges (holo intensity).
import { clamp } from './dom.js?v=20261008165204';

export function attachTilt(el, { max = 18, target = el } = {}) {
  let rect = null;
  let raf = 0;

  const set = (px, py, active) => {
    target.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`);
    target.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`);
    target.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    target.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    target.style.setProperty('--hyp', clamp(Math.hypot(px - 0.5, py - 0.5) * 2).toFixed(3));
    target.classList.toggle('is-tilting', active);
  };

  const onMove = (e) => {
    rect ||= el.getBoundingClientRect();
    const px = clamp((e.clientX - rect.left) / rect.width);
    const py = clamp((e.clientY - rect.top) / rect.height);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => set(px, py, true));
  };
  const onLeave = () => {
    rect = null;
    cancelAnimationFrame(raf);
    set(0.5, 0.5, false);
  };
  const onEnter = () => {
    rect = el.getBoundingClientRect();
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointercancel', onLeave);
  window.addEventListener('scroll', onLeave, { passive: true });
  set(0.5, 0.5, false);

  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.removeEventListener('pointercancel', onLeave);
    window.removeEventListener('scroll', onLeave);
  };
}
