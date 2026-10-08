// Small shared UI bits: toasts and a modal shell.
import { h } from './dom.js?v=20261008165204';
import { sfx } from './sfx.js?v=20261008165204';

export function toast(text, { icon = '✦', ms = 3200 } = {}) {
  const root = document.getElementById('toasts');
  if (!root) return;
  const el = h('div.toast', { role: 'status' }, h('span.toast__icon', {}, icon), h('span', {}, text));
  root.append(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, ms);
}

/**
 * Open a modal. `content` is a Node. Returns { el, close }.
 * Closes on Esc, backdrop click, or any [data-close] element.
 */
export function openModal(content, { className = '', label = 'Dialog', onClose, dismissible = true } = {}) {
  const prevFocus = document.activeElement;
  const panel = h('div.modal__panel', { role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' }, content);
  const el = h('div.modal', { class: className }, h('div.modal__backdrop', { 'data-close': dismissible ? '' : null }), panel);

  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) close();
  };
  function close() {
    document.removeEventListener('keydown', onKey);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
    document.body.classList.remove('has-modal');
    onClose?.();
    prevFocus?.focus?.({ preventScroll: true });
  }
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      sfx.play('click');
      close();
    }
  });
  document.addEventListener('keydown', onKey);
  document.body.append(el);
  document.body.classList.add('has-modal');
  requestAnimationFrame(() => panel.focus({ preventScroll: true }));
  return { el, close };
}
