// Math utilities
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const fract = (x: number): number => x - Math.floor(x);

export const mod = (x: number, y: number): number => x - y * Math.floor(x / y);

// Color utilities
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export const hslToRgb = (h: number, s: number, l: number): RGB => {
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

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
};

// Palette generation
export type Palette = Uint8Array; // r,g,b triplets for 256 colors

export const generatePalette = (
  fn: (i: number) => RGB
): Palette => {
  const palette = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const { r, g, b } = fn(i);
    palette[i * 3 + 0] = r;
    palette[i * 3 + 1] = g;
    palette[i * 3 + 2] = b;
  }
  return palette;
};

// Common demoscene palettes
export const createFirePalette = (): Palette =>
  generatePalette((i) => ({
    r: clamp(i * 3, 0, 255),
    g: clamp(i * 1.5 - 128, 0, 255),
    b: clamp(i - 200, 0, 255),
  }));

export const createPlasmaPalette = (): Palette =>
  generatePalette((i) => ({
    r: Math.floor(128 + 127 * Math.sin(Math.PI * i / 32)),
    g: Math.floor(128 + 127 * Math.sin(Math.PI * i / 64 + 2)),
    b: Math.floor(128 + 127 * Math.sin(Math.PI * i / 128 + 4)),
  }));

export const createRainbowPalette = (): Palette =>
  generatePalette((i) => hslToRgb(i / 256, 1, 0.5));

// Noise functions
export const noise2D = (x: number, y: number): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

// Simple pseudo-random number generator (seeded)
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}
