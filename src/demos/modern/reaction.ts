import type { Demo, DemoMetadata } from '../../core/types';
import {
  createProgramFromSource,
  setupFullscreenQuad,
  fullscreenVertexShader,
} from '../../core/webgl';

// Simulation shader - Gray-Scott reaction-diffusion
const simulationShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_state;
uniform vec2 u_resolution;
uniform float u_feed;
uniform float u_kill;

void main() {
  vec2 texel = 1.0 / u_resolution;

  // Current state: R = chemical U, G = chemical V
  vec4 state = texture(u_state, v_uv);
  float u = state.r;
  float v = state.g;

  // 9-point Laplacian stencil for diffusion
  vec4 lap = -state;

  // Cardinal neighbors (weight 0.2)
  lap += texture(u_state, v_uv + vec2(texel.x, 0.0)) * 0.2;
  lap += texture(u_state, v_uv - vec2(texel.x, 0.0)) * 0.2;
  lap += texture(u_state, v_uv + vec2(0.0, texel.y)) * 0.2;
  lap += texture(u_state, v_uv - vec2(0.0, texel.y)) * 0.2;

  // Diagonal neighbors (weight 0.05)
  lap += texture(u_state, v_uv + vec2(texel.x, texel.y)) * 0.05;
  lap += texture(u_state, v_uv + vec2(-texel.x, texel.y)) * 0.05;
  lap += texture(u_state, v_uv + vec2(texel.x, -texel.y)) * 0.05;
  lap += texture(u_state, v_uv + vec2(-texel.x, -texel.y)) * 0.05;

  // Diffusion rates
  float Du = 1.0;
  float Dv = 0.5;

  // Reaction term
  float uvv = u * v * v;

  // Gray-Scott equations
  float dt = 1.0;
  float du = Du * lap.r - uvv + u_feed * (1.0 - u);
  float dv = Dv * lap.g + uvv - (u_feed + u_kill) * v;

  float newU = u + du * dt;
  float newV = v + dv * dt;

  fragColor = vec4(clamp(newU, 0.0, 1.0), clamp(newV, 0.0, 1.0), 0.0, 1.0);
}
`;

// Display shader - renders the state with beautiful colors
const displayShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_state;
uniform float u_time;

// Color palette
vec3 palette(float t) {
  // Organic coral/fingerprint colors
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.0, 0.1, 0.2);

  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec4 state = texture(u_state, v_uv);
  float u = state.r;
  float v = state.g;

  // Pattern intensity
  float pattern = v;

  // Color based on both chemicals
  float t = pattern * 0.8 + u * 0.2;

  // Rich, organic color palette
  vec3 col1 = vec3(0.02, 0.02, 0.05);    // Deep background
  vec3 col2 = vec3(0.1, 0.2, 0.4);       // Dark blue
  vec3 col3 = vec3(0.2, 0.5, 0.6);       // Teal
  vec3 col4 = vec3(0.9, 0.7, 0.5);       // Warm highlight
  vec3 col5 = vec3(1.0, 0.95, 0.9);      // Bright peak

  vec3 col;
  if (pattern < 0.1) {
    col = mix(col1, col2, pattern * 10.0);
  } else if (pattern < 0.3) {
    col = mix(col2, col3, (pattern - 0.1) * 5.0);
  } else if (pattern < 0.6) {
    col = mix(col3, col4, (pattern - 0.3) * 3.33);
  } else {
    col = mix(col4, col5, (pattern - 0.6) * 2.5);
  }

  // Add subtle glow to active regions
  col += vec3(0.1, 0.15, 0.2) * smoothstep(0.2, 0.8, v) * 0.5;

  // Gamma correction
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export class ReactionDiffusionDemo implements Demo {
  metadata: DemoMetadata = {
    id: 'reaction',
    name: 'Reaction-Diffusion',
    era: 'modern',
    year: 2012,
    description: 'Gray-Scott reaction-diffusion system. Two chemicals react and diffuse, creating emergent patterns that look like coral, fingerprints, and alien landscapes.',
    author: 'Karl Sims / Gray-Scott model',
    renderer: 'webgl2',
    tags: ['reaction-diffusion', 'simulation', 'procedural', 'emergent', 'organic'],
  };

  private gl!: WebGL2RenderingContext;
  private simProgram!: WebGLProgram;
  private displayProgram!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private width = 0;
  private height = 0;

  // Ping-pong framebuffers
  private framebuffers: WebGLFramebuffer[] = [];
  private textures: WebGLTexture[] = [];
  private currentBuffer = 0;

  // Parameters that create interesting patterns
  private feed = 0.037;
  private kill = 0.06;
  private paramTime = 0;

  init(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Enable floating-point texture rendering extension
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.warn('EXT_color_buffer_float not supported, reaction-diffusion may not work properly');
    }

    // Create shader programs
    this.simProgram = createProgramFromSource(gl, fullscreenVertexShader, simulationShader);
    this.displayProgram = createProgramFromSource(gl, fullscreenVertexShader, displayShader);

    this.buffer = setupFullscreenQuad(gl);

    // Setup vertex attributes for both programs
    for (const program of [this.simProgram, this.displayProgram]) {
      gl.useProgram(program);
      const positionLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    this.initFramebuffers();
    this.seedPattern();
  }

  private initFramebuffers(): void {
    const gl = this.gl;

    // Clean up old framebuffers
    for (const fb of this.framebuffers) {
      gl.deleteFramebuffer(fb);
    }
    for (const tex of this.textures) {
      gl.deleteTexture(tex);
    }

    this.framebuffers = [];
    this.textures = [];

    // Create two framebuffers for ping-pong
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Use RGBA16F which has better support, with NEAREST filtering
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.width, this.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

      const framebuffer = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      // Check framebuffer status
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer not complete:', status);
      }

      this.textures.push(texture);
      this.framebuffers.push(framebuffer);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private seedPattern(): void {
    const gl = this.gl;

    // Initialize with U=1 everywhere, V=0 with random seeds
    // Use Uint16Array for half-float data
    const data = new Uint16Array(this.width * this.height * 4);

    // Helper to convert float to half-float (IEEE 754 half precision)
    const toHalf = (v: number): number => {
      const floatView = new Float32Array(1);
      const int32View = new Int32Array(floatView.buffer);
      floatView[0] = v;
      const x = int32View[0];

      let bits = (x >> 16) & 0x8000; // sign
      let m = (x >> 12) & 0x07ff; // mantissa
      const e = (x >> 23) & 0xff; // exponent

      if (e < 103) return bits; // too small, flush to zero
      if (e > 142) {
        bits |= 0x7c00; // infinity or NaN
        bits |= ((e === 255) ? 0 : 1) && (x & 0x007fffff);
        return bits;
      }
      if (e < 113) {
        m |= 0x0800;
        bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
        return bits;
      }
      bits |= ((e - 112) << 10) | (m >> 1);
      bits += m & 1;
      return bits;
    };

    const one = toHalf(1.0);
    const zero = toHalf(0.0);
    const half = toHalf(0.5);
    const quarter = toHalf(0.25);

    for (let i = 0; i < this.width * this.height; i++) {
      data[i * 4 + 0] = one;   // U
      data[i * 4 + 1] = zero;  // V
      data[i * 4 + 2] = zero;
      data[i * 4 + 3] = one;
    }

    // Add random seeds of V
    const numSeeds = 30;
    for (let s = 0; s < numSeeds; s++) {
      const cx = Math.floor(Math.random() * this.width);
      const cy = Math.floor(Math.random() * this.height);
      const radius = 5 + Math.floor(Math.random() * 15);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const x = (cx + dx + this.width) % this.width;
            const y = (cy + dy + this.height) % this.height;
            const i = y * this.width + x;
            data[i * 4 + 0] = half;    // Lower U
            data[i * 4 + 1] = quarter; // Seed V
          }
        }
      }
    }

    // Upload to both textures
    for (const texture of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.width, this.height, 0, gl.RGBA, gl.HALF_FLOAT, data);
    }
  }

  render(time: number): void {
    const gl = this.gl;

    // Slowly vary parameters to morph patterns
    this.paramTime = time * 0.0001;
    this.feed = 0.030 + Math.sin(this.paramTime) * 0.015;
    this.kill = 0.057 + Math.cos(this.paramTime * 0.7) * 0.008;

    // Run simulation steps (multiple per frame for speed)
    const stepsPerFrame = 8;
    gl.useProgram(this.simProgram);

    const feedLoc = gl.getUniformLocation(this.simProgram, 'u_feed');
    const killLoc = gl.getUniformLocation(this.simProgram, 'u_kill');
    const resLoc = gl.getUniformLocation(this.simProgram, 'u_resolution');
    const stateLoc = gl.getUniformLocation(this.simProgram, 'u_state');

    gl.uniform2f(resLoc, this.width, this.height);
    gl.uniform1f(feedLoc, this.feed);
    gl.uniform1f(killLoc, this.kill);
    gl.uniform1i(stateLoc, 0);

    for (let step = 0; step < stepsPerFrame; step++) {
      // Read from current, write to next
      const readBuffer = this.currentBuffer;
      const writeBuffer = 1 - this.currentBuffer;

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[writeBuffer]);
      gl.viewport(0, 0, this.width, this.height);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[readBuffer]);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      this.currentBuffer = writeBuffer;
    }

    // Render to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);

    gl.useProgram(this.displayProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);

    const displayStateLoc = gl.getUniformLocation(this.displayProgram, 'u_state');
    const displayTimeLoc = gl.getUniformLocation(this.displayProgram, 'u_time');
    gl.uniform1i(displayStateLoc, 0);
    gl.uniform1f(displayTimeLoc, time * 0.001);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initFramebuffers();
    this.seedPattern();
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.simProgram);
    gl.deleteProgram(this.displayProgram);
    gl.deleteBuffer(this.buffer);

    for (const fb of this.framebuffers) {
      gl.deleteFramebuffer(fb);
    }
    for (const tex of this.textures) {
      gl.deleteTexture(tex);
    }
  }
}
