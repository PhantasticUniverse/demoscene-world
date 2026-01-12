import type { Demo, DemoMetadata } from '../../core/types';

export class FireDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'fire',
    name: 'Fire',
    era: 'oldschool',
    year: 1990,
    description: 'Classic fire effect using cellular automaton with heat diffusion. Each pixel averages neighboring heat values and rises upward.',
    author: 'DOS demo scene',
    renderer: 'canvas2d',
    tags: ['cellular-automaton', 'palette', 'procedural'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;
  private fireBuffer: Uint8Array = new Uint8Array(0);
  private palette: Uint8Array = new Uint8Array(256 * 3);
  private scale = 4; // Render at lower resolution for authentic look

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.generatePalette();
    this.resize(width, height);
  }

  private generatePalette(): void {
    // Fire palette: black -> red -> orange -> yellow -> white
    for (let i = 0; i < 256; i++) {
      let r: number, g: number, b: number;

      if (i < 64) {
        // Black to dark red
        r = i * 4;
        g = 0;
        b = 0;
      } else if (i < 128) {
        // Dark red to orange
        r = 255;
        g = (i - 64) * 4;
        b = 0;
      } else if (i < 192) {
        // Orange to yellow
        r = 255;
        g = 255;
        b = (i - 128) * 4;
      } else {
        // Yellow to white
        r = 255;
        g = 255;
        b = 255;
      }

      this.palette[i * 3 + 0] = r;
      this.palette[i * 3 + 1] = g;
      this.palette[i * 3 + 2] = b;
    }
  }

  render(time: number): void {
    const bufferWidth = Math.floor(this.width / this.scale);
    const bufferHeight = Math.floor(this.height / this.scale);

    // Seed the bottom row with random fire
    const bottomRow = (bufferHeight - 1) * bufferWidth;
    for (let x = 0; x < bufferWidth; x++) {
      // Random intensity with some flickering
      this.fireBuffer[bottomRow + x] = Math.random() > 0.3 ? 255 : Math.floor(Math.random() * 128);
    }

    // Propagate fire upward
    for (let y = 0; y < bufferHeight - 1; y++) {
      for (let x = 0; x < bufferWidth; x++) {
        // Average of pixels below and to the sides
        const idx = y * bufferWidth + x;

        // Sample from below and neighbors (with wrapping)
        const below = (y + 1) * bufferWidth + x;
        const belowLeft = (y + 1) * bufferWidth + ((x - 1 + bufferWidth) % bufferWidth);
        const belowRight = (y + 1) * bufferWidth + ((x + 1) % bufferWidth);
        const twoBelow = Math.min(y + 2, bufferHeight - 1) * bufferWidth + x;

        // Average the heat values
        const avg = (
          this.fireBuffer[below] +
          this.fireBuffer[belowLeft] +
          this.fireBuffer[belowRight] +
          this.fireBuffer[twoBelow]
        ) / 4;

        // Decay as it rises (cooling factor)
        const decay = 1.5 + Math.random() * 0.5;
        this.fireBuffer[idx] = Math.max(0, Math.floor(avg - decay));
      }
    }

    // Render to canvas
    const data = this.imageData.data;

    for (let y = 0; y < bufferHeight; y++) {
      for (let x = 0; x < bufferWidth; x++) {
        const fireValue = this.fireBuffer[y * bufferWidth + x];

        const r = this.palette[fireValue * 3 + 0];
        const g = this.palette[fireValue * 3 + 1];
        const b = this.palette[fireValue * 3 + 2];

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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.imageData = this.ctx.createImageData(width, height);

    const bufferWidth = Math.floor(width / this.scale);
    const bufferHeight = Math.floor(height / this.scale);
    this.fireBuffer = new Uint8Array(bufferWidth * bufferHeight);
  }

  destroy(): void {
    // No cleanup needed
  }
}
