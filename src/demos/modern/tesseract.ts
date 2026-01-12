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

// The 16 vertices of a tesseract (4D hypercube)
// Each vertex is at (+/-1, +/-1, +/-1, +/-1)
vec4 vertices[16] = vec4[16](
  vec4(-1, -1, -1, -1), vec4( 1, -1, -1, -1),
  vec4(-1,  1, -1, -1), vec4( 1,  1, -1, -1),
  vec4(-1, -1,  1, -1), vec4( 1, -1,  1, -1),
  vec4(-1,  1,  1, -1), vec4( 1,  1,  1, -1),
  vec4(-1, -1, -1,  1), vec4( 1, -1, -1,  1),
  vec4(-1,  1, -1,  1), vec4( 1,  1, -1,  1),
  vec4(-1, -1,  1,  1), vec4( 1, -1,  1,  1),
  vec4(-1,  1,  1,  1), vec4( 1,  1,  1,  1)
);

// 32 edges of a tesseract
// Each edge connects vertices that differ in exactly one coordinate
ivec2 edges[32] = ivec2[32](
  // Inner cube (w = -1)
  ivec2(0, 1), ivec2(2, 3), ivec2(4, 5), ivec2(6, 7),
  ivec2(0, 2), ivec2(1, 3), ivec2(4, 6), ivec2(5, 7),
  ivec2(0, 4), ivec2(1, 5), ivec2(2, 6), ivec2(3, 7),
  // Outer cube (w = +1)
  ivec2(8, 9), ivec2(10, 11), ivec2(12, 13), ivec2(14, 15),
  ivec2(8, 10), ivec2(9, 11), ivec2(12, 14), ivec2(13, 15),
  ivec2(8, 12), ivec2(9, 13), ivec2(10, 14), ivec2(11, 15),
  // Connections between cubes (along w axis)
  ivec2(0, 8), ivec2(1, 9), ivec2(2, 10), ivec2(3, 11),
  ivec2(4, 12), ivec2(5, 13), ivec2(6, 14), ivec2(7, 15)
);

// 4D rotation in XY plane
vec4 rotXY(vec4 p, float a) {
  float s = sin(a), c = cos(a);
  return vec4(c*p.x - s*p.y, s*p.x + c*p.y, p.z, p.w);
}

// 4D rotation in XZ plane
vec4 rotXZ(vec4 p, float a) {
  float s = sin(a), c = cos(a);
  return vec4(c*p.x - s*p.z, p.y, s*p.x + c*p.z, p.w);
}

// 4D rotation in XW plane (the exotic one!)
vec4 rotXW(vec4 p, float a) {
  float s = sin(a), c = cos(a);
  return vec4(c*p.x - s*p.w, p.y, p.z, s*p.x + c*p.w);
}

// 4D rotation in YZ plane
vec4 rotYZ(vec4 p, float a) {
  float s = sin(a), c = cos(a);
  return vec4(p.x, c*p.y - s*p.z, s*p.y + c*p.z, p.w);
}

// 4D rotation in YW plane
vec4 rotYW(vec4 p, float a) {
  float s = sin(a), c = cos(a);
  return vec4(p.x, c*p.y - s*p.w, p.z, s*p.y + c*p.w);
}

// 4D rotation in ZW plane
vec4 rotZW(vec4 p, float a) {
  float s = sin(a), c = cos(a);
  return vec4(p.x, p.y, c*p.z - s*p.w, s*p.z + c*p.w);
}

// Project 4D -> 3D using perspective projection from W
vec3 project4Dto3D(vec4 p, float focalLength) {
  float w = focalLength / (focalLength - p.w);
  return p.xyz * w;
}

// Project 3D -> 2D
vec2 project3Dto2D(vec3 p, float focalLength) {
  float z = focalLength / (focalLength - p.z);
  return p.xy * z;
}

