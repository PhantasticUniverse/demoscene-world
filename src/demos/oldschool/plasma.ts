import type { Demo, DemoMetadata } from '../../core/types';

export class PlasmaDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'plasma',
    name: 'Plasma',
    era: 'oldschool',
    year: 1986,
    description: 'Classic sine-wave based color cycling effect. Multiple overlapping sine functions create organic, flowing color patterns.',
    author: 'Amiga demo scene',
    renderer: 'canvas2d',
    tags: ['sine', 'palette', 'procedural', 'classic'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;
  private palette: Uint8Array = new Uint8Array(256 * 3);

  // Precomputed sine table for performance
  private sinTable: Float32Array = new Float32Array(512);

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
    this.generatePalette();
    this.generateSinTable();
  }

  private generatePalette(): void {
    for (let i = 0; i < 256; i++) {
      // Create a vibrant, cycling palette
      const r = Math.floor(128 + 127 * Math.sin(Math.PI * i / 32));
      const g = Math.floor(128 + 127 * Math.sin(Math.PI * i / 64 + 2.094));
      const b = Math.floor(128 + 127 * Math.sin(Math.PI * i / 128 + 4.188));

      this.palette[i * 3 + 0] = r;
      this.palette[i * 3 + 1] = g;
      this.palette[i * 3 + 2] = b;
    }
  }

  private generateSinTable(): void {
    for (let i = 0; i < 512; i++) {
      this.sinTable[i] = Math.sin((i * Math.PI * 2) / 512);
    }
  }

  private sin(angle: number): number {
    const index = Math.floor(((angle % (Math.PI * 2)) / (Math.PI * 2)) * 512) & 511;
    return this.sinTable[index];
  }

  render(time: number): void {
    const t = time * 0.001;
    const data = this.imageData.data;

    // Scale factor for lower resolution feel (authentic old-school)
    const scale = 2;
    const scaledWidth = Math.floor(this.width / scale);
    const scaledHeight = Math.floor(this.height / scale);

    for (let y = 0; y < scaledHeight; y++) {
      for (let x = 0; x < scaledWidth; x++) {
        // Multiple overlapping plasma patterns
        const value = Math.floor(
          (128 +
            127 * this.sin(x / 16 + t) +
            128 +
            127 * this.sin(y / 8 + t * 1.3) +
            128 +
            127 * this.sin((x + y) / 16 + t * 0.7) +
            128 +
            127 * this.sin(Math.sqrt(x * x + y * y) / 8 + t * 2)) /
            4
        ) & 255;

        // Get palette color
        const r = this.palette[value * 3 + 0];
        const g = this.palette[value * 3 + 1];
        const b = this.palette[value * 3 + 2];

        // Fill scaled pixels
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = x * scale + sx;
            const py = y * scale + sy;
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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.imageData = this.ctx.createImageData(width, height);
  }

  destroy(): void {
    // No cleanup needed
  }
}
