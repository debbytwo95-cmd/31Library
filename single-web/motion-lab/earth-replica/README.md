# Connected Earth · 交互地球

以 https://www.connected.earth/ 的地球视觉为参考，使用本地 Three.js、OrbitControls 与地图采样构建点阵大陆、地点标记、关联弧线和环绕卡片。地点为本地演示数据，不连接原网站的录音数据库。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/motion-lab/earth-replica/dist/index.html`。公共导航与字体按仓库路径加载；ES 模块需要 HTTP，不能直接双击页面。

- `dist/index.html`：实验室详情，包含公共介绍、预览／代码页签、交付和使用说明；没有参数时不显示下方空面板。
- `dist/effect.js`、`dist/effect.css`：容器隔离的地球实现，预览与交付共用。
- `dist/globe.js`：工作台初始化与交付登记；旧 `dist/style.css` 保留为构图参考，不再加载。
- `dist/assets/`：Three.js、OrbitControls、MIT 许可及 Three.js 示例地图资源。

初始静止，真实点击“开始旋转”后连续运动；支持鼠标或触屏拖拽、地点按钮和键盘方向键旋转。重置恢复默认视角并暂停。减少动态效果时降低速度、减弱卡片缩放并立即完成视角切换。

提供复制组件代码、下载示例和复制提示词。下载为 ZIP，包含运行示例、组件片段、提示词、`effect.js`、所有必要资源与许可、`serve.cjs`。解压后运行 `node serve.cjs`，访问 http://127.0.0.1:8000 。

复制代码前，从源码包将 `effect.js` 与 `assets/` 放到接入页同级，或调整对应导入路径。Inter 字体与许可内嵌在样式，中文 Noto Sans SC 字体和许可随源码包提供。多个 `.library-earth` 容器各自初始化；移除前调用 `root.libraryComponent.destroy()` 清理事件、动画和 WebGL 资源。

修改后检查登记与子路径资源，以及实际 WebGL 加载、拖拽、键盘与源码包解压运行。脚本检查不能代替浏览器视觉验证。
