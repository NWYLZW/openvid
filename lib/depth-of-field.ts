/** Coordinates in the unprojected foreground canvas, normalized, top-left origin. */
export interface DepthOfField {
  focus: { x: number; y: number };
  /** Radius in pixels at 1080px canvas height. */
  maxBlurPx?: number;
  protectedPoints?: Array<{ x: number; y: number }>;
  /** World depth to maximum blur; plane height is 2. */
  depthRange?: number;
  sharpBand?: number;
}
/** Matches THREE Euler XYZ with x = -pitch, y = yaw. */
export function planeDepth(x: number, y: number, aspect: number, pitch: number, yaw: number): number {
  const rx = -pitch * Math.PI / 180, ry = yaw * Math.PI / 180;
  return -Math.cos(rx) * Math.sin(ry) * (x - .5) * 2 * aspect + Math.sin(rx) * (.5 - y) * 2;
}
export const depthFragment = `
#ifdef USE_MAP
  vec4 center = texture2D(map, vMapUv);
  float delta = max(0.0, dofFocusZ - dofPlaneZ - dofSharpBand);
  float amount = smoothstep(0.0, dofDepthRange, delta);
  vec2 radius = dofRadiusUv * amount;
  vec3 sum = vec3(0.0);
  float alphaWeight = 0.0;
  if (radius.x > 0.000001) {
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        vec2 offset = vec2(float(x), float(y));
        float weight = exp(-dot(offset, offset) * 0.5);
        vec4 tap = texture2D(map, clamp(vMapUv + offset * radius * 0.5, vec2(0.0), vec2(1.0)));
        sum += tap.rgb * tap.a * weight;
        alphaWeight += tap.a * weight;
      }
    }
  }
  // Keep silhouette alpha; transparent texels cannot contribute dark fringes.
  vec3 color = alphaWeight > 0.00001 ? sum / alphaWeight : center.rgb;
  diffuseColor *= vec4(color, center.a);
#endif
`;

/** Matches the existing THREE camera/XYZ projection, with a top-left canvas origin. */
export function projectPerspectivePoint(point: { x: number; y: number }, aspect: number, pitch: number, yaw: number, perspectivePx: number) {
  if (pitch === 0 && yaw === 0) return point;
  const rx = -pitch * Math.PI / 180, ry = yaw * Math.PI / 180;
  const x = (point.x - .5) * 2 * aspect, y = (.5 - point.y) * 2;
  const z = planeDepth(point.x, point.y, aspect, pitch, yaw);
  const cameraZ = 2 * perspectivePx / 1080;
  if (cameraZ - z <= .001) throw new Error('Depth focus is behind the camera. Reduce the tilt or perspective strength.');
  const scale = cameraZ / (cameraZ - z);
  return { x: .5 + Math.cos(ry) * x * scale / (2 * aspect),
    y: .5 - (Math.sin(rx) * Math.sin(ry) * x + Math.cos(rx) * y) * scale / 2 };
}

/** Keep source protection aligned when a native Zoom adds a second projection. */
export function reprojectDepthOfField(depth: DepthOfField, aspect: number, pitch: number, yaw: number, perspectivePx: number): DepthOfField {
  const project = (point: {x: number; y: number}) => projectPerspectivePoint(point, aspect, pitch, yaw, perspectivePx);
  return { ...depth, focus: project(depth.focus), protectedPoints: depth.protectedPoints?.map(project) };
}
