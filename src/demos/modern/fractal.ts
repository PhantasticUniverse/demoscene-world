import type { Demo, DemoMetadata } from '../../core/types';
import {
  createProgramFromSource,
  setupFullscreenQuad,
  fullscreenVertexShader,
} from '../../core/webgl';

const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Attempt a higher iteration count for detail
const int MAX_ITER = 256;

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Animated zoom
  float t = u_time * 0.15;
  float zoom = pow(1.5, t);

  // Interesting coordinate to zoom into (Seahorse Valley)
  vec2 target = vec2(-0.743643887037151, 0.131825904205330);

  // Apply zoom and pan
  vec2 c = target + uv / zoom;

  // Mandelbrot iteration
  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < MAX_ITER; i++) {
    if (dot(z, z) > 4.0) break;

    // z = z^2 + c
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    iter += 1.0;
  }

  // Smooth iteration count for better coloring
  if (iter < float(MAX_ITER)) {
    float log_zn = log(dot(z, z)) / 2.0;
    float nu = log(log_zn / log(2.0)) / log(2.0);
    iter = iter + 1.0 - nu;
  }

  // Coloring
  vec3 col;

  if (iter >= float(MAX_ITER)) {
    // Inside the set - deep black/purple
    col = vec3(0.0, 0.0, 0.02);
  } else {
    // Outside - smooth gradient based on iteration
    float hue = fract(iter * 0.02 + t * 0.1);
    float sat = 0.7 + 0.3 * sin(iter * 0.1);
    float val = 0.9 - 0.4 * cos(iter * 0.05);

    col = hsv2rgb(vec3(hue, sat, val));

    // Add some glow near the boundary
    float edgeDist = iter / float(MAX_ITER);
    col += vec3(0.1, 0.05, 0.2) * (1.0 - edgeDist) * 2.0;
  }

  // Vignette
  vec2 vignetteUV = gl_FragCoord.xy / u_resolution - 0.5;
  float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.5;
  col *= vignette;

  fragColor = vec4(col, 1.0);
}
`;

export class FractalDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'fractal',
    name: 'Fractal Zoom',
    era: 'modern',
    year: 1980,
    description: 'Infinite zoom into the Mandelbrot set. The GPU iterates the formula z = z² + c for each pixel, revealing endless self-similar patterns.',
    author: 'Benoit Mandelbrot',
    renderer: 'webgl2',
    tags: ['fractal', 'mandelbrot', 'infinite', 'shader', 'mathematical'],
  };

  private gl!: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private timeUniform!: WebGLUniformLocation;
  private resolutionUniform!: WebGLUniformLocation;
  private mouseUniform!: WebGLUniformLocation;
  private width = 0;
  private height = 0;
  private mouseX = 0;
  private mouseY = 0;

  init(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Create shader program
    this.program = createProgramFromSource(gl, fullscreenVertexShader, fragmentShader);

    // Get uniform locations
    this.timeUniform = gl.getUniformLocation(this.program, 'u_time')!;
    this.resolutionUniform = gl.getUniformLocation(this.program, 'u_resolution')!;
    this.mouseUniform = gl.getUniformLocation(this.program, 'u_mouse')!;

    // Setup fullscreen quad
    this.buffer = setupFullscreenQuad(gl);

    // Setup vertex attribute
    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Set clear color
    gl.clearColor(0, 0, 0, 1);
  }

  render(time: number): void {
    const gl = this.gl;

    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform1f(this.timeUniform, time * 0.001);
    gl.uniform2f(this.resolutionUniform, this.width, this.height);
    gl.uniform2f(this.mouseUniform, this.mouseX, this.mouseY);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  onMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.buffer);
  }
}
