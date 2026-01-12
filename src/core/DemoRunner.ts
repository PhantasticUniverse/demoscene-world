import type { Demo, RenderingContext, RendererType } from './types';

export class DemoRunner {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private currentRendererType: RendererType | null = null;
  private currentDemo: Demo | null = null;
  private animationId: number = 0;
  private lastTime: number = 0;
  private isPaused: boolean = false;
  private pausedTime: number = 0;
  private accumulatedPauseTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.container = canvas.parentElement!;
    this.setupResize();
    this.setupInputHandlers();
  }

  private setupResize(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this.canvas.parentElement!);
    this.handleResize();
  }

  private handleResize(): void {
    const container = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.currentDemo) {
      this.currentDemo.resize(this.canvas.width, this.canvas.height);
    }
  }

  private setupInputHandlers(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.currentDemo?.onMouseMove) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        this.currentDemo.onMouseMove(x, y);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.currentDemo?.onMouseDown) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        this.currentDemo.onMouseDown(x, y, e.button);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.currentDemo?.onKeyDown) {
        this.currentDemo.onKeyDown(e.key);
      }
    });
  }

  private recreateCanvas(): void {
    // Create a new canvas to switch context types
    const newCanvas = document.createElement('canvas');
    newCanvas.id = this.canvas.id;
    newCanvas.style.cssText = this.canvas.style.cssText;
    newCanvas.width = this.canvas.width;
    newCanvas.height = this.canvas.height;

    this.container.replaceChild(newCanvas, this.canvas);
    this.canvas = newCanvas;

    // Clear old contexts
    this.ctx2d = null;
    this.gl = null;

    // Re-setup input handlers on new canvas
    this.setupInputHandlers();
  }

  private getContext(type: RendererType): RenderingContext {
    // If switching renderer types, recreate the canvas
    if (this.currentRendererType !== null && this.currentRendererType !== type) {
      this.recreateCanvas();
    }
    this.currentRendererType = type;

    if (type === 'canvas2d') {
      if (!this.ctx2d) {
        this.ctx2d = this.canvas.getContext('2d')!;
      }
      return this.ctx2d;
    } else {
      if (!this.gl) {
        this.gl = this.canvas.getContext('webgl2', {
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: false,
        })!;
      }
      return this.gl;
    }
  }

  async runDemo(demo: Demo): Promise<void> {
    // Stop current demo
    this.stop();

    this.currentDemo = demo;
    this.accumulatedPauseTime = 0;
    this.isPaused = false;

    // Get appropriate context
    const ctx = this.getContext(demo.metadata.renderer);

    // Initialize demo
    await demo.init(ctx, this.canvas.width, this.canvas.height);

    // Start render loop
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    if (!this.currentDemo) return;

    this.animationId = requestAnimationFrame(this.loop);

    if (this.isPaused) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    // Time passed to demo excludes paused time
    const time = now - this.accumulatedPauseTime;

    // Clear canvas based on renderer type
    if (this.currentDemo.metadata.renderer === 'canvas2d' && this.ctx2d) {
      // Let demo handle clearing
    } else if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    this.currentDemo.render(time, deltaTime);
  };

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }

    if (this.currentDemo) {
      this.currentDemo.destroy();
      this.currentDemo = null;
    }

    // Clear contexts
    if (this.ctx2d) {
      this.ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.gl) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
  }

  pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pausedTime = performance.now();
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.accumulatedPauseTime += performance.now() - this.pausedTime;
      this.isPaused = false;
      this.lastTime = performance.now();
    }
  }

  togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  get paused(): boolean {
    return this.isPaused;
  }

  restart(): void {
    if (this.currentDemo) {
      this.runDemo(this.currentDemo);
    }
  }
}
