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

// Signed distance functions
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Smooth minimum for blending shapes
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Rotation matrix
mat2 rot2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// Scene distance function
float map(vec3 p) {
  float t = u_time * 0.5;

  // Rotating torus
  vec3 p1 = p;
  p1.xz *= rot2D(t);
  p1.xy *= rot2D(t * 0.7);
  float torus = sdTorus(p1, vec2(1.0, 0.3));

  // Orbiting spheres
  float spheres = 1e10;
  for (int i = 0; i < 4; i++) {
    float angle = float(i) * 1.57 + t * 1.5;
    vec3 offset = vec3(cos(angle) * 1.5, sin(t + float(i)) * 0.5, sin(angle) * 1.5);
    float sphere = sdSphere(p - offset, 0.4);
    spheres = smin(spheres, sphere, 0.3);
  }

  // Central pulsing sphere
  float pulse = 0.5 + 0.2 * sin(t * 3.0);
  float center = sdSphere(p, pulse);

  // Combine with smooth minimum
  float d = smin(torus, spheres, 0.5);
  d = smin(d, center, 0.4);

  return d;
}

// Calculate normal using gradient
vec3 calcNormal(vec3 p) {
  const float h = 0.0001;
  const vec2 k = vec2(1, -1);
  return normalize(
    k.xyy * map(p + k.xyy * h) +
    k.yyx * map(p + k.yyx * h) +
    k.yxy * map(p + k.yxy * h) +
    k.xxx * map(p + k.xxx * h)
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Camera setup
  float camDist = 4.0 + sin(u_time * 0.3) * 0.5;
  float camAngle = u_time * 0.2;
  vec3 ro = vec3(sin(camAngle) * camDist, 2.0 + sin(u_time * 0.5), cos(camAngle) * camDist);
  vec3 target = vec3(0.0);

  // Camera matrix
  vec3 forward = normalize(target - ro);
  vec3 right = normalize(cross(vec3(0, 1, 0), forward));
  vec3 up = cross(forward, right);

  vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);

  // Raymarching
  float t = 0.0;
  float d;
  vec3 p;

  for (int i = 0; i < 100; i++) {
    p = ro + rd * t;
    d = map(p);
    if (d < 0.001 || t > 20.0) break;
    t += d;
  }

  // Coloring
  vec3 col = vec3(0.02, 0.02, 0.05); // Background

  if (d < 0.001) {
    vec3 n = calcNormal(p);

    // Lighting
    vec3 lightDir = normalize(vec3(1, 2, -1));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
    float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    // Base color with position-based variation
    vec3 baseCol = 0.5 + 0.5 * cos(u_time * 0.5 + p * 2.0 + vec3(0, 2, 4));

    col = baseCol * (0.2 + 0.8 * diff);
    col += vec3(1.0, 0.9, 0.8) * spec * 0.5;
    col += vec3(0.3, 0.5, 1.0) * fresnel * 0.3;

    // Fog
    float fog = 1.0 - exp(-t * 0.1);
    col = mix(col, vec3(0.02, 0.02, 0.05), fog);
  }

  // Gamma correction
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class RaymarcherDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'raymarcher',
    name: 'Raymarcher',
    era: 'modern',
    year: 2010,
    description: 'Real-time raymarching using signed distance functions (SDFs). The GPU calculates surface intersections by "marching" rays through a mathematically defined 3D scene.',
    author: 'Inigo Quilez / Shadertoy',
    renderer: 'webgl2',
    tags: ['raymarching', 'sdf', '3d', 'shader', 'procedural'],
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

    // Create shader program
    this.program = createProgramFromSource(gl, fullscreenVertexShader, fragmentShader);

    // Get uniform locations
    this.timeUniform = gl.getUniformLocation(this.program, 'u_time')!;
    this.resolutionUniform = gl.getUniformLocation(this.program, 'u_resolution')!;

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
