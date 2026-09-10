/** A small image-space GPU pass: video pixels warp before pointer artwork is painted. */
export interface PointerDistortion { x: number; y: number; radius: number; amplitude: number; waveProgress?: number }
let resources: { canvas: HTMLCanvasElement; gl: WebGL2RenderingContext; program: WebGLProgram; texture: WebGLTexture; vao: WebGLVertexArrayObject } | undefined;

function ensureResources() {
  if (resources) return resources;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('Pointer distortion needs WebGL2. Choose another click effect on this device.');
  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind)!; gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(`Pointer shader: ${error}`); }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, `#version 300 es
    out vec2 uv;
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`);
  const fragment = compile(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    in vec2 uv; out vec4 color;
    uniform sampler2D source; uniform vec2 resolution;
    uniform int count; uniform vec4 presses[32]; uniform vec2 waves[32];
    void main() {
      vec2 p = vec2(uv.x, 1.0 - uv.y) * resolution;
      vec2 delta = vec2(0.0); float total = 0.0;
      for (int i = 0; i < 32; i++) {
        if (i >= count) break;
        vec2 offset = p - presses[i].xy;
        float r2 = dot(offset, offset) / (presses[i].z * presses[i].z);
        float weight = r2 < 1.0 ? (1.0 - r2) * (1.0 - r2) : 0.0;
        if (waves[i].y > 0.5) {
          float progress = waves[i].x;
          float r = sqrt(r2);
          float front = 0.05 + 0.9 * progress;
          float phase = (r - front) / 0.14;
          float envelope = smoothstep(0.0, 0.08, progress) * pow(1.0 - progress, 1.3);
          float packet = exp(-phase * phase * 1.5) * sin(phase * 3.14159265);
          float edge = 1.0 - smoothstep(0.88, 1.0, r);
          delta += offset / max(length(offset), 0.001) * presses[i].z * presses[i].w * packet * envelope * edge * smoothstep(0.0, 0.08, r);
        } else {
          delta += offset * presses[i].w * weight;
        }
        if (r2 < 1.0) total += abs(presses[i].w);
      }
      p += delta * min(1.0, .35 / max(.35, total));
      vec2 sampleUv = p / resolution;
      color = texture(source, vec2(sampleUv.x, 1.0 - sampleUv.y));
    }`);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Pointer shader: ${gl.getProgramInfoLog(program)}`);
  const texture = gl.createTexture()!, vao = gl.createVertexArray()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  resources = { canvas, gl, program, texture, vao };
  return resources;
}

export function applyPointerDistortion(target: HTMLCanvasElement, presses: PointerDistortion[]): void {
  if (!presses.length) return;
  if (presses.length > 32) throw new Error('Pointer track supports at most 32 simultaneous distort clicks.');
  const { canvas, gl, program, texture, vao } = ensureResources();
  if (gl.isContextLost()) throw new Error('Pointer graphics context lost. Reload or choose a different effect.');
  if (canvas.width !== target.width || canvas.height !== target.height) { canvas.width = target.width; canvas.height = target.height; }
  gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program); gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, target);
  gl.uniform1i(gl.getUniformLocation(program, 'source'), 0);
  gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
  gl.uniform1i(gl.getUniformLocation(program, 'count'), presses.length);
  gl.uniform4fv(gl.getUniformLocation(program, 'presses[0]'), new Float32Array(presses.flatMap(p => [p.x, p.y, p.radius, p.amplitude])));
  gl.uniform2fv(gl.getUniformLocation(program, 'waves[0]'), new Float32Array(presses.flatMap(p => [p.waveProgress ?? 0, p.waveProgress === undefined ? 0 : 1])));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const ctx = target.getContext('2d')!;
  // Keep every pixel outside the affected circles in the original 2D surface.
  ctx.save(); ctx.beginPath();
  for (const press of presses) { ctx.moveTo(press.x + press.radius, press.y); ctx.arc(press.x, press.y, press.radius, 0, Math.PI * 2); }
  ctx.clip(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(canvas, 0, 0); ctx.restore();
}
export function disposePointerDistortion(): void {
  if (!resources) return;
  const { gl, program, texture, vao } = resources;
  gl.deleteProgram(program); gl.deleteTexture(texture); gl.deleteVertexArray(vao);
  resources = undefined;
}

/** Unit-radius water packet; the crest travels outwards and leaves the center at rest. */
export function waterRippleOffset(radiusFraction: number, progress: number): number {
  if(progress<=0||progress>=1||radiusFraction<=0||radiusFraction>=1)return 0;
  const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  const phase=(radiusFraction-(.05+.9*progress))/.14;
  return Math.exp(-phase*phase*1.5)*Math.sin(phase*Math.PI)*smooth(0,.08,progress)*Math.pow(1-progress,1.3)*(1-smooth(.88,1,radiusFraction))*smooth(0,.08,radiusFraction);
}
