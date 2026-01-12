import type { Demo, DemoMetadata } from '../../core/types';

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export class FlowFieldDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'flowfield',
    name: 'Flow Field',
    era: 'golden',
    year: 2025,
    description: 'Thousands of particles flow along curl noise vector fields, creating rivers of light that converge and spiral. Trails build up intricate interference patterns.',
    author: 'Claude',
    renderer: 'canvas2d',
    tags: ['particles', 'noise', 'curl', 'procedural', 'trails'],
  };

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private particles: Particle[] = [];
  private numParticles = 4000;

  // Offscreen canvas for trail persistence
  private trailCanvas!: HTMLCanvasElement;
  private trailCtx!: CanvasRenderingContext2D;

  // Flow field
  private fieldResolution = 20;
  private fieldWidth = 0;
  private fieldHeight = 0;
  private flowFieldX: Float32Array = new Float32Array(0);
  private flowFieldY: Float32Array = new Float32Array(0);

  private noiseOffset = 0;

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      age: Math.floor(Math.random() * 100),
      maxAge: 80 + Math.floor(Math.random() * 120),
    };
  }

  private updateFlowField(time: number): void {
    const t = time * 0.0003;
    this.noiseOffset = t;

    for (let fy = 0; fy < this.fieldHeight; fy++) {
      for (let fx = 0; fx < this.fieldWidth; fx++) {
        const idx = fy * this.fieldWidth + fx;

        // World position for noise sampling
        const wx = fx * 0.1 + this.noiseOffset;
        const wy = fy * 0.1;

        // Curl noise: derivative of noise gives divergence-free field
        const eps = 0.01;
        const n1 = this.noise(wx, wy + eps, t);
        const n2 = this.noise(wx, wy - eps, t);
        const n3 = this.noise(wx + eps, wy, t);
        const n4 = this.noise(wx - eps, wy, t);

        // Curl: (dN/dy, -dN/dx) for 2D
        this.flowFieldX[idx] = (n1 - n2) / (2 * eps);
        this.flowFieldY[idx] = -(n3 - n4) / (2 * eps);

        // Add some swirl attractors
        const cx = this.fieldWidth / 2;
        const cy = this.fieldHeight / 2;
        const dx = fx - cx;
        const dy = fy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
          // Swirling motion
          const swirl = 0.3 / (1 + dist * 0.1);
          this.flowFieldX[idx] += -dy * swirl * 0.05;
          this.flowFieldY[idx] += dx * swirl * 0.05;
        }
      }
    }
  }

  private noise(x: number, y: number, t: number): number {
    // Simple gradient noise approximation using sine combinations
    let n = 0;
    n += Math.sin(x * 1.2 + y * 0.8 + t * 0.5) * 0.5;
    n += Math.sin(x * 2.4 - y * 1.3 + t * 0.7) * 0.25;
    n += Math.sin(x * 0.7 + y * 2.1 - t * 0.3) * 0.25;
    n += Math.sin(x * 3.1 + y * 0.4 + t) * 0.125;
    return n;
  }

  private getFlowAt(x: number, y: number): [number, number] {
    const fx = Math.floor(x / this.fieldResolution);
    const fy = Math.floor(y / this.fieldResolution);

    if (fx < 0 || fx >= this.fieldWidth || fy < 0 || fy >= this.fieldHeight) {
      return [0, 0];
    }

    const idx = fy * this.fieldWidth + fx;
    return [this.flowFieldX[idx], this.flowFieldY[idx]];
  }

  render(time: number, deltaTime: number): void {
    // Update flow field periodically (not every frame for performance)
    if (Math.floor(time / 50) !== Math.floor((time - deltaTime) / 50)) {
      this.updateFlowField(time);
    }

    // Fade trail canvas
    this.trailCtx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    this.trailCtx.fillRect(0, 0, this.width, this.height);

    const speed = deltaTime * 0.15;

    // Update and draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Get flow direction
      const [flowX, flowY] = this.getFlowAt(p.x, p.y);

      // Calculate velocity magnitude for coloring
      const velocity = Math.sqrt(flowX * flowX + flowY * flowY);

      // Move particle
      const oldX = p.x;
      const oldY = p.y;
      p.x += flowX * speed * 50;
      p.y += flowY * speed * 50;
      p.age++;

      // Respawn if out of bounds or too old
      if (p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height || p.age > p.maxAge) {
        this.particles[i] = this.createParticle();
        continue;
      }

      // Color based on velocity: cool blues for slow, hot magentas for fast
      const velNorm = Math.min(1, velocity * 3);
      const hue = 220 - velNorm * 100; // 220 (blue) to 120 (cyan) to 320 (magenta wraps)
      const saturation = 80 + velNorm * 20;
      const lightness = 40 + velNorm * 30;

      // Age-based alpha for fading in/out
      const ageRatio = p.age / p.maxAge;
      const alpha = ageRatio < 0.1 ? ageRatio * 10 : (ageRatio > 0.9 ? (1 - ageRatio) * 10 : 1);

      // Draw particle trail
      this.trailCtx.beginPath();
      this.trailCtx.moveTo(oldX, oldY);
      this.trailCtx.lineTo(p.x, p.y);
      this.trailCtx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.6})`;
      this.trailCtx.lineWidth = 1;
      this.trailCtx.stroke();

      // Draw particle head
      this.trailCtx.beginPath();
      this.trailCtx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      this.trailCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${alpha * 0.8})`;
      this.trailCtx.fill();
    }

    // Draw trail canvas to main canvas
    this.ctx.drawImage(this.trailCanvas, 0, 0);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Create/resize trail canvas
    if (!this.trailCanvas) {
      this.trailCanvas = document.createElement('canvas');
      this.trailCtx = this.trailCanvas.getContext('2d')!;
    }
    this.trailCanvas.width = width;
    this.trailCanvas.height = height;
    this.trailCtx.fillStyle = 'black';
    this.trailCtx.fillRect(0, 0, width, height);

    // Update flow field dimensions
    this.fieldWidth = Math.ceil(width / this.fieldResolution);
    this.fieldHeight = Math.ceil(height / this.fieldResolution);
    this.flowFieldX = new Float32Array(this.fieldWidth * this.fieldHeight);
    this.flowFieldY = new Float32Array(this.fieldWidth * this.fieldHeight);

    this.initParticles();
  }

  destroy(): void {
    this.particles = [];
  }
}
