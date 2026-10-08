// Foil booster pack. Two stacked copies of the artwork (top strip + body) are
// clipped along a jagged cut line so the top can be torn off along a swipe.
import { h, rand } from '../lib/dom.js?v=20261008165204';
import { SET, PACK } from '../config.js?v=20261008165204';

// Photo sticker on the front of the pack. Swap the file to change it.
const COVER = { src: 'images/pack-cover.jpg', position: '50% 50%' };

const CUT = 15; // % from the top where the pack tears
const TEETH = 22; // crimp teeth on the sealed edges
const DEPTH = 1.4; // crimp tooth depth (%)

function crimp(y0, dir) {
  return Array.from({ length: TEETH + 1 }, (_, i) => {
    const x = (i / TEETH) * 100;
    const y = i % 2 ? y0 : y0 + dir * DEPTH;
    return [x, y];
  });
}

function jaggedLine() {
  const n = 28;
  return Array.from({ length: n + 1 }, (_, i) => [(i / n) * 100, CUT + (i === 0 || i === n ? 0 : rand(-0.7, 0.7))]);
}

const poly = (pts) => `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`;

function Art() {
  return h(
    'div.pack__art',
    {},
    h('div.pack__crimp.pack__crimp--top', {}, `✦ ${SET.name.toUpperCase()} ✦`),
    h('div.pack__brand', {}, h('span', {}, 'BOOSTER PACK'), h('span', {}, SET.series)),
    h('div.pack__title', {}, 'Camille'),
    h('div.pack__ribbon', {}, '25TH BIRTHDAY BOOSTER'),
    h(
      'div.pack__hero',
      {},
      h('div.pack__burst'),
      h('div.pack__fan', {}, h('i'), h('i'), h('i')),
      h(
        'div.pack__sticker',
        {},
        h('img', { src: COVER.src, alt: '', draggable: 'false', style: { objectPosition: COVER.position } }),
      ),
    ),
    h('div.pack__count', {}, h('b', {}, PACK.size), h('small', {}, 'CARDS')),
    h('div.pack__jp', {}, 'カミーユ', h('small', {}, 'ブースターパック')),
    h('div.pack__fine', {}, '1 ULTRA RARE OR BETTER IN EVERY PACK'),
    h('div.pack__crimp.pack__crimp--bottom', {}, SET.edition),
    h('div.pack__sheen'),
  );
}

/** Returns { el, setTear(min, max), tearOff(dir), reset(), poke(), rect() } */
export function CardPack() {
  const top = h('div.pack__half.pack__top', {}, Art());
  const body = h('div.pack__half.pack__body', {}, Art());
  const tear = h('div.pack__tear');
  const guide = h('div.pack__guide', { style: { top: `${CUT}%` } }, h('span.pack__scissors', { 'aria-hidden': 'true' }, '✂'));
  const light = h('div.pack__light', { style: { top: `${CUT}%` } });
  const inner = h('div.pack__inner', {}, body, top, guide, tear);
  const el = h('div.pack', { style: { '--cut': `${CUT}%` } }, h('div.pack__shadow'), light, inner);

  function clip() {
    const line = jaggedLine();
    const topPts = [...crimp(0, 1), [100, CUT + 0.4], ...[...line].reverse().map(([x, y]) => [x, y + 0.4])];
    const bodyPts = [...line, ...crimp(100, -1).reverse()];
    top.style.clipPath = poly(topPts);
    body.style.clipPath = poly(bodyPts);
  }
  clip();

  return {
    el,
    inner,
    cut: CUT,
    /** Show tear progress between two x positions (0..1). */
    setTear(min, max) {
      const p = Math.max(0, max - min);
      tear.style.left = `${min * 100}%`;
      tear.style.width = `${p * 100}%`;
      tear.style.top = `${CUT}%`;
      el.classList.toggle('is-tearing', p > 0);
      const fromLeft = min < 1 - max;
      top.style.transformOrigin = fromLeft ? `100% ${CUT}%` : `0% ${CUT}%`;
      top.style.rotate = `${(fromLeft ? -1 : 1) * p * 9}deg`;
      top.style.translate = `0 ${-p * 8}px`;
      return p;
    },
    /** Finish the tear: the strip flies off. dir = 1 (right) or -1 (left). */
    tearOff(dir = 1) {
      el.classList.add('is-open');
      top.style.rotate = '';
      top.style.translate = '';
      top.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dir * 90}px, -160px) rotate(${dir * 28}deg)`, opacity: 0 },
        ],
        { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
      );
    },
    setLight(color, { rainbow = false } = {}) {
      el.style.setProperty('--light', color);
      el.classList.toggle('light-rainbow', rainbow);
      el.classList.add('is-lit');
    },
    /** Slide the empty wrapper away once cards are out. */
    drop() {
      el.classList.add('is-dropping');
    },
    reset() {
      el.className = 'pack';
      el.style.removeProperty('--light');
      top.getAnimations().forEach((a) => a.cancel());
      top.style.rotate = '';
      top.style.translate = '';
      tear.style.width = '0';
      clip();
    },
    poke() {
      el.classList.remove('is-poked');
      void el.offsetWidth;
      el.classList.add('is-poked');
    },
  };
}
