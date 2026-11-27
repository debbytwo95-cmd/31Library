# Elliptical Gallery · 椭圆环绕画廊

组件 / 画廊，标识 `elliptical-gallery-studio`。

参考 [Melius](https://www.melius.com/?ref=minimal.gallery) 首页环绕图片：朝向屏幕的卡片沿椭圆旋转，近大远小，后景轻微模糊和淡出。全部图片、视频替换为纯色块，保留横幅、竖幅与方形的比例变化。没有图片、字体、图标或第三方运行库依赖。此效果与球面拖拽的 Orbit Gallery 分开收录。

延续用户已明确的自动播放要求：默认 17 块、8 度/秒、逆时针、88% 水平展开、40% 椭圆比例、104px 基准宽度、36% 透视系数、后景模糊 2.2px。悬停或聚焦某块时减速停驻并放大最多 30%，移出后恢复。水平拖动改变位置，触屏纵向仍可滚动。点击色块或空格切换暂停，左右键步进，Home / Escape 复位并暂停。工作台重置保留主题、页签，恢复参数并暂停；参数区“继续旋转”恢复播放。失焦、隐藏、代码页签或离开视口时暂停。系统减少动态效果时停止自动转动，保留手动拖动、步进和控制。

从仓库根目录运行 `node scripts/serve.mjs`，打开 `http://127.0.0.1:4173/31Library/single-web/components/gallery/elliptical-gallery-studio/index.html`。也可在本目录 `npm run dev`。无需安装依赖，`npm run check` 检查语法。封面、工作台、复制代码及下载示例共用 `effect.js` 和 `gallery.css`。复制提示词、代码和下载均截取当前参数与主题；暂停属于临时播放状态，不改变导出默认自动播放的参数。

接入：放置 `.library-elliptical-gallery` 容器、引入 CSS 与 effect.js，调用 `LibraryEllipticalGallery.mount(root,config)`。返回 `update(config)`、`reset()`、`pause()`、`resume()`、`getConfig()`、`destroy()`。`autoplay:false` 可关闭初始自动播放。多实例独立，重复挂载先清理旧实例；删除容器前调用 destroy，清理指针捕获、事件、动画帧和观察器。默认高度 520px，小屏 360px；宿主可为容器指定高度。

下载为可直接打开的独立 HTML，无外部资源；复制代码只包含组件，不含公共导航、工作台或封面跳转。原页面用于结构与运动研究，未下载或分发其媒体。

专项测试：仓库根目录 `node scripts/elliptical-gallery.test.cjs`，再执行 `MAINTENANCE.md` 中公共检查。浏览器核对两个索引、分类与搜索、封面、跳转返回、自动旋转、悬停、拖动、键盘、参数、重置、交付和窄屏。
