# Copy Button · 复制按钮

参考：[DesignBookmark · Copy Button](https://designbookmark.com/motion#db-copy-button)。基于用户提供的单页 HTML 复刻，按 31Library 规范整理。

- 分类：Components → 按钮；标签：press；原生 HTML、CSS、JavaScript，无第三方运行库。
- 只展示高 36px、圆角 12px 的独立复制按钮，预览与封面均居中，不展示命令行。复制成功后 Copy 滚动为 Copied，复制图标转出、绿色勾选弹入，文字宽度弹性变化，1800ms 后复位。
- 参数：完成态停留（ms）、文字弹簧刚度与阻尼；面板中的刚度和阻尼只显示数值，提示词中保留完整计算单位。图标与宽度弹簧保留参考值 420/18、300/24。
- 默认浅色，支持深色演示区、鼠标、触屏及键盘 Enter/空格。示例复制内容固定为 `npm i motion-kit`，接入时可通过 `config.command` 修改；真实复制成功才展示成功态，失败提供状态提示。初始静止，无自动演示，停稳后不运行动画帧。
- 封面与详情共用实现和初始参数。点击封面按钮由公共外框跳转详情；封面悬停不模拟复制，移出复位。
- 复制代码、下载单文件 HTML 与复制提示词同步当前参数及主题；图标使用仓库 `assets/icons/copy.svg`、`check.svg`，导出内嵌同一源文件及 Inter 字体（附 OFL 许可）。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/components/button/copy-button-studio/index.html`。

接入：放置 `.library-copy-command` 完整结构，引入 `button.css` 与 `effect.js`，调用 `root.libraryComponent = LibraryCopyButton.mount(root, { command: 'npm i motion-kit', doneMs: 1800, stiffness: 260, damping: 20 })`。每个实例独立，修改参数用 `update(config)`，复位用 `reset()`，移除前用 `destroy()`。复制代码包含初始化逻辑，无需重复挂载。

剪贴板 API 需要 HTTPS 或 localhost；不可用时尝试 `document.execCommand('copy')`，被浏览器阻止时会明确提示失败。异步复制期间重复激活会被忽略；重置、失焦、隐藏或销毁后过期的异步结果不再更新界面。系统减少动态效果时即时切换。

验证：`node scripts/copy-button.test.cjs`、`node scripts/check.mjs`、`node scripts/runtime.test.cjs`；浏览器检查索引按钮分类、封面跳转、复制、参数、重置、主题、代码、提示词、下载及窄屏布局。
