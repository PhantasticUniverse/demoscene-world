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

// Hash function for noise
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // Smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion
float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  float freq = 1.0;

  for (int i = 0; i < 6; i++) {
    f += amp * noise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }

  return f;
}

// Domain warping: fbm(p + fbm(p + fbm(p)))
vec2 warp(vec2 p, float t) {
  // First layer of warping
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + t * 0.1),
    fbm(p + vec2(5.2, 1.3) - t * 0.08)
  );

  // Second layer of warping
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.12)
  );

  return r;
}

float terrain(vec2 p, float t) {
  vec2 w = warp(p, t);
  return fbm(p + 4.0 * w);
}

void main() {
  vec2 uv = v_uv;
  float t = u_time;

  // Aspect ratio correction
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 3.0;

  // Scroll forward through the landscape
  p.y += t * 0.3;

  // Get terrain height
  float h = terrain(p * 0.5, t * 0.5);

  // Calculate gradient for normal/lighting
  float eps = 0.01;
  float hx = terrain((p + vec2(eps, 0.0)) * 0.5, t * 0.5);
  float hy = terrain((p + vec2(0.0, eps)) * 0.5, t * 0.5);

  vec3 normal = normalize(vec3(
    (h - hx) / eps * 2.0,
    1.0,
    (h - hy) / eps * 2.0
  ));

  // Light direction (sun low on horizon)
  vec3 lightDir = normalize(vec3(0.5, 0.3, -0.8));
  float diff = max(dot(normal, lightDir), 0.0);

  // Rim lighting
  vec3 viewDir = vec3(0.0, 1.0, 0.0);
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

  // Color palette based on height and warping
  vec2 w = warp(p * 0.5, t * 0.5);
  float warpAmount = length(w);

  // Base colors: alien landscape palette
  vec3 lowColor = vec3(0.1, 0.05, 0.15);    // Deep purple
  vec3 midColor = vec3(0.2, 0.3, 0.4);      // Slate blue
  vec3 highColor = vec3(0.9, 0.6, 0.3);     // Orange peaks
  vec3 accentColor = vec3(0.0, 0.8, 0.6);   // Teal accents

  // Mix colors based on height
  vec3 col = mix(lowColor, midColor, smoothstep(0.2, 0.5, h));
  col = mix(col, highColor, smoothstep(0.6, 0.9, h));

  // Add accent color based on warp intensity
  col = mix(col, accentColor, smoothstep(0.4, 0.8, warpAmount) * 0.3);

  // Apply lighting
  col *= 0.3 + 0.7 * diff;

  // Add rim glow
  col += vec3(0.4, 0.2, 0.6) * rim * 0.5;

  // Atmospheric fog based on distance (simulated by y position)
  float fog = smoothstep(0.0, 1.0, uv.y);
  vec3 fogColor = vec3(0.15, 0.1, 0.2);
  col = mix(col, fogColor, fog * 0.5);

  // Add subtle glow to high points
  col += vec3(1.0, 0.8, 0.5) * smoothstep(0.75, 0.95, h) * 0.3;

  // Vignette
  float vignette = 1.0 - length((uv - 0.5) * 1.5);
  vignette = smoothstep(0.0, 1.0, vignette);
  col *= vignette;

  // Gamma correction
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class DomainWarpDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'domainwarp',
    name: 'Alien Terrain',
    era: 'modern',
    year: 2025,
    description: 'Domain warping creates alien landscapes using fbm(p + fbm(p + fbm(p))). Each noise layer distorts the next, producing impossibly organic, otherworldly formations.',
    author: 'Claude (Inigo Quilez technique)',
    renderer: 'webgl2',
    tags: ['noise', 'procedural', 'terrain', 'shader', 'domain-warping'],
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
    gl.clear(gl.COLOR_BUFFER_BIT);

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
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.buffer);
  }
}
