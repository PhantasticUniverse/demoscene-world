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

// Simple star hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Simple starfield - single layer
vec3 stars(vec3 rd) {
  vec3 p = rd * 80.0;
  vec3 fp = floor(p);
  float h = hash(fp.xy + fp.z * 31.0);

  if (h > 0.96) {
    vec3 sp = fract(p);
    float d = length(sp - 0.5);
    float brightness = smoothstep(0.15, 0.0, d) * h;
    return vec3(0.9, 0.95, 1.0) * brightness;
  }
  return vec3(0.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Camera orbits the black hole
  float camAngle = u_time * 0.1;
  vec3 ro = vec3(cos(camAngle) * 8.0, sin(u_time * 0.05) * 2.0 + 1.5, sin(camAngle) * 8.0);

  // Look at center
  vec3 forward = normalize(-ro);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);

  // Raymarch with gravitational bending - reduced steps
  vec3 col = vec3(0.0);
  vec3 diskAccum = vec3(0.0);
  float diskAlpha = 0.0;
  float totalDist = 0.0;
  bool hitHorizon = false;

  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * totalDist;
    float r = length(p);

    // Hit event horizon
    if (r < 1.05) {
      hitHorizon = true;
      break;
    }

    // Gravitational light bending
    float bendStrength = 1.5 / (r * r);
    rd = normalize(rd - normalize(p) * bendStrength * 0.12);

    // Sample accretion disk (simple torus check)
    float diskR = length(p.xz);
    if (diskR > 1.5 && diskR < 4.0 && abs(p.y) < 0.3) {
      float density = exp(-abs(p.y) * 15.0);
      density *= smoothstep(1.5, 2.0, diskR) * smoothstep(4.5, 3.5, diskR);

      // Spiral pattern
      float angle = atan(p.z, p.x);
      density *= 0.7 + 0.3 * sin(angle * 2.0 - diskR * 1.5 + u_time * 0.5);

      if (density > 0.01) {
        // Temperature color (inner = hotter)
        float temp = 1.0 - (diskR - 1.5) / 2.5;
        vec3 diskCol = mix(vec3(0.8, 0.3, 0.1), vec3(1.0, 0.9, 0.7), temp);

        // Doppler shift
        float doppler = dot(vec3(-sin(angle), 0.0, cos(angle)), normalize(-p));
        diskCol = mix(diskCol, vec3(0.5, 0.7, 1.0), clamp(doppler * 0.4, 0.0, 1.0));
        diskCol = mix(diskCol, vec3(1.0, 0.5, 0.2), clamp(-doppler * 0.4, 0.0, 1.0));

        float alpha = density * 0.4;
        diskAccum += diskCol * alpha * (1.0 - diskAlpha) * (1.5 + doppler * 0.5);
        diskAlpha += alpha * (1.0 - diskAlpha);

        if (diskAlpha > 0.9) break;
      }
    }

    totalDist += 0.12;
    if (totalDist > 25.0) break;
  }

  // Background stars
  if (!hitHorizon) {
    col = stars(rd);
  }

  // Blend disk
  col = col * (1.0 - diskAlpha) + diskAccum;

  // Simple photon ring glow
  float ringDist = abs(length(ro + rd * 2.0) - 1.5);
  col += vec3(1.0, 0.9, 0.7) * 0.15 / (ringDist + 0.2);

  // Vignette and gamma
  col *= 1.0 - length(uv) * 0.2;
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class BlackHoleDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'blackhole',
    name: 'Event Horizon',
    era: 'modern',
    year: 2025,
    description: 'A Schwarzschild black hole bends spacetime itself. Light curves around the event horizon, the accretion disk glows with Doppler-shifted plasma.',
    author: 'Claude',
    renderer: 'webgl2',
    tags: ['raymarching', 'physics', 'space', 'gravitational-lensing'],
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
