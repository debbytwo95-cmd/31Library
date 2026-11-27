# Icon Button · 扩散箭头按钮

圆形底色扩散、文字反色和箭头穿梭的原生按钮，支持时长、箭头延迟、圆盘大小、箭头位移、圆角与缓动调节。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/components/button/icon-button-studio/index.html`。无需安装项目依赖，共用字体、导航和交付脚本按仓库路径加载。

- `index.html`、`styles.css` 与 `studio.css`：工作台页面。
- `button.css`：隔离样式；`../../../../assets/button-runtime.js`：预览与交付共用的交互。
- `app.js`：当前参数、主题、预设、重置和交付登记；公共导航来自 `../../../../assets/site-shell.js`。

“复制组件代码”提供可嵌入的 HTML / CSS / JavaScript；“下载示例”提供可直接打开的单文件 HTML；“复制提示词”提供当前参数与接入约束。当前演示主题同步交付。Inter Semibold 字体、SVG 与字体许可已内嵌。

多个完整按钮容器可独立初始化；实例位于 `root.libraryComponent`，支持 `reset()` 与 `destroy()`，移除前调用 `destroy()`。样式不修改目标页面的所有按钮或 body。

仅真实悬停、聚焦与按压触发，触屏松手后复位；Tab 聚焦，Enter／空格激活。取消、失焦或离页清理临时状态。系统减少动态效果时保留状态切换并禁用运动过渡。重置恢复默认参数、预设和静止状态，保留主题与页签。

修改后运行项目 `check`，以及仓库根目录的 `node scripts/check.mjs`、`node scripts/runtime.test.cjs`。完整流程见 `../../../MAINTENANCE.md`。
