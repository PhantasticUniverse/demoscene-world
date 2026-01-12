import type { Demo, DemoMetadata } from '../../core/types';
import {
  createProgramFromSource,
  setupFullscreenQuad,
  fullscreenVertexShader,
} from '../../core/webgl';

// Lightweight single-pass mycelium shader
// Creates branching network patterns without heavy agent simulation
const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;

#define PI 3.14159265359

// Hash
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

// FBM
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5 * noise(p); p *= 2.0;
  f += 0.25 * noise(p); p *= 2.0;
  f += 0.125 * noise(p);
  return f / 0.875;
}

// Voronoi for network nodes
vec2 voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);

  float minDist = 10.0;
  vec2 minPoint = vec2(0.0);

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 cellId = n + neighbor;
      vec2 point = neighbor + vec2(hash(cellId), hash(cellId + 100.0)) * 0.8 + 0.1;

      float d = length(f - point);
      if (d < minDist) {
        minDist = d;
        minPoint = cellId;
      }
    }
  }

  return vec2(minDist, hash(minPoint));
}

// Branching veins using domain warping
float veins(vec2 uv, float t) {
  vec2 p = uv * 6.0;

  // Animate slowly
  p += vec2(sin(t * 0.1), cos(t * 0.08)) * 0.5;

  // Domain warp for organic flow
  vec2 warp = vec2(
    fbm(p + t * 0.05),
    fbm(p + vec2(5.2, 1.3) + t * 0.05)
  );

  float n = fbm(p + warp * 1.5);

  // Extract thin vein structures
  float vein = 0.0;
  for (float i = 1.0; i < 4.0; i++) {
    float freq = pow(2.0, i);
    float edge = abs(fract(n * freq) - 0.5);
    vein += smoothstep(0.15 / i, 0.0, edge) / i;
  }

  return vein;
}

// Network nodes and connections
float network(vec2 uv, float t) {
  vec2 p = uv * 4.0 + t * 0.1;

  vec2 vor = voronoi(p);
  float cellDist = vor.x;
  float cellId = vor.y;

  // Node at cell center
  float node = smoothstep(0.3, 0.1, cellDist);

  // Pulsing based on cell
  node *= 0.7 + 0.3 * sin(t * 2.0 + cellId * 10.0);

  // Edge glow (connections between nodes)
  float edge = smoothstep(0.5, 0.35, cellDist) - smoothstep(0.35, 0.2, cellDist);

  return node + edge * 0.5;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  // Dark organic background
  vec3 col = vec3(0.01, 0.015, 0.01);

  // Background texture
  float bgNoise = fbm(uv * 3.0 + t * 0.02);
  col += vec3(0.015, 0.025, 0.01) * bgNoise;

  // Vein network layer
  float v = veins(uv, t);
  col += vec3(0.05, 0.15, 0.03) * v;

  // Voronoi network layer
  float net = network(uv, t);
  col += vec3(0.1, 0.3, 0.1) * net;

  // Combine with bioluminescent glow
  float totalGlow = v + net;
  vec3 glowCol = mix(
    vec3(0.1, 0.4, 0.1),   // Dark green
    vec3(0.3, 0.9, 0.4),   // Bright green
    totalGlow
  );

  col += glowCol * totalGlow * 0.3;

  // Bright hotspots
  col += vec3(0.5, 1.0, 0.5) * pow(net, 4.0);

  // Pulsing center glow
  float centerPulse = 0.03 / (length(uv) + 0.3);
  centerPulse *= 0.5 + 0.5 * sin(t * 0.5);
  col += vec3(0.1, 0.3, 0.1) * centerPulse;

  // Vignette
  col *= 1.0 - length(uv) * 0.25;

  // Gamma
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class MyceliumDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'mycelium',
    name: 'Mycelium',
    era: 'modern',
    year: 2025,
    description: 'A fungal network spreads through the darkness. Inspired by slime mold intelligence, branching tendrils seek optimal paths, pulsing with bioluminescent life.',
    author: 'Claude',
    renderer: 'webgl2',
    tags: ['organic', 'network', 'emergence', 'procedural', 'nature'],
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
