# Chrome / Google 搜索演示

当前：真实逐字输入版，约9.7秒、1080p60fps。34字符原速逐字输入约4.6秒；输入后稍停，鼠标与镜头0.6秒到搜索按钮，点击后等0.4秒再拉远，结果页结束。

## 本次入口

- 当前参数：[natural-typing-edit.json](natural-typing-edit.json)。
- 恢复工作先读 `runs/natural-typing-final-2026-09-10/run.md`，核对真实工程和产物。
- 源素材为该运行typed-source.mp4，来自Openvid Record真实键盘输入；去除左侧工具指针所在空白边，光标/水波/镜头在工程内渲染。
- 重新录制时先读[scripts/type-humanly.mjs](scripts/type-humanly.mjs)，按真实时间和几何更新assembly；media assemble后用[scripts/prepare-natural-typing.mjs](scripts/prepare-natural-typing.mjs)生成工程参数。旧自然停顿版human-pauses-edit.json保留对比。

## 共同编辑要求

AI、人、预览和导出使用同一工程。Mouse面板编辑轨迹/点击效果，Motion编辑关键帧/景深；已有工程先读取state并updateMotion增量微调，不能用旧配方覆盖人工设置。首次换源创建时才apply完整配置。保存实际project快照和媒体，参数JSON不是完整IndexedDB导出。

## 按需读取

- 操作/导出：[编辑API](../../.agents/skills/openvid-docs/references/editing-api.md)。
- 要重新录制：[原生录制经验](../../.agents/skills/openvid-docs/references/native-recording.md)，使用Openvid Record；不能把CDP网页采集称为原生窗口录屏。
- 镜头设计与历史演进：[camera.md](camera.md)。水波版water-ripple-edit.json、按压版refined-effects-edit.json保留用于对比。
- 最早的[record.md](record.md)和[edit.md](edit.md)是历史制作路径，不是当前默认。

原始素材来自Openvid窗口录制；鼠标轨迹是设计的展示动画，点击依据命令记录，不称为OS轨迹采样。不添加模拟工具栏，默认内置desktop-01壁纸。
