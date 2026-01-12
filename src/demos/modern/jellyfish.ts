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

#define PI 3.14159265359

mat2 rot2D(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

// Jellyfish bell - elegant dome (opening faces down)
float sdBell(vec3 p, float pulse) {
  // Flip so dome faces up, opening faces down
  vec3 q = p;
  q.y = -q.y;  // Flip vertically

  // Dome shape
  vec3 scale = vec3(1.0, 0.7 + pulse * 0.15, 1.0);
  float outer = length(q / scale) - 1.0;

  // Inner cavity (creates the hollow bell)
  vec3 innerScale = scale * 0.88;
  float inner = length((q - vec3(0.0, 0.15, 0.0)) / innerScale) - 1.0;
  float bell = max(outer, -inner);

  // Cut off top to create opening
  bell = max(bell, -q.y - 0.2 + pulse * 0.08);

  // Scalloped edge at the rim (bottom in world space)
  float angle = atan(q.z, q.x);
  float scallop = sin(angle * 12.0 + u_time * 2.5) * 0.06;
  scallop += sin(angle * 24.0 - u_time * 1.5) * 0.025;
  bell += scallop * smoothstep(-0.3, 0.1, q.y);

  return bell;
}

// Single tentacle as a tapered, waving strand
float sdTentacle(vec3 p, float len, float baseRadius, float t, float seed) {
  // Tentacle extends downward (negative y)
  float y = -p.y;
  if (y < 0.0 || y > len) return 1e10;

  float progress = y / len;

  // Flowing wave motion
  float wave = sin(y * 1.5 + t * 2.0 + seed) * 0.4 * progress;
  wave += sin(y * 2.5 + t * 1.5 + seed * 2.0) * 0.2 * progress;

  float waveZ = cos(y * 2.0 + t * 1.8 + seed * 0.7) * 0.3 * progress;

  vec3 offset = vec3(wave, 0.0, waveZ);
  vec3 q = p - offset;

  // Tapered radius
  float radius = baseRadius * (1.0 - progress * 0.85);

  return length(q.xz) - radius;
}

// Complete jellyfish
float sdJellyfish(vec3 p, float timeOffset) {
  float t = u_time + timeOffset;

  // Smooth pulsing animation
  float pulse = sin(t * 1.2) * 0.4;

  // Gentle swimming motion
  p.y += sin(t * 0.3) * 0.3;
  p.x += sin(t * 0.2) * 0.2;
  p.z += cos(t * 0.25) * 0.15;

  // Subtle tilt
  p.xy *= rot2D(sin(t * 0.2) * 0.05);
  p.zy *= rot2D(cos(t * 0.18) * 0.04);

  // Bell
  float d = sdBell(p, pulse);

  // Fewer, thicker tentacles for better performance
  // Outer ring - 8 tentacles
  for (int i = 0; i < 8; i++) {
    float angle = float(i) * PI * 0.25;
    vec3 tp = p;
    tp.x -= cos(angle) * 0.6;
    tp.z -= sin(angle) * 0.6;
    tp.y -= 0.15;

    float tent = sdTentacle(tp, 2.5, 0.1, t, float(i) + timeOffset);
    d = smin(d, tent, 0.12);
  }

  // Central arms - 4 thicker
  for (int i = 0; i < 4; i++) {
    float angle = float(i) * PI * 0.5 + PI * 0.25;
    vec3 op = p;
    op.x -= cos(angle) * 0.25;
    op.z -= sin(angle) * 0.25;
    op.y -= 0.1;

    float arm = sdTentacle(op, 2.0, 0.14, t * 0.85, float(i) * 4.0 + timeOffset);
    d = smin(d, arm, 0.1);
  }

  return d;
}

// Scene with multiple jellyfish
float map(vec3 p) {
  float d = sdJellyfish(p, 0.0);

  // One background jellyfish for depth
  d = min(d, sdJellyfish((p - vec3(2.2, 0.3, 4.0)) * 0.65, 3.0) / 0.65);

  return d;
}

vec3 calcNormal(vec3 p) {
  const float h = 0.001;
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
  float t = u_time;

  // Camera
  vec3 ro = vec3(0.0, 0.0, -3.5);
  ro.x += sin(t * 0.15) * 0.3;
  ro.y += cos(t * 0.12) * 0.25;

  vec3 rd = normalize(vec3(uv, 1.0));

  // Raymarch
  float dist = 0.0;
  float d;
  vec3 p;

  for (int i = 0; i < 80; i++) {
    p = ro + rd * dist;
    d = map(p);
    if (d < 0.001 || dist > 20.0) break;
    dist += d * 0.8;
  }

  // Deep ocean background
  vec3 deepBlue = vec3(0.0, 0.02, 0.08);
  vec3 midBlue = vec3(0.0, 0.05, 0.15);
  float grad = uv.y * 0.5 + 0.5;
  vec3 col = mix(deepBlue, midBlue, grad);

  // Subtle god rays from above
  float rays = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float rayX = sin(fi * 1.5 + t * 0.1) * 0.4;
    rays += smoothstep(0.15, 0.0, abs(uv.x - rayX)) * 0.1;
  }
  col += vec3(0.0, 0.05, 0.1) * rays * smoothstep(-0.5, 0.5, uv.y);

  if (d < 0.01) {
    vec3 n = calcNormal(p);

    // Ethereal color palette
    vec3 cyan = vec3(0.2, 0.9, 1.0);
    vec3 purple = vec3(0.6, 0.2, 1.0);
    vec3 pink = vec3(1.0, 0.3, 0.6);
    vec3 aqua = vec3(0.1, 1.0, 0.7);

    // Color varies across the creature
    float colorMix = sin(p.y * 2.0 + t * 0.5) * 0.5 + 0.5;
    vec3 baseColor = mix(cyan, purple, colorMix);
    baseColor = mix(baseColor, pink, sin(p.x * 3.0 + t) * 0.3 + 0.2);
    baseColor = mix(baseColor, aqua, cos(p.z * 2.0 + t * 0.7) * 0.2 + 0.1);

    // Fresnel for translucent edge glow
    float fresnel = pow(1.0 - abs(dot(n, -rd)), 3.0);

    // Pulsing bioluminescence
    float pulse = 0.6 + 0.4 * sin(t * 2.0 + p.y * 3.0);

    // Build the glow
    vec3 jellyColor = baseColor * 0.4 * pulse;        // Core color
    jellyColor += baseColor * fresnel * 1.5;          // Edge glow
    jellyColor += cyan * 0.3 * pulse;                 // Ambient glow

    // Membrane veins
    float veins = sin(p.y * 15.0 + atan(p.z, p.x) * 6.0 + t) * 0.15 + 0.85;
    jellyColor *= veins;

    // Translucent blend with background
    float alpha = 0.4 + fresnel * 0.6;
    col = mix(col, jellyColor, alpha);

    // Bloom
    col += baseColor * fresnel * 0.4;

    // Distance fog
    float fog = 1.0 - exp(-dist * 0.1);
    col = mix(col, midBlue, fog * 0.6);
  }

  // Bioluminescent particles
  for (int i = 0; i < 30; i++) {
    float fi = float(i);
    vec3 particlePos = vec3(
      sin(fi * 73.1 + t * 0.03) * 4.0,
      mod(fi * 0.5 - t * 0.08, 6.0) - 3.0,
      cos(fi * 91.7) * 6.0 + 3.0
    );

    float twinkle = pow(sin(t * 1.5 + fi * 2.5) * 0.5 + 0.5, 2.0);
    float particleDist = length(cross(particlePos - ro, rd));
    float glow = 0.02 / (particleDist * particleDist + 0.01) * twinkle;
    glow *= smoothstep(10.0, 3.0, length(particlePos - ro));

    vec3 particleCol = mix(vec3(0.2, 0.8, 1.0), vec3(0.4, 1.0, 0.6), hash(fi));
    col += particleCol * glow;
  }

  // Vignette
  col *= 1.0 - length(uv) * 0.3;

  // Gamma
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class JellyfishDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'jellyfish',
    name: 'Deep Sea',
    era: 'modern',
    year: 2018,
    description: 'Bioluminescent jellyfish drift through dark waters. SDFs create translucent creatures with pulsing bells and trailing tentacles, surrounded by glowing plankton.',
    author: 'Demoscene World',
    renderer: 'webgl2',
    tags: ['raymarching', 'sdf', 'organic', 'underwater', 'bioluminescence'],
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
