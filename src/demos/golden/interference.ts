import type { Demo, DemoMetadata } from '../../core/types';

interface WaveSource {
  x: number;
  y: number;
  phase: number;
  frequency: number;
  amplitude: number;
}

export class InterferenceDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'interference',
    name: 'Interference',
    era: 'golden',
    year: 2025,
    description: 'Wave interference patterns emerge from multiple point sources. Constructive and destructive interference create hypnotic moiré effects in real-time.',
    author: 'Claude',
    renderer: 'canvas2d',
    tags: ['waves', 'physics', 'patterns', 'moiré', 'procedural'],
  };

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private imageData!: ImageData;
  private sources: WaveSource[] = [];

  // Precomputed sin table
  private sinTable: number[] = [];
  private tableSize = 4096;

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);

    // Precompute sin table for performance
    for (let i = 0; i < this.tableSize; i++) {
      this.sinTable[i] = Math.sin((i / this.tableSize) * Math.PI * 2);
    }
  }

  private fastSin(x: number): number {
    const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.floor((normalized / (Math.PI * 2)) * this.tableSize) % this.tableSize;
    return this.sinTable[index];
  }

  private initSources(): void {
    // Create wave sources in interesting patterns
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.3;

    this.sources = [];

    // Ring of sources
    const numSources = 5;
    for (let i = 0; i < numSources; i++) {
      const angle = (i / numSources) * Math.PI * 2;
      this.sources.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        phase: 0,
        frequency: 0.03 + Math.random() * 0.01,
        amplitude: 1,
      });
    }

    // Center source
    this.sources.push({
      x: cx,
      y: cy,
      phase: Math.PI,
      frequency: 0.035,
      amplitude: 1.2,
    });
  }

  render(time: number): void {
    const t = time * 0.001;
    const ctx = this.ctx;
    const data = this.imageData.data;

    // Animate source positions
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.3;

    for (let i = 0; i < this.sources.length - 1; i++) {
      const angle = (i / (this.sources.length - 1)) * Math.PI * 2 + t * 0.2;
      const r = radius * (0.8 + 0.2 * Math.sin(t * 0.5 + i));
      this.sources[i].x = cx + Math.cos(angle) * r;
      this.sources[i].y = cy + Math.sin(angle) * r;
      this.sources[i].phase = t * 3 + i * 0.5;
    }

    // Center source pulses
    this.sources[this.sources.length - 1].phase = t * 4;

    // Render at reduced resolution for performance
    const scale = 2;
    const renderWidth = Math.floor(this.width / scale);
    const renderHeight = Math.floor(this.height / scale);

    // Calculate interference pattern
    for (let py = 0; py < renderHeight; py++) {
      const y = py * scale;

      for (let px = 0; px < renderWidth; px++) {
        const x = px * scale;

        // Sum waves from all sources
        let wave = 0;

        for (const source of this.sources) {
          const dx = x - source.x;
          const dy = y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Wave equation: A * sin(k*r - wt + phi)
          const k = source.frequency * 50; // Wave number
          const omega = 2; // Angular frequency
          const phase = k * dist - omega * t + source.phase;

          // Amplitude falls off with distance (1/sqrt(r) for 2D waves)
          const falloff = source.amplitude / Math.sqrt(dist / 50 + 1);
          wave += falloff * this.fastSin(phase);
        }

        // Normalize and convert to color
        const normalized = (wave / this.sources.length) * 0.5 + 0.5;

        // Color scheme: deep blue to bright cyan/white
        const intensity = Math.pow(normalized, 1.5);

        // Primary color (cyan/blue)
        const r = Math.floor(intensity * intensity * 100);
        const g = Math.floor(intensity * 200 + (1 - intensity) * 20);
        const b = Math.floor(intensity * 255 + (1 - intensity) * 80);

        // Fill scaled pixels
        for (let sy = 0; sy < scale && py * scale + sy < this.height; sy++) {
          for (let sx = 0; sx < scale && px * scale + sx < this.width; sx++) {
            const idx = ((py * scale + sy) * this.width + (px * scale + sx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(this.imageData, 0, 0);

    // Draw source indicators
    ctx.globalCompositeOperation = 'lighter';
    for (const source of this.sources) {
      // Pulsing glow
      const pulse = 0.5 + 0.5 * Math.sin(source.phase);

      const gradient = ctx.createRadialGradient(
        source.x, source.y, 0,
        source.x, source.y, 30 + pulse * 20
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * pulse})`);
      gradient.addColorStop(0.3, `rgba(100, 200, 255, ${0.4 * pulse})`);
      gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');

      ctx.beginPath();
      ctx.arc(source.x, source.y, 50, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core point
      ctx.beginPath();
      ctx.arc(source.x, source.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Draw concentric rings hint
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
    ctx.lineWidth = 1;
    for (const source of this.sources.slice(0, 1)) {
      for (let r = 50; r < 300; r += 50) {
        ctx.beginPath();
        ctx.arc(source.x, source.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.imageData = this.ctx.createImageData(width, height);
    this.initSources();
  }

  destroy(): void {
    this.sources = [];
  }
}
