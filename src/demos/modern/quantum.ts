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
#define TAU 6.28318530718

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

// FBM for turbulence (reduced iterations)
float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    f += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return f;
}

// Virtual particle pair (particle-antiparticle)
// Returns: x = intensity, y = phase
vec2 virtualPair(vec2 uv, vec2 center, float birthTime, float lifetime, float t) {
  float age = t - birthTime;
  if (age < 0.0 || age > lifetime) return vec2(0.0);

  // Lifetime envelope - gaussian rise and fall
  float envelope = exp(-pow((age - lifetime * 0.5) / (lifetime * 0.3), 2.0));

  // Two particles separating from center
  float separation = age * 0.3;
  float angle = hash(center + birthTime) * TAU;

  vec2 p1 = center + vec2(cos(angle), sin(angle)) * separation;
  vec2 p2 = center - vec2(cos(angle), sin(angle)) * separation;

  // Particle wavefunctions (gaussian packets)
  float sigma = 0.02 + age * 0.01;
  float d1 = length(uv - p1);
  float d2 = length(uv - p2);

  float psi1 = exp(-d1*d1 / (2.0*sigma*sigma));
  float psi2 = exp(-d2*d2 / (2.0*sigma*sigma));

  // Phase evolution (de Broglie)
  float momentum = 5.0;
  float phase1 = momentum * dot(uv - center, vec2(cos(angle), sin(angle))) - t * 10.0;
  float phase2 = momentum * dot(uv - center, vec2(-cos(angle), -sin(angle))) - t * 10.0 + PI; // Antiparticle

  // Combine with interference
  vec2 wf1 = psi1 * vec2(cos(phase1), sin(phase1));
  vec2 wf2 = psi2 * vec2(cos(phase2), sin(phase2));

  vec2 total = wf1 + wf2;
  float intensity = length(total) * envelope;

  return vec2(intensity, atan(total.y, total.x));
}

// Vacuum energy fluctuation (foam structure)
float foamStructure(vec2 uv, float t) {
  // Voronoi-like foam cells
  vec2 p = uv * 8.0;
  vec2 n = floor(p);
  vec2 f = fract(p);

  float minDist = 10.0;
  float secondMin = 10.0;

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 neighbor = vec2(float(dx), float(dy));
      vec2 cellId = n + neighbor;

      // Cell center moves over time
      vec2 offset = vec2(
        hash(cellId),
        hash(cellId + 100.0)
      );
      offset += 0.3 * vec2(
        sin(t * 0.5 + hash(cellId) * TAU),
        cos(t * 0.4 + hash(cellId + 50.0) * TAU)
      );

      float d = length(f - neighbor - offset);
      if (d < minDist) {
        secondMin = minDist;
        minDist = d;
      } else if (d < secondMin) {
        secondMin = d;
      }
    }
  }

  // Cell edge
  float edge = secondMin - minDist;
  return edge;
}

// Uncertainty cloud (Heisenberg) - reduced iterations
float uncertaintyCloud(vec2 uv, float t) {
  float u = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float phase = fi * 1.4 + t * 0.3;
    vec2 offset = vec2(sin(phase * 1.1 + fi), cos(phase * 0.9 + fi * 1.3)) * 0.1;
    float d = length(uv + offset);
    u += exp(-d * d / 0.01) * (0.5 + 0.5 * sin(t * 2.0 + fi * 0.5));
  }
  return u * 0.3;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  vec3 col = vec3(0.0);

  // Deep space background
  vec3 bg1 = vec3(0.01, 0.0, 0.03);
  vec3 bg2 = vec3(0.02, 0.01, 0.05);
  col = mix(bg1, bg2, length(uv) * 0.5);

  // Foam structure (spacetime topology)
  float foam = foamStructure(uv, t);
  vec3 foamColor = vec3(0.1, 0.05, 0.2) * smoothstep(0.0, 0.15, foam);
  col += foamColor;

  // Multiple virtual particle pairs popping in and out
  float totalIntensity = 0.0;
  vec3 particleColor = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float fi = float(i);

    // Each particle has its own birth cycle
    float cycleLength = 2.0 + hash(vec2(fi, 0.0)) * 3.0;
    float birthTime = mod(t + fi * 0.7, cycleLength);
    float lifetime = 0.5 + hash(vec2(fi, 1.0)) * 0.5;

    if (birthTime < lifetime) {
      // Particle center
      vec2 center = vec2(
        hash(vec2(fi, floor(t / cycleLength))) - 0.5,
        hash(vec2(fi + 100.0, floor(t / cycleLength))) - 0.5
      ) * 1.5;

      vec2 pair = virtualPair(uv, center, 0.0, lifetime, birthTime);

      if (pair.x > 0.01) {
        // Color based on phase (complex amplitude visualization)
        float phase = pair.y;
        vec3 phaseColor = 0.5 + 0.5 * vec3(
          cos(phase),
          cos(phase + TAU / 3.0),
          cos(phase + 2.0 * TAU / 3.0)
        );

        particleColor += phaseColor * pair.x;
        totalIntensity += pair.x;
      }
    }
  }

  // Normalize and add particle contribution
  if (totalIntensity > 0.0) {
    particleColor /= totalIntensity;
    col += particleColor * min(totalIntensity * 2.0, 1.0);
  }

  // Vacuum fluctuation glow (zero-point energy)
  float vacuumEnergy = fbm(uv * 5.0 + t * 0.2) * fbm(uv * 3.0 - t * 0.15);
  vacuumEnergy = pow(vacuumEnergy, 2.0);
  col += vec3(0.3, 0.1, 0.5) * vacuumEnergy * 0.3;

  // Bright energy bursts
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float burstTime = mod(t * 0.7 + fi * 1.3, 3.0);

    if (burstTime < 0.3) {
      vec2 burstPos = vec2(
        hash(vec2(fi, floor((t * 0.7 + fi * 1.3) / 3.0))) - 0.5,
        hash(vec2(fi + 50.0, floor((t * 0.7 + fi * 1.3) / 3.0))) - 0.5
      );

      float d = length(uv - burstPos);
      float burst = exp(-d * d / 0.002) * (1.0 - burstTime / 0.3);
      col += vec3(1.0, 0.8, 1.0) * burst;
    }
  }

  // Subtle interference pattern (underlying wave nature)
  float interference = sin(length(uv) * 50.0 - t * 3.0) * 0.5 + 0.5;
  interference *= exp(-length(uv) * 2.0);
  col += vec3(0.2, 0.1, 0.3) * interference * 0.1;

  // Uncertainty haze
  col += vec3(0.15, 0.1, 0.25) * uncertaintyCloud(uv, t);

  // Tone mapping
  col = col / (col + 0.5);

  // Vignette
  col *= 1.0 - length(uv) * 0.3;

  // Gamma
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class QuantumFoamDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'quantum',
    name: 'Quantum Foam',
    era: 'modern',
    year: 2025,
    description: 'At the Planck scale, spacetime itself becomes turbulent. Virtual particle-antiparticle pairs blink in and out of existence, borrowing energy from the vacuum in fleeting quantum fluctuations.',
    author: 'Claude',
    renderer: 'webgl2',
    tags: ['physics', 'quantum', 'particles', 'procedural', 'abstract'],
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
