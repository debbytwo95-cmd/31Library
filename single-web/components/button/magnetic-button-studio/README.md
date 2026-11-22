# Magnetic Button · 磁吸按钮

磁吸、分层跟随、弹簧回弹和按压反馈均由真实用户操作触发；没有自动演示、虚拟光标或闲置运动。

在仓库根目录运行 `npm --prefix single-web/components/button/magnetic-button-studio run dev`，打开终端显示的地址。无需安装依赖，服务同时提供仓库共用资源。GitHub Pages 继续使用原有相对路径。

- `index.html`、`styles.css`：详情布局及项目实际参数。
- `button.css`：隔离的按钮样式；`../../../assets/button-runtime.js`：预览和交付共用的交互实现。
- `app.js`：参数、预设、主题、重置及交付登记；公共导航来自 `../../../assets/site-shell.js`。
- `reference/`：原始资料与布局参考；旧 `shell.js` 已由公共导航替代。

“复制组件代码”提供必要的 HTML / CSS / JavaScript；“下载示例”提供可直接打开的 HTML；“复制提示词”描述当前参数与接入约束。三者使用当前参数与演示主题，工作台慢速观察和吸附辅助线不带入交付。字体、SVG 和字体许可包含在示例内，不需要网络。

复制代码时放置完整容器、引入一次样式，在结构之后初始化；多个实例各自独立。实例位于 `root.libraryComponent`，支持 `update()`、`reset()`、`destroy()`，移除前调用 `destroy()`。

鼠标位置决定磁吸；触屏支持按压和点击，不模拟鼠标悬停。Tab 聚焦，Enter／空格激活；取消、失焦或离页清理临时状态。重置恢复默认参数和静止状态，保留演示主题及当前页签。

来源参考：[DesignBookmark Magnetic Button](https://designbookmark.com/motion#db-magnetic-button)。原项目页面：https://magnetic-button-studio.candybull5.chatgpt.site 。

修改后运行项目 `check`，以及仓库根目录的 `node scripts/check.mjs`、`node scripts/runtime.test.cjs`。完整流程见 `../../../MAINTENANCE.md`。
