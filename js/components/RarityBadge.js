import { h, pixelStar } from '../lib/dom.js?v=20261008165204';
import { rarityById } from '../lib/gacha.js?v=20261008165204';

/** Stars + label, e.g. ★★★ RARE.  size: 'sm' | 'md' | 'lg' */
export function RarityBadge(rarityId, { size = 'md', shiny = false } = {}) {
  const r = rarityById(rarityId);
  const stars = r.stars > 0 ? Array.from({ length: r.stars }, () => pixelStar()).join('') : '<b>?</b><b>?</b><b>?</b>';
  return h(
    'span.rbadge',
    { class: `rb-${r.id} rb-${size}${shiny ? ' rb-shiny' : ''}`, title: `${r.label}${shiny ? ' (Shiny)' : ''}` },
    h('span.rbadge__stars', { html: stars }),
    h('span.rbadge__label', {}, r.label.toUpperCase()),
  );
}
