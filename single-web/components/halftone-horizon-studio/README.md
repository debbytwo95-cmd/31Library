# Halftone Horizon · 半调地平线

依据 [uibrik 公开预览](https://uibrik.com/components/halftone-horizon)独立编写的视觉复刻。原站组件源码受 Pro 权限保护，此实现未使用其源码；画面和交互为近似复刻。

直接打开 `index.html` 进入完整工作台，打开 `halftone-horizon.html` 查看无依赖的单文件示例。也可在本目录运行 `npm run dev`，访问 http://127.0.0.1:4176/ 。无需安装依赖，预览服务需要 Node.js。

- 黑色、橙色与暖白的弧形半调网点，固定胶片颗粒。色板采用连续切线插值，末端柔和融入暖白，减轻分段色带。
- 网点透镜直接跟随指针，指针经过深色位置时同样显出放大的主色圆点，按局部亮度判断并兼容四个方向，移出后恢复暗部；独立柔光稍后跟随，`follow` 控制迟滞。柔光与拖尾沿局部渐变色板着色，暗部为橙红、亮部为浅桃色，保留网点反差。
- 拖尾沿真实移动路径形成连续的细小网点笔迹，按年龄缩小、收窄并淡出；时间采样保留完整时长，快速移动也不会只剩最后几个圆形光斑。拖尾与透镜独立，调整时长也会更新已有笔迹。
- 四向渐变、单色与六色渐变、16 项数值参数，预览随容器宽度自适应。
- 真实指针触发透镜、拖尾；点击或聚焦后按 Enter／空格触发涟漪。
- 触屏按住移动，释放、取消、失焦后复位；支持纵向页面滚动。
- 首次可见时播放一次 2.4 秒入场：暖白底 → 暗部与网点展开 → 静止。支持入场时长、起始深度和“重播入场”；时长 0 关闭。索引封面保持静止，减少动态效果时跳过入场并关闭拖尾与涟漪。
- 复制组件代码、复制提示词和下载示例均同步当前参数，导出不含工作台界面。
- 原生 WebGL，无第三方运行依赖；没有 WebGL 时降级为静态 CSS 渐变。

`effect.js` 是自包含渲染器；`app.js` 管理参数和交付；`styles.css` 只定义工作台布局。`assets/` 是现有 31Library 公共外框与字体的本地副本，用于独立运行；字体许可随资源保留。

复制代码后，把完整容器、隔离样式和初始化脚本放入页面。每个容器独立挂载到 `root.libraryComponent`，可调用 `getConfig()`、`update({...})`、`replayIntro()`、`reset()` 和 `destroy()`。移除组件前调用 `destroy()` 清理事件、观察器、动画帧与 WebGL 资源。

已接入 `G:/31Library/single-web/components/halftone-horizon-studio/`，登记于 `G:/31Library/assets/catalog-data.js`，分类为“组件 / 背景”。在资源库运行 `node scripts/serve.mjs` 后访问 http://127.0.0.1:4173/31Library/single-web/components/halftone-horizon-studio/index.html 。

运行 `npm run check` 检查语法并验证静止初态、交互收敛、触屏取消、多实例销毁、减少动态效果、WebGL 回退和单文件默认值。浏览器检查了 WebGL 画面、参数切换、代码／提示词复制和示例下载。
