import type { Demo, DemoMetadata } from '../../core/types';

interface Particle {
  x: number;
  y: number;
  z: number;
  hue: number;
}

export class AttractorDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'attractor',
    name: 'Strange Attractor',
    era: 'golden',
    year: 1996,
    description: 'Lorenz attractor visualization with thousands of particles tracing chaos. The butterfly-shaped structure reveals hidden geometry within mathematical chaos.',
    author: 'Demoscene World',
    renderer: 'canvas2d',
    tags: ['chaos', 'particles', 'mathematical', '3d', 'attractor'],
  };

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private particles: Particle[] = [];
  private numParticles = 5000;

  // Lorenz parameters (classic values for chaotic behavior)
  private sigma = 10;
  private rho = 28;
  private beta = 8 / 3;

  // View rotation
  private rotationY = 0;
  private rotationX = 0;

  // Trail canvas for persistent trails
  private trailCanvas!: HTMLCanvasElement;
  private trailCtx!: CanvasRenderingContext2D;

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
  }

  private initParticles(): void {
    this.particles = [];

    // Initialize particles distributed along the attractor
    for (let i = 0; i < this.numParticles; i++) {
      // Start near one of the attractor's fixed points with small perturbation
      const wing = Math.random() > 0.5 ? 1 : -1;
      const sqrtPart = Math.sqrt(this.beta * (this.rho - 1));

      this.particles.push({
        x: wing * sqrtPart + (Math.random() - 0.5) * 10,
        y: wing * sqrtPart + (Math.random() - 0.5) * 10,
        z: this.rho - 1 + (Math.random() - 0.5) * 10,
        hue: (i / this.numParticles) * 360, // Distributed hues
      });
    }

    // Pre-run to get particles onto the attractor
    for (let i = 0; i < 100; i++) {
      for (const p of this.particles) {
        this.lorenzStep(p, 0.005);
      }
    }
  }

  private lorenzStep(p: Particle, dt: number): void {
    // Lorenz system equations
    const dx = this.sigma * (p.y - p.x);
    const dy = p.x * (this.rho - p.z) - p.y;
    const dz = p.x * p.y - this.beta * p.z;

    p.x += dx * dt;
    p.y += dy * dt;
    p.z += dz * dt;
  }

  private project(x: number, y: number, z: number): [number, number, number] {
    // Center the attractor (Lorenz attractor is centered around z=rho-1 ≈ 27)
    const cx = x;
    const cy = y;
    const cz = z - 25; // Shift z to center

    // Apply rotations
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);

    // Rotate around Y axis
    let rx = cx * cosY - cz * sinY;
    let rz = cx * sinY + cz * cosY;

    // Rotate around X axis
    const ry = cy * cosX - rz * sinX;
    rz = cy * sinX + rz * cosX;

    // Scale to fit screen nicely
    const baseScale = Math.min(this.width, this.height) / 80;

    // Simple orthographic-ish projection (with slight depth scaling)
    const depthScale = 1.0 + rz * 0.01;
    const scale = baseScale * depthScale;

    const screenX = this.width / 2 + rx * scale;
    const screenY = this.height / 2 - ry * scale;

    return [screenX, screenY, rz];
  }

  render(time: number, deltaTime: number): void {
    const t = time * 0.001;

    // Smooth rotation
    this.rotationY = t * 0.2;
    this.rotationX = 0.4 + Math.sin(t * 0.15) * 0.3;

    // Integration timestep (smaller = more accurate but slower evolution)
    const dt = 0.004;

    // Fade trails slowly for persistence
    this.trailCtx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    this.trailCtx.fillRect(0, 0, this.width, this.height);

    // Update and draw particles
    for (const particle of this.particles) {
      // Store old position
      const [oldX, oldY] = this.project(particle.x, particle.y, particle.z);

      // Integrate several small steps for accuracy
      for (let s = 0; s < 3; s++) {
        this.lorenzStep(particle, dt);
      }

      // Project new position
      const [newX, newY, depth] = this.project(particle.x, particle.y, particle.z);

      // Calculate velocity for brightness
      const dx = newX - oldX;
      const dy = newY - oldY;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      // Color based on z-position (creates wing distinction)
      const zColor = ((particle.z - 10) / 35) * 180; // Map z to hue shift
      const hue = (particle.hue + zColor + t * 10) % 360;

      // Brightness based on velocity
      const brightness = Math.min(70, 30 + velocity * 15);
      const saturation = 85 + Math.min(15, velocity * 5);

      // Depth-based alpha
      const alpha = Math.max(0.3, Math.min(1, 0.6 + depth * 0.02));

      // Skip if way off screen
      if (newX < -50 || newX > this.width + 50 || newY < -50 || newY > this.height + 50) {
        continue;
      }

      // Draw trail line
      this.trailCtx.beginPath();
      this.trailCtx.moveTo(oldX, oldY);
      this.trailCtx.lineTo(newX, newY);
      this.trailCtx.strokeStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, ${alpha * 0.6})`;
      this.trailCtx.lineWidth = 1;
      this.trailCtx.stroke();

      // Draw particle point (brighter)
      this.trailCtx.beginPath();
      this.trailCtx.arc(newX, newY, 1.2, 0, Math.PI * 2);
      this.trailCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${brightness + 20}%, ${alpha})`;
      this.trailCtx.fill();
    }

    // Copy trails to main canvas
    this.ctx.drawImage(this.trailCanvas, 0, 0);

    // Additive glow pass
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.globalAlpha = 0.15;
    this.ctx.drawImage(this.trailCanvas, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
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

    // Clear to black
    this.trailCtx.fillStyle = 'black';
    this.trailCtx.fillRect(0, 0, width, height);

    this.initParticles();
  }

  destroy(): void {
    this.particles = [];
  }
}
