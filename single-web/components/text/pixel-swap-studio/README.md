# Pixel Swap · 像素换词

组件 / 文字，项目标识 `pixel-swap-studio`。

参考：[Melius 标题](https://www.melius.com/?ref=minimal.gallery)。仅复刻标题文字：固定前后缀与像素化换词、词槽宽度缓动；使用仓库 Inter Regular / Noto Sans SC，不收录图片、画廊、导航或原站字体。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/components/text/pixel-swap-studio/index.html`。无需安装依赖；`npm run check` 检查脚本语法。

默认前缀 Create any，词组 movie / image / campaign，后缀 you imagine；最大字号 64px，转场 650ms，最大像素块 8px。窄容器中短标题会缩小至两行，长文本保留自然换行。按用户要求默认自动轮播，每次清晰停驻 1300ms 后前进一次。悬停、点击、轻触或 Enter/空格立即切换。移出或取消恢复首词后继续；Escape 或重置恢复首词并暂停，真实操作或 resume 恢复。失焦、隐藏或代码页签暂停，返回后继续。调参后先停驻 1300ms；减少动态效果时停止自动轮播，手动直接换词。

预览、封面和交付共用 `effect.js` 与 `pixel-swap.css`。交付三个入口同步当前参数与主题，源码包包含可直接打开的 index.html、component.html、prompt.txt、README.md、字体与许可。复制代码在当前内容包含非 ASCII 字符时内嵌中文字体；源码包始终包含中文字体。英文内嵌 Inter Regular / Semibold 与 OFL 许可。

接入：放置 `.library-pixel-swap` 容器、引入隔离 CSS、加载 effect.js，调用 `LibraryPixelSwap.mount(root, config)`。实例提供 `next()`、`update(config)`、`reset()`、`pause()`、`resume()`、`destroy()`；重挂载清理旧实例，移除前调用 destroy。`autoplay:false` 可关闭自动播放。支持多实例，销毁清理帧、定时器、事件与 ResizeObserver。Canvas 隐藏于辅助技术，原生按钮提供当前完整句子和键盘操作。

专项检查：仓库根目录运行 `node scripts/pixel-swap.test.cjs`，覆盖转场阶段、快速操作与取消、多实例、销毁、窄屏、中文、减少动态效果、交付快照与重置。配合 `MAINTENANCE.md` 的公共检查，浏览器核对两个索引入口、封面、返回路径及交付。
