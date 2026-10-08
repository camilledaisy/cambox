// The pack-opening experience:
//   1. swipe across the top of the pack to tear it open
//   2. cards slide out; swipe / tap through them one by one
//   3. the last card is the rare slot: face-down, charges up by rarity, tap to flip
//   4. summary of the whole pack
import { h, $, clamp, rand, replayClass, reducedMotion } from '../lib/dom.js?v=20261008165204';
import { MESSAGES, ODDS, PACK } from '../config.js?v=20261008165204';
import { rollPack, rarityById, hitChance, fmtOneIn, cardById } from '../lib/gacha.js?v=20261008165204';
import { store } from '../lib/store.js?v=20261008165204';
import { sfx } from '../lib/sfx.js?v=20261008165204';
import { shake } from '../lib/shake.js?v=20261008165204';
import { ParticleField } from '../lib/particles.js?v=20261008165204';
import { attachTilt } from '../lib/tilt.js?v=20261008165204';
import { toast } from '../lib/ui.js?v=20261008165204';
import { saveCardImage } from '../lib/cardImage.js?v=20261008165204';
import { CardPack } from './CardPack.js?v=20261008165204';
import { Card } from './Card.js?v=20261008165204';
import { RarityBadge } from './RarityBadge.js?v=20261008165204';
import { openCardDetail } from './CardDetail.js?v=20261008165204';

const TAU = Math.PI * 2;
const RAINBOW = ['#ff5e7e', '#ffb13b', '#ffe45e', '#5ee6a0', '#5ec8ff', '#a47bff', '#ff7eea'];
const GLITCH = ['#39ff88', '#ff2bd6', '#28e0ff', '#ffffff'];

// Rare-slot choreography by tier (0 common … 4 secret, 5 error).
const FX = [
  { glow: '#fffaf0', dim: 0.8, shake: [1, 3], dur: 900, colors: ['#ffffff', '#fff3cf'] },
  { glow: '#9ff5c8', dim: 0.84, shake: [1, 3.5], dur: 1000, colors: ['#9ff5c8', '#ffffff', '#d8ffe9'] },
  { glow: '#ffd95a', dim: 0.87, shake: [1.5, 4.5], dur: 1200, colors: ['#ffd95a', '#fff6c2', '#ffffff', '#ffb13b'] },
  { glow: '#ff7eb6', dim: 0.9, shake: [2, 6], dur: 1400, colors: ['#ff7eb6', '#ffd95a', '#7ecbff', '#ffffff', '#b9f5d8'] },
  { glow: '#ffffff', dim: 0.93, shake: [2, 6], dur: 1400, colors: RAINBOW },
  { glow: '#39ff88', dim: 0.92, shake: [2, 8], dur: 1400, colors: GLITCH },
];

