当前水波点击版：water-ripple-edit.json；同一无光标素材、7.5秒脚本、60fps。Mouse→Water ripple选择，圈状形变向外传播，保留上一版柔和景深。

当前效果优化版使用refined-effects-edit.json：点击100%强度/20%范围/0.5秒，景深1.8及柔和过渡、缩放补偿。保持7.5秒脚本与60fps。

当前鼠标效果版本使用pointer-effects-edit.json及runs/pointer-effects-2026-09-10/clean-source.mp4。Mouse面板和Mouse时间线可微调轨迹/点击，默认扭曲，60fps。此素材无预合成鼠标；下方历史版本只供参考。

# Chrome / Google 搜索演示

当前视频制作必须交付同一可编辑工程：Motion内可查看/微调关键帧与景深，AI后续用updateMotion保留人工修改。当前运行状态见runs/shared-edit-2026-09-10/run.md。

当前版本只演示搜索，配置为shared-edit.json（含可编辑景深；search-only-edit.json保留无景深版），总长7.5秒：1.5秒内开始输入，同步鼠标与镜头点击搜索，结果页回正后停留1秒结束。更长的历史流程保留供参考，不再作为本次成片范围。

目标：约 25–30 秒、1920×1080、无声视频。真实展示打开 Google、输入同义搜索词（原生版用“Iceland northern lights best month”，旧CDP版用“冰岛 极光 最佳月份”）、浏览结果、查看图片和相关网页；加入变速、缩放、3D 效果和内置桌面壁纸。不能伪造搜索结果。

- 当前重录要求使用 Openvid Record：先读 [原生录制经验](../../.agents/skills/openvid-docs/references/native-recording.md)，验证目标窗口和鼠标后再正式录制。
- [record.md](record.md) 保留旧 CDP 采集的历史做法，不作为原生重录的默认路径。
- 素材准备完成后读 [edit.md](edit.md)：按实际事件定位剪辑与动画。
- 本次状态在 `runs/<本次标识>/run.md`，素材和精确参数保留在同一运行目录。

原生重录优先选定Chrome演示窗口，保留真实鼠标操作，不把无关桌面、账号资料或麦克风录入成片。旧成片仅为CDP网页采集加Openvid外框，不能当作原生录制已完成的证据。

步骤和脚本允许根据页面变化调整。进入网页需要先读取当前结果；不硬编码结果排名。遇到验证码时停在对应步骤，不绕过验证。

## 原生重录的实际路径

当前可复用的原生示例使用英文同义搜索词 `Iceland northern lights best month`，避免本次系统中文输入兼容性问题。采用 Openvid Record 的窗口捕获；CDP只用于录制页焦点、时钟读取及编辑器API，不采集视频帧。

指针是Computer Use实际命令坐标驱动的展示动画，不是系统光标原始轨迹；必须如实说明。按录制时钟保存事件；旧原生版先pointer再assemble，当前连续编排版先预剪无光标素材，再在剪辑时间轴上设计pointer和camera，详见camera.md。每次新录制重新根据事件确定区间，不套用上次的绝对时间。
