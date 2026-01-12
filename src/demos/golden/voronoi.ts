import type { Demo, DemoMetadata } from '../../core/types';

interface Seed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

export class VoronoiDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'voronoi',
    name: 'Crystal Voronoi',
    era: 'golden',
    year: 2025,
    description: 'Crystalline Voronoi cells that form, merge, and split as seeds dance across the screen. Edge glow creates a stained-glass aesthetic.',
    author: 'Claude',
    renderer: 'canvas2d',
    tags: ['voronoi', 'procedural', 'geometric', 'cells'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;
  private scale = 3; // Lower resolution for performance

  private seeds: Seed[] = [];
  private numSeeds = 25;

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
  }

  private initSeeds(bufferWidth: number, bufferHeight: number): void {
    this.seeds = [];
    for (let i = 0; i < this.numSeeds; i++) {
      this.seeds.push({
        x: Math.random() * bufferWidth,
        y: Math.random() * bufferHeight,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        hue: (i / this.numSeeds) * 360,
      });
    }
  }

  private updateSeeds(width: number, height: number, time: number, deltaTime: number): void {
    const t = time * 0.001;
    const speed = deltaTime * 0.03;

    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];

      // Lissajous-like motion overlay
      const lissajousX = Math.sin(t * 0.5 + i * 0.7) * 0.5;
      const lissajousY = Math.cos(t * 0.3 + i * 1.1) * 0.5;

      seed.x += (seed.vx + lissajousX) * speed;
      seed.y += (seed.vy + lissajousY) * speed;

      // Bounce off walls
      if (seed.x < 0 || seed.x > width) {
        seed.vx *= -1;
        seed.x = Math.max(0, Math.min(width, seed.x));
      }
      if (seed.y < 0 || seed.y > height) {
        seed.vy *= -1;
        seed.y = Math.max(0, Math.min(height, seed.y));
      }

      // Mutual repulsion between seeds
      for (let j = i + 1; j < this.seeds.length; j++) {
        const other = this.seeds[j];
        const dx = other.x - seed.x;
        const dy = other.y - seed.y;
        const distSq = dx * dx + dy * dy;
        const minDist = 30;

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (minDist - dist) * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          seed.vx -= fx;
          seed.vy -= fy;
          other.vx += fx;
          other.vy += fy;
        }
      }

      // Damping
      seed.vx *= 0.99;
      seed.vy *= 0.99;

      // Slowly cycle hue
      seed.hue = (seed.hue + deltaTime * 0.01) % 360;
    }
  }

  render(time: number, deltaTime: number): void {
    const bufferWidth = Math.floor(this.width / this.scale);
    const bufferHeight = Math.floor(this.height / this.scale);
    const data = this.imageData.data;

    this.updateSeeds(bufferWidth, bufferHeight, time, deltaTime);

    // Compute Voronoi for each pixel
    for (let y = 0; y < bufferHeight; y++) {
      for (let x = 0; x < bufferWidth; x++) {
        let minDist = Infinity;
        let secondMinDist = Infinity;
        let closestIdx = 0;

        // Find closest and second-closest seeds
        for (let i = 0; i < this.seeds.length; i++) {
          const seed = this.seeds[i];
          const dx = x - seed.x;
          const dy = y - seed.y;
          const dist = dx * dx + dy * dy; // Squared distance for speed

          if (dist < minDist) {
            secondMinDist = minDist;
            minDist = dist;
            closestIdx = i;
          } else if (dist < secondMinDist) {
            secondMinDist = dist;
          }
        }

        const closest = this.seeds[closestIdx];
        const distToEdge = Math.sqrt(secondMinDist) - Math.sqrt(minDist);

        // Base color from seed hue
        const hue = closest.hue;
        const saturation = 70;

        // Lightness based on distance from center of cell
        const centerDist = Math.sqrt(minDist);
        const maxDist = 50;
        const centerGradient = Math.min(1, centerDist / maxDist);
        let lightness = 25 + centerGradient * 25;

        // Edge glow - bright white/gold at cell boundaries
        const edgeThreshold = 3;
        let edgeGlow = 0;
        if (distToEdge < edgeThreshold) {
          edgeGlow = 1 - (distToEdge / edgeThreshold);
          edgeGlow = edgeGlow * edgeGlow; // Sharpen the glow
        }

        // Convert HSL to RGB
        let r: number, g: number, b: number;

        if (edgeGlow > 0.3) {
          // Edge: golden-white glow
          const glowIntensity = edgeGlow;
          r = 255 * glowIntensity + (1 - glowIntensity) * 100;
          g = 230 * glowIntensity + (1 - glowIntensity) * 80;
          b = 180 * glowIntensity + (1 - glowIntensity) * 60;
        } else {
          // Cell interior: rich gem colors
          [r, g, b] = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);

          // Add subtle edge glow even for non-edge pixels
          const edgeTint = edgeGlow * 2;
          r = Math.min(255, r + edgeTint * 100);
          g = Math.min(255, g + edgeTint * 80);
          b = Math.min(255, b + edgeTint * 50);
        }

        // Scale up to full resolution
        for (let sy = 0; sy < this.scale; sy++) {
          for (let sx = 0; sx < this.scale; sx++) {
            const px = x * this.scale + sx;
            const py = y * this.scale + sy;
            if (px < this.width && py < this.height) {
              const idx = (py * this.width + px) * 4;
              data[idx + 0] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 255;
            }
          }
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.imageData = this.ctx.createImageData(width, height);

    const bufferWidth = Math.floor(width / this.scale);
    const bufferHeight = Math.floor(height / this.scale);
    this.initSeeds(bufferWidth, bufferHeight);
  }

  destroy(): void {
    this.seeds = [];
  }
}
