# Blur Reveal · 模糊显现

组件 / 文字。文字无需点击即可从左向右逐字由模糊与透明变清晰，每轮完成后清晰停驻 1400ms，再自动播放。悬停、点击、轻触或 Enter／空格立即重播。移出或取消后恢复清晰并继续循环；窗口失焦、页面隐藏及代码页签暂停，恢复后继续。重置恢复默认参数并暂停，操作文字或切回预览恢复循环。系统减少动态效果时不播放模糊。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/components/text/blur-reveal-studio/index.html`。无 npm 运行依赖。

默认参数：文字 `Coming into focus`、字号 48px、单字时长 400ms、逐字间隔 30ms、起始模糊 8px，autoPlay 为 true。预览和封面使用 `effect.js`、`blur-reveal.css` 与同一组默认值。

工作台提供复制组件代码、下载单文件 HTML 和复制提示词，均使用当前参数与主题。交付仅包含组件结构、隔离 CSS 和原生 JavaScript，内嵌 Inter 字体及 SIL OFL 许可；中文使用系统字体。下载文件可直接打开。

将交付结构放入页面，引入一次样式与脚本，再执行 `LibraryBlurReveal.mount(root, config)`。实例提供 `play()`、`update(config)`、`reset()`、`resume()`、`destroy()`。多个实例各自独立；移除前调用 `destroy()`，再次挂载同一容器会先清理旧实例。动效使用现代浏览器的 Web Animations API，不支持时显示静态文字。

验证命令：`node --check single-web/components/text/blur-reveal-studio/effect.js`、`node --check single-web/components/text/blur-reveal-studio/app.js`、`node scripts/blur-reveal.test.cjs`。
