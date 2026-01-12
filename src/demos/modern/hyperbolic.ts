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

// Complex multiplication
vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

// Complex division
vec2 cdiv(vec2 a, vec2 b) {
  return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / dot(b,b);
}

// Mobius transformation (hyperbolic isometry)
vec2 mobius(vec2 z, vec2 a) {
  // f(z) = (z - a) / (1 - conj(a)*z)
  vec2 num = z - a;
  vec2 denom = vec2(1.0, 0.0) - cmul(vec2(a.x, -a.y), z);
  return cdiv(num, denom);
}

// Hyperbolic distance from origin
float hypDist(vec2 z) {
  float r = length(z);
  if (r >= 1.0) return 100.0;
  return log((1.0 + r) / (1.0 - r));
}

// Distance to a geodesic (circular arc orthogonal to unit circle)
// Geodesic through points p1, p2 on unit circle
float distToGeodesic(vec2 z, vec2 p1, vec2 p2) {
  // Find center of the circular arc
  // For geodesic through p1, p2, center is at intersection of perpendicular bisector
  // with line from origin perpendicular to chord

  vec2 mid = (p1 + p2) * 0.5;
  float midLen = length(mid);

  if (midLen < 0.001) {
    // Geodesic passes through origin - it's a diameter
    vec2 dir = normalize(p1);
    return abs(z.x * dir.y - z.y * dir.x);
  }

  // Center is along the line from origin through midpoint, beyond the circle
  vec2 centerDir = mid / midLen;
  float centerDist = 1.0 / midLen;
  vec2 center = centerDir * centerDist;
  float radius = sqrt(centerDist * centerDist - 1.0);

  return abs(length(z - center) - radius);
}

// {5,4} tessellation - pentagons, 4 meeting at each vertex
// This creates the classic Escher Circle Limit look

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;
  uv *= 1.02;

  float t = u_time;
  float r = length(uv);

  // Outside disk
  if (r >= 1.0) {
    float glow = exp(-(r - 1.0) * 15.0) * 0.3;
    fragColor = vec4(vec3(0.02) + vec3(0.3, 0.2, 0.5) * glow, 1.0);
    return;
  }

  // Apply hyperbolic rotation (Mobius transformation)
  float rotSpeed = 0.3;
  float rotAngle = t * rotSpeed;
  vec2 rotCenter = vec2(0.0);

  // Create rotation via composition of two reflections
  vec2 z = uv;

  // Rotate by moving center, rotating, moving back
  float moveAmt = 0.3;
  vec2 moveDir = vec2(cos(t * 0.15), sin(t * 0.2)) * moveAmt;
  z = mobius(z, moveDir);

  // Simple rotation around origin
  float c = cos(rotAngle), s = sin(rotAngle);
  z = vec2(c * z.x - s * z.y, s * z.x + c * z.y);

  z = mobius(z, -moveDir);

  // Tessellation using {7,3} - 7-gons, 3 at each vertex
  int p = 7;  // polygon sides
  int q = 3;  // meeting at vertex

  float polyAngle = PI / float(p);
  float vertAngle = PI / float(q);

  // Fundamental domain is a triangle with angles PI/p, PI/q, PI/2
  // We reflect until we're in the fundamental domain

  int reflections = 0;

  // Precompute geodesic parameters
  float geodesicCenterDist = 1.0 / sin(vertAngle);
  float geodesicRadius = sqrt(geodesicCenterDist * geodesicCenterDist - 1.0);

  for (int i = 0; i < 100; i++) {
    bool didReflect = false;

    // Reflect across x-axis if below
    if (z.y < 0.0) {
      z.y = -z.y;
      reflections++;
      didReflect = true;
    }

    // Reflect across line at angle PI/p
    float angle = atan(z.y, z.x);
    if (angle > polyAngle) {
      float a2 = 2.0 * polyAngle;
      z = vec2(z.x * cos(a2) + z.y * sin(a2),
               z.x * sin(a2) - z.y * cos(a2));
      reflections++;
      didReflect = true;
    }

    // Reflect across circular geodesic
    vec2 center = vec2(geodesicCenterDist, 0.0);
    vec2 toZ = z - center;
    float d = length(toZ);

    if (d < geodesicRadius && d > 0.001) {
      // Inversion in circle
      z = center + toZ * (geodesicRadius * geodesicRadius) / (d * d);
      reflections++;
      didReflect = true;
    }

    if (!didReflect) break;
  }

  // Calculate distances to edges for drawing lines
  float d1 = abs(z.y);  // x-axis
  float d2 = abs(z.x * sin(polyAngle) - z.y * cos(polyAngle));  // angle line

  vec2 geoCenter = vec2(geodesicCenterDist, 0.0);
  float d3 = abs(length(z - geoCenter) - geodesicRadius);

  // Hyperbolic line width - thinner toward edge
  float hDist = hypDist(uv);
  float lineWidth = 0.02 * exp(-hDist * 0.15);
  lineWidth = max(lineWidth, 0.003);

  // Draw geodesic lines
  float line1 = smoothstep(lineWidth, lineWidth * 0.3, d1);
  float line2 = smoothstep(lineWidth, lineWidth * 0.3, d2);
  float line3 = smoothstep(lineWidth, lineWidth * 0.3, d3);
  float lines = max(max(line1, line2), line3);

  // Tile coloring based on reflection parity
  int parity = reflections % 2;

  // Two-color Escher style
  vec3 color1 = vec3(0.15, 0.1, 0.3);   // Dark purple
  vec3 color2 = vec3(0.95, 0.85, 0.6);  // Warm cream

  vec3 tileColor = (parity == 0) ? color1 : color2;

  // Add subtle variation by reflection count
  float variation = float(reflections) * 0.02;
  tileColor *= 1.0 - variation * 0.3;

  // Combine tile and lines
  vec3 lineColor = vec3(0.4, 0.3, 0.2);  // Dark gold lines
  vec3 col = mix(tileColor, lineColor, lines * 0.8);

  // Highlight the center tile slightly
  if (reflections < 3) {
    col *= 1.1;
  }

  // Fade at disk edge
  float edgeFade = smoothstep(0.98, 0.92, r);
  col *= edgeFade;

  // Disk boundary
  float boundary = smoothstep(0.995, 0.99, r) * smoothstep(0.98, 0.985, r);
  col = mix(col, vec3(0.5, 0.4, 0.3), boundary);

  // Gamma
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class HyperbolicDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'hyperbolic',
    name: 'Hyperbolic Tessellation',
    era: 'modern',
    year: 2025,
    description: 'The Poincare disk model of hyperbolic geometry filled with {7,3} tessellation - heptagons with three meeting at each vertex. Rotation in hyperbolic space looks utterly alien.',
    author: 'Claude (Escher-inspired)',
    renderer: 'webgl2',
    tags: ['non-euclidean', 'hyperbolic', 'tessellation', 'mathematical', 'mobius'],
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
