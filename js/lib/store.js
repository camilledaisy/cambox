// Collection state, persisted to localStorage.
//
// Shape:
// {
//   v: 1,
//   collector: 'name',                       // for future trading
//   packs: 3,                                // booster packs opened
//   pulls: 15,                               // total cards pulled
//   cards: { '005': { count, shiny, first, last } },
//   log:   [{ uid, id, shiny, at }],         // every copy pulled, newest first.
//                                            // `uid` makes each copy tradeable later.
//   flags: { luckyCharm: true, ... }
// }
import { STORAGE_KEY } from '../config.js?v=20261008165204';

const LOG_LIMIT = 500;
const newId = () => (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2));
const blank = () => ({ v: 1, playerId: newId(), collector: '', packs: 0, pulls: 0, cards: {}, log: [], flags: {} });

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = { ...blank(), ...JSON.parse(raw) };
      if (!saved.playerId) saved.playerId = newId();
      return saved;
    }
  } catch {
    /* private mode / corrupted — start fresh */
  }
  return blank();
}

let state = load();
const listeners = new Set();

function commit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable; the session still works in memory */
  }
  listeners.forEach((fn) => fn(state));
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function addCard(card, shiny) {
  const entry = (state.cards[card.id] ||= { count: 0, shiny: 0, first: Date.now() });
  const isNew = entry.count === 0;
  const isNewShiny = shiny && entry.shiny === 0;
  entry.count += 1;
  if (shiny) entry.shiny += 1;
  entry.last = Date.now();
  state.pulls += 1;
  state.log.unshift({ uid: uid(), id: card.id, shiny, at: Date.now() });
  if (state.log.length > LOG_LIMIT) state.log.length = LOG_LIMIT;
  return { isNew, isNewShiny, count: entry.count };
}

export const store = {
  get: () => state,
  owned: (id) => state.cards[id],
  has: (id) => (state.cards[id]?.count ?? 0) > 0,

  /** Add a whole pack. Returns per-card info ({ isNew, isNewShiny, count }) in pack order. */
  recordPack(pulls) {
    const results = pulls.map(({ card, shiny }) => addCard(card, shiny));
    state.packs = (state.packs || 0) + 1;
    commit();
    return { results, packNo: state.packs };
  },

  flag: (key) => state.flags[key],
  setFlag(key, value) {
    state.flags[key] = value;
    commit();
  },

  setCollector(name) {
    state.collector = String(name).slice(0, 24);
    commit();
  },

  reset() {
    state = { ...blank(), playerId: state.playerId, collector: state.collector };
    commit();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Keep multiple tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  state = load();
  listeners.forEach((fn) => fn(state));
});
