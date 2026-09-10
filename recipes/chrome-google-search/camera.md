# 连续镜头与鼠标编排

当前加速版为 [fast-intro-edit.json](fast-intro-edit.json)，基于下述 [camera-edit.json](camera-edit.json) 的原始节拍。用户希望镜头、鼠标、操作共同形成连续动作，不能先点击再补一段无关镜头动画。保留原始录制画面比例，不使用模拟工具栏或设备框；默认内置 Desktop / macOS 风格壁纸 desktop-01，圆角8、三层软阴影24。

## 当前节拍

- 0秒：平面斜躺，约三分之一位于画面下方之外，鼠标位于素材底部。
- 0–2.4秒：镜头拉远、逐渐放平，同时鼠标向搜索框上滑。
- 2.4–4.85秒：鼠标继续移动，卡片逐渐向右、向内倾斜，进入搜索框近景。
- 4.85秒：鼠标和镜头到位，短暂停留；约5.14秒点击。真实输入紧随其后。
- 7.4–9.25秒：鼠标和镜头一起移向提交位置；约9.07秒点击。
- 9.25–11秒：回正拉远，展示真实结果；后续保持阅读视角。

光标在预剪后的素材时间轴上编排，和相机共用源秒；本版全局speed=1，局部倍速保留在assembly。鼠标入口到搜索框的4.85秒移动用余弦缓动，镜头使用目的关键帧的Bezier缓动。光标先合入无光标素材，再由Openvid统一做透视和等比缩放，不另叠屏幕坐标光标。轨迹是设计的展示动画；真实点击时刻来自原生操作证据，不是OS轨迹采样。

## 实际执行时再读

本版复用Openvid Record原生窗口录像，未重新录制，未使用CDP采集帧。当前运行在 `runs/choreography-2026-09-10/`，原始录制和点击记录在 `runs/native-2026-09-10/`。

1. 顺序解码原始WebM得到native-normalized.mp4，再用 `media assemble` 预剪到clean-timed.mp4。原WebM直接随机seek曾产生VP9参考帧错误和时长偏移，不可用“ffmpeg退出0”认定素材正常。
2. 执行 [choreograph-pointer.mjs](scripts/choreograph-pointer.mjs)，传本次运行目录。它根据实际assembly时间映射生成pointer-events.json与pointer.json，保留原始点击sourceTime。该脚本的入口、停留与源坐标比例是本片设计，更换素材必须调整。
3. `pnpm openvid media pointer <run>/pointer.json` 生成choreographed-source.mp4。
4. 导入该素材，replaceSource后apply当前edit.json，save工程，使用Openvid export('1080p')导出。读取编辑API文档，不自行猜接口。
5. 保存project.json及实际导出；检查开场、运动中点、点击前后、末帧和全片解码。预览正确不代替导出检查。

旧版“立起后再出现光标”已被用户修订。历史参数保留在camera/easing运行归档中，不把它重新当成默认。

相机渲染先旋转和透视平面，再平移与等比缩放；预览和导出共用顺序与阴影层参数。裁剪、split按原素材时间映射关键帧，避免重新播放开场。CSS与Canvas栅格化仍可能略有差异，以真实导出为准。

## 缩短开场（当前版本）

用户认为首次输入前等待5秒偏慢，现把源0–5.4秒以1.8倍播放，输出为3秒；其后保持原速。鼠标到位约2.69秒，点击约2.85秒，输入约3秒开始。保留壁纸、圆角、阴影和原来的镜头路径。

使用现有media assemble预剪已烘焙光标的素材，不再次叠加光标；相机时间同步分段映射：t<=5.4时t/1.8，否则t-2.4。本例分界位于静止镜头区间内，因此跨界保持段不改变曲线形状。若分界在运动中，不可只改关键帧时间，需拆分曲线或直接在原工程里调整分段速度。参数见runs/fast-intro-2026-09-10/assembly.json与edit.json，成片约28.4秒。

## 1.5秒开场与同步提交（待实际导出验收）

当前synced-quick-edit.json把基础素材前6秒压到1.5秒，首次点击约1.28秒，输入约1.5秒内出现。旧版提交镜头源7.4秒先动，鼠标却源7.969秒才动，造成0.569秒延迟。现在二者共用sourceStart=7.4、sourceArrival=8.85，点击仍按证据9.069秒；映射后为2.9秒同时起步、4.35秒共同到位、4.569秒点击。

使用synced-quick-cues.json作为单一节拍来源，通过scripts/prepare-synced-quick.mjs传新的运行目录生成assembly、pointer与edit参数，拒绝覆盖配置。执行media assemble然后media pointer，导入synced-source.mp4应用edit。本次输入取无光标clean-timed.mp4，避免重复叠加光标。

鼠标使用余弦缓动，提交镜头使用[0.37,0,0.63,1]近似相同缓入缓出；起点和终点严格同步，中间曲线近似。已检查共享节拍和配置重放一致，Mac锁屏期间尚未完成编辑器导出与视觉验收。
