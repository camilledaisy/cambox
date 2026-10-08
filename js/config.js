// ============================================================================
//  CAMILLE CARDS — CONFIG
//  Everything you're likely to want to tweak lives in this file.
//  (Cards themselves live in js/data/cards.js.)
// ============================================================================

export const SET = {
  name: 'Camille Cards',
  code: 'CC',
  edition: "25TH BDAY",
  series: 'SERIES 01',
};

/**
 * RARITY TABLE
 * - `tier` controls how dramatic the reveal gets (0 = chill → 4 = chaos).
 * - `message` is the line shown when the rare-slot card is revealed.
 * Pull chances live in PACK below.
 */
export const RARITIES = [
  { id: 'common',   label: 'Common',      stars: 1, tier: 0, message: 'Classic Camille.' },
  { id: 'uncommon', label: 'Uncommon',    stars: 2, tier: 1, message: 'Ooh, a little upgrade.' },
  { id: 'rare',     label: 'Rare',        stars: 3, tier: 2, message: 'Okayyyy, good pull.' },
  { id: 'ultra',    label: 'Ultra Rare',  stars: 4, tier: 3, message: 'WAIT. YOU ACTUALLY GOT THIS ONE?' },
  { id: 'secret',   label: 'Secret Rare', stars: 5, tier: 4, message: 'NO WAY.' },
];

/** Rarities that never come from the normal roll (see ODDS.error). */
export const HIDDEN_RARITIES = [
  { id: 'error', label: '???', stars: 0, tier: 5, message: 'Uh... that one was not supposed to drop.' },
];

/**
 * BOOSTER PACK
 * - `size`: cards per pack. The LAST card is the "rare slot".
 * - `fillerWeights`: chance (in %) for every card except the last.
 * - `hitWeights`: chance (in %) for the last card.
 * Weights are normalised, so they don't strictly have to add up to 100.
 * A rarity with no cards in cards.js is skipped automatically.
 */
export const PACK = {
  size: 5,
  fillerWeights: { common: 70, rare: 30 },
  hitWeights: { ultra: 92, secret: 8 },
  /** No card appears twice in the same pack (falls back gracefully if a pool runs out). */
  noDuplicates: true,
  /** Avoid doubles: within the rarity rolled, a player always gets a card they don't own yet.
   *  Rarity odds don't change, so a double only happens once they own every card of that rarity. */
  noRepeatsAcrossPacks: true,
};

export const ODDS = {
  /** Chance that the rare slot turns into Error Camille instead. 1/300 ≈ 0.33% */
  error: 1 / 300,
  /** Chance that a normal card comes out as its Shiny variant. 1/32 ≈ 3% */
  shiny: 1 / 32,
  /** Lucky charm (hidden easter egg) multiplies Ultra/Secret rare-slot odds by this for one pack. */
  luckyCharmBoost: 3,
};

export const MESSAGES = {
  shiny: '✦ SHINY VARIANT ✦',
  // Toasts shown after N total packs opened.
  milestones: {
    1: 'First pack! Welcome to the Camille economy.',
    5: '5 packs opened. Camille is flattered.',
    10: '10 packs. This is a normal amount of Camille.',
    25: '25 packs for 25 years. Happy birthday, Camille!',
    50: '50 packs. You are legally Camille’s biggest fan.',
  },
  // Speech bubbles when you poke the pack on the home screen.
  boxPokes: [
    'hey!! no peeking',
    'rip me open!!',
    'shake me gently...',
    'it’s camille’s birthday!',
    'camille is 25!!',
    'i might be a rare one ✦',
    'there are 5 camilles in here',
    'ok that tickles',
    'press the big button!!',
    '*rattle rattle*',
  ],
};

/** Click the logo this many times for the secret message. */
export const SECRET_LOGO = {
  clicks: 5,
  title: 'SECRET UNLOCKED',
  lines: [
    'Congratulations. You have clicked the logo an unreasonable number of times.',
    'Official notice from the Camverse: Camille is the main character today. Please act accordingly.',
    'As a reward, your next pack has a ✦ LUCKY CHARM ✦ (3× the odds of an Ultra or Secret Rare).',
  ],
};

/**
 * OPTIONAL SOUND FILES
 * Every sound is synthesised by default, so nothing is required here.
 * To use your own audio, drop a file in /sounds and map it, e.g.
 *   reveal: 'sounds/reveal.mp3',
 * Names: click, open, poke, rip, tearoff, deal, whoosh, rattle, dim, charge,
 *        pop, flash, flip, sparkle, heartbeat, reveal, glitch, secret
 */
export const SOUND_FILES = {
  // reveal: 'sounds/reveal.mp3',
};

/**
 * PLAYER TRACKING
 * Paste your Google Apps Script web-app URL here (see tracking/README.md) and
 * every friend's name, packs and cards are sent to your Google Sheet.
 * Leave it empty to turn tracking off.
 */
export const TRACKING = {
  endpoint: 'https://script.google.com/macros/s/AKfycbxdSUlx5UCggh96N-nbyilVb5LmyZELxFafCku1QKgFtAGuYmFcbO6hq7xBJCQs-rjqqw/exec',
};

/**
 * TRIAL: include every retired photo as well (61 cards instead of 25).
 * Set to false to go back to the 25-card birthday set.
 */
export const INCLUDE_RETIRED_CARDS = false;

// Kept as-is so collections saved before the rename survive.
export const STORAGE_KEY = 'camille-blind-box/v1';
