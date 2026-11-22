# Hold Button · 长按确认按钮

参考：[DesignBookmark Motion – Hold Button](https://designbookmark.com/motion#db-hold-button)。根据用户提供的单页 HTML 参考实现，在 31Library 公共规范下重新组织为可复用组件。

- 分类：Components → Buttons；交互标签：press；实现：原生 HTML、CSS、JavaScript。
- 默认外观：220 × 56 px 胶囊，Inter Semibold 14px，浅色与深色演示主题均可切换。
- 交互：默认长按 1200ms，进度从左向右增长，松手提前取消并弹性回弹；成功后变为 56px 绿色圆形与 SVG 勾选，1700ms 后复位。
- 详情可调：长按时长、成功态停留、回弹阻尼；工作台的 0.25× 慢速观察不写入交付文件。
- 操作：鼠标、触屏、键盘 Enter/空格；取消、离页、窗口失焦清理按压状态；尊重减少动态效果。
- 可复用：独立类名，多个实例互不影响；每个按钮提供 `libraryComponent.update(config)`、`reset()`、`destroy()`、`onComplete` 回调。
- 交付：复制组件代码、下载单文件 HTML、复制提示词，均同步当前参数；无第三方运行依赖。
- 浏览：`single-web/components/hold-button-studio/index.html`。封面使用同一组件且不自动演示，长按完成后可跳转详情。

在仓库根目录启动 `node scripts/serve.mjs`，打开 `http://127.0.0.1:4173/31Library/single-web/components/hold-button-studio/index.html`。

部署路径使用相对链接，兼容 GitHub Pages 的 `/31Library/` 子路径。