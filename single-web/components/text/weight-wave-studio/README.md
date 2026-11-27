# Weight Wave · 字重波浪

文字组件工作台，参考用户提供的 DesignBookmark [Weight Wave](https://designbookmark.com/motion#db-weight-wave) 单页源码。根据用户后续要求，闲置时自动扫动，真实交互优先接管波峰。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/components/text/weight-wave-studio/index.html`；无需安装或构建。项目语法检查：`npm --prefix single-web/components/text/weight-wave-studio run check`。

`effect.js` 与 `weight-wave.css` 为封面、预览和导出共用实现。默认文字 Feel the weight，字号 54px，基础字重 300，峰值 820，波峰宽度 13%，静止不透明度 42%，字重弹簧刚度 260、阻尼 22；波峰跟随弹簧 150 / 22。鼠标经过、触屏按住移动、聚焦后的方向键触发；Home/End 定位，Escape 或离开后恢复自动扫动。自动扫动以 4600ms 为周期，从行宽 -6% 往返至 106%。失焦、隐藏或代码页签暂停，返回继续。减少动态效果时关闭自动扫动，只保留操作反馈。传入 `autoplay:false` 可禁用闲置扫动。

效果依赖完整字重轴的 Inter Variable，使用公共资源 `assets/fonts/inter-variable.woff2`，来源为 [Inter 官方仓库](https://github.com/rsms/inter/blob/master/docs/font-files/InterVariable.woff2)。许可见 `assets/fonts/INTER-OFL.txt`。公共 UI 仍沿用原静态字体。中文回退到系统字体，连续字重取决于字体支持。

复制代码、下载 HTML、复制提示词均快照当前参数与主题。下载文件内嵌字体及许可，直接打开即可离线使用。复制结构、一次引入 CSS/JS 后调用 `LibraryWeightWave.mount(root, config)`；返回 `update(config)`、`reset()`、`play()`、`pause()`、`destroy()`，删除实例前销毁。各实例独立运行，样式仅作用于组件专属类。工作台重置恢复默认参数、暂停动画并清除交互，保留主题及页签；再次操作文字或返回预览后恢复播放。
