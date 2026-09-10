<div align="center">
   
   <picture>
     <source
       media="(prefers-color-scheme: dark)"
       srcset="https://openvid.dev/images/pages/openvid-animation.svg"
     />
     <source
       media="(prefers-color-scheme: light)"
       srcset="https://github.com/user-attachments/assets/c8fb0340-e05d-403e-9805-b1006a6218cc"
     />
     <img
       width="50%"
       alt="openvid Hero"
       src="https://openvid.dev/images/pages/openvid-animation-light.svg"
     />
   </picture>

  ## Create professional demos and mockups in seconds, directly in your browser
  **Record your screen or upload a video, add smooth zooms, device mockups, 3D effects, and custom backgrounds - export a cinematic demo.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![FFmpeg.wasm](https://img.shields.io/badge/FFmpeg.wasm-007808?logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Discord Community](https://img.shields.io/badge/Discord-Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/aBu5A2tBXb)
</div>

<div align="center">
   <img width="952" height="550" alt="poindeo-video-speed_1 5x_1787010609273 (1) (1)" src="https://github.com/user-attachments/assets/90c23e69-a542-4887-ab4c-955e6e39e981" />
</div>

## Features

### Video Input
- **Screen recording** - Capture your screen directly in the browser with no installation required
- **Upload your video** - MP4, WebM, QuickTime, and MKV

### Mockup Creation
- **Mockups applied to images**
- **3D transformations**

### Visual Customization

**Backgrounds**
- 100+ pre-designed backgrounds
- Custom images or Unsplash
- Solid colors and gradients

### Canvas & Elements
- **Shapes** - Rectangles, circles, triangles
- **Text** - Custom fonts, colors, and sizes
- **SVG** - Import vector graphics
- **Images** - PNG, JPG, WebP overlays

### Zoom
- Zoom in/out at specific timeline moments
- Speed and easing control
- **3D Camera Movement** - Tilt and dynamic rotation based on points of interest

### Audio
- Multi-track support
- Auto-trim based on video duration

### Export

**Quality**
- 4K (3840×2160) @ 30fps
- 2K (2560×1440) @ 30fps
- 1080p (1920×1080) @ 30fps
- 720p (1280×720) @ 30fps
- 480p (720×480) @ 24fps

**Format**
- MP4 (H.264)
- WebM (VP9 with transparent background support)
- GIF
- PNG, WEBP, JPG, AVIF

---

## Screenshots

<table width="100%">
  <tr>
    <td width="60%">
      <a href="https://www.youtube.com/watch?v=BreTDBD_pGY" target="_blank">
        <img
          src="https://github.com/user-attachments/assets/82a82dc8-ce81-4d78-829e-12c9ef096758"
          alt="FreeCut multi-track timeline"
          width="100%"
        />
      </a>
    </td>
    <td width="40%">
      <img
        src="https://github.com/user-attachments/assets/9053805f-aa96-4a45-8c0e-cddd46df5406"
        alt="Frame 1116606751"
        width="100%"
      />
    </td>
  </tr>
  <tr>
    <td width="60%">
      <img
        src="https://github.com/user-attachments/assets/a22c3d1b-a3d3-4934-ad6a-2c2542fd6206"
        alt="Frame 1116606753"
        width="100%"
      />
    </td>
    <td width="40%">
     <img
        src="https://github.com/user-attachments/assets/28ce5648-4085-4503-ac68-d8224f7bcccb"
        alt="Frame 1116606752"
        width="100%"
      />
    </td>
  </tr>
</table>

   <img width="1729" height="918" alt="openvid-1784321861424 (1)" src="https://github.com/user-attachments/assets/fdca5a94-1119-449d-9436-3a2b09c58e94" />

---

## Technology

**Video Processing**
- FFmpeg.wasm - fully in-browser rendering
- Canvas API - preview
- MediaBunny - optimized video pipeline
- Three.js - 3D effects
- HTML to Image - mockup export

**Storage**
- IndexedDB - locally recorded videos
- LocalStorage - user settings
- Supabase Storage - cloud backups (coming soon)
---

## Quick Start — local mode

This fork supports editing and exporting without an account, Supabase, or any API key.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev --hostname 127.0.0.1
```

Open http://localhost:3000/en/editor for video, or
http://localhost:3000/en/editor?mode=photo for images.

For a production build:

```bash
pnpm build
pnpm start --hostname 127.0.0.1
```

`NEXT_PUBLIC_LOCAL_ONLY=true` in the example enables local mode. It is a
**build-time** setting: restart development or rebuild production after changing it.
No placeholder Supabase credentials are needed. When the flag is unset or `false`,
the original account integration remains enabled and requires your own Supabase
URL, anonymous key, OAuth providers, and database setup.

Local mode:

- Keeps video/image editing, device mockups, zooms, audio, and local exports.
- Exports videos without redirecting to login. Does not create a fake user/session.
- Skips Supabase session refresh and profile access; hides account, sign-out,
  cloud feedback, and online stock-photo search controls.
- Disables feedback and scheduled-email endpoints (404), and Google Analytics.
- Redirects login and OAuth callbacks back to the local editor.
- Retains browser storage for projects and media. Use the same browser profile and
  URL/port to return to your work; clearing site data removes those local copies.

This mode removes the cloud-account requirement; it is **not a fully offline bundle**.
Some fonts, icons, and 3D helper assets can still need internet access. Built-in
backgrounds and uploaded images remain available. Image AVIF/WebP fallback encoding
uses your own local Next.js server. Video export speed depends on the browser and
hardware. The original noncommercial license still applies.


---

## 💬 Community

¡Contributions are welcome! Join our **Discord** to collaborate: [![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/aBu5A2tBXb)

## Contributors
<a href="https://github.com/CristianOlivera1/openvid/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=CristianOlivera1/openvid" />
</a>

## Incremental AI workflow

Run `pnpm openvid help`, `pnpm openvid status`, or `pnpm openvid start` from this repository. The service CLI is intentionally small; editing and exporting currently use the browser.

Portable skills: [openvid](skills/openvid/SKILL.md) routes tasks, [openvid-docs](skills/openvid-docs/SKILL.md) documents operations, and [openvid-create](skills/openvid-create/SKILL.md) designs reusable recipes. Canonical sources live in `skills/`; `.agents/skills/openvid*` links provide in-repository discovery.

Install all three with `node cli/install-skills.mjs`, or build the Codex plugin with `node cli/package-skills.mjs`. See [installation, plugin packaging, and runtime setup](docs/SKILLS.md). The skill/plugin installation is separate from the Openvid editor checkout; no account configuration changes are made merely by packaging.

### First real recipe: Chrome Google Search

The [recipe](recipes/chrome-google-search/RECIPE.md) preserves real screen footage and an editable project with camera motion, mouse events, click effects, depth of field, and retiming. Start at that entrypoint for the current version; older capture and framing examples remain historical references. `automation/cdp-recorder.mjs` runs with the computer-use tool's CDP capability. `pnpm openvid record encode`, `media assemble`, and `media inspect` handle recorded media; `window.openvid` exposes a small local-mode editing API using the existing editor. Read the [recording reference](.agents/skills/openvid-docs/references/recording.md) and [editing API reference](.agents/skills/openvid-docs/references/editing-api.md) only when needed.

Validate the local edit recipe with `node --experimental-strip-types --test tests/local-edit.test.mjs` (Node 22+). Generated takes and run artifacts stay local under ignored recipe runs; no private recordings are committed.

### Native recording revision

Capture uses Openvid **Record → Share screen**; the current recipe documents whether the take uses a window or a browser tab and how cursor contamination is excluded. CDP only assists focus/clock/editor control; it does not capture the video. The [native recording reference](.agents/skills/openvid-docs/references/native-recording.md) records the successful sequence and actual limitations.

Computer Use's software cursor was absent from the captured window, so `automation/native-pointer-log.mjs` logs actual command coordinates and `pnpm openvid media pointer <plan.json>` adds an explicitly synthetic pointer visualization before retiming. This is not an OS cursor trajectory. Local recording now allows 300 seconds; other apps/multi-window synchronization still need their own verification.

Run `node --experimental-strip-types --test tests/*.test.mjs` for edit, source-boundary, pointer, and archival protection regression tests (Node 22+, ffmpeg/ffprobe required).

### Camera-directed revision

The current [camera recipe](recipes/chrome-google-search/camera.md) uses no simulated toolbar: the original plane starts laid back, rises before the pointer appears, moves into a side-angle search close-up, then returns to a stable frontal view. Optional camera keyframes in the local editing API reuse the Motion pipeline; preview/export transform order and trim/split remapping are regression-tested. Intermediate media can retain a 2560-pixel width via the pointer CLI.
