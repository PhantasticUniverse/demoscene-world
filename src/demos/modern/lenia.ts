import type { Demo, DemoMetadata } from '../../core/types';
import {
  createProgramFromSource,
  setupFullscreenQuad,
  fullscreenVertexShader,
} from '../../core/webgl';

// Lightweight single-pass Lenia-inspired shader
// Creates organic, cell-like patterns without heavy multi-pass simulation
const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;

#define PI 3.14159265359

// Hash function
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM - 3 octaves for efficiency
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5 * noise(p); p *= 2.0;
  f += 0.25 * noise(p); p *= 2.0;
  f += 0.125 * noise(p);
  return f / 0.875;
}

// Lenia-like cell pattern using domain warping
float leniaCell(vec2 p, float t) {
  // Multiple moving cell centers
  float cells = 0.0;

  for (int i = 0; i < 5; i++) {
    float fi = float(i);

    // Cell center moves organically
    vec2 center = vec2(
      sin(t * 0.3 + fi * 1.2) * 0.3 + cos(t * 0.2 + fi) * 0.2,
      cos(t * 0.25 + fi * 0.9) * 0.3 + sin(t * 0.15 + fi * 1.5) * 0.2
    );

    vec2 d = p - center;
    float r = length(d);

    // Organic shape using noise distortion
    float angle = atan(d.y, d.x);
    float shape = 0.15 + 0.05 * sin(angle * 3.0 + t + fi)
                      + 0.03 * sin(angle * 5.0 - t * 0.5);

    // Soft ring structure (characteristic of Lenia Orbium)
    float ring = exp(-pow((r - shape * 0.7) / 0.08, 2.0));
    float core = exp(-pow(r / shape, 2.0));

    cells += (core * 0.6 + ring * 0.4) * (0.7 + 0.3 * sin(t * 0.5 + fi));
  }

  return cells;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  // Get cell pattern
  float cells = leniaCell(uv, t);

  // Add subtle background texture
  float bg = fbm(uv * 5.0 + t * 0.1) * 0.1;

  // Edge detection for membrane effect
  float eps = 0.01;
  float cx = leniaCell(uv + vec2(eps, 0.0), t);
  float cy = leniaCell(uv + vec2(0.0, eps), t);
  float edge = abs(cx - cells) + abs(cy - cells);
  edge = smoothstep(0.0, 0.1, edge * 5.0);

  // Organic color palette (cyan-blue-green)
  float hue = 0.5 + cells * 0.1 + edge * 0.05 + sin(t * 0.1) * 0.03;
  float sat = 0.5 + cells * 0.3;
  float val = cells * 0.8 + edge * 0.4 + bg;

  vec3 col = hsv2rgb(vec3(hue, sat, val));

  // Inner glow
  col += vec3(0.2, 0.5, 0.6) * pow(cells, 2.5) * 0.4;

  // Edge highlight (membrane)
  col += vec3(0.7, 0.9, 1.0) * edge * 0.4;

  // Dark background
  vec3 bgCol = vec3(0.02, 0.03, 0.05);
  col = mix(bgCol, col, smoothstep(0.02, 0.15, cells + bg));

  // Gamma correction
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class LeniaDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'lenia',
    name: 'Lenia',
    era: 'modern',
    year: 2025,
    description: 'Organic lifeforms emerge from mathematical rules. Soft, living patterns move and pulse like single-celled organisms, inspired by Bert Chan\'s continuous cellular automata.',
    author: 'Claude (Bert Chan\'s Lenia)',
    renderer: 'webgl2',
    tags: ['cellular-automata', 'emergence', 'life', 'organic', 'procedural'],
  };

  private gl!: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private timeUniform!: WebGLUniformLocation;
  private resolutionUniform!: WebGLUniformLocation;
  private width = 0;
  private height = 0;

  init(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.width = width;
    this.height = height;

    this.program = createProgramFromSource(gl, fullscreenVertexShader, fragmentShader);
    this.timeUniform = gl.getUniformLocation(this.program, 'u_time')!;
    this.resolutionUniform = gl.getUniformLocation(this.program, 'u_resolution')!;
    this.buffer = setupFullscreenQuad(gl);

    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.clearColor(0, 0, 0, 1);
  }

  render(time: number): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);
    gl.uniform1f(this.timeUniform, time * 0.001);
    gl.uniform2f(this.resolutionUniform, this.width, this.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.buffer);
  }
}
