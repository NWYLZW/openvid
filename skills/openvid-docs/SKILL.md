---
name: openvid-docs
description: 查询本地 Openvid 的现有 CLI、启动方法、浏览器操作和已验证限制；制作过程需要具体操作时使用。
---

# 当前可用操作

技能安装目录不是 Openvid 项目目录。先按[项目定位](references/project-location.md)找到并验证项目；不要从技能路径向上猜仓库位置。不要把 openvid.app 的同名云服务当成本项目。

安装后的便携入口为本技能内 `scripts/openvid.mjs`：`node <本技能目录>/scripts/openvid.mjs --project <Openvid项目目录> locate` 验证位置，后续把 locate 换为 help/status/start。也支持 OPENVID_PROJECT，或从项目内部向上定位。没有项目时先按定位文档准备；不自动扫描用户主目录。

以下命令均在已验证的项目根目录执行：

```sh
pnpm openvid help
pnpm openvid status
pnpm openvid start
```

默认地址 http://localhost:3088/en/editor，图片模式追加 `?mode=photo`。命令支持 `--port 数字`。status 输出 JSON，不可用时退出码 1。start 使用已有生产构建；服务已就绪则复用，否则在前台启动，仅监听本机。Ctrl+C 停止此次启动的进程；CLI 不接管或终止其他已有进程。

首次安装才执行 `pnpm install --frozen-lockfile`，从 `.env.example` 创建 `.env.local`，设置 `NEXT_PUBLIC_LOCAL_ONLY=true`，再 `pnpm build`。不要覆盖已有环境配置。这个开关在构建时生效，修改后必须重新构建。UI 源码有更新时也要重新构建、重启自己管理的进程。

## 编辑与导出时才读这里

- 使用 Openvid Record 录制窗口/屏幕时，先读取 [原生录制](references/native-recording.md)，按真实素材验证来源与光标。
- 用户明确选择 CDP 网页采集，或仅需预剪已有素材时，读取 [页面录制与素材 CLI](references/recording.md)。
- 批量设置变速、缩放、3D、标题，或保存/导出时，读取 [本地编辑器 API](references/editing-api.md)。
- 其他操作继续使用当前环境提供的浏览器工具，先读其操作说明。实际读页面后选按钮，不保存或复用旧 accessibility 索引。

已验证流程：Select file 导入 → 面板调整 → Export 选择格式/质量 → 等待完成 → 检查实际文件。已实测短视频 H.264 和 PNG 导出，以及视频刷新恢复；未完成全部设备模型、声音、4K/GIF/透明 WebM 的测试。

视频导出建议在 Chrome 验证；保持录制/导出标签可见。原生保存或共享窗口不属于网页 DOM。录屏使用 getDisplayMedia，可能需要用户选择来源和授予权限；桌面/带声音录制尚未建立无人值守链路；网页无声采集已有 CDP 路径。

本地版无需登录；若出现 Google 登录，检查实际地址是否是 openvid.dev 的官网流程。服务启动成功还要把正确的 localhost 页面打开到用户正在使用的浏览器并验证，不能仅报告后台端口可访问。

项目存于浏览器本地，浏览器配置和 origin（含端口）改变会进入另一套存储。清理站点数据会丢失项目。部分字体/图标/3D 辅助资源仍可能联网。

遇到新问题时先查对应源码和运行证据，只把验证过的必要经验补到这里；内容变长后再拆分条件性参考文档。
