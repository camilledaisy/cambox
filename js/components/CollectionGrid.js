import { h } from '../lib/dom.js?v=20261008165204';
import { CARDS, SPECIAL_CARDS } from '../data/cards.js?v=20261008165204';
import { store } from '../lib/store.js?v=20261008165204';
import { Card, CardSilhouette } from './Card.js?v=20261008165204';

/**
 * Grid of every card: discovered ones render normally, the rest as silhouettes.
 * filter: 'all' | rarity id
 */
export function CollectionGrid({ filter = 'all', onOpen }) {
  const list = CARDS.filter((c) => filter === 'all' || c.rarity === filter);
  // Special (error) cards only show up in "All", as a mysterious bonus slot.
  const specials = filter === 'all' ? SPECIAL_CARDS : [];

  const items = [...list, ...specials].map((card, i) => {
    const owned = store.owned(card.id);
    const found = (owned?.count ?? 0) > 0;
    const isSpecial = SPECIAL_CARDS.includes(card);
    const label = found ? card.name : '???';

    const body = found ? Card(card, { shiny: owned.shiny > 0 && owned.shiny === owned.count }) : CardSilhouette(card);
    const tag = h(
      'div.dex-item__label',
      {},
      h('span.dex-item__no', {}, isSpecial ? '???' : card.no),
      h('span.dex-item__name', {}, label),
      found && h('span.dex-item__check', { 'aria-label': 'discovered' }, '✓'),
    );
    const badges = found && h(
      'div.dex-item__badges',
      {},
      owned.count > 1 && h('span.dex-badge', {}, `×${owned.count}`),
      owned.shiny > 0 && h('span.dex-badge.dex-badge--shiny', { title: 'Shiny owned' }, '✦'),
    );

    return h(
      found ? 'button.dex-item' : 'div.dex-item',
      {
        class: `${found ? 'is-found' : 'is-locked'}${isSpecial ? ' is-special' : ''}`,
        type: found ? 'button' : null,
        style: { '--i': i },
        onClick: found ? () => onOpen?.(card) : null,
        'aria-label': found ? `Open ${card.name}` : null,
      },
      h('div.dex-item__card', {}, body, badges),
      tag,
    );
  });

  return h(
    'div.dex-grid',
    {},
    items.length ? items : h('p.dex-empty', {}, 'No cards in this rarity yet.'),
  );
}
