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
- `src/demos/` - Demo implementations organized by era:
  - `oldschool/` - Pre-1990s Canvas 2D effects (plasma, starfield, fire)
  - `golden/` - 90s-2000s Canvas 2D effects (tunnel, rotozoom, metaballs)
  - `modern/` - WebGL2 shader effects (raymarcher, fractal)

## Adding New Demos

1. Create `src/demos/{era}/{name}.ts` implementing the `Demo` interface from `src/core/types.ts`
2. Add `registerDemo(new YourDemo())` to the era's `index.ts`

The Demo interface requires:
- `metadata` - id, name, era, description, renderer type, tags
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
