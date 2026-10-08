// Hidden stuff. Shhh.
import { h, rand, pick } from './dom.js?v=20261008165204';
import { SECRET_LOGO } from '../config.js?v=20261008165204';
import { store } from './store.js?v=20261008165204';
import { sfx } from './sfx.js?v=20261008165204';
import { toast, openModal } from './ui.js?v=20261008165204';

/** Click the logo N times fast → secret message + lucky charm for the next box. */
export function logoSecret(logoEl) {
  let clicks = 0;
  let timer = 0;
  logoEl.addEventListener('click', (e) => {
    e.preventDefault();
    clicks += 1;
    clearTimeout(timer);
    timer = setTimeout(() => (clicks = 0), 1500);
    logoEl.classList.remove('is-bonked');
    void logoEl.offsetWidth;
    logoEl.classList.add('is-bonked');
    sfx.play('poke');
    if (clicks < SECRET_LOGO.clicks) return;
    clicks = 0;
    store.setFlag('luckyCharm', true);
    store.setFlag('foundLogoSecret', true);
    sfx.play('secret');
    openModal(
      h(
        'div.secret',
        {},
        h('div.secret__bar', {}, h('span', {}, '✿ secret.txt'), h('button.secret__x', { type: 'button', 'data-close': '', 'aria-label': 'Close' }, '×')),
        h(
          'div.secret__body',
          {},
          h('div.secret__icon', {}, '🍀'),
          h('h2.secret__title', {}, SECRET_LOGO.title),
          SECRET_LOGO.lines.map((l) => h('p', {}, l)),
          h('button.btn.btn--go', { type: 'button', 'data-close': '' }, 'OK!! ✦'),
        ),
      ),
      { className: 'modal--secret', label: SECRET_LOGO.title },
    );
  });
}

/** ↑↑↓↓←→←→BA → toggles a handheld-console green screen mode. */
function konami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let i = 0;
  document.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    i = k === code[i] ? i + 1 : k === code[0] ? 1 : 0;
    if (i === code.length) {
      i = 0;
      const on = document.documentElement.classList.toggle('is-retro');
      sfx.play('secret');
      toast(on ? 'CHEAT CODE ACCEPTED: 1989 MODE' : '1989 MODE OFF. welcome back to color', { icon: '🎮' });
    }
  });
}

/** Type a magic word anywhere → something rains from the sky. */
function typedWords() {
  const words = {
    daisy: { emoji: ['🌼', '🌼', '✿'], msg: 'daisy mode ✿' },
    cake: { emoji: ['🎂', '🍰', '🧁'], msg: 'someone said cake??' },
    camille: { emoji: ['💖', '✨', '🎀', '⭐'], msg: 'you summoned her.' },
    birthday: { emoji: ['🎉', '🎈', '🎁', '🎂'], msg: 'HAPPY BIRTHDAY CAMILLE!!' },
    '25': { emoji: ['🎂', '🎉', '✨', '🎈', '2️⃣', '5️⃣'], msg: 'Camille is 25!! 🎂' },
  };
  let buf = '';
  document.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-12);
    for (const [w, cfg] of Object.entries(words)) {
      if (buf.endsWith(w)) {
        buf = '';
        emojiRain(cfg.emoji);
        toast(cfg.msg, { icon: cfg.emoji[0] });
      }
    }
  });
}

export function emojiRain(emoji, count = 36) {
  sfx.play('sparkle');
  const layer = h('div.emoji-rain', { 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    layer.append(
      h('span', {
        style: {
          left: `${rand(0, 100)}%`,
          animationDelay: `${rand(0, 1.6)}s`,
          animationDuration: `${rand(2.4, 4.2)}s`,
          fontSize: `${rand(18, 40)}px`,
          '--drift': `${rand(-60, 60)}px`,
          '--spin': `${rand(-360, 360)}deg`,
        },
      }, pick(emoji)),
    );
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 6500);
}

function consoleNote() {
  console.log(
    '%c✿ CAMVERSE ✿%c\nOh, a developer. Hi!\nNo, you cannot edit the odds from here. (…well. You could. But Camille would know.)',
    'font: 700 16px sans-serif; color: #fff; background: #ff8a1f; padding: 6px 10px; border-radius: 4px;',
    'color: #8a6a4a; font: 12px monospace;',
  );
}

export function initEasterEggs() {
  konami();
  typedWords();
  consoleNote();
}
