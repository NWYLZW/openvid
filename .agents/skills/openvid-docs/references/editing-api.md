# 本地编辑器 API v1

当前仅在 NEXT_PUBLIC_LOCAL_ONLY=true 时存在 `window.openvid`，绑定当前标签的真实编辑器状态。通过当前环境允许的 CDP Runtime.evaluate 调用；尚不是 HTTP 服务或通用 headless 渲染器。

- `state()`：ready、素材 duration、currentTime、exportProgress 和不含媒体 Blob 的工程参数快照。
- `apply(edit)`：校验全部参数后应用一套编辑配置；覆盖外框、背景、画布比例、全局倍速、缩放和文字图层，静音源音轨。返回 Promise，等待 React 提交与媒体重新就绪。输入缩放/文字时间使用源素材时间；全局 speed 改变导出时长。
- `save()`：等待当前工程通过编辑器现有存储保存。媒体仍在当前浏览器的 IndexedDB 中。
- `seek(seconds)`：使用现有时间线跳转，供检查画面。
- `export(quality)`：发起现有导出流程。调用返回不是导出完成；观察 `exportProgress.status`，到 complete 后再确认真实文件。error 必须处理。

apply 仅覆盖本次已需要的字段，没有任意 React 状态注入。不要用于仍需要保留当前图层的用户项目；新制作优先用明确的新工程环境。UI 动画与媒体帧显示可能稍晚于参数提交，截图验收需核对实际画面。

精确格式见 [LocalEdit 定义与校验](../../../../lib/local-edit.ts)；可直接复用 [首个实际配置](../../../../recipes/chrome-google-search/edit.json) 和 [应用脚本](../../../../recipes/chrome-google-search/scripts/apply-edit.mjs)。配置中的 `version: 1`、speed、padding、roundedCorners、shadows、mockup、background、zooms 和 titles 都须提供。坐标为0–100百分比，颜色为#RRGGBB。当前只支持 none/chrome/macos 外框；缩放有序且不重叠。API 拒绝超出素材的区间。

缩放 level 为 Openvid 的1–10级参数，不直接等于倍数。tiltX/tiltY 非零时启用缩放片段的3D效果。字幕由 API 放到 VIDEO_Z_INDEX 之上；不要用小于视频层的固定 zIndex。

重现需要：同一源素材、edit.json、工程快照和实际工具版本。只导出工程参数 JSON 不包含视频字节，不能宣称是完整可移植工程包。保存成功后可刷新验证恢复。

补充：`downloadSource()`下载当前加载的单个源Blob，返回fileName/bytes/type；它不导出整个多素材工程，也不自动确认浏览器下载完成。原生录屏使用后，必须检查实际文件的尺寸、时长和内容。

素材替换：先通过界面 Upload 将文件放入库，再 `await sources()` 读取带id的库元信息，`await replaceSource(id)` 替换当前视频。复用现有上传处理器；准备失败会拒绝并保留旧clip映射，成功须等待新clip和媒体就绪才返回。替换会重建视频轨与默认缩放；随后重新apply本次配置。不要拿它作为追加素材命令。

`await downloadSource()`现按工程唯一sourceId从素材库读取实际Blob，返回sourceId和文件信息；多来源工程明确拒绝，避免下载到另一段源。调用方必须await，并检查真实下载文件。

可选 `camera`：以源视频秒计的关键帧数组，字段 time/scale/x/y/pitch/yaw/roll/perspective。首帧time=0、时间严格递增；可以叠加原生zooms。位置百分比，角度为度。复用Motion轨道采样与渲染，界面显示Camera keyframes；配置入口在recipe/API。参考 [镜头配方](../../../../recipes/chrome-google-search/camera.md)。未提供camera时清除旧camera Motion片段。

camera关键帧可附加 easing=[x1,y1,x2,y2]，四个控制值限定0–1，绑定到达该帧的区间；未提供沿用默认S曲线。裁剪保留整条曲线的原始knots及easing，不重新启动缓动。原始视频的圆角和软阴影在预览/导出按相同画布长边单位缩放。

背景可使用 `background: {wallpaper: "desktop-01"}`，名称由内置目录校验并解析，未知壁纸在修改工程前拒绝。已有 `{from: "#112233", to: "#445566"}` 渐变配置仍兼容。

可选 `depthOfField`（仅 none + 单视频 + 单条 camera 关键帧）：

