import type { Demo, DemoMetadata } from '../../core/types';

interface Epicycle {
  freq: number;
  amp: number;
  phase: number;
}

// Predefined shapes as DFT results (precomputed for performance)
const SHAPES = {
  // Heart shape
  heart: (() => {
    const cycles: Epicycle[] = [];
    const n = 64;
    for (let k = 0; k < n; k++) {
      let re = 0, im = 0;
      for (let t = 0; t < n; t++) {
        const angle = (t / n) * Math.PI * 2;
        // Heart parametric: x = 16sin^3(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const x = 16 * Math.pow(Math.sin(angle), 3);
        const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
        const phi = -2 * Math.PI * k * t / n;
        re += (x * Math.cos(phi) - y * Math.sin(phi)) / n;
        im += (x * Math.sin(phi) + y * Math.cos(phi)) / n;
      }
      const amp = Math.sqrt(re * re + im * im);
      if (amp > 0.01) {
        cycles.push({ freq: k, amp, phase: Math.atan2(im, re) });
      }
    }
    return cycles.sort((a, b) => b.amp - a.amp).slice(0, 30);
  })(),

  // Star shape
  star: (() => {
    const cycles: Epicycle[] = [];
    const n = 64;
    for (let k = 0; k < n; k++) {
      let re = 0, im = 0;
      for (let t = 0; t < n; t++) {
        const angle = (t / n) * Math.PI * 2;
        const r = 10 + 8 * Math.cos(5 * angle);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const phi = -2 * Math.PI * k * t / n;
        re += (x * Math.cos(phi) - y * Math.sin(phi)) / n;
        im += (x * Math.sin(phi) + y * Math.cos(phi)) / n;
      }
      const amp = Math.sqrt(re * re + im * im);
      if (amp > 0.01) {
        cycles.push({ freq: k, amp, phase: Math.atan2(im, re) });
      }
    }
    return cycles.sort((a, b) => b.amp - a.amp).slice(0, 25);
  })(),

  // Infinity symbol
  infinity: (() => {
    const cycles: Epicycle[] = [];
    const n = 64;
    for (let k = 0; k < n; k++) {
      let re = 0, im = 0;
      for (let t = 0; t < n; t++) {
        const angle = (t / n) * Math.PI * 2;
        const scale = 15;
        const x = scale * Math.cos(angle) / (1 + Math.sin(angle) * Math.sin(angle));
        const y = scale * Math.sin(angle) * Math.cos(angle) / (1 + Math.sin(angle) * Math.sin(angle));
        const phi = -2 * Math.PI * k * t / n;
        re += (x * Math.cos(phi) - y * Math.sin(phi)) / n;
        im += (x * Math.sin(phi) + y * Math.cos(phi)) / n;
      }
      const amp = Math.sqrt(re * re + im * im);
      if (amp > 0.01) {
        cycles.push({ freq: k, amp, phase: Math.atan2(im, re) });
      }
    }
    return cycles.sort((a, b) => b.amp - a.amp).slice(0, 25);
  })(),

  // Spiral flower
  flower: (() => {
    const cycles: Epicycle[] = [];
    const n = 64;
    for (let k = 0; k < n; k++) {
      let re = 0, im = 0;
      for (let t = 0; t < n; t++) {
        const angle = (t / n) * Math.PI * 2;
        const r = 12 * (1 + 0.5 * Math.cos(6 * angle)) * (0.5 + 0.5 * Math.cos(3 * angle));
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const phi = -2 * Math.PI * k * t / n;
        re += (x * Math.cos(phi) - y * Math.sin(phi)) / n;
        im += (x * Math.sin(phi) + y * Math.cos(phi)) / n;
      }
      const amp = Math.sqrt(re * re + im * im);
      if (amp > 0.01) {
        cycles.push({ freq: k, amp, phase: Math.atan2(im, re) });
      }
    }
    return cycles.sort((a, b) => b.amp - a.amp).slice(0, 30);
  })(),
};

const SHAPE_NAMES = Object.keys(SHAPES) as (keyof typeof SHAPES)[];

