import { h } from '../lib/dom.js?v=20261008165204';
import { store } from '../lib/store.js?v=20261008165204';
import { sfx } from '../lib/sfx.js?v=20261008165204';
import { rarityById, packChance, fmtOneIn, fmtPct } from '../lib/gacha.js?v=20261008165204';
import { attachTilt } from '../lib/tilt.js?v=20261008165204';
import { openModal, toast } from '../lib/ui.js?v=20261008165204';
import { saveCardImage } from '../lib/cardImage.js?v=20261008165204';
import { Card } from './Card.js?v=20261008165204';
import { RarityBadge } from './RarityBadge.js?v=20261008165204';

const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/** Big view of a discovered card with 3D tilt + all its info. */
export function openCardDetail(card, { shiny: startShiny } = {}) {
  const owned = store.owned(card.id) || { count: 0, shiny: 0 };
  const rarity = rarityById(card.rarity);
  let shiny = startShiny ?? (owned.shiny > 0 && owned.shiny === owned.count);
  let untilt = null;

  const cardWrap = h('div.detail__card');
  const renderCard = () => {
    untilt?.();
    const el = Card(card, { shiny });
    cardWrap.replaceChildren(el);
    untilt = attachTilt(cardWrap, { max: 24, target: el });
  };

  const shinyToggle = owned.shiny > 0 && h(
    'button.chip.chip--shiny',
    {
      type: 'button',
      'aria-pressed': String(shiny),
      onClick: (e) => {
        shiny = !shiny;
        e.currentTarget.setAttribute('aria-pressed', String(shiny));
        e.currentTarget.textContent = shiny ? '✦ SHOWING SHINY' : '✧ SHOW SHINY';
        sfx.play(shiny ? 'sparkle' : 'click');
        renderCard();
      },
    },
    shiny ? '✦ SHOWING SHINY' : '✧ SHOW SHINY',
  );

  const statRows = Object.entries(card.stats || {}).map(([k, v]) =>
    h(
      'li',
      {},
      h('span', {}, k),
      typeof v === 'number' ? h('span.detail__bar', { style: { '--v': v } }) : h('span.detail__bar.is-text'),
      h('b', {}, v),
    ),
  );

  const p = packChance(card);
  const content = h(
    'div.detail',
    {},
    h('button.chip.detail__close', { type: 'button', 'data-close': '', 'aria-label': 'Close' }, '✕'),
    cardWrap,
    h(
      'div.detail__info',
      {},
      h('p.detail__no', {}, `CAMILLEDEX No.${card.no}`),
      h('h2.detail__name', {}, card.name),
      h('div.detail__badges', {}, RarityBadge(card.rarity, { size: 'lg', shiny }), shinyToggle),
      h('p.detail__desc', {}, `“${card.description}”`),
      h('ul.detail__stats', {}, statRows),
      h(
        'dl.detail__facts',
        {},
        h('dt', {}, 'ERA'), h('dd', {}, card.era),
        h('dt', {}, 'PULL RATE'), h('dd', {}, `${fmtOneIn(p)} packs (${fmtPct(p)})`),
        h('dt', {}, 'SHINY RATE'), h('dd', {}, rarity.id === 'error' ? 'does not compute' : `${fmtOneIn(packChance(card, { shiny: true }))} packs`),
        h('dt', {}, 'OWNED'), h('dd', {}, `×${owned.count}${owned.shiny ? ` (✦ ${owned.shiny} shiny)` : ''}`),
        h('dt', {}, 'FIRST PULLED'), h('dd', {}, fmtDate(owned.first)),
      ),
      h(
        'div.detail__actions',
        {},
        h(
          'button.btn.btn--ghost',
          {
            type: 'button',
            onClick: async () => {
              sfx.play('click');
              try {
                await saveCardImage(card, { shiny });
              } catch {
                toast('Couldn’t save the image here — try a screenshot!', { icon: '⚠' });
              }
            },
          },
          '⤓ SAVE CARD',
        ),
        h('button.btn.btn--ghost', { type: 'button', 'data-close': '' }, 'CLOSE'),
      ),
    ),
  );

  renderCard();
  sfx.play('flip');
  return openModal(content, {
    className: `modal--detail detail--${rarity.id}`,
    label: `${card.name} card details`,
    onClose: () => untilt?.(),
  });
}
