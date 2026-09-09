# Chrome 页面采集：已验证路径

适用：录制受控 Chrome 标签页的真实交互，不包含浏览器工具栏、系统桌面或声音。

在 computer-use REPL 中使用工具文档允许的浏览器/CDP API。先建立目标 HTTP(S) 页面，再获取其 CDP capability；不要另起未经工具管理的浏览器连接。

```js
const { startRecording } = await import('/absolute/repo/automation/cdp-recorder.mjs');
const recording = await startRecording(cdp, '/absolute/run/take-01');
await recording.capture(async () => {
  recording.mark('search-submit');
  // 在此执行已观察到的页面操作，并读取最新页面状态。
});
// 下一次工具调用可以继续 recording.capture(...)。
const result = await recording.stop();
```

capture 中的事件收集循环与本次操作同时执行，并在工具调用返回前结束；不要留下跨调用后台 pump，它会因工具执行上下文结束而失败。每次 capture 之间的静止时间也在原始时间轴中，后续按事件剪掉。

每帧保存 JPEG 和 CDP 时间戳，收到后 ack。stop 保存 recording.json。帧缓冲溢出、无帧或采集错误会报告失败；失败 take 保留用于诊断，重录使用新目录。

进入新标签页时为新 target 建立独立 take，不能假定旧 target 自动跟随。录制中如临时固定视口，结束后恢复。不要把新窗口、系统权限对话框或音轨误称为已经捕获。

编码与预剪（需要本机 ffmpeg/ffprobe）：

```sh
pnpm openvid record encode /absolute/run/take-01 /absolute/run/raw.mp4
pnpm openvid media assemble /absolute/run/assembly.json
pnpm openvid media inspect /absolute/run/assembled.mp4
```

assembly.json 包含 output、可选偶数 width/height（默认1440×900）及 clips。每个 clip 的 file/start/end/speed/hold 定义源片段、倍速和末帧停留；时间单位秒，路径相对此 JSON。仅处理无声音视频。输出拒绝覆盖；同时生成 `.timeline.json` 保存源区间到输出时间的映射。实际时长仍以 ffprobe 为准。

首个实例：[Google 搜索配方](../../../../recipes/chrome-google-search/RECIPE.md)。素材必须来自真实录制，不能把占位图片当作操作成功证据。

## 鼠标与点击的呈现

首个实际成片确认：此 CDP 采集流程没有系统鼠标，也没有额外的光标叠加。Codex 浏览器工具负责点击、输入和滚动；这些离散操作不保证产生连续可见的指针移动。工具截图里出现的指针标记也不能当成录制帧包含光标的证据。

若用户需要鼠标演示，录制前明确选择含光标的系统窗口采集，或随新录制保存实际指针/点击事件并同步渲染光标。后者目前未实现；不要声称可以从既有无光标素材中精确恢复原始轨迹。
