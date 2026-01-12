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

// Mobius-Klein surface
float sdSurface(vec3 p, float t) {
  // Mobius strip component
  float angle = atan(p.z, p.x);
  float r = length(p.xz);

  // Mobius twist - half turn around the loop
  float twist = angle * 0.5 + t * 0.2;

  // Local coordinates on the strip
  vec3 local;
  local.x = r - 1.2;
  local.y = p.y * cos(twist) + (r - 1.2) * sin(twist) * 0.3;
  local.z = -p.y * sin(twist) + (r - 1.2) * cos(twist) * 0.3;

  // Strip thickness
  float strip = max(abs(local.x) - 0.3, abs(local.y) - 0.02);

  // Add flowing particles effect
  float flow = sin(angle * 3.0 + t * 2.0) * 0.5 + 0.5;

  return strip;
}

// Flow particles on the surface
vec3 surfaceFlow(vec3 p, float t) {
  float angle = atan(p.z, p.x);
  float r = length(p.xz);

  // Particles flowing along the surface
  float flow = 0.0;
  vec3 flowColor = vec3(0.0);

  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float particleAngle = mod(t * 0.5 + fi * TAU / 10.0, TAU);
    float particleTwist = particleAngle * 0.5 + t * 0.2;

    vec3 particlePos = vec3(
      cos(particleAngle) * 1.2,
      sin(particleTwist) * 0.15,
      sin(particleAngle) * 1.2
    );

    float d = length(p - particlePos);
    float glow = 0.01 / (d * d + 0.001);

    // Color cycles as particle goes around (shows one-sidedness)
    float colorPhase = particleAngle + particleTwist;
    vec3 pc = 0.5 + 0.5 * cos(colorPhase + vec3(0.0, 2.1, 4.2));

    flow += glow;
    flowColor += pc * glow;
  }

  return flowColor / (flow + 0.01);
}

vec3 calcNormal(vec3 p, float t) {
  const float h = 0.001;
  const vec2 k = vec2(1, -1);
  return normalize(
    k.xyy * sdSurface(p + k.xyy * h, t) +
    k.yyx * sdSurface(p + k.yyx * h, t) +
    k.yxy * sdSurface(p + k.yxy * h, t) +
    k.xxx * sdSurface(p + k.xxx * h, t)
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  // Camera
  float camAngle = t * 0.1;
  vec3 ro = vec3(cos(camAngle) * 3.0, sin(t * 0.05) * 0.5 + 0.3, sin(camAngle) * 3.0);
  vec3 target = vec3(0.0);

  vec3 forward = normalize(target - ro);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);

  vec3 rd = normalize(forward + uv.x * right + uv.y * up);

  // Background
  vec3 col = mix(
    vec3(0.02, 0.01, 0.04),
    vec3(0.05, 0.02, 0.08),
    uv.y * 0.5 + 0.5
  );

  // Raymarch
  float dist = 0.0;
  for (int i = 0; i < 60; i++) {
    vec3 p = ro + rd * dist;
    float d = sdSurface(p, t);

    if (d < 0.001) {
      // Hit the surface
      vec3 n = calcNormal(p, t);

      // Base color - iridescent based on position
      float angle = atan(p.z, p.x);
      float twist = angle * 0.5 + t * 0.2;
      vec3 baseColor = 0.5 + 0.5 * cos(twist * 2.0 + vec3(0.0, 2.1, 4.2));

      // Lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, -0.5));
      float diff = max(dot(n, lightDir), 0.0);
      float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);

      // Fresnel
      float fresnel = pow(1.0 - abs(dot(n, -rd)), 3.0);

      col = baseColor * (0.2 + 0.6 * diff);
      col += vec3(1.0) * spec * 0.5;
      col += baseColor * fresnel * 0.5;

      // Add flow particles
      col += surfaceFlow(p, t) * 0.3;

      // Fog
      float fog = 1.0 - exp(-dist * 0.2);
      col = mix(col, vec3(0.05, 0.02, 0.08), fog);

      break;
    }

    dist += d;
    if (dist > 20.0) break;
  }

  // Add floating particles to show space
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec3 particlePos = vec3(
      sin(fi * 1.23 + t * 0.1) * 2.0,
      cos(fi * 2.34 + t * 0.15) * 1.5,
      sin(fi * 0.87 + t * 0.12) * 2.0
    );

    float d = length(cross(particlePos - ro, rd));
    float glow = 0.002 / (d * d + 0.0001);
    glow *= smoothstep(10.0, 2.0, length(particlePos - ro));

    col += vec3(0.5, 0.3, 0.8) * glow;
  }

  // Vignette
  col *= 1.0 - length(uv) * 0.3;

  // Gamma
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class KleinFlowDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'klein',
    name: 'Klein Flow',
    era: 'modern',
    year: 2025,
    description: 'A Mobius strip\'s impossible cousin - the Klein bottle has no inside or outside. Watch particles flow along its surface, seamlessly transitioning through what appears to be solid matter.',
    author: 'Claude',
    renderer: 'webgl2',
    tags: ['topology', '4d', 'mathematics', 'geometry', 'impossible'],
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
