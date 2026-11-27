# Tab Pill · 弹性胶囊标签页

基于用户提供的 [DesignBookmark Tab Pill](https://designbookmark.com/motion#db-tab-pill) 源码复刻。前缘弹簧为 620 / 40，后缘为 170 / 19，单位质量为 1；根据移动方向交换两侧参数。保留弹性拉伸与滑动，去掉原参考的自动演示及常驻动画循环。

在仓库根目录运行 `live-server`，访问：

`http://127.0.0.1:8080/single-web/components/tabs/tab-pill-studio/index.html`

索引分类：`single-web/components/index.html?section=components&category=tabs`。索引封面使用同一页面和默认参数；真实指针进入标签时切换，移出后复位，点击进入详情。

## 接入

工作台提供“复制组件代码”“下载示例”“复制提示词”，同步当前弹簧参数和主题。下载为单个可直接打开的 HTML，包含 Inter 字体与 OFL 许可，不依赖外部资源。导出从首项静止开始。

也可引入 `effect.css` 和 `effect.js`，放置页面中的 `.library-tab-pill` 结构，再调用 `LibraryTabPill.mount(root, options)`。返回实例支持：

- `select(index)`：选择指定项。
- `update(config)`：更新弹簧参数，重新测量并停稳。
- `selectedIndex`、`getConfig()`：读取当前选择及参数。
- `reset()`：回到首项，清除位移和速度。
- `settle()`：保持当前选择并立即停稳。
- `destroy()`：移除事件、尺寸监听和动画帧。

`onChange(index, tab)` 在初始化选项中传入。每个实例独立，自动生成 tab/panel 的唯一关联 ID。示例面板通过视觉隐藏样式保留可访问内容；真实项目可替换面板内容并移除 `.library-tab-pill-panel` 的视觉隐藏样式，或通过回调联动已有内容。

支持鼠标、触屏点击、Enter/空格、左右方向键、Home/End。系统减少动态效果时立即切换。字体加载和尺寸改变后重新定位，失焦或页面隐藏时结束动画。

## 验证

运行 `node scripts/tab-pill.test.cjs`、`node scripts/check.mjs`、`node scripts/runtime.test.cjs`。浏览器核对连续反向切换、深浅主题、四个参数、慢速、重置、代码页签、复制与下载，及 320 px 窄屏和索引封面。
