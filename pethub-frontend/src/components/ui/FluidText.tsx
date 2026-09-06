import React, { useEffect, useRef, useState } from 'react';

export interface FluidTextProps {
  /** The text string to render with the fluid simulation */
  text: string;
  /** Font family (defaults to inherit or system font) */
  fontFamily?: string;
  /** Font size in px (if omitted, automatically scales to container) */
  fontSize?: number | string;
  /** Font weight (e.g. 700, 800, 900) */
  fontWeight?: string | number;
  /** Text alignment in canvas */
  textAlign?: 'left' | 'center' | 'right' | 'auto';
  /** Base text illumination / gradient start color (hex) */
  color?: string;
  /** Accent color for internal gradient (hex) */
  accentColor?: string;
  /** Array of hex colors for fluid dye splats */
  paletteColors?: string[];
  /** Radius of fluid disturbance (default: ~0.004 in UV space) */
  splatRadius?: number;
  /** Force / momentum applied to fluid by pointer movement */
  splatForce?: number;
  /** Vorticity / curl intensity */
  curl?: number;
  /** Dissipation rate of dye density per frame (0.9 to 0.99) */
  densityDissipation?: number;
  /** Dissipation rate of fluid velocity per frame (0.9 to 0.99) */
  velocityDissipation?: number;
  /** Enable subtle ambient fluid motion when idle */
  autoSplat?: boolean;
  /** HTML tag for semantic container */
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  /** Additional CSS class names */
  className?: string;
  /** Inline CSS styles */
  style?: React.CSSProperties;
}

// Default PetHub color palette: Vibrant Brand Orange, Amber, Warm Coral, and Gold
const DEFAULT_PALETTE = [
  '#F97316', // Orange 500 (Brand PetHub)
  '#EA580C', // Orange 600
  '#FB923C', // Orange 400
  '#FDBA74', // Orange 300
  '#FED7AA', // Orange 200
  '#F59E0B', // Amber 500
  '#FFF7ED', // Warm white-orange highlight
];

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0.976, 0.45, 0.086]; // Default PetHub orange #F97316
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

