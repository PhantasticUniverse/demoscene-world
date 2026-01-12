import type { Demo, DemoMetadata } from '../../core/types';
import { SeededRandom } from '../../core/utils';

interface Star {
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
}

export class StarfieldDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'starfield',
    name: 'Starfield',
    era: 'oldschool',
    year: 1982,
    description: '3D starfield flying through space. A classic effect using simple perspective projection to create depth.',
    author: 'C64 demo scene',
    renderer: 'canvas2d',
    tags: ['3d', 'perspective', 'particles', 'classic'],
  };

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private stars: Star[] = [];
  private numStars = 400;
  private speed = 0.5;
  private rng = new SeededRandom(42);

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push(this.createStar(true));
    }
  }

  private createStar(randomZ: boolean): Star {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const spread = Math.max(this.width, this.height);

    return {
      x: this.rng.range(-spread, spread),
      y: this.rng.range(-spread, spread),
      z: randomZ ? this.rng.range(1, 1000) : 1000,
      prevX: cx,
      prevY: cy,
    };
  }

  render(time: number, deltaTime: number): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Fade effect for trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Dynamic speed based on time
    const currentSpeed = this.speed * (1 + 0.3 * Math.sin(time * 0.0005));

    for (const star of this.stars) {
      // Store previous screen position
      const prevZ = star.z;

      // Move star towards camera
      star.z -= currentSpeed * deltaTime;

      // Reset star if it passes the camera
      if (star.z <= 0) {
        const newStar = this.createStar(false);
        star.x = newStar.x;
        star.y = newStar.y;
        star.z = newStar.z;
        star.prevX = cx;
        star.prevY = cy;
        continue;
      }

      // Project 3D position to 2D screen
      const scale = 200 / star.z;
      const screenX = cx + star.x * scale;
      const screenY = cy + star.y * scale;

      // Previous position
      const prevScale = 200 / prevZ;
      const prevScreenX = cx + star.x * prevScale;
      const prevScreenY = cy + star.y * prevScale;

      // Check if on screen
      if (
        screenX < 0 ||
        screenX >= this.width ||
        screenY < 0 ||
        screenY >= this.height
      ) {
        const newStar = this.createStar(false);
        star.x = newStar.x;
        star.y = newStar.y;
        star.z = newStar.z;
        star.prevX = cx;
        star.prevY = cy;
        continue;
      }

      // Brightness based on distance (closer = brighter)
      const brightness = Math.min(255, Math.floor((1 - star.z / 1000) * 255));
      const size = Math.max(1, (1 - star.z / 1000) * 3);

      // Draw star trail
      ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(prevScreenX, prevScreenY);
      ctx.lineTo(screenX, screenY);
      ctx.stroke();

      // Draw star point
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${Math.min(255, brightness + 50)})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();

      star.prevX = screenX;
      star.prevY = screenY;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // Reinitialize stars for new dimensions
    if (this.stars.length > 0) {
      this.initStars();
    }
  }

  destroy(): void {
    this.stars = [];
  }
}