// Distance from point to line segment
float lineSegmentDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Get interpolated W value along edge
float getEdgeW(vec4 a, vec4 b, vec2 p, vec2 pa, vec2 pb) {
  vec2 pab = p - pa;
  vec2 bab = pb - pa;
  float t = clamp(dot(pab, bab) / dot(bab, bab), 0.0, 1.0);
  return mix(a.w, b.w, t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  vec3 col = vec3(0.0);

  // Background gradient
  col = mix(vec3(0.02, 0.01, 0.05), vec3(0.08, 0.02, 0.12), uv.y * 0.5 + 0.5);

  // Apply all six 4D rotations at different speeds
  vec4 transformedVerts[16];
  for (int i = 0; i < 16; i++) {
    vec4 v = vertices[i];

    // The mesmerizing 4D rotation - multiple planes at once
    v = rotXW(v, t * 0.3);           // Rotation into the 4th dimension
    v = rotYW(v, t * 0.23);          // Another 4D rotation
    v = rotZW(v, t * 0.17);          // Third 4D rotation
    v = rotXY(v, t * 0.11);          // Regular 3D rotations
    v = rotXZ(v, t * 0.13);
    v = rotYZ(v, t * 0.07);

    transformedVerts[i] = v;
  }

  // Project to 2D
  vec2 projectedVerts[16];
  float depths[16];
  for (int i = 0; i < 16; i++) {
    vec3 p3 = project4Dto3D(transformedVerts[i], 3.0);
    vec2 p2 = project3Dto2D(p3, 4.0);
    projectedVerts[i] = p2 * 0.4; // Scale down
    depths[i] = p3.z;
  }

  // Draw edges with glow
  float edgeGlow = 0.0;
  vec3 edgeColor = vec3(0.0);

  for (int i = 0; i < 32; i++) {
    int i0 = edges[i].x;
    int i1 = edges[i].y;

    vec2 a = projectedVerts[i0];
    vec2 b = projectedVerts[i1];
    vec4 v0 = transformedVerts[i0];
    vec4 v1 = transformedVerts[i1];

    float dist = lineSegmentDist(uv, a, b);

    // Get W value for coloring
    float w = getEdgeW(v0, v1, uv, a, b);
    float wNorm = w * 0.5 + 0.5; // Map [-1, 1] to [0, 1]

    // Color based on W depth (4th dimension)
    vec3 wColor = mix(
      vec3(0.3, 0.6, 1.0),  // Deep blue for w = -1
      vec3(1.0, 0.5, 0.2),  // Orange for w = +1
      wNorm
    );

    // Edge thickness varies with average depth
    float avgDepth = (depths[i0] + depths[i1]) * 0.5;
    float thickness = 0.008 * (1.0 + avgDepth * 0.3);

    // Core edge
    float edge = smoothstep(thickness, thickness * 0.3, dist);

    // Glow
    float glow = 0.015 / (dist + 0.01);
    glow *= smoothstep(0.3, 0.0, dist);

    // Brightness based on depth
    float brightness = 0.5 + 0.5 * (avgDepth + 1.0) / 2.0;

    edgeGlow += (edge + glow * 0.3) * brightness;
    edgeColor += wColor * (edge + glow * 0.5) * brightness;
  }

  // Normalize edge color
  if (edgeGlow > 0.0) {
    edgeColor /= edgeGlow;
    col += edgeColor * min(edgeGlow, 3.0);
  }

  // Draw vertices as glowing points
  for (int i = 0; i < 16; i++) {
    vec2 v = projectedVerts[i];
    float dist = length(uv - v);

    float wNorm = transformedVerts[i].w * 0.5 + 0.5;
    vec3 vColor = mix(
      vec3(0.3, 0.6, 1.0),
      vec3(1.0, 0.5, 0.2),
      wNorm
    );

    float brightness = 0.5 + 0.5 * (depths[i] + 1.0) / 2.0;

    // Point glow
    float glow = 0.004 / (dist * dist + 0.001);
    glow *= brightness;
    col += vColor * glow * 0.5;

    // Bright core
    float core = smoothstep(0.015, 0.005, dist);
    col += vColor * core * brightness * 2.0;
  }

  // Subtle central glow
  float centerGlow = 0.05 / (length(uv) + 0.5);
  col += vec3(0.3, 0.2, 0.5) * centerGlow * 0.2;

  // Vignette
  col *= 1.0 - length(uv) * 0.3;

  // Tone mapping
  col = col / (col + 1.0);

  // Gamma
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class TesseractDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'tesseract',
    name: 'Tesseract',
    era: 'modern',
    year: 2025,
    description: 'A tesseract (4D hypercube) rotates through six independent planes of 4-dimensional space. The inner and outer cubes phase through each other as the shape tumbles through dimensions we cannot see.',
    author: 'Claude',
    renderer: 'webgl2',
    tags: ['4d', 'geometry', 'hypercube', 'projection', 'mathematics'],
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
