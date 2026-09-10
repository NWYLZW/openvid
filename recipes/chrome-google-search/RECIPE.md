# Chrome / Google 搜索演示

当前制作采用[连续镜头与鼠标编排版本](camera.md)，配置为camera-edit.json。下方保留历史制作路径；不要把旧版本的Chrome外框重新加回来。

目标：约 25–30 秒、1920×1080、无声视频。真实展示打开 Google、输入同义搜索词（原生版用“Iceland northern lights best month”，旧CDP版用“冰岛 极光 最佳月份”）、浏览结果、查看图片和相关网页；加入变速、缩放、3D 效果和内置桌面壁纸。不能伪造搜索结果。

- 当前重录要求使用 Openvid Record：先读 [原生录制经验](../../.agents/skills/openvid-docs/references/native-recording.md)，验证目标窗口和鼠标后再正式录制。
- [record.md](record.md) 保留旧 CDP 采集的历史做法，不作为原生重录的默认路径。
- 素材准备完成后读 [edit.md](edit.md)：按实际事件定位剪辑与动画。
- 本次状态在 `runs/<本次标识>/run.md`，素材和精确参数保留在同一运行目录。

原生重录优先选定Chrome演示窗口，保留真实鼠标操作，不把无关桌面、账号资料或麦克风录入成片。旧成片仅为CDP网页采集加Openvid外框，不能当作原生录制已完成的证据。

步骤和脚本允许根据页面变化调整。进入网页需要先读取当前结果；不硬编码结果排名。遇到验证码时停在对应步骤，不绕过验证。

## 原生重录的实际路径

当前可复用的原生示例使用英文同义搜索词 `Iceland northern lights best month`，避免本次系统中文输入兼容性问题。采用 Openvid Record 的窗口捕获；CDP只用于录制页焦点、时钟读取及编辑器API，不采集视频帧。

指针是Computer Use实际命令坐标驱动的展示动画，不是系统光标原始轨迹；必须如实说明。按录制时钟保存事件；旧原生版先pointer再assemble，当前连续编排版先预剪无光标素材，再在剪辑时间轴上设计pointer和camera，详见camera.md。每次新录制重新根据事件确定区间，不套用上次的绝对时间。
