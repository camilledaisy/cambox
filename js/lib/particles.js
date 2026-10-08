// Lightweight canvas particle system for sparkles, confetti, dust and glitch pixels.
import { rand, pick } from './dom.js?v=20261008165204';

const MAX = 700;
const TAU = Math.PI * 2;

export class ParticleField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.running = false;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
  }

  /**
   * Emit a burst.
   * type: 'dot' | 'star' | 'confetti' | 'pixel' | 'ring'
   */
  burst({
    x, y, count = 20, type = 'dot', colors = ['#fff'], speed = 4, spread = TAU, angle = -Math.PI / 2,
    gravity = 0.08, life = [40, 80], size = [2, 5], drag = 0.985, spin = 0.2, jitter = 0,
  }) {
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= MAX) this.parts.shift();
      const a = angle + rand(-spread / 2, spread / 2);
      const v = speed * rand(0.35, 1);
      const l = rand(life[0], life[1]);
      this.parts.push({
        type, x: x + rand(-jitter, jitter), y: y + rand(-jitter, jitter),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: gravity, drag,
        life: l, max: l, size: rand(size[0], size[1]), color: pick(colors),
        rot: rand(0, TAU), vr: rand(-spin, spin), tw: rand(0, TAU),
      });
    }
    this.start();
  }

  ring({ x, y, color = '#fff', size = 180, life = 40, width = 6 }) {
    this.parts.push({ type: 'ring', x, y, vx: 0, vy: 0, g: 0, drag: 1, life, max: life, size, color, width, rot: 0, vr: 0, tw: 0 });
    this.start();
  }

  clear() {
    this.parts.length = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.frame);
  }

  frame() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const next = [];
    for (const p of this.parts) {
      p.life -= 1;
      if (p.life <= 0) continue;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.tw += 0.25;
      this.draw(p);
      next.push(p);
    }
    this.parts = next;
    if (next.length) requestAnimationFrame(this.frame);
    else {
      this.running = false;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  draw(p) {
    const { ctx } = this;
    const t = p.life / p.max;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2.2);
    ctx.translate(p.x, p.y);
    ctx.fillStyle = p.color;
    switch (p.type) {
      case 'dot': {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.5 + t * 0.5), 0, TAU);
        ctx.fill();
        break;
      }
      case 'star': {
        const s = p.size * (0.6 + 0.4 * Math.abs(Math.sin(p.tw))) * 1.6;
        ctx.rotate(p.rot * 0.3);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? s : s * 0.22;
          const a = (i / 8) * TAU;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'confetti': {
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tw * 0.6));
        ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
        break;
      }
      case 'pixel': {
        const s = Math.round(p.size);
        ctx.fillRect(Math.round(-s / 2), Math.round(-s / 2), s, s);
        break;
      }
      case 'ring': {
        const k = 1 - t;
        ctx.globalAlpha = t;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * t + 1;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + p.size * (1 - (1 - k) * (1 - k)), 0, TAU);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}
