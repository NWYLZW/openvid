from pathlib import Path
from urllib.request import urlretrieve
from zipfile import ZipFile
from pxr import Usd,Sdf
import sys
assets=Path(sys.argv[1])
textures=assets/'textures';textures.mkdir(parents=True,exist_ok=True)
model=assets/'source.usdz'
if not model.exists():urlretrieve('https://www.apple.com/105/media/us/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/ar/iPhone_Duo_e-sim_Star-White_Variant.usdz',model)
with ZipFile(model) as z:
 for name in z.namelist():
  if Path(name).suffix.lower() in {'.png','.jpg','.jpeg','.avif'}:(textures/Path(name).name).write_bytes(z.read(name))
s=Usd.Stage.Open(str(model));s.GetDefaultPrim().GetVariantSet('Pose').SetVariantSelection('Landscape');flat=Usd.Stage.Open(s.Flatten())
for p in flat.Traverse():
 for a in p.GetAttributes():
  v=a.Get()
  if isinstance(v,Sdf.AssetPath) and v.path:a.Set(Sdf.AssetPath('textures/'+Path(v.path.split('[')[-1].rstrip(']')).name))
flat.GetRootLayer().Export(str(assets/'duo.usdc'))
print('Prepared USD, prims',sum(1 for _ in flat.Traverse()))
