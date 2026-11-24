# Goo Morph · 液态文字变形

组件 / 文字，项目 id：`goo-morph-studio`。

参考用户提供的 DesignBookmark [Goo Morph](https://designbookmark.com/motion#db-goo-morph) 源码。双层文字使用相反的模糊、透明度变化及 SVG alpha 阈值融合，保留参考的 smoothstep 节奏、字距和 Inter Semibold 外观。根据用户明确要求启用自动循环，移除参考中的共享演示引擎。

## 预览与交互

在仓库根目录运行 `node scripts/serve.mjs`，访问：

<http://127.0.0.1:4173/31Library/single-web/components/text/goo-morph-studio/index.html>

- 页面打开后自动循环，默认每词停留 1600ms，再用 1050ms 完成变形。点击、轻触、Enter 或空格可立即切换，变形中忽略重复输入。
- 详情移出后继续轮换；封面仅在真实悬停时循环，移出后回到首词并停止。失焦、隐藏或代码页签时暂停，恢复后重新等待完整停留时间。
- 减少动态效果时直接切换。窄容器按最长词组缩小字号。
- 参数更新与重置恢复首词，按当前停留时长继续循环；保留演示主题与预览／代码页签。

| 参数 | 默认值 | 范围 |
| --- | --- | --- |
| words | Ideas, Sketches, Designs, Products | 最多 12 组，每组 40 字符 |
| fontSize | 64 px | 24–96 px |
| duration | 1050 ms | 300–2400 ms |
| hold | 1600 ms | 400–5000 ms |
| blur | 8 px | 2–16 px |
| threshold | 140 | 80–200 |

## 交付与接入

封面、详情、复制代码和下载示例共用 `effect.js`、`goo-morph.css` 与相同默认参数。三个交付按钮均使用当前参数；异步生成代码前先取得参数快照。

复制组件代码可直接放入已有页面，包含结构、隔离样式、运行逻辑，以及内嵌 Inter 字体和许可。下载得到单文件 `goo-morph.html`，无需第三方运行库或网络资源。工作台本身需通过 HTTP 打开，以便交付模块读取源码与字体。

初始化：`root.libraryComponent = LibraryGooMorph.mount(root, config)`。返回 `next()`、`update(config)`、`reset()`、`finish()` 、`play()`、`pause()` 和 `destroy()`。各实例生成唯一滤镜 id，重复挂载会清理旧实例；移除节点前调用 `destroy()`，释放事件、观察器和动画帧。停留期间仅保留一个计时器，不运行动画帧；暂停和销毁清理计时器。传入 `autoplay:false` 可手动控制播放。

## 验证记录

2026-11-24，所有已执行的检查均返回退出码 0：

- `node scripts/sync-catalog.mjs --check`
- `node scripts/catalog-structure.test.mjs`
- `node scripts/check.mjs`
- `node scripts/runtime.test.cjs`
- `node scripts/check.mjs http://127.0.0.1:4173/31Library/`
- `node --check single-web/components/text/goo-morph-studio/effect.js`
- `node --check single-web/components/text/goo-morph-studio/app.js`
- `node scripts/goo-morph.test.cjs`（8 项：手动模式、融合收尾、多实例、取消清理、减少动态效果、尺寸、重复挂载、自动循环与计时器生命周期）
- `node scripts/delivery.test.cjs`
- `node scripts/prompt-copy.test.cjs`
- `node scripts/design.test.cjs`
- `node scripts/word-roll.test.cjs`
- `node scripts/weight-wave.test.cjs`

浏览器实际验证：根索引和组件索引的文字分类、英文／中文搜索、hover 筛选、卡片标题与封面按钮跳转、详情返回及筛选恢复、刷新加载、真实封面悬停与移出复位、点击和键盘输入、参数编辑、主题切换、重置、代码页签、复制代码、复制提示词与实际下载。两入口均保留 `/31Library/` 子路径，HTTP 检查覆盖 14 个项目、118 项页面与资源，无 404。390px 与 1280px 视口下没有水平溢出；小屏参数与交付控件可用。

使用 Alpha/Beta/Gamma、24px、2400ms、16px、阈值 200 验证三项交付的当前参数，下载内容含相同配置、内嵌字体及完整脚本。浏览器安全策略禁止 `file:` 导航，未直接在浏览器打开下载后的本地 HTML。触屏和减少动态效果由运行时测试覆盖，未做真实移动设备验证。

浏览器环境还记录了未定位来源的 MutationObserver 提示和公共 ViewTransition 取消提示；未发现新增效果脚本报错或资源加载失败。

本次文件的 `git diff --check` 通过；全仓同项检查报告已有 `single-web/components/button/copy-button-studio/index.html:84` 尾随空格，保留原有改动。

截图保存在仓库根目录 `output/goo-morph/`。

## 自动播放更新验证

2026-11-24：按用户要求增加自动循环与停留时长参数。浏览器刷新后未点击或悬停组件，连续观察到 Ideas → Sketches → Designs；复制代码、提示词和下载示例均同步自动播放与停留参数。原有双索引验证记录保留。
