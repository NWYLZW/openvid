// Adapted from jadon7/iphone-duo (MIT). See third-party/duo-animation-LICENSE.
export const screenShader = `
uniform sampler2D systemMap;
uniform vec4 systemProjectionFrame;
uniform bool systemEnabled;
uniform vec3 statusRing;
uniform vec3 statusColor;
uniform float foldAngle;
uniform float blurStrength;
uniform float darkening;
uniform float boundaryFill;
uniform float transitionPower;
uniform bool projectScreen;
uniform vec2 uiPixel;
uniform vec4 uiFrame;
uniform vec2 uiGradient;
uniform vec3 uiReferenceEye;
varying vec3 vUIPosition;
// Preserve coverage without stretching the nearest image edge into missing content.
vec3 coveredScreenSample(vec2 uv, vec2 feather, float lod, vec3 fill) {
  vec2 coverage = smoothstep(-feather, feather, uv)
    * (1.0 - smoothstep(vec2(1.0) - feather, vec2(1.0) + feather, uv));
  return mix(fill, textureLod(map, clamp(uv, vec2(0.0), vec2(1.0)), lod).rgb,
    coverage.x * coverage.y);
}
vec3 screenColor() {
  // Intersect the actual camera ray (in device-local space) with the unfolded screen.
  float depth = (0.24948 - uiReferenceEye.z) / (vUIPosition.z - uiReferenceEye.z);
  vec2 projected = uiReferenceEye.xy + (vUIPosition.xy - uiReferenceEye.xy) * depth;
  vec2 sourceUV = (projected - uiFrame.xy) / uiFrame.zw;
  #ifdef INNER_UI
    float progress = clamp(foldAngle / 1.570796327, 0.0, 1.0);
  #else
    // Anchor the image to the projected hinge-side edge of the outer screen.
    float c = cos(foldAngle), s = sin(foldAngle);
    vec2 hingeEdge = vec2(-0.23396, -0.27463 - 0.275454);
    vec2 foldedEdge = vec2(c * hingeEdge.x + s * hingeEdge.y,
      -s * hingeEdge.x + c * hingeEdge.y + 0.275454);
    float edgeDepth = (0.24948 - uiReferenceEye.z) / (foldedEdge.y - uiReferenceEye.z);
    float anchorX = uiReferenceEye.x + (foldedEdge.x - uiReferenceEye.x) * edgeDepth;
    sourceUV.x = uiGradient.x + (projected.x - anchorX) / uiFrame.z;
    float progress = clamp((3.141592654 - foldAngle) / 1.570796327, 0.0, 1.0);
  #endif
  if (!projectScreen) {
    sourceUV = vMapUv;
    #ifndef INNER_UI
      sourceUV.x = mix(uiGradient.x, uiGradient.y, vMapUv.x);
    #endif
  }
  // Vertical projection belongs to the fold transition, not either resting pose.
  // sin² gives zero displacement and zero velocity at fully open/closed.
  float verticalFoldWeight = sin(clamp(foldAngle, 0.0, 3.141592654));
  verticalFoldWeight *= verticalFoldWeight;
  sourceUV.y = mix(vMapUv.y, sourceUV.y, verticalFoldWeight);
  float edge = (sourceUV.x - uiGradient.x) / (uiGradient.y - uiGradient.x);
  float motion = smoothstep(0.0, 1.0, progress);
  float blurGradient = clamp(edge, 0.0, 1.0);
  float darkenGradient = clamp((edge - 0.2) / 0.8, 0.0, 1.0);
  float effect = motion * pow(darkenGradient, transitionPower);
  float radius = blurStrength * motion * pow(blurGradient, transitionPower);
  vec2 aa = max(fwidth(sourceUV), uiPixel * 0.5);
  vec2 dx = dFdx(sourceUV) / uiPixel;
  vec2 dy = dFdy(sourceUV) / uiPixel;
  float baseLod = log2(max(1.0, max(length(dx), length(dy))));
  // The final mip supplies a diffuse color from this same complete screen texture.
  // Only missing coverage receives it; valid projected pixels keep their mapping.
  float fillLod = ceil(log2(max(1.0 / uiPixel.x, 1.0 / uiPixel.y)));
  vec3 fill = textureLod(map, vec2(0.5), fillLod).rgb * boundaryFill;
  vec3 color = coveredScreenSample(sourceUV, aa, baseLod, fill);
  if (radius > 0.0) {
    // Use the same mip level at zero blur, then increase it continuously.
    float lod = max(baseLod, log2(max(1.0, radius)));
    vec2 footprint = max(aa, uiPixel * radius * 0.75);
    color = vec3(0.0);
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        float wx = x == 0 ? 6.0 : (abs(x) == 1 ? 4.0 : 1.0);
        float wy = y == 0 ? 6.0 : (abs(y) == 1 ? 4.0 : 1.0);
        vec2 sampleUV = sourceUV + vec2(float(x), float(y)) * uiPixel * radius;
        // Blur image coverage into the diffuse fill with the same normalized kernel.
        color += coveredScreenSample(sampleUV, footprint, lod, fill) * wx * wy / 256.0;
      }
    }
  }
  // Continuous attenuation never clips an entire band to zero at finite strength.
  color *= exp(-effect * darkening);
  if(systemEnabled) {
    vec2 overlayUV=projectScreen?sourceUV:vMapUv;
    #ifndef INNER_UI
      if(projectScreen)overlayUV.x=(sourceUV.x-systemProjectionFrame.x)/systemProjectionFrame.z;
      overlayUV.x=1.0-(1.0-overlayUV.x)*7.739354/11.251287*1125.0/1600.0;
    #endif
    // Share the video projection; the closed-cover frame establishes alignment.
    vec4 overlay=textureLod(systemMap,overlayUV,max(0.0,log2(max(1.0,radius))));
    float inside=step(0.0,overlayUV.x)*step(overlayUV.x,1.0)*step(0.0,overlayUV.y)*step(overlayUV.y,1.0);
    color=mix(color,overlay.rgb*exp(-effect*darkening),overlay.a*inside);
  }
  if(statusRing.x > 0.5) {
    // Aperture center from the cover camera mesh bounds, in native screen UV.
    // Use physical screen UV, never the camera-projected video coordinates.
    #ifdef INNER_UI
      vec2 p = vec2((vMapUv.x-1.0)*15.7987/11.1035 + 0.79343/11.2513,
        vMapUv.y-(4.832818+5.625671)/11.2513);
    #else
      vec2 p = (vMapUv-vec2((7.179888-0.233960)/7.739354,
        (4.832818+5.625671)/11.251287))*vec2(7.739354/11.251287,1.0);
    #endif
    float r=0.035*statusRing.y;
    float dist=length(p);
    float feather=max(fwidth(dist),0.0002);
    float ring=1.0-smoothstep(statusRing.z*.5,statusRing.z*.5+feather,abs(dist-r));
    // Open arc under the aperture, with three small status dots below it.
    ring*=smoothstep(-r*.70,-r*.60,p.y);
    float dots=0.0;
    for(int i=-1;i<=1;i++) {
      vec2 center=vec2(float(i)*r*.38,-r*.96);
      dots=max(dots,1.0-smoothstep(statusRing.z,statusRing.z+feather,length(p-center)));
    }
    color=mix(color,statusColor,max(ring,dots));
  }
  return color;
}
`;
export const foldShader = `
uniform float foldAngle;
uniform float hingeWidth;
vec2 rotateHinge(vec2 p) {
  float c = cos(foldAngle), s = sin(foldAngle);
  p.y -= 0.275454;
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y + 0.275454);
}
#ifdef FLEXIBLE_SCREEN
vec4 bendStrip(vec3 p) {
  float halfWidth = hingeWidth;
  if (p.x >= halfWidth) return vec4(p.x, p.z, 1.0, 0.0);
  if (p.x <= -halfWidth) return vec4(rotateHinge(p.xz), cos(foldAngle), -sin(foldAngle));
  float t = (p.x + halfWidth) / (2.0 * halfWidth);
  float t2 = t*t, t3 = t2*t;
  vec2 a = rotateHinge(vec2(-halfWidth, p.z));
  vec2 b = vec2(halfWidth, p.z);
  vec2 ta = 2.0 * halfWidth * vec2(cos(foldAngle), -sin(foldAngle));
  vec2 tb = vec2(2.0 * halfWidth, 0.0);
  vec2 point = (2.0*t3-3.0*t2+1.0)*a + (t3-2.0*t2+t)*ta + (-2.0*t3+3.0*t2)*b + (t3-t2)*tb;
  vec2 tangent = normalize((6.0*t2-6.0*t)*a + (3.0*t2-4.0*t+1.0)*ta + (-6.0*t2+6.0*t)*b + (3.0*t2-2.0*t)*tb);
  return vec4(point, tangent);
}
#endif
`;
