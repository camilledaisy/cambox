// Renders a flat PNG of a card (for SAVE CARD) using Canvas2D, then shares
// (mobile) or downloads it. Kept separate from the DOM card so it works
// everywhere without screenshot libraries.
import { SET } from '../config.js?v=20261008165204';
import { CARDS } from '../data/cards.js?v=20261008165204';
import { rarityById } from './gacha.js?v=20261008165204';
import { loadCardImage } from './placeholder.js?v=20261008165204';
import { h } from './dom.js?v=20261008165204';
import { openModal } from './ui.js?v=20261008165204';

const W = 750;
const H = 1050;
const INK = '#3a2418';

const THEMES = {
  common: { frame: ['#fff6e0', '#ffe9bf'], text: INK, sub: '#8a6a4a', accent: '#e8a13a' },
  uncommon: { frame: ['#dcf8e7', '#b9efcf'], text: INK, sub: '#3f7a5a', accent: '#35b27a' },
  rare: { frame: ['#dff0ff', '#b8dcff'], text: INK, sub: '#3a6a9a', accent: '#3b8fe0' },
  ultra: { frame: ['#fff1b0', '#ffc94d'], text: INK, sub: '#8a5a10', accent: '#ff5e9a' },
  secret: { frame: ['#2a1a4d', '#130c26'], text: '#fff4d6', sub: '#d9c8ff', accent: '#ffd95a' },
  error: { frame: ['#101014', '#050507'], text: '#39ff88', sub: '#28e0ff', accent: '#ff2bd6' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function rainbow(ctx, x0, y0, x1, y1, alpha) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  ['#ff5e7e', '#ffb13b', '#ffe45e', '#5ee6a0', '#5ec8ff', '#a47bff', '#ff7eea'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export async function renderCardCanvas(card, { shiny = false } = {}) {
  await Promise.all(['700 64px "Titan One"', '700 24px "Silkscreen"', '800 24px "M PLUS Rounded 1c"'].map((f) => document.fonts?.load(f).catch(() => {})));
  const rarity = rarityById(card.rarity);
  const t = THEMES[rarity.id] || THEMES.common;
  const img = await loadCardImage(card);

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  // frame
  const fg = ctx.createLinearGradient(0, 0, W, H);
  fg.addColorStop(0, t.frame[0]);
  fg.addColorStop(1, t.frame[1]);
  roundRect(ctx, 6, 6, W - 12, H - 12, 40);
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = rarity.id === 'secret' ? '#ffd95a' : rarity.id === 'error' ? '#39ff88' : INK;
  ctx.stroke();

  if (rarity.id === 'secret') {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) {
      ctx.globalAlpha = Math.random() * 0.8;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // header
  ctx.fillStyle = t.sub;
  ctx.font = '700 26px "Silkscreen", monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`No.${card.no}`, 48, 82);
  ctx.fillStyle = t.text;
  let size = 60;
  ctx.font = `${size}px "Titan One", sans-serif`;
  while (ctx.measureText(card.name).width > W - 250 && size > 30) {
    size -= 2;
    ctx.font = `${size}px "Titan One", sans-serif`;
  }
  ctx.textAlign = 'right';
  ctx.fillText(card.name, W - 46, 88);
  ctx.textAlign = 'left';

  // photo
  const px = 44, py = 118, pw = W - 88, ph = 545;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 14);
  ctx.clip();
  ctx.fillStyle = card.color || '#ffd27a';
  ctx.fillRect(px, py, pw, ph);
  if (img) {
    const [ox, oy] = (card.imagePosition || '50% 40%').split(' ').map((v) => parseFloat(v) / 100);
    const s = Math.max(pw / img.width, ph / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, px + (pw - dw) * (ox || 0.5), py + (ph - dh) * (isNaN(oy) ? 0.4 : oy), dw, dh);
  }
  if (rarity.id === 'error') {
    for (let y = py; y < py + ph; y += 6) {
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(px, y, pw, 2);
    }
  }
  ctx.restore();
  roundRect(ctx, px, py, pw, ph, 14);
  ctx.lineWidth = 8;
  ctx.strokeStyle = rarity.id === 'error' ? '#39ff88' : INK;
  ctx.stroke();

  // era tag
  ctx.font = '700 20px "Silkscreen", monospace';
  const era = `ERA · ${card.era}`;
  const ew = ctx.measureText(era).width + 28;
  ctx.fillStyle = INK;
  ctx.fillRect(px + 16, py + ph - 50, ew, 36);
  ctx.fillStyle = '#fff7e3';
  ctx.fillText(era, px + 30, py + ph - 25);

  if (shiny) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + pw - 150, py + 16, 134, 38);
    ctx.fillStyle = '#a47bff';
    ctx.fillText('✦ SHINY', px + pw - 138, py + 43);
  }

  // rarity row
  let y = py + ph + 50;
  ctx.fillStyle = t.accent;
  const stars = Math.max(rarity.stars, 0);
  for (let i = 0; i < stars; i++) drawStar(ctx, 64 + i * 36, y - 10, 15);
  ctx.fillStyle = t.text;
  ctx.font = '700 26px "Silkscreen", monospace';
  ctx.fillText(rarity.id === 'error' ? '??? ???' : rarity.label.toUpperCase(), 56 + Math.max(stars, 0) * 36 + 8, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.sub;
  ctx.fillText(rarity.id === 'error' ? '???/???' : `${card.no}/${String(CARDS.length).padStart(3, '0')}`, W - 48, y);
  ctx.textAlign = 'left';

  // description
  y += 50;
  ctx.fillStyle = t.text;
  ctx.font = 'italic 800 28px "M PLUS Rounded 1c", sans-serif';
  for (const line of wrap(ctx, `“${card.description}”`, W - 110).slice(0, 3)) {
    ctx.fillText(line, 56, y);
    y += 38;
  }

  // stats
  y += 14;
  const entries = Object.entries(card.stats || {}).slice(0, 4);
  entries.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const sx = 56 + col * 330, sy = y + row * 46;
    ctx.fillStyle = t.sub;
    let fs = 18;
    ctx.font = `700 ${fs}px "Silkscreen", monospace`;
    const room = 300 - ctx.measureText(String(v)).width - 14;
    while (ctx.measureText(k.toUpperCase()).width > room && fs > 11) ctx.font = `700 ${--fs}px "Silkscreen", monospace`;
    ctx.fillText(k.toUpperCase(), sx, sy);
    ctx.font = '700 18px "Silkscreen", monospace';
    ctx.fillStyle = t.text;
    ctx.textAlign = 'right';
    ctx.fillText(String(v), sx + 300, sy);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(58,36,24,.18)';
    ctx.fillRect(sx, sy + 8, 300, 10);
    if (typeof v === 'number') {
      ctx.fillStyle = t.accent;
      ctx.fillRect(sx, sy + 8, 3 * Math.max(0, Math.min(100, v)), 10);
    }
  });

  // footer
  ctx.fillStyle = t.sub;
  ctx.font = '700 18px "Silkscreen", monospace';
  ctx.fillText('✿ CAMILLE CARDS', 48, H - 40);
  ctx.textAlign = 'right';
  ctx.fillText(SET.edition, W - 48, H - 40);
  ctx.textAlign = 'left';

  // foil
  if (shiny) rainbow(ctx, 0, 0, W, H, 0.5);
  else if (['rare', 'ultra', 'secret'].includes(rarity.id)) rainbow(ctx, 0, H, W, 0, rarity.id === 'rare' ? 0.18 : 0.32);

  return cv;
}

/** Render the card, then offer it: native share sheet on phones where allowed,
 *  otherwise a popup with the image (long-press / right-click) and a download button. */
export async function saveCardImage(card, opts = {}) {
  const canvas = await renderCardCanvas(card, opts);
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
  const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `camille-card-${card.no}-${slug}${opts.shiny ? '-shiny' : ''}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `I pulled ${card.name}!` });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      // share refused → fall through to the popup
    }
  }

  const url = URL.createObjectURL(blob);
  openModal(
    h(
      'div.savecard',
      {},
      h('img.savecard__img', { src: url, alt: `${card.name} card image` }),
      h('p.savecard__hint', {}, isTouch ? 'Long-press the card to save it to your photos.' : 'Right-click the card and choose “Save image”, or use the button.'),
      h(
        'div.savecard__btns',
        {},
        h('a.btn.btn--go', { href: url, download: filename }, '⤓ DOWNLOAD PNG'),
        h('button.btn.btn--ghost', { type: 'button', 'data-close': '' }, 'CLOSE'),
      ),
    ),
    { className: 'modal--save', label: 'Save card image', onClose: () => setTimeout(() => URL.revokeObjectURL(url), 1000) },
  );
}
