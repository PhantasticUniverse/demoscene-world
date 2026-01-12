import type { Demo, DemoMetadata } from '../../core/types';

export class TunnelDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'tunnel',
    name: 'Tunnel',
    era: 'golden',
    year: 1993,
    description: 'Infinite tunnel effect using polar coordinate texture mapping. Precalculated lookup tables map each pixel to texture coordinates.',
    author: 'Second Reality / Future Crew',
    renderer: 'canvas2d',
    tags: ['texture-mapping', 'lookup-table', 'polar', '3d-illusion'],
  };

  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private width = 0;
  private height = 0;

  // Lookup tables
  private angleTable: Float32Array = new Float32Array(0);
  private distanceTable: Float32Array = new Float32Array(0);

  // Procedural texture
  private texture: Uint8Array = new Uint8Array(0);
  private textureSize = 256;

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.generateTexture();
    this.resize(width, height);
  }

  private generateTexture(): void {
    const size = this.textureSize;
    this.texture = new Uint8Array(size * size * 3);

    // Create a checkerboard/grid pattern with some variation
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 3;

        // Create interesting pattern
        const checker = ((x >> 4) ^ (y >> 4)) & 1;
        const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1);
        const gradient = (x + y) / (size * 2);

        const base = checker ? 180 : 60;
        const variation = Math.floor(noise * 30 + gradient * 40);

        // Purple/cyan color scheme
        this.texture[idx + 0] = Math.min(255, Math.max(0, base + variation)); // R
        this.texture[idx + 1] = Math.min(255, Math.max(0, 50 + variation)); // G
        this.texture[idx + 2] = Math.min(255, Math.max(0, base + 50 + variation)); // B
      }
    }
  }

  private generateLookupTables(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.angleTable = new Float32Array(this.width * this.height);
    this.distanceTable = new Float32Array(this.width * this.height);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - cx;
        const dy = y - cy;

        // Angle (for rotation around tunnel)
        const angle = Math.atan2(dy, dx);

        // Distance from center (for depth)
        const dist = Math.sqrt(dx * dx + dy * dy);

        const idx = y * this.width + x;
        this.angleTable[idx] = angle;
        // Use 1/distance for perspective (avoid division by zero)
        this.distanceTable[idx] = dist > 0 ? 32 / dist : 0;
      }
    }
  }

  render(time: number): void {
    const t = time * 0.001;
    const data = this.imageData.data;
    const texSize = this.textureSize;
    const texMask = texSize - 1;

    // Animation parameters
    const shiftX = t * 2; // Movement through tunnel
    const shiftAngle = t * 0.5; // Rotation

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        // Get precalculated values
        const angle = this.angleTable[idx];
        const distance = this.distanceTable[idx];

        // Calculate texture coordinates with animation
        let texX = Math.floor(((angle + shiftAngle) / (Math.PI * 2)) * texSize * 2) & texMask;
        let texY = Math.floor((distance * texSize + shiftX * 50) * 0.5) & texMask;

        // Get texture color
        const texIdx = (texY * texSize + texX) * 3;
        let r = this.texture[texIdx + 0];
        let g = this.texture[texIdx + 1];
        let b = this.texture[texIdx + 2];

        // Apply depth fog (darker towards center = far away)
        const fog = Math.min(1, distance * 8);
        r = Math.floor(r * fog);
        g = Math.floor(g * fog);
        b = Math.floor(b * fog);

        // Write to image data
        const pixelIdx = idx * 4;
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
    this.generateLookupTables();
  }

  destroy(): void {
    // No cleanup needed
  }
}
