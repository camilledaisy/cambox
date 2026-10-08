// App bootstrap: views, routing, nav, wiring components together.
import { h, $, $$, pick, pixelStar } from './lib/dom.js?v=20261008165204';
import { MESSAGES, ODDS, RARITIES, PACK } from './config.js?v=20261008165204';
import { CARDS } from './data/cards.js?v=20261008165204';
import { store } from './lib/store.js?v=20261008165204';
import { sfx } from './lib/sfx.js?v=20261008165204';
import { slotOdds, fmtPct, fmtOneIn } from './lib/gacha.js?v=20261008165204';
import { attachTilt } from './lib/tilt.js?v=20261008165204';
import { toast } from './lib/ui.js?v=20261008165204';
import { initEasterEggs, logoSecret } from './lib/easterEggs.js?v=20261008165204';
import { initTracking } from './lib/tracker.js?v=20261008165204';
import { askForName } from './components/NamePrompt.js?v=20261008165204';
import { CardPack } from './components/CardPack.js?v=20261008165204';
import { createReveal } from './components/CardReveal.js?v=20261008165204';
import { CollectionGrid } from './components/CollectionGrid.js?v=20261008165204';
import { ProgressTracker } from './components/ProgressTracker.js?v=20261008165204';
import { RarityBadge } from './components/RarityBadge.js?v=20261008165204';
import { openCardDetail } from './components/CardDetail.js?v=20261008165204';

// ------------------------------------------------------------------ home
const homePack = CardPack();
$('#box-slot').append(homePack.el);
attachTilt(homePack.el, { max: 22 });

let pokeBubbleTimer = 0;
homePack.el.addEventListener('click', () => {
  homePack.poke();
  sfx.play('poke');
  const bubble = $('#box-bubble');
  bubble.textContent = pick(MESSAGES.boxPokes);
  bubble.classList.remove('is-shown');
  void bubble.offsetWidth;
  bubble.classList.add('is-shown');
  clearTimeout(pokeBubbleTimer);
  pokeBubbleTimer = setTimeout(() => bubble.classList.remove('is-shown'), 1800);
});

const reveal = createReveal({
  onViewCollection: () => (location.hash = '#/dex'),
  onClose: () => document.body.classList.remove('is-opening'),
});
$('#stage-root').append(reveal.el);

$('#open-btn').addEventListener('click', () => {
  if (reveal.isBusy()) return;
  const rect = homePack.el.getBoundingClientRect();
  document.body.classList.add('is-opening');
  reveal.open(rect);
});

// Drop-rate table (generated from config so it's always accurate).
function renderRates() {
  const rows = slotOdds().map(({ rarity, filler, hit }) =>
    h('tr', {}, h('td', {}, RarityBadge(rarity.id, { size: 'sm' })), h('td', {}, fmtPct(filler)), h('td', {}, fmtPct(hit))),
  );
  $('#rates-body').replaceChildren(
    h(
      'table.rates__table',
      {},
      h('thead', {}, h('tr', {}, h('th', {}, 'RARITY'), h('th', {}, `CARDS 1–${PACK.size - 1}`), h('th', {}, 'RARE SLOT'))),
      h('tbody', {}, rows),
    ),
    h('p.rates__fine', {}, `✦ Any card can be Shiny: ${fmtOneIn(ODDS.shiny)}.  ✦ Rumour has it something else hides in the last slot...`),
  );
}
renderRates();

// ------------------------------------------------------------------ dex
let dexFilter = 'all';

