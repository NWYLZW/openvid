# Duo source and local artwork

The folding geometry and screen projection/gradient shaders are adapted from
[jadon7 / iphone-duo](https://github.com/chuspeeism/iphone-duo), MIT. The complete
copyright and permission notice is in `duo-animation-LICENSE`.

The device mesh and textures are Apple artwork, **not** covered by that MIT
license. This repository does not redistribute the USDZ, derived GLB, textures,
or rendered device artwork as open-source assets. `public/models/duo/` and
`public/models/iphone-duo.glb` are ignored.

The optional local setup command downloads the Star White USDZ from Apple's
[iPhone Duo AR asset](https://www.apple.com/105/media/us/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/ar/iPhone_Duo_e-sim_Star-White_Variant.usdz),
selects its Landscape pose, and converts it using Openvid's installed Three.js.
Use of this artwork remains subject to Apple's terms. Night Sky is a configurable
material tint of the locally prepared model, not a separately verified Apple finish asset.

The preparation-only vendored USD loader is pinned under cli/duo-assets/vendor;
its provenance and Three/fflate license paths are documented there. It includes
the reference connection-resolution/texture-readiness fixes. Runtime Three is
not globally upgraded. Re-run prepare-assets when updating from the r184 model.
