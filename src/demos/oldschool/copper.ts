import type { Demo, DemoMetadata } from '../../core/types';

interface CopperBar {
  y: number;
  speed: number;
  phase: number;
  colors: string[];
  height: number;
}

export class CopperDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'copper',
    name: 'Copper Bars',
    era: 'oldschool',
    year: 1988,
    description: 'Classic Amiga copper bars - horizontal gradient strips dancing with sine wave motion. A signature effect of the demoscene\'s golden era.',
    author: 'Claude (Amiga homage)',
    renderer: 'canvas2d',
    tags: ['amiga', 'copper', 'retro', 'raster', 'classic'],
  };

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private bars: CopperBar[] = [];

  // Classic demoscene color palettes
  private palettes = [
    // Fire palette
    ['#000', '#300', '#600', '#900', '#c00', '#f00', '#f30', '#f60', '#f90', '#fc0', '#ff0', '#ff6', '#ffc', '#fff', '#ffc', '#ff6', '#ff0', '#fc0', '#f90', '#f60', '#f30', '#f00', '#c00', '#900', '#600', '#300'],
    // Ocean palette
    ['#000', '#003', '#006', '#009', '#00c', '#00f', '#03f', '#06f', '#09f', '#0cf', '#0ff', '#6ff', '#cff', '#fff', '#cff', '#6ff', '#0ff', '#0cf', '#09f', '#06f', '#03f', '#00f', '#00c', '#009', '#006', '#003'],
    // Purple haze
    ['#000', '#201', '#402', '#603', '#804', '#a05', '#c06', '#e07', '#f08', '#f2a', '#f4c', '#f6e', '#f8f', '#faf', '#fcf', '#fef', '#fcf', '#faf', '#f8f', '#f6e', '#f4c', '#f2a', '#f08', '#e07', '#c06', '#a05'],
    // Green matrix
    ['#000', '#010', '#020', '#030', '#040', '#050', '#060', '#070', '#080', '#090', '#0a0', '#0b0', '#0c0', '#0d0', '#0e0', '#0f0', '#2f2', '#4f4', '#6f6', '#8f8', '#afa', '#cfc', '#afa', '#8f8', '#6f6', '#4f4'],
    // Gold/bronze
    ['#000', '#210', '#420', '#630', '#840', '#a50', '#c60', '#e70', '#f80', '#fa0', '#fc0', '#fd0', '#fe0', '#ff0', '#fe6', '#fca', '#fc6', '#fa0', '#f80', '#e70', '#c60', '#a50', '#840', '#630', '#420', '#210'],
  ];

  init(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.ctx = ctx;
    this.resize(width, height);
  }

  private initBars(): void {
    this.bars = [];
    const numBars = 8;

    for (let i = 0; i < numBars; i++) {
      const paletteIndex = i % this.palettes.length;
      this.bars.push({
        y: (this.height / numBars) * i,
        speed: 0.8 + Math.random() * 0.4,
        phase: (i / numBars) * Math.PI * 2,
        colors: this.palettes[paletteIndex],
        height: 28 + Math.floor(Math.random() * 12),
      });
    }
  }

  render(time: number): void {
    const t = time * 0.001;
    const ctx = this.ctx;

    // Dark blue background (classic Amiga blue)
    ctx.fillStyle = '#000020';
    ctx.fillRect(0, 0, this.width, this.height);

    // Optional: Draw subtle scanlines for authenticity
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < this.height; y += 2) {
      ctx.fillRect(0, y, this.width, 1);
    }

    // Sort bars by y position for proper layering (back to front)
    const sortedBars = [...this.bars].map((bar, index) => {
      const baseY = this.height / 2;
      const amplitude = this.height * 0.35;
      const y = baseY + Math.sin(t * bar.speed + bar.phase) * amplitude;
      return { ...bar, currentY: y, index };
    }).sort((a, b) => a.currentY - b.currentY);

    // Draw each copper bar
    for (const bar of sortedBars) {
      const y = bar.currentY;
      const colors = bar.colors;
      const barHeight = bar.height;

      // Draw the gradient bar line by line (like real copper effect)
      for (let line = 0; line < barHeight; line++) {
        const colorIndex = Math.floor((line / barHeight) * colors.length);
        const scanY = Math.floor(y - barHeight / 2 + line);

        if (scanY >= 0 && scanY < this.height) {
          // Slight horizontal wobble for extra demoscene feel
          const wobble = Math.sin(t * 3 + scanY * 0.05 + bar.phase) * 2;

          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(wobble, scanY, this.width, 1);
        }
      }

      // Bright highlight line in center
      const highlightY = Math.floor(y);
      if (highlightY >= 0 && highlightY < this.height) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(0, highlightY, this.width, 1);
      }

      // Subtle glow effect
      const gradient = ctx.createLinearGradient(0, y - barHeight, 0, y + barHeight);
      const baseColor = colors[Math.floor(colors.length / 2)];
      // Convert 3-char hex to rgba for proper alpha
      const rgb = this.hexToRgb(baseColor);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.3, `rgba(${rgb}, 0.2)`);
      gradient.addColorStop(0.5, `rgba(${rgb}, 0.4)`);
      gradient.addColorStop(0.7, `rgba(${rgb}, 0.2)`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y - barHeight * 1.5, this.width, barHeight * 3);
    }

    // Add scrolling sine text at bottom (classic demoscene touch)
    this.drawSineText(t);

    // Add subtle CRT curvature vignette
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, 'transparent');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawSineText(t: number): void {
    const ctx = this.ctx;
    const text = '   GREETINGS FROM DEMOSCENE WORLD  ...  COPPER BARS FOREVER  ...  ';
    const charWidth = 12;
    const baseY = this.height - 40;
    const scrollX = (t * 80) % (text.length * charWidth);

    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < text.length * 2; i++) {
      const char = text[i % text.length];
      const x = i * charWidth - scrollX;

      if (x < -charWidth || x > this.width + charWidth) continue;

      const sineOffset = Math.sin(t * 3 + i * 0.3) * 8;
      const y = baseY + sineOffset;

      // Rainbow color for text
      const hue = (i * 10 + t * 50) % 360;

      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.fillText(char, x, y);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initBars();
  }

  // Convert hex color to RGB string
  private hexToRgb(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    // Expand 3-char hex to 6-char
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  destroy(): void {
    this.bars = [];
  }
}