export function createReveal({ onViewCollection, onClose }) {
  const pack = CardPack();
  const stack = h('div.stage__stack');
  const slot = h('div.stage__slot', {}, stack, pack.el);
  const fan = h('div.stage__fan');
  const pips = h('div.stage__pips', { 'aria-hidden': 'true' });
  const headText = h('span.stage__head-text');
  const head = h('h2.stage__head', { 'aria-live': 'polite' }, headText);
  const info = h('div.stage__info', { 'aria-live': 'polite' });
  const content = h('div.stage__content', {}, head, pips, slot, fan, info);
  const canvas = h('canvas.stage__particles', { 'aria-hidden': 'true' });
  const flashEl = h('div.stage__flash');

  const skipBtn = h('button.chip.stage__skip', { type: 'button', onClick: skip }, 'SKIP ▸▸');
  const closeBtn = h('button.chip.stage__close', { type: 'button', 'aria-label': 'Back to home', onClick: close }, '✕ BACK');
  const muteBtn = h('button.chip.stage__mute', { type: 'button', onClick: () => sfx.toggle() });
  const syncMute = () => {
    muteBtn.textContent = sfx.isMuted() ? '♪ OFF' : '♪ ON';
    muteBtn.setAttribute('aria-label', sfx.isMuted() ? 'Unmute sounds' : 'Mute sounds');
  };
  sfx.subscribe(syncMute);
  syncMute();

  const el = h(
    'div.stage',
    { 'aria-hidden': 'true', 'data-phase': 'idle' },
    h('div.stage__dim'),
    h('div.stage__rays'),
    content,
    canvas,
    flashEl,
    h('div.stage__bar', {}, closeBtn, h('div.stage__bar-r', {}, skipBtn, muteBtn)),
  );
  const particles = new ParticleField(canvas);

  let runId = 0;
  let busy = false;
  let skipping = false;
  let pending = null;
  let untilt = null;
  let rainTimer = 0;
  let wrappers = [];

  const wait = (ms) => new Promise((r) => setTimeout(r, skipping ? Math.min(ms, 30) : ms));
  const phase = (p) => (el.dataset.phase = p);
  const center = (node) => {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  };
  const setHead = (text) => (headText.textContent = text);

  /** Resolve when the user acts (arm wires listeners, returns a cleanup fn), or on skip/close. */
  function waitForUser(arm) {
    return new Promise((resolve) => {
      if (skipping) return resolve('skip');
      let cleanup = null;
      const finish = (v) => {
        if (pending !== finish) return;
        pending = null;
        cleanup?.();
        resolve(v);
      };
      pending = finish;
      cleanup = arm(finish);
    });
  }

  function skip() {
    skipping = true;
    pending?.('skip');
  }

  function flash(strength = 1) {
    if (skipping) return;
    flashEl.style.setProperty('--flash', reducedMotion() ? strength * 0.4 : strength);
    replayClass(flashEl, 'is-flashing');
  }
  const quake = () => !reducedMotion() && replayClass(content, 'is-quaking');

  function rain(ms, colors, type = 'confetti') {
    clearInterval(rainTimer);
    const t0 = performance.now();
    rainTimer = setInterval(() => {
      if (performance.now() - t0 > ms || el.dataset.phase === 'idle') return clearInterval(rainTimer);
      particles.burst({
        x: rand(0, innerWidth), y: -20, count: 3, type, colors, speed: 2, spread: 0.8, angle: Math.PI / 2,
        gravity: 0.06, drag: 0.99, size: [4, 7], life: [140, 200], spin: 0.15,
      });
    }, 70);
  }

  // ------------------------------------------------------------ 1. tear the pack
  function tearSparks(x, y, n = 3) {
    particles.burst({ x, y, count: n, type: 'dot', colors: ['#ffffff', '#fff3b0', '#ffd95a'], speed: 3.5, gravity: 0.12, life: [14, 30], size: [1, 2.5] });
  }

  async function autoCut() {
    const r = pack.el.getBoundingClientRect();
    const y = r.top + (r.height * pack.cut) / 100;
    const dur = skipping ? 150 : 650;
    const t0 = performance.now();
    let lastRip = 0;
    await new Promise((resolve) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - (1 - k) * (1 - k);
        pack.setTear(0, e);
        if (!skipping && now - lastRip > 40) {
          lastRip = now;
          sfx.play('rip');
          tearSparks(r.left + r.width * e, y, 2);
        }
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function cutPack() {
    const target = pack.el;
    const res = await waitForUser((finish) => {
      let min = null;
      let max = null;
      let active = false;
      let lastRip = 0;
      let rect = null;
      const norm = (e) => clamp((e.clientX - rect.left) / rect.width);
      const down = (e) => {
        active = true;
        rect = target.getBoundingClientRect();
        target.setPointerCapture?.(e.pointerId);
        const x = norm(e);
        min = min === null ? x : Math.min(min, x);
        max = max === null ? x : Math.max(max, x);
      };
      const move = (e) => {
        if (!active) return;
        const x = norm(e);
        min = Math.min(min, x);
        max = Math.max(max, x);
        const p = pack.setTear(min, max);
        const now = performance.now();
        if (now - lastRip > 40) {
          lastRip = now;
          sfx.play('rip');
          tearSparks(e.clientX, rect.top + (rect.height * pack.cut) / 100);
        }
        if (p >= 0.72) finish(x >= (min + max) / 2 ? 1 : -1);
      };
      const up = () => (active = false);
      const key = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          finish('auto');
        }
      };
      target.addEventListener('pointerdown', down);
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
      document.addEventListener('keydown', key);
      return () => {
        target.removeEventListener('pointerdown', down);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
        document.removeEventListener('keydown', key);
      };
    });
    if (typeof res === 'number') return res;
    await autoCut();
    return 1;
  }

  // ------------------------------------------------------------ 2. the stack of cards
  function buildStack(pulls, results) {
    wrappers = pulls.map(({ card, shiny, hit }, i) => {
      const cardEl = Card(card, { shiny, withBack: hit, faceDown: hit });
      const shaker = h('div.stack-card__shaker', {}, cardEl);
      const w = h('div.stack-card', { class: hit ? 'is-hit' : '', style: { zIndex: pulls.length - i } }, shaker);
      w._card = cardEl;
      w._shaker = shaker;
      w._rec = results[i];
      return w;
    });
    stack.replaceChildren(...wrappers);
    layoutStack(0);
  }

  function layoutStack(current) {
    wrappers.forEach((w, j) => {
      const d = j - current;
      w.style.setProperty('--d', Math.max(0, Math.min(d, 3)));
      w.classList.toggle('is-top', d === 0);
    });
  }

  function addSticker(w) {
    const rec = w._rec;
    if (!rec || w.querySelector('.sticker')) return;
    if (rec.isNew) w.append(h('span.sticker.sticker--new', {}, 'NEW!'));
    if (rec.isNewShiny) w.append(h('span.sticker.sticker--shiny', {}, '✦ 1st SHINY'));
  }

  function renderPips(current) {
    pips.replaceChildren(
      ...wrappers.map((w, j) =>
        h('i', { class: [j < current && 'is-done', j === current && 'is-now', w.classList.contains('is-hit') && 'is-star'].filter(Boolean).join(' ') }),
      ),
    );
  }

  function swipe(w) {
    return waitForUser((finish) => {
      let sx = 0;
      let dx = 0;
      let t0 = 0;
      let dragging = false;
      const down = (e) => {
        dragging = true;
        sx = e.clientX;
        dx = 0;
        t0 = performance.now();
        w.setPointerCapture?.(e.pointerId);
        w.classList.add('is-dragging');
      };
      const move = (e) => {
        if (!dragging) return;
        dx = e.clientX - sx;
        w.style.translate = `${dx}px ${-Math.abs(dx) * 0.06}px`;
        w.style.rotate = `${dx / 16}deg`;
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        w.classList.remove('is-dragging');
        const tap = Math.abs(dx) < 8 && performance.now() - t0 < 450;
        if (Math.abs(dx) > 70 || tap) finish(dx < 0 ? -1 : 1);
        else {
          w.style.translate = '';
          w.style.rotate = '';
        }
      };
      const key = (e) => {
        if (['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault();
          finish(e.key === 'ArrowLeft' ? -1 : 1);
        }
      };
      w.addEventListener('pointerdown', down);
      w.addEventListener('pointermove', move);
      w.addEventListener('pointerup', up);
      w.addEventListener('pointercancel', up);
      document.addEventListener('keydown', key);
      return () => {
        w.removeEventListener('pointerdown', down);
        w.removeEventListener('pointermove', move);
        w.removeEventListener('pointerup', up);
        w.removeEventListener('pointercancel', up);
        document.removeEventListener('keydown', key);
      };
    });
  }

  function flyAway(w, dir) {
    const from = { translate: w.style.translate || '0px 0px', rotate: w.style.rotate || '0deg' };
    w.classList.remove('is-top');
    const a = w.animate([from, { translate: `${dir * 115}vw -12vh`, rotate: `${dir * 38}deg` }], {
      duration: skipping ? 120 : 480,
      easing: 'cubic-bezier(.45,0,.8,.55)',
      fill: 'forwards',
    });
    a.onfinish = () => (w.hidden = true);
  }

  function showFiller(i, pull) {
    const r = rarityById(pull.card.rarity);
    setHead(`CARD ${i + 1} / ${wrappers.length}`);
    info.replaceChildren(
      h('div.stage__badges', {}, RarityBadge(pull.card.rarity, { size: 'lg', shiny: pull.shiny }), pull.shiny && h('span.chip.chip--shiny', {}, MESSAGES.shiny)),
      h('p.stage__hint', {}, h('span.blink', {}, '▶'), ' Swipe or tap the card for the next one'),
    );
    info.classList.add('is-shown');
    addSticker(wrappers[i]);
    if (skipping) return;
    sfx.play('flip');
    const { x, y, r: rect } = center(wrappers[i]);
    if (r.tier >= 1) particles.burst({ x, y, count: 8 + r.tier * 12, type: 'star', colors: FX[r.tier].colors, speed: 4 + r.tier, size: [2, 5], life: [30, 55], jitter: rect.width * 0.35 });
    if (r.tier >= 2) {
      sfx.play('sparkle');
      flash(0.25);
    }
    if (pull.shiny) setTimeout(() => sfx.play('sparkle'), 150);
  }

  // ------------------------------------------------------------ 3. the rare slot
  function burstAt(node, tier) {
    const { x, y, r } = center(node);
    const c = FX[tier].colors;
    particles.ring({ x, y, color: c[0], size: r.width * (0.9 + tier * 0.2), life: 36 });
    switch (tier) {
      case 0:
      case 1:
        particles.burst({ x, y, count: 24 + tier * 16, type: 'dot', colors: c, speed: 5, life: [30, 55], jitter: r.width * 0.3 });
        break;
      case 2:
        particles.burst({ x, y, count: 60, type: 'star', colors: c, speed: 8, size: [3, 7], life: [40, 80], gravity: 0.05, jitter: r.width * 0.3 });
        setTimeout(() => particles.ring({ x, y, color: '#fff6c2', size: r.width * 1.6, life: 42 }), 120);
        break;
      case 3:
        particles.burst({ x, y, count: 150, type: 'confetti', colors: c, speed: 13, spread: TAU * 0.8, angle: -Math.PI / 2, gravity: 0.17, size: [4, 8], life: [70, 120] });
        particles.burst({ x, y, count: 60, type: 'star', colors: c, speed: 9, size: [3, 8], life: [50, 90] });
        [0, 110, 220].forEach((d, i) => setTimeout(() => particles.ring({ x, y, color: c[i], size: r.width * (1.2 + i * 0.4), life: 44 }), d));
        break;
      case 4:
        particles.burst({ x, y, count: 260, type: 'confetti', colors: c, speed: 16, spread: TAU, gravity: 0.16, size: [4, 9], life: [80, 140] });
        particles.burst({ x, y, count: 120, type: 'star', colors: ['#ffffff', ...c], speed: 11, size: [3, 9], life: [60, 110] });
        c.forEach((col, i) => setTimeout(() => particles.ring({ x, y, color: col, size: r.width * (1 + i * 0.35), life: 50, width: 8 }), i * 70));
        break;
      case 5:
        particles.burst({ x, y, count: 170, type: 'pixel', colors: GLITCH, speed: 10, gravity: 0, drag: 0.94, size: [3, 10], life: [30, 70] });
        break;
    }
  }

  function leak(w, tier) {
    const { x, y, r } = center(w);
    particles.burst({
      x, y, count: 2 + Math.min(tier, 4), type: tier === 5 ? 'pixel' : tier >= 2 ? 'star' : 'dot', colors: FX[tier].colors,
      speed: 1.6, gravity: -0.02, life: [30, 55], size: [2, 5], jitter: r.width * 0.6,
    });
  }

  async function rareSlot(w, pull, alive) {
    const rarity = rarityById(pull.card.rarity);
    const tier = rarity.tier;
    const fx = FX[tier];
    setHead('THE LAST CARD');
    info.replaceChildren(h('p.stage__hint', {}, 'Something special is in here...'));
    el.style.setProperty('--dim', fx.dim);
    phase('hit');
    sfx.play('dim');
    await wait(500);
    if (!alive()) return;

    // charge: glow + shake + particles, escalating with tier
    w.style.setProperty('--glow', fx.glow);
    w.classList.add('is-charging');
    w.classList.toggle('glow-rainbow', tier === 4);
    w.classList.toggle('glow-glitch', tier === 5);
    sfx.play('charge', Math.min(tier, 4));
    await shake(w._shaker, {
      duration: fx.dur, from: fx.shake[0], to: fx.shake[1], shouldStop: () => skipping,
      onTick: (i) => {
        sfx.play('rattle');
        if (i % 2 === 0) leak(w, Math.min(tier, 3));
      },
    });
    if (!alive()) return;

    // Secret rare + error: it settles... then goes feral.
    if (tier >= 4) {
      info.replaceChildren(h('p.stage__hint', {}, '...?'));
      await wait(750);
      sfx.play('heartbeat');
      await wait(450);
      info.replaceChildren(h('p.stage__hint', { class: tier === 5 ? 'is-error' : '' }, tier === 5 ? 'ERR0R: card.exe has stopped responding' : 'wait... WAIT'));
      if (tier === 5) {
        sfx.play('glitch');
        document.documentElement.classList.add('is-glitch-screen');
      }
      await shake(w._shaker, {
        duration: 1300, from: 5, to: 12, shouldStop: () => skipping,
        onTick: (i) => {
          sfx.play('rattle');
          leak(w, tier);
          if (tier === 4 && i % 3 === 0) sfx.play('sparkle');
        },
      });
      document.documentElement.classList.remove('is-glitch-screen');
      if (!alive()) return;
    }

    // tap to reveal
    w.classList.add('is-ready');
    info.replaceChildren(h('p.stage__hint.is-big', {}, h('span.blink', {}, '▶'), ' TAP TO REVEAL'));
    await waitForUser((finish) => {
      const go = () => finish('tap');
      const key = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      };
      w.addEventListener('click', go);
      document.addEventListener('keydown', key);
      return () => {
        w.removeEventListener('click', go);
        document.removeEventListener('keydown', key);
      };
    });
    if (!alive()) return;

    // reveal!
    w.classList.remove('is-ready');
    el.dataset.tier = String(tier);
    el.style.setProperty('--glow', fx.glow);
    el.classList.toggle('is-rainbow', tier === 4);
    el.classList.toggle('is-error', tier === 5);
    phase('reveal');
    sfx.play('pop');
    info.replaceChildren();
    if (tier >= 3) {
      flash(tier === 3 ? 0.8 : 1);
      sfx.play('flash');
      quake();
    }
    if (tier === 4) setTimeout(() => flash(0.9), 380);
    if (tier === 5) {
      sfx.play('glitch');
      document.documentElement.classList.add('is-glitch-screen');
      setTimeout(() => document.documentElement.classList.remove('is-glitch-screen'), 650);
    }
    burstAt(w, tier);
    if (tier >= 3 && tier !== 5) {
      w.classList.add(tier === 4 ? 'is-spinning-lots' : 'is-spinning');
      sfx.play('whoosh');
      await wait(tier === 4 ? 1500 : 950);
    } else await wait(200);
    if (!alive()) return;

    sfx.play('flip');
    w._card.classList.remove('is-face-down');
    await wait(380);
    burstAt(w, tier);
    sfx.play('reveal', tier);
    if (pull.shiny) setTimeout(() => sfx.play('sparkle'), 250);
    if (tier >= 2 && tier !== 5) flash(0.35 + tier * 0.1);
    if (tier === 4) rain(4500, RAINBOW);
    else if (tier === 3) rain(2500, fx.colors);
    else if (pull.shiny) rain(1800, ['#ffffff', '#e0f4ff', '#ffe9fb'], 'star');
    w.classList.remove('is-charging');
    addSticker(w);
    untilt = attachTilt(w._card, { max: 20 });

    setHead('YOU PULLED...');
    const next = h('button.btn.btn--go', { type: 'button' }, `SEE ALL ${wrappers.length} CARDS ▸`);
    info.replaceChildren(
      h('div.stage__badges', {}, RarityBadge(pull.card.rarity, { size: 'lg', shiny: pull.shiny }), pull.shiny && h('span.chip.chip--shiny', {}, MESSAGES.shiny)),
      h('p.stage__msg', { class: `msg-${rarity.id}` }, rarity.message),
      h('p.stage__odds', {}, h('b', {}, fmtOneIn(hitChance(pull.card) * (pull.shiny ? ODDS.shiny : 1))), ' chance', pull.shiny && h('small', {}, ` · shiny rate ${fmtOneIn(ODDS.shiny)}`)),
      h('div.stage__btns', {}, next),
    );
    replayClass(info, 'is-shown');
    next.focus({ preventScroll: true });
    await waitForUser((finish) => {
      const go = () => finish('next');
      next.addEventListener('click', go);
      return () => next.removeEventListener('click', go);
    });
  }

  // ------------------------------------------------------------ 4. summary
  function showSummary(pulls, results, packNo, preview) {
    untilt?.();
    untilt = null;
    phase('summary');
    skipBtn.hidden = true;
    setHead('YOUR PACK');
    pips.replaceChildren();

    // rare card goes in the middle of the fan
    const order = pulls.map((_, i) => i);
    const hitIdx = order.pop();
    order.splice(Math.floor(order.length / 2), 0, hitIdx);
    const mid = (order.length - 1) / 2;
    fan.replaceChildren(
      ...order.map((i, pos) => {
        const { card, shiny, hit } = pulls[i];
        const o = pos - mid;
        return h(
          'button.fan-card',
          {
            type: 'button',
            class: hit ? 'is-hit' : '',
            style: { '--o': o, '--ao': Math.abs(o), '--k': pos, zIndex: hit ? 10 : 5 - Math.abs(o) },
            'aria-label': `Open ${card.name}`,
            onClick: () => openCardDetail(card, { shiny }),
          },
          Card(card, { shiny }),
          results[i]?.isNew && h('span.fan-card__new', {}, 'NEW'),
        );
      }),
    );
    requestAnimationFrame(() => requestAnimationFrame(() => fan.classList.add('is-spread')));

    const newCount = results.filter((r) => r?.isNew).length;
    const hit = pulls[pulls.length - 1];
    info.replaceChildren(
      h(
        'p.stage__summary',
        {},
        h('b', {}, newCount ? `${newCount} new card${newCount === 1 ? '' : 's'}!` : 'No new cards this time.'),
        ' ',
        preview ? 'Preview mode, not saved.' : `Pack #${packNo} · tap a card to look closer.`,
      ),
      h(
        'div.stage__btns',
        {},
        h('button.btn.btn--ghost', { type: 'button', onClick: () => doSave(hit.card, hit.shiny) }, '⤓ SAVE BEST CARD'),
        h('button.btn.btn--ghost', { type: 'button', onClick: () => { close(); onViewCollection?.(); } }, '▦ VIEW COLLECTION'),
        h('button.btn.btn--go', { type: 'button', onClick: openAnother }, '↻ OPEN ANOTHER PACK'),
      ),
    );
    replayClass(info, 'is-shown');
    $('.btn--go', info)?.focus({ preventScroll: true });

    const milestone = !preview && MESSAGES.milestones[packNo];
    if (milestone) setTimeout(() => toast(milestone, { icon: '📦' }), 900);
  }

  // ------------------------------------------------------------ lifecycle
  function resetStage() {
    clearInterval(rainTimer);
    untilt?.();
    untilt = null;
    particles.clear();
    pack.reset();
    stack.replaceChildren();
    stack.className = 'stage__stack';
    wrappers = [];
    fan.replaceChildren();
    fan.className = 'stage__fan';
    info.replaceChildren();
    info.classList.remove('is-shown');
    pips.replaceChildren();
    setHead('');
    el.classList.remove('is-rainbow', 'is-error');
    el.style.removeProperty('--glow');
    el.style.setProperty('--dim', 0);
    el.dataset.tier = '0';
    skipBtn.hidden = false;
    document.documentElement.classList.remove('is-glitch-screen');
  }

  function show() {
    el.classList.add('is-active');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('stage-open');
  }

  function close() {
    runId++;
    skipping = true;
    pending?.('skip');
    busy = false;
    sfx.play('click');
    el.classList.remove('is-active');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stage-open');
    setTimeout(() => {
      if (el.classList.contains('is-active')) return;
      phase('idle');
      resetStage();
    }, 300);
    onClose?.();
  }

  /** Open a pack. `fromRect` = home-page pack position, for a smooth hand-off. */
  async function open(fromRect) {
    if (busy) return;
    busy = true;
    skipping = false;
    const run = ++runId;
    const alive = () => run === runId;

    // ?preview=<card id>[&shiny] forces the rare-slot card. Preview packs are NOT saved.
    const params = new URLSearchParams(location.search);
    const forced = params.has('preview') && cardById(params.get('preview'));
    const boost = !forced && !!store.flag('luckyCharm');
    const owned = PACK.noRepeatsAcrossPacks && !forced ? Object.keys(store.get().cards).filter((id) => store.has(id)) : [];
    const pulls = rollPack({ boost, forceHit: forced || null, exclude: owned });
    if (forced && params.has('shiny')) pulls[pulls.length - 1].shiny = true;
    if (boost) store.setFlag('luckyCharm', false);
    let results;
    let packNo;
    if (forced) {
      const seen = new Set();
      results = pulls.map(({ card }) => {
        const isNew = !store.has(card.id) && !seen.has(card.id);
        seen.add(card.id);
        return { isNew, isNewShiny: false };
      });
      packNo = store.get().packs;
    } else ({ results, packNo } = store.recordPack(pulls));
    const hitTier = rarityById(pulls[pulls.length - 1].card.rarity).tier;

    resetStage();
    phase('pack');
    show();
    sfx.play('open');
    if (boost) toast('Lucky charm activated ✦ boosted odds!', { icon: '🍀' });

    if (fromRect) {
      const to = pack.el.getBoundingClientRect();
      const dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
      const dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
      const s = fromRect.width / to.width || 1;
      pack.el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: 'none' }], { duration: 550, easing: 'cubic-bezier(.2,.9,.25,1)' });
    } else replayClass(pack.el, 'is-entering');
    el.style.setProperty('--dim', 0.6);
    await wait(550);
    if (!alive()) return;

    // 1 — swipe to tear
    setHead('SWIPE TO OPEN');
    info.replaceChildren(
      h('p.stage__hint', {}, '✂ Drag across the top of the pack to tear it open'),
      h('button.chip', { type: 'button', onClick: () => pending?.('auto') }, 'OPEN IT FOR ME'),
    );
    info.classList.add('is-shown');
    pack.el.classList.add('show-guide');
    const dir = await cutPack();
    if (!alive()) return;
    info.classList.remove('is-shown');
    pack.el.classList.remove('show-guide');
    sfx.play('tearoff');
    pack.tearOff(dir);
    const r = pack.el.getBoundingClientRect();
    tearSparks(r.left + r.width / 2, r.top + (r.height * pack.cut) / 100, 30);
    pack.setLight(hitTier === 5 ? '#39ff88' : hitTier >= 3 ? FX[hitTier].glow : '#fff6d0', { rainbow: hitTier === 4 });
    await wait(450);

    // 2 — cards slide out of the pack
    buildStack(pulls, results);
    requestAnimationFrame(() => stack.classList.add('is-rising'));
    sfx.play('deal');
    setHead('');
    await wait(950);
    pack.drop();
    stack.classList.add('is-out');
    await wait(650);
    if (!alive()) return;
    phase('cards');

    for (let i = 0; i < pulls.length - 1; i++) {
      layoutStack(i);
      renderPips(i);
      showFiller(i, pulls[i]);
      const d = await swipe(wrappers[i]);
      if (!alive()) return;
      sfx.play('deal');
      flyAway(wrappers[i], d === -1 ? -1 : 1);
      await wait(200);
    }

    // 3 — the rare slot
    const last = pulls.length - 1;
    layoutStack(last);
    renderPips(last);
    await rareSlot(wrappers[last], pulls[last], alive);
    if (!alive()) return;

    // 4 — the whole pack
    skipping = false;
    showSummary(pulls, results, packNo, !!forced);
    busy = false;
  }

  async function doSave(card, shiny) {
    sfx.play('click');
    try {
      await saveCardImage(card, { shiny });
    } catch (err) {
      console.warn(err);
      toast('Couldn’t save the image here — try a screenshot!', { icon: '⚠' });
    }
  }

  function openAnother() {
    if (busy) return;
    sfx.play('click');
    open(null);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('is-active') && !document.body.classList.contains('has-modal')) close();
  });

  return { el, open, close, isBusy: () => busy };
}
