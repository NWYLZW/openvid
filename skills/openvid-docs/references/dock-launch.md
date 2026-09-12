# Dock 启动动画

用于用户明确要求的应用启动包装；Dock 是动画，窗口源素材的录制/截图来源必须另行说明。

UI：导入视频 → Motion → Add camera keyframes → Edit camera → Add Dock launch。上传图标后时间线显示 Dock 行，点击可打开对应参数。设置与 camera fragment 一起保存，Dock 固定在画布坐标，不跟随视频平面倾斜；展开窗口保持原始比例。

第一版支持 1–8 张嵌入 PNG/JPEG/WebP 图标、选中图标、位置 x/y（画布百分比）、size（画布高度百分比）、gap、opacity、start、bounces、amplitude、bounceDuration、expandDuration、keepVisible。没有图标时不隐藏窗口，需先上传图标。数值校验见 `<project>/lib/dock-launch.ts`。

首次配方 `apply` 可提供 `dockLaunch`，要求 camera + mockup none；继续编辑用 `updateMotion(id,{dockLaunch:config},expectedFragment)`，null移除。读取当前完整片段再增量更新，避免覆盖人工编辑。图标数据嵌入工程，不依赖临时本机路径。素材与导出另外归档，不将聊天截图或应用图标提交到通用代码。

当前试片限定单视频、无外框；多视频或外框下不会启用 Dock。预览与导出调用同一画布函数，Dock 启用时按60fps导出。裁剪产生的新片段保留原入场相位，不能重新从头弹跳。初版并非完整系统 Dock，未实现拖动排序或任意窗口间切换。

材质与镜头：`glassBlur`（0–40，1080p单位，默认18）、`cornerRadius`（底板高度百分比10–45，默认28）、`cameraZoom`（开场全场景放大1–3，旧项目省略为1）。均在Dock面板可调。毛玻璃采样底板背后的真实画布，模糊后叠加低强度染色与亮边，不是纯白色透明填充。场景镜头同时作用壁纸、Dock与展开窗口，逐渐拉回1×；与camera关键帧控制的视频平面姿态分开，可同时使用。它属于Dock轨道的启动镜头，改变原生Zoom不会修改此参数。


macOS参考对齐：新建Dock默认深色。`appearance`为dark/light，`runningDots`控制运行圆点，`separatorAfter`表示分隔线前的图标数量（0关闭，必须小于总图标数），均可在Dock面板调整。参考比例为图标104px、底板约166px；普通间距约32px，分隔区约96px；位置/尺寸随画布等比变化。图标先按非透明内容边界归一化，防止ICNS自带留白造成废纸篓比应用图标小一圈。废纸篓用本机AppKit `NSTrashFull` 在darkAqua外观下绘制，不能把CoreTypes的浅色icns或临摹图当作同一系统深色图标。该系统素材只随本次工程归档，不加入通用代码发行包。

## Persistent bottom mode

`pinToBottom:true` composites Dock after the scene camera, with a bottom inset of 1.8% of canvas height. `keepVisible:true` keeps it visible for the whole owning Motion interval; its timeline bar spans that interval. Both switches are editable; screen pin is an optional alternative to the default desktop-follow mode. Vertical position is disabled while pinned; horizontal position and size remain editable. The window launch uses inverse scene coordinates to stay attached to the screen icon.

`opacity` is labeled Glass tint: it controls material tint, not whole-layer alpha. A 96% dark tint conceals the frosted backdrop; start around 40-50% and verify actual footage. This Raft take uses 42% tint and 32px blur. Preview and export both sample and blur the fully camera-composited backdrop before drawing the Dock icons.

## Follow the desktop camera (current default)

`followCamera:true` places wallpaper, video and Dock in the same scale/pan camera. It is mutually exclusive with `pinToBottom`; enabling either UI mode disables the other. New Docks follow the desktop camera and remain visible; screen pin is retained only as an optional alternative. In follow mode the Dock is placed at the desktop bottom, can enlarge or leave the viewport partially, and reappears on pullback. Window pitch/yaw/roll remain its local perspective controls. Native scale/x/y are applied once to the whole scene, not also to the window. The current validated recipe uses a single uncropped video with mockup none and no native Zoom fragments.

In desktop-follow mode glass is sampled in scene coordinates before the shared camera transform, so its apparent size and blur follow zoom. The background has a larger cached drawing area to keep ordinary camera moves inside continuous wallpaper coverage; do not stretch one-pixel edges or repeat app pixels to hide uncovered areas.

## Center, land, open, hold, slide out

`startFromCenter:true` starts the Dock at the screen center and moves it to its desktop position during `bounceDuration`. The opening camera finishes its pullback at the same arrival time. `settleDuration` adds a landing pause before the window opens (default0.15s for a centered entrance;0 for older recipes).

`exitAfterOpen:true` starts a downward exit only after the window's complete unfold plus `exitDelay` (default0.5s). `exitDuration` defaults to0.45s. A completed exit does not re-enter during later camera pullback. The timeline bar ends at the exit completion. All options are available in the Dock panel; the exit option takes precedence over fading.

Dock rendering uses the same scene camera matrix to calculate its final screen position and size before rasterization. This preserves camera following while allowing a slide beyond the intermediate scene canvas without premature clipping. Exit geometry includes the current zoom and shadow bounds so the whole Dock leaves the viewport. Do not implement this as an opacity fade or let the window appear before Dock arrival.
