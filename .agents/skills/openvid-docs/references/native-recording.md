# Openvid 原生录制：已验证的操作路径

适用：用户要求使用 Openvid Record 录制窗口/屏幕。不要静默换成 CDP 帧采集。以下已在 Chrome 窗口完成真实录制；其他原生应用和跨应用捕获仍需按来源验证。

## 快速流程

1. 准备专用 Chrome 窗口，保留 Openvid 和演示页面两个标签。先关闭上次导出完成对话框。确认用户暂时不操作录制窗口，避免窗口被切换。
2. 让 Openvid 标签获得前台焦点。本次可用 CDP `Page.bringToFront` 做焦点准备；它不负责采集视频。
3. 点 Record → Recording Setup。按配方设置 Camera、Microphone、System Audio；本例全部关闭。
4. 用 Computer Use 原生点击 Share screen。Chrome共享选择器不属于网页DOM；读取原生accessibility后操作。
5. 选择“窗口” → 当前 Openvid 所在 Chrome 窗口 → “分享”。选中来源前分享按钮不可用。不要选择 Cua Driver 或 Software Cursor 辅助窗口。
6. 等待倒数结束，确认 Recording 计时。切到同一窗口中的演示标签，Openvid留在后台录制整个窗口。
7. 需要记录操作时间时，在本地模式读取 `window.openvidRecording.clock()`，确认 state 为 recording、surface 为 window，并确认 startedAtMs 大于0后保存。开始前约300ms的准备阶段返回零；真正启动后才暴露有效时钟。
8. 按当前截图的实际坐标操作；每一步后检查结果。停止用 Openvid Stop 按钮或同一原生录制实例的 `window.openvidRecording.stop()`。
9. 等待 Processing your recording 结束、编辑器出现新素材和时长。用 `window.openvid.downloadSource()` 下载当前源文件，先检查原片再剪辑。

Chrome“窗口”菜单可选择实际窗口。Cmd+反引号在本次不可靠。分享提示条可能成为当前窗口；重新读取完整accessibility树后从窗口菜单切换，不重复旧索引。

## 鼠标：必须区分捕获与可视化

本次原生窗口视频没有包含Computer Use的独立软件指针。即使改用坐标点击，原片也未包含那个软件指针；不能以工具截图中的指针证明录屏有鼠标。

已验证补充路径：原生录制保留，使用 `automation/native-pointer-log.mjs` 记录Computer Use实际点击命令的坐标及起止时间，再用 `pnpm openvid media pointer <plan.json>` 绘制可视化指针与点击提示。它不依赖浏览器DOM，可接受其他app的Computer Use目标，但目前只实测Chrome窗口。

这条轨道是**命令坐标驱动的展示动画**，不是测得的系统鼠标轨迹。点击时间取命令起止的中点，两个位置之间做0.4秒平滑插值；需要更高同步精度时再补真正的输入事件采样，不隐瞒当前精度。

脚本输入坐标必须相对当前截图，并同时传入截图width/height。规范化为捕获区域百分比后随素材缩放。来源或窗口边界变化时重新确认映射，不能把其他窗口坐标直接混用。

pointer计划格式：`input`原生源视频、`events`指针记录JSON、`output`新文件名，路径相对计划文件；可选`cropTop`为顶部裁除比例。输出为1440宽、30fps、无声，拒绝覆盖已有文件。先加指针，再统一按assembly.json剪辑/变速，避免画面和指针时间分离。

## 本次踩坑与处理

- 背景标签直接发起共享曾报InvalidStateError：把录制页带到前台，再用原生点击触发Share screen。
- 原生accessibility偶尔滞后于画面：无变化时看截图确认模态框，不盲目重复点击。
- Native typeText输入中文只留下空格，paste又出现等待剪贴板读取超时；本例换用同义英文搜索词，保留中文标题。其他输入方式需另行验证，不声称中文系统输入已解决。
- “窗口”选择器曾只列出当前Openvid窗口和工具辅助窗口，独立Google窗口未出现；同窗口多标签路径成功。
- “整个屏幕”测试录到了实际桌面与当前对话，不符合成片范围，测试片段不用于输出或公开归档。整屏录制不能当作目标app窗口录制的等价替代。
- 共享期间出现ScreenCaptureKit -3811、noWindowsAvailable和窗口被用户切换提示。停止测试、重读当前状态并协调窗口占用后继续。
- 原代码约120秒自动停止。本地模式现放宽为300秒，云模式仍120秒。本次正式素材119.043秒，最后超过上限的滚动没有录入；只使用原片真实覆盖的片段。
- CDP调用可能重新显示调试提示条。正式镜头前可关闭提示条，之后减少调试调用；仅在需要时用clock/stop读取或停止，不用CDP替代采集。

源视频仍存于当前浏览器的IndexedDB。新录制会清理当前视频工程，所以重录前先归档已有工程参数与源素材。最终剪辑可使用新的origin/端口隔离工程；本例3090录制，3092制作成片。

## 记录坐标的实际脚本接口

```js
const { createPointerLog } = await import('/absolute/repo/automation/native-pointer-log.mjs');
const log = createPointerLog(clock.startedAtMs, '/absolute/run/pointer-events.json');
await log.mark('home-ready');
await log.click(app, x, y, screenshotWidth, screenshotHeight);
// 使用当前环境允许的Computer Use API输入、滚动并检查画面。
await log.mark('result-ready');
```

每次click或mark都立即写盘，方便中断后检查。创建时拒绝覆盖已有日志，后续原子保存；同一录制源的操作串行执行，每次都await。clock来自真正开始录制后的`openvidRecording.clock()`，不要用打开选择器时的时间。录制时长上限也要计入计划，超出原片时长的事件不能剪成成功操作。
