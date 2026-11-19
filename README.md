# 使用介绍

## 本地预览

安装 Node.js 后，在仓库根目录运行 `node scripts/serve.mjs`，打开终端显示的地址。无需安装项目依赖，也可继续使用 `live-server`。

组件工作台仍可分别运行 `npm --prefix single-web/components/magnetic-button-studio run dev` 或 `npm --prefix single-web/components/icon-button-studio run dev`；服务同时提供仓库共用字体、脚本和样式。

## 当前交付

- 五个项目均提供“复制组件代码”“下载示例”“复制提示词”，同步当前参数。
- 三个按钮与流体光效下载为单文件 HTML；地球下载为包含 Three.js、地图、字体、许可和本地服务脚本的 ZIP 源码包。
- Curve Fill Button 保留 Annnimate 的方向感知曲线填充，默认 500ms / power3.out，工作台遵循 31Library 视觉规范。
- 按钮、光效与地球的预览和交付共用交互实现。组件代码限定自身容器，支持多个独立实例；移除前调用 `root.libraryComponent.destroy()`。
- 索引登记集中在 `assets/catalog-data.js`，封面继续使用详情页中的真实组件。

## 检查与维护

运行 `node scripts/check.mjs` 检查项目登记及本地资源，运行 `node scripts/runtime.test.cjs` 检查交互、参数交付与实例清理，运行 `node scripts/delivery.test.cjs` 核对地球源码包、依赖、字体和 ZIP 数据。服务启动后可运行 `node scripts/check.mjs http://127.0.0.1:4173/31Library/` 检查子路径访问。

新增、修改、改名和删除步骤见 [维护清单](./MAINTENANCE.md)。这些检查不能代替浏览器中的视觉、触屏和 WebGL 验证。

## 项目规范

- [网站规范](./STANDARDS.md)：八类规范总览，含内容分类、交互、代码交付、提示词及新增维护流程。
- [设计规范](./DESIGN.md)：公共视觉、字体、颜色、导航、瀑布流封面、标签和详情页布局。
- [命名规范](./NAMING.md)：展示名称、项目标识、目录、变体与资源命名，以及改名流程。
- [仓库贡献指南](./AGENTS.md)：开发命令、代码风格、验证要求与交互规则。