// --- WebGL Shaders ---
const baseVertexShader = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 uTexelSize;

  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(uTexelSize.x, 0.0);
    vR = vUv + vec2(uTexelSize.x, 0.0);
    vT = vUv + vec2(0.0, uTexelSize.y);
    vB = vUv - vec2(0.0, uTexelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const splatShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float uAspectRatio;
  uniform vec3 uColor;
  uniform vec2 uPoint;
  uniform float uRadius;

  void main () {
    vec2 p = vUv - uPoint.xy;
    p.x *= uAspectRatio;
    vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const advectionShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexelSize;
  uniform float uDt;
  uniform float uDissipation;

  void main () {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
    gl_FragColor = uDissipation * texture2D(uSource, coord);
  }
`;

const divergenceShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const curlShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

const vorticityShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float uCurl;
  uniform float uDt;

  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= uCurl * C;
    force.y *= -1.0;

    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
  }
`;

const pressureShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float C = texture2D(uDivergence, vUv).x;

    float pressure = (L + R + B + T - C) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B) * 0.5;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// Final display composite shader with Text Alpha Mask
const displayShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uDensity;
  uniform sampler2D uTextMask;
  uniform vec3 uBaseColor;
  uniform vec3 uAccentColor;

  void main () {
    // Correct 2D canvas vertical flip: WebGL (0,0) is bottom-left, Canvas (0,0) is top-left
    vec2 textUv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 mask = texture2D(uTextMask, textUv);

    // Outside the text letter shapes: 100% transparent
    if (mask.a < 0.01) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vec4 fluid = texture2D(uDensity, vUv);
    float fluidIntensity = clamp(length(fluid.rgb) * 1.5, 0.0, 1.0);

    // Elegant gradient inside the text so it's always readable & bold
    vec3 baseGrad = mix(uBaseColor, uAccentColor, vUv.x * 0.75 + vUv.y * 0.25);

    // Blend fluid dye swirls on top of the text base
    vec3 color = mix(baseGrad, fluid.rgb + baseGrad * 0.25, fluidIntensity);

    // Subtle specular glow on peak velocity
    color += fluid.rgb * 0.35;

    gl_FragColor = vec4(color, mask.a);
  }
`;

function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (!vs) return null;
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.warn('[FluidText] VS Error:', gl.getShaderInfoLog(vs));
    gl.deleteShader(vs);
    return null;
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) {
    gl.deleteShader(vs);
    return null;
  }
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.warn('[FluidText] FS Error:', gl.getShaderInfoLog(fs));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[FluidText] Link Error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return prog;
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  width: number;
  height: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

function createFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  filtering: number
): FBO | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  if (!fbo) {
    gl.deleteTexture(texture);
    return null;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    return null;
  }

  return {
    texture,
    fbo,
    width: w,
    height: h,
    attach: (id: number) => {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
  };
}

function createDoubleFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  filtering: number
): DoubleFBO | null {
  const fbo1 = createFBO(gl, w, h, internalFormat, format, type, filtering);
  const fbo2 = createFBO(gl, w, h, internalFormat, format, type, filtering);
  if (!fbo1 || !fbo2) return null;

  return {
    width: w,
    height: h,
    read: fbo1,
    write: fbo2,
    swap() {
      const temp = this.read;
      this.read = this.write;
      this.write = temp;
    },
  };
}

export function FluidText({
  text,
  fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize,
  fontWeight = 800,
  textAlign = 'center',
  color = '#F97316', // PetHub Brand Orange
  accentColor = '#FB923C', // Warm golden orange
  paletteColors = DEFAULT_PALETTE,
  splatRadius = 0.0045,
  splatForce = 6000,
  curl = 28,
  densityDissipation = 0.975,
  velocityDissipation = 0.98,
  autoSplat = true,
  as: Component = 'div',
  className = '',
  style,
}: FluidTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const rawCanvas = canvasRef.current;
    const rawContainer = containerRef.current;
    if (!rawCanvas || !rawContainer) return;
    const canvas = rawCanvas;
    const container = rawContainer;

    // 1. Initialize WebGL context (WebGL2 with WebGL1 fallback)
    const glOptions: WebGLContextAttributes = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    };

    let gl: WebGLRenderingContext | null =
      (canvas.getContext('webgl2', glOptions) as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl', glOptions) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl', glOptions) as WebGLRenderingContext | null);

    if (!gl) {
      setHasWebGL(false);
      return;
    }

    // 2. Check for float / half-float extensions
    let extHalfFloat: any = gl.getExtension('OES_texture_half_float');
    let extLinear: any = gl.getExtension('OES_texture_half_float_linear');
    const isWebGL2 = 'WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext;

    let halfFloatType = gl.UNSIGNED_BYTE;
    let internalFormat = gl.RGBA;
    let format = gl.RGBA;
    let filtering: number = gl.LINEAR;

    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      extLinear = gl.getExtension('OES_texture_float_linear');
      halfFloatType = (gl as any).HALF_FLOAT;
      internalFormat = (gl as any).RGBA16F;
      filtering = extLinear ? (gl.LINEAR as number) : (gl.NEAREST as number);
    } else if (extHalfFloat) {
      halfFloatType = extHalfFloat.HALF_FLOAT_OES;
      filtering = extLinear ? (gl.LINEAR as number) : (gl.NEAREST as number);
    }

    // Quad geometry
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    // Compile programs
    const splatProg = createProgram(gl, baseVertexShader, splatShaderSource);
    const advectionProg = createProgram(gl, baseVertexShader, advectionShaderSource);
    const divergenceProg = createProgram(gl, baseVertexShader, divergenceShaderSource);
    const curlProg = createProgram(gl, baseVertexShader, curlShaderSource);
    const vorticityProg = createProgram(gl, baseVertexShader, vorticityShaderSource);
    const pressureProg = createProgram(gl, baseVertexShader, pressureShaderSource);
    const gradSubProg = createProgram(gl, baseVertexShader, gradientSubtractShaderSource);
    const displayProg = createProgram(gl, baseVertexShader, displayShaderSource);

    if (
      !splatProg ||
      !advectionProg ||
      !divergenceProg ||
      !curlProg ||
      !vorticityProg ||
      !pressureProg ||
      !gradSubProg ||
      !displayProg
    ) {
      setHasWebGL(false);
      return;
    }

    const splatP = splatProg;
    const advectionP = advectionProg;
    const divergenceP = divergenceProg;
    const curlP = curlProg;
    const vorticityP = vorticityProg;
    const pressureP = pressureProg;
    const gradSubP = gradSubProg;
    const displayP = displayProg;

    // Offscreen 2D canvas for text mask
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    const textMaskTex = gl.createTexture();
    if (!textMaskTex) {
      setHasWebGL(false);
      return;
    }
    gl.bindTexture(gl.TEXTURE_2D, textMaskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Simulation resolutions (powers of 2 for GPU efficiency)
    let simWidth = 128;
    let simHeight = 128;
    let densityWidth = 256;
    let densityHeight = 256;

    let density: DoubleFBO | null = null;
    let velocity: DoubleFBO | null = null;
    let divergence: FBO | null = null;
    let curlFBO: FBO | null = null;
    let pressure: DoubleFBO | null = null;

    function initFBOs() {
      if (!gl) return;
      let d = createDoubleFBO(gl, densityWidth, densityHeight, internalFormat, format, halfFloatType, filtering);
      let v = createDoubleFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
      let div = createFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
      let c = createFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
      let p = createDoubleFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);

      if (!d || !v || !div || !c || !p) {
        // Fallback to standard UNSIGNED_BYTE
        halfFloatType = gl.UNSIGNED_BYTE;
        internalFormat = gl.RGBA;
        filtering = gl.LINEAR;
        d = createDoubleFBO(gl, densityWidth, densityHeight, internalFormat, format, halfFloatType, filtering);
        v = createDoubleFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
        div = createFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
        c = createFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
        p = createDoubleFBO(gl, simWidth, simHeight, internalFormat, format, halfFloatType, filtering);
      }

      density = d;
      velocity = v;
      divergence = div;
      curlFBO = c;
      pressure = p;
    }

    initFBOs();

    // Text mask rendering
    function renderTextMask(w: number, h: number) {
      if (!offscreenCtx || !gl) return;
      offscreenCanvas.width = w;
      offscreenCanvas.height = h;

      offscreenCtx.clearRect(0, 0, w, h);
      offscreenCtx.fillStyle = '#FFFFFF';
      offscreenCtx.textBaseline = 'middle';
      const computedAlign =
        textAlign && textAlign !== 'auto'
          ? textAlign
          : ((window.getComputedStyle(container).textAlign as 'left' | 'center' | 'right') || 'center');

      offscreenCtx.textAlign = computedAlign === 'right' ? 'right' : computedAlign === 'left' ? 'left' : 'center';

      let size = 64;
      if (typeof fontSize === 'number') {
        size = fontSize;
      } else if (typeof fontSize === 'string') {
        size = parseFloat(fontSize) || 64;
      } else {
        // Responsive font calculation matching container width
        const charCount = Math.max(text.length, 1);
        const targetW = w * 0.96;
        const approxSize = (targetW / charCount) * 1.72;
        size = Math.max(22, Math.min(approxSize, h * 0.8));
      }

      offscreenCtx.font = `${fontWeight} ${size}px ${fontFamily}`;

      // Support multi-line text if provided with '\n'
      const lines = text.split('\n');
      const lineHeight = size * 1.15;
      const totalH = lines.length * lineHeight;
      const startY = h / 2 - totalH / 2 + lineHeight / 2;

      let drawX = w / 2;
      if (computedAlign === 'left') drawX = 4;
      else if (computedAlign === 'right') drawX = w - 4;

      for (let i = 0; i < lines.length; i++) {
        offscreenCtx.fillText(lines[i], drawX, startY + i * lineHeight);
      }

      gl.bindTexture(gl.TEXTURE_2D, textMaskTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
    }

    // Render quad helper
    function renderQuad(target: FBO | null) {
      if (!gl) return;
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    // Splat injection
    function splat(x: number, y: number, dx: number, dy: number, colorRgb: [number, number, number], radius = splatRadius) {
      if (!gl || !velocity || !density) return;

      // 1. Splat velocity
      gl.useProgram(splatP);
      gl.uniform1i(gl.getUniformLocation(splatP, 'uTarget'), velocity.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(splatP, 'uAspectRatio'), canvas.width / canvas.height);
      gl.uniform2f(gl.getUniformLocation(splatP, 'uPoint'), x, y);
      gl.uniform3f(gl.getUniformLocation(splatP, 'uColor'), dx, dy, 0.0);
      gl.uniform1f(gl.getUniformLocation(splatP, 'uRadius'), radius);
      renderQuad(velocity.write);
      velocity.swap();

      // 2. Splat density
      gl.uniform1i(gl.getUniformLocation(splatP, 'uTarget'), density.read.attach(0));
      gl.uniform3f(gl.getUniformLocation(splatP, 'uColor'), colorRgb[0], colorRgb[1], colorRgb[2]);
      renderQuad(density.write);
      density.swap();
    }

    // Multiple splat burst (for clicks or initial entrance)
    function splatBurst(x: number, y: number, count = 4, forceMultiplier = 2.0) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
        const dist = 0.015 * Math.random();
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const speed = splatForce * forceMultiplier * (0.8 + Math.random() * 0.5);
        const colHex = paletteColors[Math.floor(Math.random() * paletteColors.length)];
        splat(px, py, Math.cos(angle) * speed, Math.sin(angle) * speed, hexToRgb(colHex), splatRadius * 1.8);
      }
    }

    // Pointer state tracking
    let lastX = 0;
    let lastY = 0;
    let colorIdx = 0;

    function getPointerUV(e: PointerEvent): { x: number; y: number } {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
      return { x, y };
    }

    function handlePointerMove(e: PointerEvent) {
      const { x, y } = getPointerUV(e);
      if (lastX === 0 && lastY === 0) {
        lastX = x;
        lastY = y;
        return;
      }
      const dx = (x - lastX) * splatForce;
      const dy = (y - lastY) * splatForce;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0.0001) {
        colorIdx = (colorIdx + 1) % paletteColors.length;
        const rgb = hexToRgb(paletteColors[colorIdx]);
        splat(x, y, dx, dy, rgb, splatRadius);
      }

      lastX = x;
      lastY = y;
    }

    function handlePointerDown(e: PointerEvent) {
      const { x, y } = getPointerUV(e);
      lastX = x;
      lastY = y;
      // Splash burst on click
      splatBurst(x, y, 6, 3.0);
    }

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);

    // Initial ambient splash for immediate visual delight
    setTimeout(() => {
      splatBurst(0.5, 0.5, 5, 2.2);
    }, 150);

    // Resize Observer to match container dimensions
    let width = 0;
    let height = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w > 0 && h > 0 && (w !== width || h !== height)) {
          width = w;
          height = h;
          // Clamp devicePixelRatio to 2 to maintain smooth 60fps on high-DPI
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);

          densityWidth = Math.min(512, Math.max(128, Math.floor(w * 0.75)));
          densityHeight = Math.min(512, Math.max(128, Math.floor(h * 0.75)));
          simWidth = Math.max(64, Math.floor(densityWidth / 2));
          simHeight = Math.max(64, Math.floor(densityHeight / 2));

          initFBOs();
          renderTextMask(canvas.width, canvas.height);
        }
      }
    });

    resizeObserver.observe(container);

    // Visibility and Intersection Observers for battery & GPU optimization
    let isVisible = true;
    let isTabActive = true;
    let animFrameId = 0;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      isTabActive = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Context loss / restoration handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animFrameId);
    };
    const handleContextRestored = () => {
      initFBOs();
      if (width > 0 && height > 0) {
        renderTextMask(canvas.width, canvas.height);
      }
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Simulation Loop (Navier-Stokes)
    let lastTime = performance.now();
    let autoSplatTimer = 0;

    function step() {
      if (!isVisible || !isTabActive) {
        animFrameId = requestAnimationFrame(step);
        return;
      }

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      // Subtle ambient motion when idle
      if (autoSplat) {
        autoSplatTimer += dt;
        if (autoSplatTimer > 1.8) {
          autoSplatTimer = 0;
          const ambientX = 0.2 + 0.6 * Math.random();
          const ambientY = 0.35 + 0.3 * Math.random();
          const angle = Math.random() * Math.PI * 2;
          const speed = splatForce * 0.8;
          const col = paletteColors[Math.floor(Math.random() * paletteColors.length)];
          splat(
            ambientX,
            ambientY,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            hexToRgb(col),
            splatRadius * 1.5
          );
        }
      }

      if (gl && velocity && density && divergence && curlFBO && pressure) {
        // 1. Curl
        gl.useProgram(curlP);
        gl.uniform2f(gl.getUniformLocation(curlP, 'uTexelSize'), 1.0 / simWidth, 1.0 / simHeight);
        gl.uniform1i(gl.getUniformLocation(curlP, 'uVelocity'), velocity.read.attach(0));
        renderQuad(curlFBO);

        // 2. Vorticity Confinement
        gl.useProgram(vorticityP);
        gl.uniform2f(gl.getUniformLocation(vorticityP, 'uTexelSize'), 1.0 / simWidth, 1.0 / simHeight);
        gl.uniform1i(gl.getUniformLocation(vorticityP, 'uVelocity'), velocity.read.attach(0));
        gl.uniform1i(gl.getUniformLocation(vorticityP, 'uCurl'), curlFBO.attach(1));
        gl.uniform1f(gl.getUniformLocation(vorticityP, 'uCurl'), curl);
        gl.uniform1f(gl.getUniformLocation(vorticityP, 'uDt'), dt);
        renderQuad(velocity.write);
        velocity.swap();

        // 3. Divergence
        gl.useProgram(divergenceP);
        gl.uniform2f(gl.getUniformLocation(divergenceP, 'uTexelSize'), 1.0 / simWidth, 1.0 / simHeight);
        gl.uniform1i(gl.getUniformLocation(divergenceP, 'uVelocity'), velocity.read.attach(0));
        renderQuad(divergence);

        // 4. Pressure Jacobi Iteration (16 iterations for crisp fluid stability)
        gl.useProgram(pressureP);
        gl.uniform2f(gl.getUniformLocation(pressureP, 'uTexelSize'), 1.0 / simWidth, 1.0 / simHeight);
        gl.uniform1i(gl.getUniformLocation(pressureP, 'uDivergence'), divergence.attach(0));

        for (let i = 0; i < 16; i++) {
          gl.uniform1i(gl.getUniformLocation(pressureP, 'uPressure'), pressure.read.attach(1));
          renderQuad(pressure.write);
          pressure.swap();
        }

        // 5. Gradient Subtract
        gl.useProgram(gradSubP);
        gl.uniform2f(gl.getUniformLocation(gradSubP, 'uTexelSize'), 1.0 / simWidth, 1.0 / simHeight);
        gl.uniform1i(gl.getUniformLocation(gradSubP, 'uPressure'), pressure.read.attach(0));
        gl.uniform1i(gl.getUniformLocation(gradSubP, 'uVelocity'), velocity.read.attach(1));
        renderQuad(velocity.write);
        velocity.swap();

        // 6. Advect Velocity
        gl.useProgram(advectionP);
        gl.uniform2f(gl.getUniformLocation(advectionP, 'uTexelSize'), 1.0 / simWidth, 1.0 / simHeight);
        gl.uniform1i(gl.getUniformLocation(advectionP, 'uVelocity'), velocity.read.attach(0));
        gl.uniform1i(gl.getUniformLocation(advectionP, 'uSource'), velocity.read.attach(0));
        gl.uniform1f(gl.getUniformLocation(advectionP, 'uDt'), dt);
        gl.uniform1f(gl.getUniformLocation(advectionP, 'uDissipation'), velocityDissipation);
        renderQuad(velocity.write);
        velocity.swap();

        // 7. Advect Density (Dye Colors)
        gl.uniform2f(gl.getUniformLocation(advectionP, 'uTexelSize'), 1.0 / densityWidth, 1.0 / densityHeight);
        gl.uniform1i(gl.getUniformLocation(advectionP, 'uVelocity'), velocity.read.attach(0));
        gl.uniform1i(gl.getUniformLocation(advectionP, 'uSource'), density.read.attach(1));
        gl.uniform1f(gl.getUniformLocation(advectionP, 'uDissipation'), densityDissipation);
        renderQuad(density.write);
        density.swap();

        // 8. Composite Display with Text Mask onto screen
        gl.useProgram(displayP);
        gl.uniform1i(gl.getUniformLocation(displayP, 'uDensity'), density.read.attach(0));
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textMaskTex);
        gl.uniform1i(gl.getUniformLocation(displayP, 'uTextMask'), 1);

        const baseRgb = hexToRgb(color);
        const accentRgb = hexToRgb(accentColor);
        gl.uniform3f(gl.getUniformLocation(displayP, 'uBaseColor'), baseRgb[0], baseRgb[1], baseRgb[2]);
        gl.uniform3f(gl.getUniformLocation(displayP, 'uAccentColor'), accentRgb[0], accentRgb[1], accentRgb[2]);

        renderQuad(null);
      }

      animFrameId = requestAnimationFrame(step);
    }

    animFrameId = requestAnimationFrame(step);

    // --- Cleanup on unmount ---
    return () => {
      cancelAnimationFrame(animFrameId);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      if (gl) {
        gl.deleteBuffer(quadBuffer);
        gl.deleteTexture(textMaskTex);
        gl.deleteProgram(splatP);
        gl.deleteProgram(advectionP);
        gl.deleteProgram(divergenceP);
        gl.deleteProgram(curlP);
        gl.deleteProgram(vorticityP);
        gl.deleteProgram(pressureP);
        gl.deleteProgram(gradSubP);
        gl.deleteProgram(displayP);

        // Delete FBOs
        const deleteFbo = (f: FBO | null) => {
          if (!f || !gl) return;
          gl.deleteFramebuffer(f.fbo);
          gl.deleteTexture(f.texture);
        };
        const deleteDoubleFbo = (df: DoubleFBO | null) => {
          if (!df) return;
          deleteFbo(df.read);
          deleteFbo(df.write);
        };

        deleteDoubleFbo(density);
        deleteDoubleFbo(velocity);
        deleteFbo(divergence);
        deleteFbo(curlFBO);
        deleteDoubleFbo(pressure);
      }
    };
  }, [
    text,
    fontFamily,
    fontSize,
    fontWeight,
    textAlign,
    color,
    accentColor,
    paletteColors,
    splatRadius,
    splatForce,
    curl,
    densityDissipation,
    velocityDissipation,
    autoSplat,
    reducedMotion,
  ]);

  // Fallback for browsers without WebGL or when prefers-reduced-motion is active
  if (!hasWebGL || reducedMotion) {
    return (
      <Component className={`relative inline-block select-none ${className}`} style={style}>
        <span
          className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 font-extrabold tracking-tight"
          style={{
            fontFamily,
            fontWeight,
            fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
          }}
        >
          {text}
        </span>
      </Component>
    );
  }

  return (
    <Component
      ref={containerRef}
      className={`relative inline-block w-full max-w-full overflow-hidden select-none ${className}`}
      style={{
        minHeight: '1.2em',
        verticalAlign: 'middle',
        ...style,
      }}
      aria-label={text}
    >
      {/* Screen reader semantic access */}
      <span className="sr-only">{text}</span>

      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full block cursor-pointer"
        style={{
          touchAction: 'pan-y', // Allow smooth page scrolling while enabling touch gestures
        }}
      />
    </Component>
  );
}

export default FluidText;
