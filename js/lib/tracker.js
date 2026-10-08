// Sends each player's collection summary to Camille's Google Sheet
// (see tracking/README.md). Fire-and-forget: the game never waits on it.
import { TRACKING } from '../config.js?v=20261008165204';
import { CARDS, SPECIAL_CARDS } from '../data/cards.js?v=20261008165204';
import { rarityById } from './gacha.js?v=20261008165204';
import { store } from './store.js?v=20261008165204';

/** One player's summary: who they are, packs opened, and every card they own. */
export function playerSummary(state = store.get()) {
  const cards = [...CARDS, ...SPECIAL_CARDS]
    .filter((c) => state.cards[c.id]?.count > 0)
    .map((c) => {
      const e = state.cards[c.id];
      return {
        no: c.no,
        name: c.name,
        rarity: rarityById(c.rarity).label,
        count: e.count,
        duplicates: e.count - 1,
        shiny: e.shiny || 0,
      };
    });
  return {
    playerId: state.playerId,
    name: state.collector || '',
    packsOpened: state.packs || 0,
    uniqueCards: cards.length,
    totalCards: cards.reduce((n, c) => n + c.count, 0),
    totalDuplicates: cards.reduce((n, c) => n + c.duplicates, 0),
    setSize: CARDS.length,
    cards,
    updatedAt: new Date().toISOString(),
  };
}

let timer = 0;
let lastSent = '';

function send() {
  if (!TRACKING.endpoint) return;
  const summary = playerSummary();
  if (!summary.name) return;
  const body = JSON.stringify(summary);
  const key = body.replace(/"updatedAt":"[^"]*"/, '');
  if (key === lastSent) return;
  lastSent = key;
  // text/plain + no-cors keeps this a "simple" request Apps Script accepts.
  fetch(TRACKING.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {
    lastSent = ''; // try again on the next change
  });
}

/** Sync whenever the collection changes (debounced). */
export function initTracking() {
  if (!TRACKING.endpoint) return;
  store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(send, 800);
  });
  send();
}
