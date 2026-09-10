# 定位项目与运行 CLI

安装技能只安装工作流，不安装编辑器、Node/pnpm、ffmpeg 或 Computer Use 工具。三份技能一起安装，保持同一版本。

按顺序定位：用户给定项目目录（--project）→ OPENVID_PROJECT → 当前工作目录及其父目录。使用 scripts/openvid.mjs locate 验证 package.json 的 openvid 名称、cli/openvid.mjs 和 lib/local-edit.ts。显式给错目录会报错，不偷偷切换其他工程。脚本只查上述路径，不从技能/插件安装位置推断，不扫描其他仓库。

```sh
node <skill-dir>/scripts/openvid.mjs --project /path/to/openvid locate
node <skill-dir>/scripts/openvid.mjs --project /path/to/openvid help
node <skill-dir>/scripts/openvid.mjs --project /path/to/openvid status --port 3088
```

<skill-dir> 指安装后的 openvid-docs 技能目录，<project> 指 locate 返回的 projectRoot。文档中的 <project>/lib、recipes、automation 等路径都属于编辑器检出目录，不是技能包中的相对链接。

没有项目时，实际制作请求可在用户工作区中准备一个专用目录，克隆 https://github.com/NWYLZW/openvid ，再按 SKILL.md 安装依赖、设置本地模式、构建和启动。若用户仅问文档，不自动克隆或启动。已有项目不重新克隆，不覆盖 .env.local。常规使用不要改插件缓存里的文件。

```sh
git clone https://github.com/NWYLZW/openvid openvid
```

优先使用与技能发行版本对应的编辑器版本。若 CLI 或 window.openvid 接口缺失，报告实际版本差异，先查该检出的代码/帮助，不编造可用功能。浏览器控制由当前环境的 Computer Use/CDP capability 提供；技能包不授予系统录制权限，也不自带浏览器连接。
