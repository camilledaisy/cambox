// Pack logic + probability math. Pure functions over config + card data.
import { RARITIES, HIDDEN_RARITIES, ODDS, PACK } from '../config.js?v=20261008165204';
import { CARDS, SPECIAL_CARDS } from '../data/cards.js?v=20261008165204';

export const ALL_RARITIES = [...RARITIES, ...HIDDEN_RARITIES];
export const ALL_CARDS = [...CARDS, ...SPECIAL_CARDS];

export const rarityById = (id) => ALL_RARITIES.find((r) => r.id === id) ?? RARITIES[0];
export const cardById = (id) => ALL_CARDS.find((c) => c.id === id);
export const isSpecial = (card) => SPECIAL_CARDS.includes(card);

const cardWeight = (c) => c.weight ?? 1;
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

/** Rarities a slot can roll (weight > 0 and at least one card), with optional lucky-charm boost. */
function slotTable(weights, boost = false) {
  return RARITIES.filter((r) => (weights[r.id] ?? 0) > 0 && CARDS.some((c) => c.rarity === r.id)).map((r) => ({
    rarity: r,
    weight: weights[r.id] * (boost && r.tier >= 3 ? ODDS.luckyCharmBoost : 1),
  }));
}

function pickWeighted(items, getWeight) {
  let n = Math.random() * sum(items, getWeight);
  for (const it of items) {
    n -= getWeight(it);
    if (n <= 0) return it;
  }
  return items[items.length - 1];
}

function rollSlot(weights, boost, inPack = new Set(), owned = new Set()) {
  // Never repeat a card within this pack: skip rarities this pack has used up.
  const table = slotTable(weights, boost);
  const open = (r) => CARDS.some((c) => c.rarity === r.id && !inPack.has(c.id));
  const available = table.filter((x) => open(x.rarity));
  // Rarity odds are the normal ones; ownership never changes them.
  const { rarity } = pickWeighted(available.length ? available : table, (x) => x.weight);
  const all = CARDS.filter((c) => c.rarity === rarity.id);
  const pool = all.filter((c) => !inPack.has(c.id));
  const candidates = pool.length ? pool : all;
  // Within that rarity, prefer cards the player doesn't own yet.
  const fresh = candidates.filter((c) => !owned.has(c.id));
  const card = pickWeighted(fresh.length ? fresh : candidates, cardWeight);
  return { card, shiny: Math.random() < ODDS.shiny };
}

/**
 * Open one booster pack.
 * @param boost    lucky charm active
 * @param forceHit card to put in the rare slot (preview mode)
 * @param exclude  ids the player already owns; within the rolled rarity an unowned
 *                 card is picked first, so doubles only come once a rarity is complete
 * @returns {{ card, shiny: boolean, hit: boolean }[]}  last entry is the rare slot
 */
export function rollPack({ boost = false, forceHit = null, exclude = [] } = {}) {
  const pack = [];
  const used = new Set();
  const owned = new Set(exclude);
  const track = (pull) => {
    if (PACK.noDuplicates) used.add(pull.card.id);
    return pull;
  };
  if (forceHit) used.add(forceHit.id);
  for (let i = 0; i < PACK.size - 1; i++) pack.push(track({ ...rollSlot(PACK.fillerWeights, false, used, owned), hit: false }));
  let last;
  if (forceHit) last = { card: forceHit, shiny: false };
  else if (SPECIAL_CARDS.length && Math.random() < ODDS.error) last = { card: pickWeighted(SPECIAL_CARDS, cardWeight), shiny: false };
  else last = rollSlot(PACK.hitWeights, boost, used, owned);
  pack.push({ ...last, hit: true });
  return pack;
}

function slotChance(card, weights, isHit) {
  if (isSpecial(card)) return isHit ? ODDS.error * (cardWeight(card) / sum(SPECIAL_CARDS, cardWeight)) : 0;
  const table = slotTable(weights);
  const entry = table.find((x) => x.rarity.id === card.rarity);
  if (!entry) return 0;
  const pool = CARDS.filter((c) => c.rarity === card.rarity);
  const p = (entry.weight / sum(table, (x) => x.weight)) * (cardWeight(card) / sum(pool, cardWeight));
  return isHit && SPECIAL_CARDS.length ? p * (1 - ODDS.error) : p;
}

/** Chance (0..1) of this card in one of the first slots / in the rare slot. */
export const fillerChance = (card) => slotChance(card, PACK.fillerWeights, false);
export const hitChance = (card) => slotChance(card, PACK.hitWeights, true);

/** Chance (0..1) that a pack contains this card at least once (or its shiny variant). */
export function packChance(card, { shiny = false } = {}) {
  const s = shiny && !isSpecial(card) ? ODDS.shiny : 1;
  const miss = Math.pow(1 - fillerChance(card) * s, PACK.size - 1) * (1 - hitChance(card) * s);
  return 1 - miss;
}

/** Normalised chance of each rarity per slot type, for the drop-rate table. */
export function slotOdds() {
  const f = slotTable(PACK.fillerWeights);
  const hTable = slotTable(PACK.hitWeights);
  const fTotal = sum(f, (x) => x.weight);
  const hTotal = sum(hTable, (x) => x.weight);
  const errorShare = SPECIAL_CARDS.length ? 1 - ODDS.error : 1;
  return RARITIES.filter((r) => CARDS.some((c) => c.rarity === r.id)).map((rarity) => ({
    rarity,
    filler: (f.find((x) => x.rarity === rarity)?.weight ?? 0) / fTotal,
    hit: ((hTable.find((x) => x.rarity === rarity)?.weight ?? 0) / hTotal) * errorShare,
    count: CARDS.filter((c) => c.rarity === rarity.id).length,
  }));
}

export const oneIn = (p) => (p > 0 ? Math.max(1, Math.round(1 / p)) : Infinity);
export const fmtOneIn = (p) => (p > 0 ? `1 in ${oneIn(p).toLocaleString('en-US')}` : 'never');
export const fmtPct = (p) => {
  const pct = p * 100;
  if (pct === 0) return '—';
  return `${pct >= 1 ? +pct.toFixed(1) : +pct.toFixed(2)}%`;
};