function renderDex() {
  const s = store.get();
  const discovered = CARDS.filter((c) => store.has(c.id)).length;
  const shinies = Object.values(s.cards).reduce((n, e) => n + (e.shiny > 0 ? 1 : 0), 0);

  const filters = [
    { id: 'all', label: 'ALL' },
    ...RARITIES.filter((r) => CARDS.some((c) => c.rarity === r.id)).map((r) => ({ id: r.id, label: r.label.toUpperCase() })),
  ];
  const filterBar = h(
    'div.dex-filters',
    { role: 'tablist', 'aria-label': 'Filter by rarity' },
    filters.map((f) =>
      h(
        'button.dex-filter',
        {
          type: 'button',
          role: 'tab',
          class: `f-${f.id}${dexFilter === f.id ? ' is-active' : ''}`,
          'aria-selected': String(dexFilter === f.id),
          onClick: () => {
            dexFilter = f.id;
            sfx.play('click');
            renderDex();
          },
        },
        f.label,
      ),
    ),
  );

  const collectorInput = h('input.trade__input', {
    type: 'text',
    maxlength: '24',
    placeholder: 'your name',
    value: s.collector || '',
    'aria-label': 'Collector name',
    onChange: (e) => {
      store.setCollector(e.target.value.trim());
      toast(`Hi ${e.target.value.trim() || 'mystery collector'}! Name saved.`, { icon: '✎' });
    },
  });

  $('#dex-root').replaceChildren(
    h(
      'div.dex',
      {},
      h(
        'header.dex__head',
        {},
        h('div.dex__lights', { 'aria-hidden': 'true' }, h('i.l-big'), h('i.l-r'), h('i.l-y'), h('i.l-g')),
        h('h1.dex__title', {}, 'THE CAMILLEDEX'),
        h('p.dex__sub', {}, 'Gotta collect every Cam.'),
      ),
      ProgressTracker({ discovered, total: CARDS.length, shinies, packs: s.packs || 0 }),
      filterBar,
      CollectionGrid({ filter: dexFilter, onOpen: (card) => openCardDetail(card) }),
      h(
        'section.trade',
        {},
        h('div.trade__title', { html: `${pixelStar()} TRADING POST <span class="trade__soon">COMING SOON</span>` }),
        h('p.trade__text', {}, 'Soon you’ll be able to trade duplicate Camilles with friends. Your collector name:'),
        h('label.trade__row', {}, h('span', {}, 'COLLECTOR:'), collectorInput),
      ),
      h(
        'div.dex__foot',
        {},
        !s.pulls && h('a.btn.btn--go', { href: '#/' }, 'OPEN YOUR FIRST PACK →'),
        h(
          'button.linkbtn',
          {
            type: 'button',
            onClick: (e) => {
              const btn = e.currentTarget;
              if (btn.dataset.armed) {
                store.reset();
                toast('Collection reset. A fresh start!', { icon: '↺' });
                return;
              }
              btn.dataset.armed = '1';
              btn.textContent = 'tap again to erase everything';
              setTimeout(() => {
                delete btn.dataset.armed;
                btn.textContent = 'reset collection';
              }, 3000);
            },
          },
          'reset collection',
        ),
      ),
    ),
  );
}

// ------------------------------------------------------------------ nav + routing
function updateNav() {
  const discovered = CARDS.filter((c) => store.has(c.id)).length;
  $('#nav-count').textContent = `${discovered}/${CARDS.length}`;
  $('#lucky').hidden = !store.flag('luckyCharm');
}

function route() {
  const view = location.hash.startsWith('#/dex') ? 'dex' : 'home';
  $$('[data-view]').forEach((v) => (v.hidden = v.dataset.view !== view));
  $$('[data-route]').forEach((a) => a.classList.toggle('is-active', a.dataset.route === view));
  $$('[data-route]').forEach((a) => (a.dataset.route === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (view === 'dex') renderDex();
  document.body.dataset.page = view;
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', () => {
  sfx.play('click');
  route();
});
store.subscribe(() => {
  updateNav();
  if (document.body.dataset.page === 'dex') renderDex();
});

const muteBtn = $('#mute');
const syncMute = (m = sfx.isMuted()) => {
  muteBtn.classList.toggle('is-muted', m);
  muteBtn.setAttribute('aria-label', m ? 'Unmute sounds' : 'Mute sounds');
  muteBtn.setAttribute('aria-pressed', String(m));
};
muteBtn.addEventListener('click', () => {
  sfx.toggle();
  sfx.play('click');
});
sfx.subscribe(syncMute);
syncMute();

logoSecret($('#logo'));
initEasterEggs();
document.querySelectorAll('[data-count]').forEach((el) => (el.textContent = CARDS.length));
updateNav();
route();
initTracking();
if (!store.get().collector) askForName();