export class EpicyclesDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'epicycles',
    name: 'Fourier Epicycles',
    era: 'golden',
    year: 2025,
    description: 'Any shape can be drawn by summing rotating circles - the Fourier transform made visible. Nested epicycles spin at different frequencies to trace complex curves.',
    author: 'Claude',
    renderer: 'canvas2d',
    tags: ['mathematics', 'fourier', 'animation', 'geometry', 'circles'],
  };

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private currentShape = 0;
  private cycles: Epicycle[] = [];
  private trail: { x: number; y: number }[] = [];
  private maxTrailLength = 800;

  private transitionProgress = 1;
  private previousCycles: Epicycle[] = [];

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
  }

  private switchShape(index: number): void {
    this.previousCycles = [...this.cycles];
    this.cycles = SHAPES[SHAPE_NAMES[index]];
    this.transitionProgress = 0;
    this.trail = [];
  }

  render(time: number): void {
    const t = time * 0.001;
    const ctx = this.ctx;

    // Clear with dark background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, this.width, this.height);

    // Switch shapes every 15 seconds
    const shapeIndex = Math.floor(t / 15) % SHAPE_NAMES.length;
    if (shapeIndex !== this.currentShape) {
      this.currentShape = shapeIndex;
      this.switchShape(shapeIndex);
    }

    // Update transition
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 0.02);
    }

    // Center point
    const cx = this.width * 0.35;
    const cy = this.height * 0.5;
    const scale = Math.min(this.width, this.height) / 50;

    // Calculate current position through epicycle chain
    let x = cx;
    let y = cy;
    const angle = t * 0.8; // Base rotation speed

    // Interpolate between previous and current cycles during transition
    const activeCycles = this.cycles.map((cycle, i) => {
      if (this.transitionProgress < 1 && i < this.previousCycles.length) {
        const prev = this.previousCycles[i];
        const ease = this.transitionProgress * this.transitionProgress * (3 - 2 * this.transitionProgress);
        return {
          freq: cycle.freq,
          amp: prev.amp + (cycle.amp - prev.amp) * ease,
          phase: prev.phase + (cycle.phase - prev.phase) * ease,
        };
      }
      return cycle;
    });

    // Draw epicycle chain
    ctx.lineWidth = 1;

    for (let i = 0; i < activeCycles.length; i++) {
      const cycle = activeCycles[i];
      const radius = cycle.amp * scale;
      const theta = cycle.freq * angle + cycle.phase;

      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${200 + i * 10}, 60%, 50%, 0.3)`;
      ctx.stroke();

      // Draw radius line
      const newX = x + radius * Math.cos(theta);
      const newY = y + radius * Math.sin(theta);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(newX, newY);
      ctx.strokeStyle = `hsla(${200 + i * 10}, 80%, 60%, 0.6)`;
      ctx.stroke();

      // Draw joint point
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${200 + i * 10}, 80%, 70%, 0.8)`;
      ctx.fill();

      x = newX;
      y = newY;
    }

    // Draw final point (pen)
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add to trail
    this.trail.push({ x, y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // Draw connecting line to trail
    if (this.trail.length > 0) {
      const lastTrail = this.trail[this.trail.length - 1];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lastTrail.x, lastTrail.y);
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw trail with gradient
    if (this.trail.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < this.trail.length; i++) {
        const progress = i / this.trail.length;
        const hue = 30 + progress * 40;
        const alpha = Math.pow(progress, 0.5) * 0.9;

        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
        ctx.stroke();
      }

      // Glow on trail
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 6;
      for (let i = Math.max(1, this.trail.length - 100); i < this.trail.length; i++) {
        const progress = (i - (this.trail.length - 100)) / 100;
        const alpha = progress * 0.15;

        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = `hsla(40, 100%, 70%, ${alpha})`;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Draw shape name
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(SHAPE_NAMES[this.currentShape].toUpperCase(), 20, 30);
    ctx.fillText(`${activeCycles.length} epicycles`, 20, 50);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.cycles = SHAPES[SHAPE_NAMES[this.currentShape]];
    this.trail = [];
  }

  destroy(): void {
    this.trail = [];
    this.cycles = [];
  }
}
