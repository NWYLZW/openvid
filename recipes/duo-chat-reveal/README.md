# Raft Duo — one continuous PWA recording

Use a single installed Raft PWA window at the unfolded Duo aspect ratio. Record
one video; both halves and the outer cover share its time and pixels. Do not
record two mobile pages, concatenate them spatially, or scale the sidebar apart
from the chat. The opening reveals the left region using Duo's folding shader.

Read `skills/openvid-docs/references/duo.md` for editable model configuration and
`skills/openvid-docs/references/native-recording.md` for capture. Run-specific production scripts and private input/output stay local and are
not distributed with the code. The verified run used the ignored
`runs/pwa-isolated/` directory; the workflow below is the reusable public record.

## Proven capture layout

- Independent Chrome process/profile hosts only local Openvid, with no login or
  browser automation extension. Raft stays in the user's installed PWA.
- Control PWA and sharing UI with native accessibility/keyboard. Do not attach a
  debugger to the PWA while recording: its information bar changes client area.
- Source window: 768×578 logical pixels, including 38-pixel system title bar.
  Content: 768×540; actual source: 1536×1156. Crop only the top 76 recorded pixels
  to obtain one 1536×1080 content video, i.e. two recording pixels per logical pixel.
- Enlarge the list with the app's native sidebar divider; collapse empty pinned
  and federated-channel groups so conversations fit. Preserve uniform UI scale.
- Type into a draft using real Unicode keyboard events; do not send it. Confirm
  the final text before clearing only the draft created by this take.

## Animation and validation

Hold closed through 0.65s; unfold by 3.4s with eased projection and progressive
blur; recorded typing begins about 4s. Both inner crops cover complementary
halves of the same video: left (0,0,.5,1), right (.5,0,.5,1). Cover follows right.
No separately enlarged list or independently timed chat stream.

Use Openvid's existing Fold track and device panel. Preserve user pose and light
settings. Account for the saved imagePhoneRefWidth when converting a pose into a
different preview viewport; do not blindly reuse its CSS-pixel scale. Save and
reload, then inspect closed/mid/open frames from an actual Openvid export.
