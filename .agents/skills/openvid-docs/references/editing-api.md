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
