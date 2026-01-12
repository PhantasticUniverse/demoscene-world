export type Era = 'oldschool' | 'golden' | 'modern';
export type RendererType = 'canvas2d' | 'webgl2';
export type RenderingContext = CanvasRenderingContext2D | WebGL2RenderingContext;

export interface DemoMetadata {
  id: string;
  name: string;
  era: Era;
  year?: number;
  description: string;
  author?: string;
  renderer: RendererType;
  tags: string[];
}

export interface Demo {
  metadata: DemoMetadata;

  init(ctx: RenderingContext, width: number, height: number): void | Promise<void>;
  render(time: number, deltaTime: number): void;
  resize(width: number, height: number): void;
  destroy(): void;

  // Optional interactivity
  onMouseMove?(x: number, y: number): void;
  onMouseDown?(x: number, y: number, button: number): void;
  onKeyDown?(key: string): void;
}

export interface DemoConstructor {
  new (): Demo;
}