```json
{"focus":{"x":0.44,"y":0.42},"protectRect":{"x":0.32,"y":0.38,"width":0.36,"height":0.075},"maxBlurPx":3.5}
```

坐标为原始素材的 **0–1** 归一化值，区别于 camera 的0–100位置百分比。`protectRect` 可省略；矩形内与焦点保持清晰，只有更远深度渐进虚化。maxBlurPx 为1080高画布、camera scale之前的半径，范围0–4，默认3.5。按实际 contain、roll、BLEED 映射，支持 auto 比例；不支持 crop、非零 videoTransform、zoom、mask、camera overlay、3D phone 或多clip组合，API及绘制入口都会拒绝，预览显示错误。默认零变换合法。

配置存入 camera motion fragment，沿现有工程保存/刷新/undo和trim remap保留。普通配方不提供depthOfField即清除旧景深。启用时预览复用导出绘制函数，CSS视频层只隐藏视觉而保持挂载；导出暂停预览，并串行访问WebGL。暂停且帧/配置未变化时不重绘。当前只支持静态保护区；不含动态鼠标跟焦。

## 人与 AI 共同微调同一工程

已有工程的后续调整先读取 `state().project`，优先 `updateMotion(id, changes, expectedFragment)`。changes 只允许 keyframes/depthOfField；expectedFragment 必须是刚从同一工程读取的完整片段。若人已修改该片段，接口拒绝旧快照，重新读取后再合并意图，不自动重试覆盖。其他片段、背景、Zoom、文字和素材保持不变。depthOfField:null 只移除该片段景深；UI 开关可以保留配置并停用。

`apply(edit)`仍用于首次创建/明确整体替换，不是通用“继续编辑”命令。不能用旧配方覆盖人工微调。真实执行参考 `automation/update-motion.mjs`，通过当前受支持的 CDP capability 调用同一浏览器工程。

选择 Motion → Edit camera，或点时间线 Camera keyframes，可看到每个关键帧的时间、位置、缩放、3D角度、透视与缓动。选择关键帧会定位预览。数值框按 Enter 或离开输入框提交，拖动位置/倾斜控件实时更新。可在播放头处添加关键帧，移除关键帧或整条运动；原有预设继续使用原面板。

景深 `enabled` 省略/true 启用，false 暂停效果并保留参数。Camera keyframes 与原生 Zoom/3D Effect 可在同一工程共存，API 与界面均支持；景深使用最外层倾斜平面的深度，不是角度相加。crop、非零视频变换、mask、摄像头叠层、phone、多 clip 等暂不支持的组合只暂停景深并给局部提示，保持其他编辑和导出可用。

## 工程内鼠标与点击效果

可选 `pointerTrack` 跟随camera片段保存在同一工程；顶层配方用于首次创建，后续 `updateMotion(id,{pointerTrack},expected)` 增量修改，null移除。UI入口 Mouse，时间线 Mouse 行显示移动/点击事件；支持全局效果与单次点击覆盖。字段 enabled/size/effect/radius/strength/duration/fps/events；坐标x/y为原始素材0..1，time是camera片段局部秒，travel为到达事件前的移动时长。效果 none/press/ripple/halo/distort，单次effect省略继承默认。fps可选30/60，开启鼠标默认60，导出读取同一参数。

使用无光标素材；不能把旧版已烘焙光标视频再叠一层。鼠标/点击不再由FFmpeg预合成：Openvid按每个预览/导出时刻采样，先局部形变视频，再画光标，最后共同应用镜头变换。背景不参与点击形变。源码与点击记录仍需归档；设计轨迹不能描述为真实系统鼠标采样。

景深可选 `softness:0..100`（省略50）调整清晰区向远端模糊的过渡，`compensateZoom:boolean`（省略false）补偿camera和原生Zoom的2D放大，避免模糊半径随推近过度放大。这两个参数均在景深面板可调。搜索试片采用maxBlurPx=1.8、softness=85、compensateZoom=true；仍为远端景深近似，不是完整物理镜头或自动焦点系统。Shader使用49点高斯采样减少稀疏采样重影。

新增 `water`（UI: Water ripple）点击样式：以点击为圆心向外传播一圈有正负折射的波峰，中心恢复清晰，外圈逐渐衰减。与只画圆环的`ripple`、整体按压的`distort`分别保留。复用radius/strength/duration与单次effect覆盖；当前水波试片duration=.65、radius=.2、strength=1。先作用视频像素，再画光标与透视。波峰有防中心奇点衰减，并对单波最大强度验证无径向折返。
