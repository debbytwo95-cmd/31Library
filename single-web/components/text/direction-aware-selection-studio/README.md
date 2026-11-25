# Direction Aware Selection · 方向感知选择

分类：Components / text。默认文字：`Hi, I'm Evelyn Gao. I build 31Library for developers and designers.`。

整段正文在演示区内居中，各行文字居中对齐，在 `for` 后固定换行；窄屏同时允许自然换行。31Library 前使用与地址栏相同的黑底白字 31 图标，`assets/icons/site-logo.png` 为 `assets/favicon.png` 的原样副本。图标与项目名作为同一选区，复制代码与下载示例内嵌该 PNG。

参考：[Aceternity UI](https://ui.aceternity.com/interactions/direction-aware-selection)。依据公开可操作预览独立实现；未读取付费源码。姓名 Evelyn Gao 与项目 31Library 共享透明弹簧选框，保留四角手柄和实时尺寸标签；按本项目要求不填背景色、不反白。姓名上方以 Caveat Semibold 手写 `hover here` 与弯曲手绘箭头作文字标注。箭头是内容插图，不是公共操作图标；未加入人物和品牌图标。

## 运行

仓库根目录运行 `node scripts/serve.mjs`，打开 `http://127.0.0.1:4173/31Library/single-web/components/text/direction-aware-selection-studio/index.html`。

无安装或构建依赖。`npm run dev` 可启动同一服务；`npm run check` 检查项目和关联公共脚本语法。

## 交互

- 鼠标经过姓名或项目名称：出现透明弹性选框，目标间共享选框追随；离开后静止复位、恢复手写提示。正文无背景色，尺寸标签保留蓝底白字。没有姓名或项目匹配的自定义正文按词提供选区。
- Tab 聚焦，左右方向键及 Home / End 移动焦点；Enter、空格或轻触选择。Escape 清除。触屏轻触显示透明选框，不宣称触屏方向悬停。
- 尺寸标签显示词本身的实测宽、高，单位 px，不含选区外扩。
- 减少动态效果时直接切换。取消、窗口失焦、离页、重置清理状态；没有自动演示。
- 参数：正文、姓名、项目名、手写提示、字号、选框颜色、响应时长、选框回弹、水平外扩和尺寸标签。重置保留当前主题与页签。

## 复用

放置 `.library-direction-selection` 容器，引入 `selection.css`、`effect.js`，调用 `LibraryDirectionSelection.mount(root, config)`。返回 `update(config)`、`reset()`、`destroy()`；删除容器前销毁。可挂载多个实例，样式使用专属前缀，不修改目标页面的通用标签。重复挂载自动清理旧实例。

工作台通过公共 `delivery.js` 提供复制组件代码、下载 HTML 和复制提示词，异步读取前快照当前参数及主题。下载 HTML 内嵌效果、Inter、Caveat 字体和各自许可，可直接双击打开；复制代码同样不依赖网络或仓库路径。中文回退系统字体。Caveat 源自 Google Fonts 官方仓库，字体及 OFL 许可存于 `assets/fonts/caveat-variable.ttf`、`CAVEAT-OFL.txt`。工作台图标仅引用仓库 `assets/icons/`。

## 验证

仓库根目录运行 `node scripts/direction-aware-selection.test.cjs`，覆盖四边判定、选框收敛、闲置静止、多实例、取消、触屏不模拟悬停、减少动态效果、参数快照、内嵌资源和特殊文字安全导出。

浏览器复现：从根索引和组件索引分别选择“文字”，搜索 Direction 或 Evelyn，筛选 hover / press；经过封面文字后点击标题或封面文字进入详情。返回时应保留搜索及筛选。修改文字、字号、颜色、时长和尺寸开关，切换代码并复制、下载；内容应为当前参数。重置应恢复默认文字且保留主题、页签。390px 小屏检查主体居中、参数单列且无横向滚动。实际触屏硬件未验证，触屏输入语义和取消由运行时测试覆盖。
