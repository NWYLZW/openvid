# Duo folding device

Use **Mockup → 3D Devices → iPhone Duo**. Configure it in the existing 3D Device
panel; AI must leave the resulting state visible and editable there.

## First local setup

The device artwork is prepared locally, not bundled with the code. See
`third-party/duo-assets.md` for provenance and scope of the code license.
Use Python 3.12+ and Node 22+ (the CLI loads the shared TypeScript schema).

```sh
python3 -m venv .duo-tools/python
.duo-tools/python/bin/pip install usd-core==26.8
pnpm openvid duo prepare-assets --python .duo-tools/python/bin/python
```

Open the printed loopback URL in a browser. The browser uses the installed
Three.js USD loader and GLB exporter; when conversion finishes it sends the
model to the temporary local server and the server exits. Reload the editor.
No model, source USDZ or textures should be added to git.

## Editing and production

- Position, scale, rotation presets, environment, glow and shadow reuse the
  existing controls. Dragging the device adjusts its 3D rotation.
- Manual fold angle: 0° closed, 180° open. Enable Fold timeline for keyframes;
  each keyframe has time, angle and cubic-bezier easing. The bottom Fold track
  displays the curve; click it to seek and return to the 3D panel.
- Screen layout defaults to One continuous video / image. Full unfolded screen
  supplies one texture and one projection frame to both inner and following outer
  screens. Use Separate panels only for intentionally independent content.
- Inner left, inner right and outer cover can use the project video or separate
  embedded images. Each has independent normalized crop, contain/cover fit and
  background. Default outer screen follows the right screen, so chat detail
  persists as the left conversation list unfolds.
- Screen projection maintains a frontal image during folding. Disabling it
  attaches the image to the moving surface. Blur, darkening and transition power
  control the progressive reveal; they are not global depth-of-field controls.
- FOV, camera distance, hinge bend width, exposure, screen brightness and finish
  are configurable. Night Sky is a material tint.
- Auto-rotate uses timeline seconds. The existing 3D Motion presets also apply.
  Plain 2D Zoom fragments do not drive a 3D device; use the original 3D Motion
  controls. Do not create decorative Zoom tracks that have no visual effect.

CLI helpers use the same validator/sampler as preview and export:

```sh
pnpm openvid duo defaults > work/duo.json
pnpm openvid duo validate work/duo.json
pnpm openvid duo sample work/duo.json 1.5
```

`window.openvid.apply()` accepts `mockup:'iphone-duo'` and
`duo:{config,transform,environment,glow,autoRotate,rotationSpeed}`. Read
`state().project.duoConfig` then use `updateDuo(changes, expectedConfig)` for a
compare-and-swap edit without replacing the project. The helper is
`automation/update-duo.mjs`; see [editing-api.md](editing-api.md).

Before export require `state().deviceReady === true`. Missing models or
undecoded screen images must fail rather than exporting blank screens.
Save with `window.openvid.save()`, reload, verify config and media persistence,
then export through Openvid. Check closed, intermediate and fully open frames,
including after a reverse seek. Do not pre-render the effect into an opaque video.

A desktop recording is not a responsive mobile UI: crop choices may omit
content. For polished demos provide separately captured list and chat screens
at the intended phone aspect ratio. Keep their provenance in the recipe run.

Renderer regression notes: preserve each GLB material opacity before multiplying
Motion opacity; require decoded video data, invalidate paused-frame caches after
source readiness changes, and update the current frame before checking export
readiness. Evict replaced image data URLs. An export error must restore preview.

Video export waits for `!video.seeking && readyState >= HAVE_CURRENT_DATA`;
an elapsed fallback timer is not evidence of a decoded frame. Encoding and
next-frame readiness use `Promise.all` so decode failures are immediately handled.

When restoring an existing project, do not treat its restored aspect ratio as a
new user resize: 3D scale/position already belong to that saved aspect. Verify
scale after two save/reload cycles; otherwise automatic aspect rescaling can
silently compound a valid saved pose into an oversized device.

During an undecoded seek, retain the last decoded screen pixels and report not
ready. Do not paint a placeholder while keeping the previous cache key: returning
to that same timestamp could then incorrectly reuse the placeholder as a frame.

Keep the Duo canvas CSS width/height at 100% of its positioning frame. Three.js
setPixelRatio/setSize and R3F transformed measurements may rewrite inline pixel
sizes during export or window resize; the framebuffer size must not become the
CSS display size. Duo's positioning box excludes shadow extent and inline-block
baseline space. Check the canvas and overlay DOM rectangles before and after export.

Duo rotation drag is a captured gesture: hit-test only on pointer down, then track
that pointer outside the mesh until pointer up/cancel. Preview uses a local angle
ref immediately; commit the final angle once on release so editor state updates
cannot interrupt the gesture. Test leaving the mesh, reversing direction and
release without a snap; do not mistake lost drag events for low rendering FPS.

## Reference-fidelity fix (2026-09-12)

Continuous mode now shares the full texture, innerUIFrame and projected sampling
across both surfaces; following cover uses gradient (.5,1). Independent custom
cover still uses its own outer frame. Turning projection off remaps attached
outer UVs to the right half of the shared texture.

