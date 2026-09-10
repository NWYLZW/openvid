# Chrome / Google 搜索演示

当前：自然停顿版，约7.9秒、1080p60fps。输入框点击后短暂停顿，再输入；点击搜索后让水波展开，镜头稍后拉远，结果页结束。不继续滚动、图片或文章浏览。

## 本次入口

- 当前参数：[human-pauses-edit.json](human-pauses-edit.json)。
- 恢复工作先读 `runs/human-pauses-2026-09-10/run.md`，核对真实工程和产物。
- 源素材为该运行的paused-source.mp4；源画面等待由assembly生成，光标/水波/镜头仍在工程内渲染。
- 调整等待时长：修改运行副本assembly.json，media assemble后运行[scripts/prepare-human-pauses.mjs](scripts/prepare-human-pauses.mjs)，依据before-project快照同步时间。不要冻结包含光标和效果的成片。

## 共同编辑要求

AI、人、预览和导出使用同一工程。Mouse面板编辑轨迹/点击效果，Motion编辑关键帧/景深；已有工程先读取state并updateMotion增量微调，不能用旧配方覆盖人工设置。首次换源创建时才apply完整配置。保存实际project快照和媒体，参数JSON不是完整IndexedDB导出。

## 按需读取

- 操作/导出：[编辑API](../../.agents/skills/openvid-docs/references/editing-api.md)。
- 要重新录制：[原生录制经验](../../.agents/skills/openvid-docs/references/native-recording.md)，使用Openvid Record；不能把CDP网页采集称为原生窗口录屏。
- 镜头设计与历史演进：[camera.md](camera.md)。水波版water-ripple-edit.json、按压版refined-effects-edit.json保留用于对比。
- 最早的[record.md](record.md)和[edit.md](edit.md)是历史制作路径，不是当前默认。

原始素材来自Openvid窗口录制；鼠标轨迹是设计的展示动画，点击依据命令记录，不称为OS轨迹采样。不添加模拟工具栏，默认内置desktop-01壁纸。
