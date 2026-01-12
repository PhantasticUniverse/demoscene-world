# Demoscene World

A gallery of tiny demoscene-style visual effects organized by era, built with TypeScript and Vite.

## Development

```bash
npm install
npm run dev
```

## Project Structure

- `src/core/` - Core infrastructure (types, utils, DemoRunner, registry)
- `src/gallery/` - Gallery UI components
- `src/demos/` - Demo implementations organized by era

## Demos

### Old-School Era (Canvas 2D)

| Demo | Year | Description | Credits |
|------|------|-------------|---------|
| Plasma | 1986 | Classic sine-wave color cycling effect | Demoscene World |
| Starfield | 1987 | 3D starfield flying through space | Demoscene World |
| Fire | 1988 | Real-time fire simulation with heat propagation | Demoscene World |
| Copper Bars | 1988 | Amiga copper bars with sine wave motion | Claude (Amiga homage) |
| Aurora Borealis | 2025 | Northern lights with layered sine waves | Claude |

### Golden Age Era (Canvas 2D)

| Demo | Year | Description | Credits |
|------|------|-------------|---------|
| Tunnel | 1993 | Infinite tunnel with polar coordinate mapping | Demoscene World |
| Rotozoom | 1994 | Rotating and zooming texture effect | Demoscene World |
| Metaballs | 1995 | Organic blob simulation | Demoscene World |
| Strange Attractor | 2025 | Lorenz attractor with particle trails | Claude |
| Crystal Voronoi | 2025 | Animated Voronoi cells with edge glow | Claude |
| Flow Field | 2025 | Curl noise particles with persistent trails | Claude |
| Interference | 2025 | Wave superposition with moving point sources | Claude |
| Fourier Epicycles | 2025 | Drawing with rotating circles (DFT visualization) | Claude |

### Modern Era (WebGL2)

| Demo | Year | Description | Credits |
|------|------|-------------|---------|
| Raymarcher | 2010 | Real-time raymarching with SDFs | Demoscene World |
| Fractal Zoom | 2011 | Mandelbrot set infinite zoom | Demoscene World |
| Reaction-Diffusion | 2025 | Gray-Scott model simulation | Claude (Gray-Scott model) |
| Alien Terrain | 2025 | Domain warping: fbm(p + fbm(p + fbm(p))) | Claude (Inigo Quilez technique) |
| Deep Sea | 2025 | Bioluminescent jellyfish with SDFs | Claude |
| Hyperbolic Tessellation | 2025 | Poincare disk with {7,3} tiling | Claude (Escher-inspired) |
| Event Horizon | 2025 | Black hole with gravitational lensing and accretion disk | Claude |
| Tesseract | 2025 | 4D hypercube rotating through six planes | Claude |
| Lenia | 2025 | Continuous cellular automata with organic lifeforms | Claude (Bert Chan's Lenia) |
| Quantum Foam | 2025 | Virtual particle pairs in vacuum fluctuations | Claude |
| Mycelium | 2025 | Fungal network with bioluminescent veins | Claude |
| Klein Flow | 2025 | Mobius strip with particles revealing one-sidedness | Claude |

## Adding New Demos

1. Create `src/demos/{era}/{name}.ts` implementing the `Demo` interface from `src/core/types.ts`
2. Add `registerDemo(new YourDemo())` to the era's `index.ts`

The Demo interface requires:
- `metadata` - id, name, era, year, description, author, renderer type, tags
- `init(ctx, width, height)` - Initialize the demo
- `render(time, deltaTime)` - Render a frame
- `resize(width, height)` - Handle canvas resize
- `destroy()` - Cleanup resources

## Keyboard Shortcuts

- Space: Pause/Resume
- F: Toggle fullscreen
- R: Restart current demo
- Arrow keys: Navigate demos
- 1/2/3: Switch era (Old-School/Golden Age/Modern)

## Tech Stack

- Vite + TypeScript
- Canvas 2D for old-school/golden age effects
- WebGL2 + GLSL for modern shader effects
