import type { DepthOfField } from './depth-of-field';

/** Persisted with the camera fragment. Coordinates refer to the original video. */
export interface CameraDepthOfField {
  focus: { x: number; y: number };
  protectRect?: { x: number; y: number; width: number; height: number };
  /** Pixels at 1080 output height, before camera scale; intentionally mild. */
  maxBlurPx: number;
}

export function parseCameraDepthOfField(value: unknown): CameraDepthOfField {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('depthOfField: expected object');
    return v as Record<string, unknown>;
  };
  const number = (v: unknown, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`depthOfField: expected finite ${min}..${max}`);
    return v;
  };
  const keys = (v: Record<string, unknown>, allowed: string[]) => {
    if (Object.keys(v).some(k => !allowed.includes(k))) throw new Error('depthOfField: unknown field');
  };
  const v = object(value); keys(v, ['focus', 'protectRect', 'maxBlurPx']);
  const f = object(v.focus); keys(f, ['x', 'y']);
  const focus = { x: number(f.x, 0, 1), y: number(f.y, 0, 1) };
  const maxBlurPx = v.maxBlurPx === undefined ? 3.5 : number(v.maxBlurPx, 0, 4);
  if (v.protectRect === undefined) return { focus, maxBlurPx };
  const r = object(v.protectRect); keys(r, ['x', 'y', 'width', 'height']);
  const protectRect = { x: number(r.x, 0, 1), y: number(r.y, 0, 1), width: number(r.width, .000001, 1), height: number(r.height, .000001, 1) };
  if (protectRect.x + protectRect.width > 1 || protectRect.y + protectRect.height > 1) throw new Error('depthOfField: protected rectangle exceeds source');
  return { focus, protectRect, maxBlurPx };
}

/** Fail closed both on API apply and if a later UI edit creates an unsupported composition. */
export function cameraDepthSupportError(state: {
  mediaType: string; mockupId: string; clipCount: number; cameraOnly: boolean;
  cropped: boolean; transformed: boolean; zoomed: boolean; masked: boolean; cameraOverlay: boolean; phone: boolean;
}): string | null {
  if (state.mediaType !== 'video' || state.mockupId !== 'none' || state.clipCount !== 1 || !state.cameraOnly)
    return 'Depth of field requires one video clip, mockup none, and one camera keyframe fragment.';
  if (state.cropped || state.transformed || state.zoomed || state.masked || state.cameraOverlay || state.phone)
    return 'Depth of field does not support crop, video transforms, zoom fragments, masks, camera overlays or 3D phones. Remove the combination or reapply a recipe without depthOfField.';
  return null;
}

/** Exact contain/bleed mapping supplied by drawFrame; roll happens before perspective. */
export function mapCameraDepthOfField(config: CameraDepthOfField, container: {
  containerX: number; containerY: number; containerWidth: number; containerHeight: number;
}, width: number, height: number, bleed: number, roll: number): DepthOfField {
  const { containerX: x, containerY: y, containerWidth: w, containerHeight: h } = container;
  const cx = x + w / 2, cy = y + h / 2;
  const angle = roll * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const map = (p: { x: number; y: number }) => {
    const px = (p.x - .5) * w, py = (p.y - .5) * h;
    return { x: (cx + px * cos - py * sin + width * (bleed - 1) / 2) / (width * bleed),
      y: (cy + px * sin + py * cos + height * (bleed - 1) / 2) / (height * bleed) };
  };
  const r = config.protectRect;
  return { focus: map(config.focus), protectedPoints: r ? [
    map({x:r.x,y:r.y}), map({x:r.x+r.width,y:r.y}),
    map({x:r.x,y:r.y+r.height}), map({x:r.x+r.width,y:r.y+r.height}),
  ] : [], maxBlurPx: config.maxBlurPx / bleed, depthRange: .35 / bleed, sharpBand: .025 / bleed };
}
