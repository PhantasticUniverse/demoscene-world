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

### Old-School Era (Pre-1990s, Canvas 2D)

| Demo | Year | Description | Credits |
|------|------|-------------|---------|
| Plasma | 1986 | Classic sine-wave color cycling effect | Demoscene World |
| Starfield | 1987 | 3D starfield flying through space | Demoscene World |
| Fire | 1988 | Real-time fire simulation with heat propagation | Demoscene World |
| Aurora Borealis | 1989 | Northern lights with layered sine waves | Demoscene World |

### Golden Age Era (1990s-2000s, Canvas 2D)

| Demo | Year | Description | Credits |
|------|------|-------------|---------|
| Tunnel | 1993 | Infinite tunnel with polar coordinate mapping | Demoscene World |
| Rotozoom | 1994 | Rotating and zooming texture effect | Demoscene World |
| Metaballs | 1995 | Organic blob simulation | Demoscene World |
| Strange Attractor | 1996 | Lorenz attractor with particle trails | Demoscene World |
| Crystal Voronoi | 1997 | Animated Voronoi cells with edge glow | Demoscene World |
| Flow Field | 1998 | Curl noise particles with persistent trails | Demoscene World |

### Modern Era (2010s+, WebGL2)

| Demo | Year | Description | Credits |
|------|------|-------------|---------|
| Raymarcher | 2010 | Real-time raymarching with SDFs | Demoscene World |
| Fractal Zoom | 2011 | Mandelbrot set infinite zoom | Demoscene World |
| Reaction-Diffusion | 2012 | Gray-Scott model simulation | Karl Sims / Gray-Scott model |
| Alien Terrain | 2015 | Domain warping: fbm(p + fbm(p + fbm(p))) | Inigo Quilez technique |
| Deep Sea | 2018 | Bioluminescent jellyfish with SDFs | Demoscene World |
| Hyperbolic Tessellation | 2020 | Poincare disk with {7,3} tiling | Demoscene World / Escher-inspired |

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
