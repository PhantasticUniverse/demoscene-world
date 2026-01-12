import type { Demo, DemoMetadata } from '../../core/types';
import { SeededRandom } from '../../core/utils';

export class AuroraDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'aurora',
    name: 'Aurora Borealis',
    era: 'oldschool',
    year: 2025,
    description: 'Northern lights dancing across a starry sky. Layered sine waves create shimmering curtains of light with traveling bright nodes.',
    author: 'Claude',
    renderer: 'canvas2d',
    tags: ['sine', 'palette', 'atmospheric', 'procedural'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;
  private scale = 2;

  private stars: Array<{ x: number; y: number; brightness: number; twinkleSpeed: number }> = [];
  private mountainProfile: number[] = [];
  private rng = new SeededRandom(42);

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
  }

  private generateStars(bufferWidth: number, bufferHeight: number): void {
    this.stars = [];
    const starCount = Math.floor((bufferWidth * bufferHeight) / 150);

    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.floor(this.rng.next() * bufferWidth),
        y: Math.floor(this.rng.next() * bufferHeight * 0.7), // Stars in upper 70%
        brightness: 0.3 + this.rng.next() * 0.7,
        twinkleSpeed: 2 + this.rng.next() * 4,
      });
    }
  }

  private generateMountains(bufferWidth: number): void {
    this.mountainProfile = [];
    const baseHeight = 0.15; // Mountains take up bottom 15%

    // Generate mountain profile using layered noise
    for (let x = 0; x < bufferWidth; x++) {
      let height = 0;
      // Multiple octaves of sine waves for natural mountain shape
      height += Math.sin(x * 0.02) * 0.3;
      height += Math.sin(x * 0.05 + 1.5) * 0.2;
      height += Math.sin(x * 0.11 + 3.0) * 0.15;
      height += Math.sin(x * 0.23 + 0.7) * 0.1;

      // Normalize and scale
      this.mountainProfile[x] = baseHeight + (height + 0.75) * 0.08;
    }
  }

  render(time: number): void {
    const t = time * 0.001;
    const bufferWidth = Math.floor(this.width / this.scale);
    const bufferHeight = Math.floor(this.height / this.scale);
    const data = this.imageData.data;

    // Clear to dark sky gradient
    for (let y = 0; y < bufferHeight; y++) {
      for (let x = 0; x < bufferWidth; x++) {
        const gradientT = y / bufferHeight;
        // Deep blue to near-black gradient
        const r = Math.floor(2 + gradientT * 5);
        const g = Math.floor(5 + gradientT * 10);
        const b = Math.floor(15 + gradientT * 20);

        this.setPixelScaled(data, x, y, r, g, b);
      }
    }

    // Draw stars with twinkling
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.x * 0.1);
      const brightness = Math.floor(star.brightness * twinkle * 255);

      // Slight blue-white tint for stars
      const r = brightness;
      const g = brightness;
      const b = Math.min(255, brightness + 30);

      this.setPixelScaled(data, star.x, star.y, r, g, b);
    }

    // Aurora layers (3 curtains at different depths)
    const auroraLayers = [
      { speed: 0.3, freq: 0.008, intensity: 0.7, yOffset: 0.25, hue: 120 }, // Green, front
      { speed: 0.25, freq: 0.012, intensity: 0.5, yOffset: 0.35, hue: 160 }, // Cyan, middle
      { speed: 0.2, freq: 0.006, intensity: 0.4, yOffset: 0.45, hue: 280 }, // Purple, back
    ];

    // Draw aurora from back to front
    for (let layerIdx = auroraLayers.length - 1; layerIdx >= 0; layerIdx--) {
      const layer = auroraLayers[layerIdx];

      for (let x = 0; x < bufferWidth; x++) {
        // Curtain wave shape - multiple sine waves combined
        const wave1 = Math.sin(x * layer.freq + t * layer.speed) * 30;
        const wave2 = Math.sin(x * layer.freq * 2.3 + t * layer.speed * 1.3 + 1.5) * 15;
        const wave3 = Math.sin(x * layer.freq * 0.7 + t * layer.speed * 0.8 + 3.0) * 20;
        const curtainOffset = wave1 + wave2 + wave3;

        // Traveling bright nodes along the curtain
        const nodePhase = x * 0.03 + t * 2;
        const node = Math.pow(Math.max(0, Math.sin(nodePhase)), 8) * 0.6;

        // Curtain base position
        const curtainY = Math.floor(bufferHeight * layer.yOffset + curtainOffset);

        // Draw vertical rays from curtain
        const rayHeight = 80 + Math.sin(x * 0.05 + t * 0.5) * 30;

        for (let y = curtainY; y < Math.min(curtainY + rayHeight, bufferHeight); y++) {
          if (y < 0) continue;

          // Vertical falloff - brighter at top, fading down
          const verticalT = (y - curtainY) / rayHeight;
          const verticalFade = Math.pow(1 - verticalT, 1.5);

          // Horizontal intensity variation (vertical rays)
          const rayFreq = 0.15;
          const rayIntensity = 0.5 + 0.5 * Math.sin(x * rayFreq + curtainOffset * 0.1 + t * 3);

          // Combined intensity
          let intensity = layer.intensity * verticalFade * rayIntensity;
          intensity += node * verticalFade; // Add bright nodes
          intensity = Math.min(1, intensity);

          if (intensity < 0.05) continue;

          // Color based on layer hue, shifting slightly with position
          const hueShift = Math.sin(y * 0.02 + t * 0.3) * 20;
          const hue = layer.hue + hueShift;
          const [ar, ag, ab] = this.hslToRgb(hue / 360, 0.8, 0.3 + intensity * 0.4);

          // Blend with existing pixel (additive-ish blending)
          const idx = (y * bufferWidth + x);
          const baseIdx = idx * 4;
          const currentR = data[baseIdx];
          const currentG = data[baseIdx + 1];
          const currentB = data[baseIdx + 2];

          const finalR = Math.min(255, currentR + ar * intensity);
          const finalG = Math.min(255, currentG + ag * intensity);
          const finalB = Math.min(255, currentB + ab * intensity);

          this.setPixelScaled(data, x, y, finalR, finalG, finalB);
        }
      }
    }

    // Draw mountain silhouette
    for (let x = 0; x < bufferWidth; x++) {
      const mountainHeight = this.mountainProfile[x] * bufferHeight;
      const mountainTop = Math.floor(bufferHeight - mountainHeight);

      for (let y = mountainTop; y < bufferHeight; y++) {
        // Dark mountain with slight blue tint
        this.setPixelScaled(data, x, y, 5, 8, 15);
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  private setPixelScaled(data: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number): void {
    // Scale up pixel to full resolution
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

    this.rng = new SeededRandom(42);
    this.generateStars(bufferWidth, bufferHeight);
    this.generateMountains(bufferWidth);
  }

  destroy(): void {
    this.stars = [];
    this.mountainProfile = [];
  }
}
