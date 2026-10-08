import { h } from '../lib/dom.js?v=20261008165204';

/** COLLECTION  7 / 10 discovered  + segmented HP-style bar. */
export function ProgressTracker({ discovered, total, shinies = 0, packs = 0 }) {
  const pct = total ? Math.round((discovered / total) * 100) : 0;
  const segmented = total <= 30;
  return h(
    'div.progress',
    {},
    h(
      'div.progress__top',
      {},
      h('span.progress__label', {}, 'COLLECTION'),
      h('span.progress__count', {}, h('b', {}, discovered), ` / ${total} discovered`),
    ),
    h(
      'div.progress__bar',
      { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(discovered), 'aria-label': 'Collection progress' },
      segmented
        ? Array.from({ length: total }, (_, i) => h('span.progress__seg', { class: i < discovered ? 'is-on' : '', style: { '--i': i } }))
        : h('span.progress__fill', { style: { width: `${pct}%` } }),
    ),
    h(
      'div.progress__meta',
      {},
      h('span', {}, `${pct}% COMPLETE`),
      h('span', {}, `✦ SHINIES ${shinies}`),
      h('span', {}, `✂ PACKS OPENED ${packs}`),
    ),
    discovered === total && total > 0 && h('div.progress__done', {}, `★ ${total}/${total} SET COMPLETE ★ Happy 25th, Camille! You are the ultimate collector.`),
  );
}
