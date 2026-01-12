import type { Demo, DemoMetadata } from '../../core/types';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export class MetaballsDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'metaballs',
    name: 'Metaballs',
    era: 'golden',
    year: 1995,
    description: 'Organic blob effect using implicit surfaces. Each pixel calculates the sum of influence from multiple balls, creating smooth, merging shapes.',
    author: 'Odyssey / Rebels',
    renderer: 'canvas2d',
    tags: ['implicit-surface', 'procedural', 'organic', 'isosurface'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;
  private balls: Ball[] = [];
  private numBalls = 6;
  private scale = 3; // Render at lower resolution for performance

  // Color palette
  private palette: Uint8Array = new Uint8Array(256 * 3);

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.generatePalette();
    this.resize(width, height);
    this.initBalls();
  }

  private generatePalette(): void {
    for (let i = 0; i < 256; i++) {
      // Gradient from dark blue through cyan to white
      let r: number, g: number, b: number;

      if (i < 64) {
        // Dark to blue
        r = 0;
        g = 0;
        b = i * 4;
      } else if (i < 128) {
        // Blue to cyan
        r = 0;
        g = (i - 64) * 4;
        b = 255;
      } else if (i < 192) {
        // Cyan to white
        r = (i - 128) * 4;
        g = 255;
        b = 255;
      } else {
        // White with glow
        r = 255;
        g = 255;
        b = 255;
      }

      this.palette[i * 3 + 0] = r;
      this.palette[i * 3 + 1] = g;
      this.palette[i * 3 + 2] = b;
    }
  }

  private initBalls(): void {
    this.balls = [];
    const bufferWidth = Math.floor(this.width / this.scale);
    const bufferHeight = Math.floor(this.height / this.scale);

    for (let i = 0; i < this.numBalls; i++) {
      this.balls.push({
        x: Math.random() * bufferWidth,
        y: Math.random() * bufferHeight,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        radius: 30 + Math.random() * 40,
      });
    }
  }

  render(time: number, deltaTime: number): void {
    const bufferWidth = Math.floor(this.width / this.scale);
    const bufferHeight = Math.floor(this.height / this.scale);
    const data = this.imageData.data;

    // Update ball positions
    this.updateBalls(bufferWidth, bufferHeight, deltaTime);

    // Calculate metaball field
    for (let y = 0; y < bufferHeight; y++) {
      for (let x = 0; x < bufferWidth; x++) {
        // Sum influence from all balls
        let sum = 0;

        for (const ball of this.balls) {
          const dx = x - ball.x;
          const dy = y - ball.y;
          const distSq = dx * dx + dy * dy;

          // Metaball formula: radius^2 / distance^2
          if (distSq > 0) {
            sum += (ball.radius * ball.radius) / distSq;
          }
        }

        // Convert sum to color index (threshold creates the blob surface)
        const colorIndex = Math.min(255, Math.floor(sum * 8));

        const r = this.palette[colorIndex * 3 + 0];
        const g = this.palette[colorIndex * 3 + 1];
        const b = this.palette[colorIndex * 3 + 2];

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

  private updateBalls(width: number, height: number, deltaTime: number): void {
    const speed = deltaTime * 0.05;

    for (const ball of this.balls) {
      ball.x += ball.vx * speed;
      ball.y += ball.vy * speed;

      // Bounce off walls
      if (ball.x < 0 || ball.x > width) {
        ball.vx = -ball.vx;
        ball.x = Math.max(0, Math.min(width, ball.x));
      }
      if (ball.y < 0 || ball.y > height) {
        ball.vy = -ball.vy;
        ball.y = Math.max(0, Math.min(height, ball.y));
      }

      // Add slight attraction to center
      const cx = width / 2;
      const cy = height / 2;
      ball.vx += (cx - ball.x) * 0.0001;
      ball.vy += (cy - ball.y) * 0.0001;

      // Dampen velocity slightly
      ball.vx *= 0.999;
      ball.vy *= 0.999;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.imageData = this.ctx.createImageData(width, height);

    // Reinitialize balls for new dimensions
    if (this.balls.length > 0) {
      this.initBalls();
    }
  }

  destroy(): void {
    this.balls = [];
  }
}
