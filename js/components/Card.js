import { h, pixelStar } from '../lib/dom.js?v=20261008165204';
import { SET } from '../config.js?v=20261008165204';
import { CARDS } from '../data/cards.js?v=20261008165204';
import { rarityById } from '../lib/gacha.js?v=20261008165204';
import { bindCardImage } from '../lib/placeholder.js?v=20261008165204';
import { RarityBadge } from './RarityBadge.js?v=20261008165204';

const cardImg = (card, cls = '') =>
  bindCardImage(
    h('img', {
      class: cls,
      alt: cls ? '' : `Photo: ${card.name}`,
      draggable: 'false',
      decoding: 'async',
      style: { objectPosition: card.imagePosition || '50% 40%' },
    }),
    card,
  );

function Stats(stats = {}) {
  return h(
    'ul.card__stats',
    {},
    Object.entries(stats).slice(0, 4).map(([k, v]) =>
      h(
        'li',
        {},
        h('span.card__stat-k', {}, k),
        typeof v === 'number'
          ? h('span.card__stat-bar', { style: { '--v': Math.max(0, Math.min(100, v)) } })
          : h('span.card__stat-bar.is-text'),
        h('b.card__stat-v', {}, v),
      ),
    ),
  );
}

/** The back of every card (seen during the reveal before the flip). */
export function CardBack() {
  return h(
    'div.card__face.card__back',
    { 'aria-hidden': 'true' },
    h(
      'div.card__back-inner',
      {},
      h('span.card__back-corner.tl', { html: pixelStar() }),
      h('span.card__back-corner.tr', { html: pixelStar() }),
      h('span.card__back-corner.bl', { html: pixelStar() }),
      h('span.card__back-corner.br', { html: pixelStar() }),
      h('div.card__back-seal', {}, h('span', {}, 'C'), h('small', {}, 'CARDS')),
      h('div.card__back-text', {}, `${SET.edition} · ${SET.series}`),
    ),
  );
}

/**
 * A Camille trading card.
 * @param card     card data from cards.js
 * @param shiny    render the Shiny variant
 * @param withBack include a back face (for flip animations)
 */
export function Card(card, { shiny = false, withBack = false, faceDown = false } = {}) {
  const rarity = rarityById(card.rarity);
  const isError = rarity.id === 'error';
  const total = String(CARDS.length).padStart(3, '0');

  const photo = h(
    'div.card__photo',
    {},
    cardImg(card),
    isError && [cardImg(card, 'card__glitch-a'), cardImg(card, 'card__glitch-b')],
    h('span.card__era', {}, `ERA · ${card.era}`),
    shiny && h('span.card__shiny-tag', {}, '✦ SHINY'),
  );

  const front = h(
    'div.card__face.card__front',
    {},
    h(
      'div.card__frame',
      {},
      h(
        'header.card__head',
        {},
        h('span.card__no', {}, `No.${card.no}`),
        h('h3.card__name', { class: card.name.length > 22 ? 'is-xlong' : card.name.length > 16 ? 'is-long' : '', 'data-text': card.name }, card.name),
      ),
      photo,
      h('div.card__rarity', {}, RarityBadge(card.rarity, { size: 'sm', shiny }), h('span.card__set', {}, isError ? '???/???' : `${card.no}/${total}`)),
      h('p.card__desc', {}, `“${card.description}”`),
      Stats(card.stats),
      h('footer.card__foot', {}, h('span.card__logo', {}, '✿ CAMILLE CARDS'), h('span', {}, SET.edition)),
    ),
    h('div.card__holo'),
    h('div.card__sparkle'),
    h('div.card__glare'),
    isError && h('div.card__scan'),
  );

  return h(
    'article.card',
    {
      class: `r-${rarity.id}${shiny ? ' is-shiny' : ''}${faceDown ? ' is-face-down' : ''}`,
      style: { '--card-color': card.color || '#ffd27a' },
      'data-id': card.id,
      'aria-label': `${card.name}, No. ${card.no}, ${rarity.label}${shiny ? ', shiny' : ''}`,
    },
    h('div.card__inner', {}, front, withBack && CardBack()),
  );
}

/** Undiscovered card for the Camilledex. */
export function CardSilhouette(card) {
  return h(
    'div.card.card--locked',
    { 'aria-label': `No. ${card.no}, not discovered yet` },
    h(
      'div.card__inner',
      {},
      h(
        'div.card__face.card__locked',
        {},
        h('span.card__no', {}, `No.${card.no}`),
        h('div.card__locked-figure', { html: SILHOUETTE_SVG }),
        h('span.card__locked-q', {}, '???'),
      ),
    ),
  );
}

export const SILHOUETTE_SVG = `<svg viewBox="0 0 120 150" aria-hidden="true"><g fill="currentColor">
  <circle cx="60" cy="20" r="11"/>
  <ellipse cx="60" cy="56" rx="38" ry="34"/>
  <path d="M34 84c-10 8-14 26-12 44 1 8 8 12 16 12h44c8 0 15-4 16-12 2-18-2-36-12-44-8 6-17 9-26 9s-18-3-26-9z"/>
  <ellipse cx="22" cy="104" rx="9" ry="14" transform="rotate(20 22 104)"/>
  <ellipse cx="98" cy="104" rx="9" ry="14" transform="rotate(-20 98 104)"/>
</g></svg>`;
