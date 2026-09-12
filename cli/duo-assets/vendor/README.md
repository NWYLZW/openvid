# Pinned Duo asset loader

USDLoader, USDAParser, USDCParser and USDComposer are copied from the reference
iphone-duo repository at commit 2662ebbeb6aa844cd4f6888f7d6f8958662249fd, whose
vendored Three revision is 186. This is used only by the local asset-preparation
page, with Openvid's installed Three runtime. It does not replace global Three.

The reference includes authored-attribute connection resolution and waits for
texture loading; these affect 12 material values in the Duo USD. The r184 loader
previously used for preparation did not produce equivalent materials.

Source: https://github.com/chuspeeism/iphone-duo/tree/2662ebbeb6aa844cd4f6888f7d6f8958662249fd/vendor/three
Licenses: third-party/duo-three-LICENSE, third-party/duo-animation-LICENSE and
third-party/duo-fflate-LICENSE. Apple model artwork remains local and ignored.
