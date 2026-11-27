# Pixel Word Swap · 像素换词

分类：Components / text（文字）。参考 [melius.com](https://www.melius.com/) 首页标题“Create any [image / audio / video / campaign / movie] you imagine”的文字效果，按原站脚本的分段节奏与像素化方法重写为原生组件。

整句绘制在 Canvas 2D 上。换词时，词槽单词单独绘制、按块缩小采样后关闭平滑放大，形成像素马赛克：650ms 内块大小按 `1 + round((max - 1) · sin(πp))` 从 1px 增至字号的 12.5% 再回落，在最粗的中点替换单词；词槽宽度以 easeInOutCubic 在新旧词宽之间过渡，每行重新居中，前后文字随之平移。换行按最长词预留，切换时不跳行。

原站页面打开后自动循环（停留 1300ms、切换 650ms）。按本仓库规则，默认改为真实操作触发：鼠标或触控笔悬停标题时立即换词并按同一节奏循环，移出后完成当前切换再停住；点击、轻触或 Enter／空格立即换到下一个词，切换中连续操作最多排队一次。参数面板的“自动轮换”开关（默认关闭）可恢复原站的持续循环。索引封面在真实悬停期间循环，移出后完成当前切换即静止。

在仓库根目录运行 `node scripts/serve.mjs`，访问 `http://127.0.0.1:4173/31Library/single-web/components/text/pixel-word-swap-studio/`。

## 参数

默认值：`prefix: 'Create any'`，`words: ['image', 'audio', 'video', 'campaign', 'movie']`，`suffix: 'you imagine'`，`fontSize: 56` px（24–96），`hold: 1300` ms（400–4000），`duration: 650` ms（200–1600），`pixel: 12.5`（最大像素块占字号的百分比，4–25），`autoplay: false`。最多 12 个词，每个 40 个字符；前缀、后缀各 60 个字符，可留空。单个词宽于容器时自动缩小字号。

## 复用

放置 `.library-pixel-word-swap` 结构（按钮内含隐藏的 `.library-pixel-word-swap-sizer` 与 `.library-pixel-word-swap-canvas`），引入 `pixel-word-swap.css` 与 `effect.js`，调用 `LibraryPixelWordSwap.mount(root, config)`。返回 `next()`、`play()`、`pause()`、`update(config)`、`reset()`、`refresh()`、`destroy()`。多实例独立；销毁时清理事件、ResizeObserver、MutationObserver、计时器与动画帧。只在切换期间运行动画帧，停留使用单个计时器。

文字颜色由 `--pixel-word-swap-text` 提供（`data-appearance="dark"` 切换为浅色），画布从该变量读取颜色，不受按钮颜色过渡影响；其他方式改色后调用 `refresh()`。系统开启“减少动态效果”时直接换词，不显示马赛克；失焦或页面隐藏时停止计时。

## 字体

原站标题使用商用字体 Reckless Standard，未随仓库分发。本组件改用仓库内 `assets/fonts/source-serif-4-latin-variable.woff2`（Source Serif 4，SIL OFL 1.1），字重 450、字距 -0.015em、自动光学尺寸；同字号下整句宽度与原站一致。复制代码与下载示例内嵌同一字体及许可，中文词组使用系统衬线字体回退。

测试：`node scripts/pixel-word-swap.test.cjs`。
