import * as THREE from "three";
import { depthFragment, planeDepth, type DepthOfField } from "./depth-of-field";
const dofUniforms = {
  dofFocusZ: { value: 0 }, dofSharpBand: { value: .04 },
  dofDepthRange: { value: .6 }, dofRadiusUv: { value: new THREE.Vector2() },
};

let _renderer: THREE.WebGLRenderer | null = null;
let _scene: THREE.Scene | null = null;
let _camera: THREE.PerspectiveCamera | null = null;
let _plane: THREE.Mesh | null = null;
let _material: THREE.MeshBasicMaterial | null = null;
let _texture: THREE.Texture | null = null;
let _dofMaterial: THREE.MeshBasicMaterial | null = null;
let _lastAspect = 0;

function buildRenderer(): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    premultipliedAlpha: true,
  });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;
  r.setClearColor(0x000000, 0);

  r.setPixelRatio(1);

  return r;
}

function ensureScene(aspect: number, renderer: THREE.WebGLRenderer): { scene: THREE.Scene; plane: THREE.Mesh } {
  if (!_scene) {
    _scene = new THREE.Scene();
  }

  if (!_texture) {
    _texture = new THREE.Texture();
    _texture.colorSpace = THREE.SRGBColorSpace;
    _texture.generateMipmaps = false;
    _texture.minFilter = THREE.LinearFilter;
    _texture.magFilter = THREE.LinearFilter;
    _texture.wrapS = THREE.ClampToEdgeWrapping;
    _texture.wrapT = THREE.ClampToEdgeWrapping;
    _texture.premultiplyAlpha = false;

    _texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  if (!_material) {
    _material = new THREE.MeshBasicMaterial({
      map: _texture,
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor
    });
    _material.premultipliedAlpha = false;

  }

  if (!_dofMaterial) {
    _dofMaterial = _material.clone();
    _dofMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, dofUniforms);
      shader.vertexShader = 'varying float dofPlaneZ;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ndofPlaneZ = (modelMatrix * vec4(position, 1.0)).z;');
      shader.fragmentShader = 'varying float dofPlaneZ; uniform float dofFocusZ; uniform float dofSharpBand; uniform float dofDepthRange; uniform vec2 dofRadiusUv;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', depthFragment);
    };
  }

  if (!_plane || Math.abs(_lastAspect - aspect) > 0.0001) {
    if (_plane) {
      _plane.geometry.dispose();
      _scene.remove(_plane);
    }
    const geo = new THREE.PlaneGeometry(2 * aspect, 2);
    _plane = new THREE.Mesh(geo, _material);
    _scene.add(_plane);
    _lastAspect = aspect;
  }

  return { scene: _scene, plane: _plane };
}

export function applyPerspective3D(
  canvas: HTMLCanvasElement,
  rotateXDeg: number,
  rotateYDeg: number,
  perspectivePx: number,
  depthOfField?: DepthOfField
): void {
  if (rotateXDeg === 0 && rotateYDeg === 0) return;
  if (typeof window === "undefined") return;

  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;
  const aspect = w / h;

  if (!_renderer) {
    _renderer = buildRenderer();
  }
  if (_renderer.domElement.width !== w || _renderer.domElement.height !== h) {
    _renderer.setSize(w, h, false);
  }

  const { scene, plane } = ensureScene(aspect, _renderer);

  _texture!.image = canvas;
  _texture!.needsUpdate = true;

  const PERSPECTIVE_REFERENCE_HEIGHT = 1080;
  const cameraZ = (2 * perspectivePx) / PERSPECTIVE_REFERENCE_HEIGHT;
  const fovDeg = (2 * Math.atan(1 / cameraZ) * 180) / Math.PI;

  if (!_camera) {
    _camera = new THREE.PerspectiveCamera(fovDeg, aspect, 0.001, cameraZ * 20);
  } else {
    _camera.fov = fovDeg;
    _camera.aspect = aspect;
    _camera.near = 0.001;
    _camera.far = cameraZ * 20;
  }
  _camera.position.set(0, 0, cameraZ);
  _camera.lookAt(0, 0, 0);
  _camera.updateProjectionMatrix();

  plane.rotation.x = -(rotateXDeg * Math.PI) / 180;
  plane.rotation.y = (rotateYDeg * Math.PI) / 180;
  plane.rotation.z = 0;

  plane.material = depthOfField ? _dofMaterial! : _material!;
  dofUniforms.dofFocusZ.value = depthOfField ? Math.min(...[depthOfField.focus, ...(depthOfField.protectedPoints ?? [])]
    .map(p => planeDepth(p.x, p.y, aspect, rotateXDeg, rotateYDeg))) : 0;
  dofUniforms.dofSharpBand.value = depthOfField?.sharpBand ?? .04;
  dofUniforms.dofDepthRange.value = Math.max(.001, depthOfField?.depthRange ?? .6);
  const radius = depthOfField ? Math.max(0, depthOfField.maxBlurPx ?? 16) * h / 1080 : 0;
  dofUniforms.dofRadiusUv.value.set(radius / w, radius / h);
  _renderer.render(scene, _camera);

  const ctx2d = canvas.getContext("2d", { alpha: true, willReadFrequently: false })!;
  ctx2d.imageSmoothingEnabled = true;
  ctx2d.imageSmoothingQuality = 'high';

  ctx2d.clearRect(0, 0, w, h);
  ctx2d.drawImage(_renderer.domElement, 0, 0);
}

export function disposePerspective3D(): void {
  _texture?.dispose();
  _material?.dispose();
  _dofMaterial?.dispose();
  if (_plane) {
    _plane.geometry.dispose();
  }
  _renderer?.dispose();
  _renderer = null;
  _scene = null;
  _camera = null;
  _plane = null;
  _material = null;
  _dofMaterial = null;
  _texture = null;
  _lastAspect = 0;
}