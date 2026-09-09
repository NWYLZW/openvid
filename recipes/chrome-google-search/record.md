# 录制

在 computer-use REPL 中创建 Chrome 演示标签，导航至 Google 并读取页面。首次 CDP 命令前必须已进入 HTTP(S) 页面。

使用仓库 `automation/cdp-recorder.mjs` 的 `startRecording(cdp, takeDirectory)`，传入当前工具提供的 CDP capability。返回 `state`、`capture(action)`、`mark(label)` 和 `stop()`；stop 返回帧数、时间和事件。每次使用新目录，拒绝混合不同录制。

记录事件：主页展示、输入开始、提交搜索、结果可见、滚动、切换图片、图片预览、进入相关页面。操作选取当前 DOM 元素，原生截图或权限对话框不属于 DOM。

每次工具调用用 `capture(async () => { /* 页面操作与状态检查 */ })` 包住录制动作，调用结束前收回采集循环。不要跨工具调用悬挂后台循环。

通过 readEvents 收集 screencastFrame，存 JPEG 和原始时间戳并逐帧 ack。停止后检查帧数和错误。CDP 仅捕获页面画面，无声音，不是桌面窗口录屏。使用 `pnpm openvid record encode <take目录> <raw.mp4>` 编码，再用 `pnpm openvid media assemble <assembly.json>` 预剪；这两个命令已实际使用。

## 本次实际使用的操作代码

以下代码在已观察到中文 Google 页面、并建立 demoTab/recorder 后按阶段执行。每段返回页面状态，AI 检查结果后才继续。页面标签或结果变化时调整本次副本。

```js
await recorder.capture(async () => {
  recorder.mark("typing-start");
  await demoTab.playwright.getByRole("combobox", { name: "搜索", exact: true })
    .pressSequentially("冰岛 极光 最佳月份");
  recorder.mark("query-entered");
  await demoTab.getAXState();
});

await recorder.capture(async () => {
  recorder.mark("search-submit");
  await demoTab.playwright.getByRole("combobox", { name: "搜索", exact: true }).press("Enter");
  await demoTab.getAXState();
});

await recorder.capture(async () => {
  recorder.mark("images-open");
  await demoTab.playwright.getByRole("link", { name: "图片", exact: true }).click();
  await demoTab.getAXState();
});
```

Google 图片预览的“访问”会打开新标签。本次为新标签独立建立 detailRecorder，预览点击和详情素材以剪辑连接，没有把新页错误地当成旧 target。
