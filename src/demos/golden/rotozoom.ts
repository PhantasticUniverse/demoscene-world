import type { Demo, DemoMetadata } from '../../core/types';

export class RotozoomDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'rotozoom',
    name: 'Rotozoom',
    era: 'golden',
    year: 1992,
    description: 'Classic rotation and zoom effect. Applies 2D transformation matrix to tile a texture with smooth rotation and scaling.',
    author: 'Amiga/DOS demo scene',
    renderer: 'canvas2d',
    tags: ['texture-mapping', 'matrix', 'rotation', 'tiling'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;

  // Procedural texture
  private texture: Uint8Array = new Uint8Array(0);
  private textureSize = 128;

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.generateTexture();
    this.resize(width, height);
  }

  private generateTexture(): void {
    const size = this.textureSize;
    this.texture = new Uint8Array(size * size * 3);

    // Create an interesting tiling pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 3;

        // XOR pattern (classic demoscene)
        const xorPattern = (x ^ y) & 255;

        // Add some sine waves for variation
        const wave1 = Math.sin((x + y) * 0.1) * 40;
        const wave2 = Math.cos((x - y) * 0.15) * 30;

        // Distance from center for radial pattern
        const cx = x - size / 2;
        const cy = y - size / 2;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const radial = Math.sin(dist * 0.2) * 50;

        // Combine patterns
        const value = (xorPattern + wave1 + wave2 + radial) / 2;

        // Color with blue/purple tint
        this.texture[idx + 0] = Math.min(255, Math.max(0, Math.floor(value * 0.7)));
        this.texture[idx + 1] = Math.min(255, Math.max(0, Math.floor(value * 0.5)));
        this.texture[idx + 2] = Math.min(255, Math.max(0, Math.floor(value)));
      }
    }
  }

  render(time: number): void {
    const t = time * 0.001;
    const data = this.imageData.data;
    const texSize = this.textureSize;
    const texMask = texSize - 1;

    // Calculate rotation and zoom
    const angle = t * 0.5;
    const zoom = 1 + 0.5 * Math.sin(t * 0.7);

    // Rotation matrix components
    const cos = Math.cos(angle) / zoom;
    const sin = Math.sin(angle) / zoom;

    // Center of screen
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Offset for texture animation
    const offsetX = Math.sin(t * 0.3) * 50;
    const offsetY = Math.cos(t * 0.4) * 50;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Translate to center, rotate, then translate back
        const dx = x - cx;
        const dy = y - cy;

        // Apply rotation matrix
        let texX = dx * cos - dy * sin + offsetX;
        let texY = dx * sin + dy * cos + offsetY;

        // Wrap texture coordinates (tile the texture)
        texX = ((Math.floor(texX) % texSize) + texSize) & texMask;
        texY = ((Math.floor(texY) % texSize) + texSize) & texMask;

        // Get texture color
        const texIdx = (texY * texSize + texX) * 3;
        const r = this.texture[texIdx + 0];
        const g = this.texture[texIdx + 1];
        const b = this.texture[texIdx + 2];

        // Write to image data
        const pixelIdx = (y * this.width + x) * 4;
        data[pixelIdx + 0] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255;
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
