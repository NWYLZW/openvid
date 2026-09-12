# Record a real PWA from an isolated Chrome process

Use when a debugger information bar contaminates a PWA recording. This workflow
was proven with the installed Raft PWA; it is not a browser-tab substitute.

## Separate control, capture and editing

1. Launch Chrome with a new user-data directory and only local Openvid:
   ```sh
   mkdir -p .duo-tools/recorder-profile
   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
     --user-data-dir="$PWD/.duo-tools/recorder-profile" \
     --no-first-run --no-default-browser-check \
     --new-window http://localhost:3101/en/editor
   ```
2. Keep the real PWA in its existing profile. No login, copied cookies, extension
   installation or debugger attachment is needed in the recorder process.
3. Use native accessibility for Record → Share screen → Window → the actual PWA.
   Confirm recording and source identity. Do not silently choose an ordinary tab.
4. Operate the PWA with native accessibility/keyboard. In this run direct Unicode
   key down/up events to the discovered PWA PID produced actual progressive typing;
   the generic native typeText route had previously failed to target its composer.
5. Save the recording and verify raw dimensions/frames before editing. The isolated
   profile's own localhost media cache can retain the take if a native download
   workflow is unavailable; never inspect the user's normal profile for this.
6. Import the resulting source into the IAB editing project. IAB is still useful
   for editing/export even when its getDisplayMedia picker cannot be operated.

## Window discovery and layout

Chrome's scriptable window can be a hidden wrapper around the visible PWA. An
AppleScript bounds success did not prove the actual PWA resized in this run.
Find the visible PWA by WindowServer owner/title, resolve its owner PID, then
inspect native AX windows. The app-shim bundle identifier can be misleading, and
the main AX window may have no title; cross-check its geometry and contents.
If its window is unavailable, use its Window menu's actual named window entry.
Never reuse captured PIDs, window IDs or AX indices from a prior run.

The current Duo example uses one 768×578 PWA window, with a 38-pixel title bar.
Captured pixels were 1536×1156; cropping the system title bar yielded 1536×1080
for a 768×540 logical layout. Enlarge the sidebar using its native divider and
collapse empty groups. Do not independently scale the list and chat content.

UI timing and geometry must be re-read after a native resize settles. Use real
2× capture pixels, not a post-export upscale or doubled CSS viewport.

## Proven checks

- No debugger bar or tool pointer in the raw PWA frames.
- One source video feeds both complementary inner halves and the following cover.
- Source VFR is normalized before temporal trim; title-bar crop is measured per run.
- Draft input is never sent. Clear only the exact draft created for the take.
- Preserve the user's project before source replacement. That API can reset aspect
  and auto-generated zooms; reapply the intended aspect and exact effect settings.
- Convert CSS-pixel pose scale/position from the saved reference width to the actual
  preview width when reapplying a recipe; otherwise a narrower editor can crop it.

See `recipes/duo-chat-reveal/README.md` and its ignored `runs/pwa-isolated/` evidence.
The IAB test in this run left getDisplayMedia pending; it did not establish that
IAB categorically lacks recording support. The isolated-process path completed.