Reference transition resets blur72/darkening2/hingeHalfWidth.35/exposure1.18,
screen brightness1, glow1.35 and reference RoomEnvironment. Camera pose, timing
and source remain editable and unchanged by this button. Turn off Reference
room lighting to use the existing HDRI selector.

The asset-preparation tool pins the reference's patched USD loader for authored
connections and texture readiness, without upgrading global Three. Existing
local models must be prepared again after this update. Twelve previously
incorrect material values were checked against reference and now match.
Old configurations without contentMode/referenceLighting retain panel/HDRI
semantics. Save new fields with the normal project/API path.


Projected content must use the actual camera eye in device-local coordinates,
updated after root motion/rotation/scale. The reference's fixed (0,0,40) is valid
only for its matching default view. Retaining it while exposing camera distance
and model rotation shears even the clear portion of the screen. Use a grid at
the same fold angle/pose to compare, not blur strength or unrelated wallpaper.

For visual iteration, show the corrected editor at the problematic angle first.
Do not repeatedly export a complete video for each small visual change; reserve
full export checks for final delivery or a change to the export path.

Duo's R3F pointer computation uses clientX/clientY against the canvas DOM rect.
Do not normalize unscaled offsetX/Y against R3F's transformed size: at 49% CSS
scale, a visible 491px canvas still produces offsets in a 1000px local box,
causing pointer-down to miss the model. Keep Frame hover and R3F event raycasts
in the same coordinate space. Verified drag changed rotation by the expected
6°/15° and reverse drag restored the original pose.

### System UI strip

Duo model settings → System UI strip provides an optional right-edge overlay. `config.systemUI` is shared by editor, save/restore, recipe/API and screen-texture rendering during preview/export. Missing configuration keeps older projects unchanged (disabled). Use `defaultDuoSystemUI()` as the complete object for incremental `updateDuo` updates.

Controls: enabled; width (0.05–0.25 of screen height); inset (0–0.1); background/iconColor/buttonColor (#RRGGBB); opacity/buttonOpacity (0–1); buttonSize (0.025–0.1); gap (0.005–0.08); status/flashlight/camera booleans. Following cover reuses the same composited texture, custom cover draws its own strip. Icons are canvas-drawn visual elements, not working OS controls. The strip overlays content rather than resizing or stretching the source. Transparent background exposes original footage; buttons use translucent fills, not backdrop blur. Large width can obscure application controls, so match color and reduce width or disable it when needed.

System UI alignment: the rail, divider and bottom controls are composited into the video texture before projection/blur, so they share its fold transition. Only the camera status ring uses physical screen UV to stay registered to the aperture. The cover camera ring and bottom buttons share the measured aperture axis. Minimum effective strip width is 12% of screen height to contain the aperture ring. Old smaller widths display at this minimum. Divider fields: borderEnabled, borderColor, borderWidth (0–12 px at 1125px screen height), borderOpacity (0–1), borderStyle (solid/dashed/dotted). Ring size/stroke are statusScale/statusStroke; obsolete statusTop is accepted for old saves but no longer positions the ring.

Button material: `buttonMaterial: glass|flat` (omitted = glass), `glassHighlight` and `glassShadow` (0–1) tune the canvas glass approximation. It uses translucent tint, directional edge highlights, soft shadow and compact filled glyphs; it does not implement native Liquid Glass background refraction. Existing color/opacity remain adjustable. Official visual reference: https://developer.apple.com/design/human-interface-guidelines/materials .

Projection correction: system UI now samples the same `sourceUV` as video. Outer-screen UI UV is calibrated against the closed cover plane using the actual device-local eye and frame; this preserves closed-pose registration while allowing unfolding projection. Camera ring remains aperture-anchored. Do not replace sourceUV with fixed vMapUv plus blur: that creates a stationary strip even though it looks softened.

Vertical projection is blended by sin²(foldAngle): fully closed/open use physical screen Y and fill the height; intermediate fold poses retain projected Y. This gives zero displacement and zero transition velocity at both endpoints while preserving the dimensional fold effect. Device pitch is independent.

Reply-wait retiming: Duo Animation → Accelerate reply wait stores `waitSpeed:{start,end,multiplier}` in source-timeline seconds. It multiplies Video's global speed only inside the wait interval. Example global 2× plus wait multiplier 2 means 4× waiting. Fold keyframes remain in source seconds, so place their endpoints at wait start/end. Preview playback and MP4/GIF/WebM frame sampling use `lib/wait-speed.ts`. Variable-speed audio mixing is not implemented; use a muted source without audio tracks (audio-mixing export rejects this combination rather than desynchronizing it). The timeline currently displays the global-speed scale, not the additional wait compression; export duration comes from the piecewise speed map.

Independent panel video: each DuoScreen supports optional videoId from the current origin's media library, videoStart (source offset seconds), and videoSpeed (0.1–8 multiplier against project source time). Omit videoId for the main project video. UI under each screen → Video source; Refresh media library after importing via Upload. Secondary audio is muted; the last frame holds when its source ends. Export waits for each requested secondary video frame to decode before drawing. Preserve media-library blobs together with project snapshots: videoId alone is not a portable media package.

制作入场、绕铰链展开和左右屏聚焦镜头时，先读 [连续镜头运动](cinematic-continuity.md)。这是用户明确认可的关键经验：中间构图点连续通过，只在阅读/输入时停稳，避免逐段快起快停和反复反向。
