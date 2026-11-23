# 仓库贡献指南

## 项目结构与模块组织

31Library 是一个静态 UI 组件与动效实验资源库。

- `index.html` 和 `single-web/components/index.html` 是索引入口；`assets/catalog.js` 和 `assets/catalog.css` 提供共用交互与样式。
- `single-web/components/<category>/<project>/` 按分类目录存放独立组件工作台（新分类建立新目录），包含项目专用脚本、样式等资源；图标统一从仓库根目录的 `assets/icons/` 调用。
- `single-web/motion-lab/` 存放动效实验。地球实验的可部署文件位于 `earth-replica/dist/`；流体光效项目包含分析资料和历史参考。
- `NAMING.md` 定义命名与组织规范。`test.html` 是占位页面，不是测试套件。

## 构建、测试与开发命令

静态托管无需构建。在仓库根目录按需运行：

```powershell
live-server
npm --prefix single-web/components/button/magnetic-button-studio run dev
npm --prefix single-web/components/button/icon-button-studio run dev
npm --prefix single-web/components/button/magnetic-button-studio run check
npm --prefix single-web/components/button/icon-button-studio run check
node single-web/motion-lab/earth-replica/serve.cjs
```

`live-server` 用于预览整个资源库，需单独安装；也可运行无需依赖的 `node scripts/serve.mjs`。组件工作台命令需要 Node.js，无需安装项目依赖：`dev` 启动本地服务，`check` 检查项目及共用脚本语法。各本地服务以仓库为根目录，并显示对应项目的入口地址，以便访问共用资源。包含 ES 模块的页面应通过 HTTP 访问。

## 代码风格与命名规范

遵循所在文件的格式：索引 HTML 使用两空格缩进，共用 CSS 使用四空格，紧凑 JavaScript 的格式随文件而异。避免无关的格式调整。目前未配置格式化或代码风格检查工具。

遵循 `NAMING.md`：索引标题使用“英文名称 · 中文名称”，稳定标识使用小写英文和短横线；组件工作台目录使用 `-studio` 后缀，如 `magnetic-button-studio`。页面入口统一为 `index.html`，资源名称应说明用途。同一效果的变体在项目内部管理，修改历史由 Git 管理。路径变更时同步更新索引和相关链接；保留相对 URL，以兼容 GitHub Pages 仓库子路径。

## 测试与验证要求

目前未配置外部测试框架或覆盖率门槛。运行相关语法检查、`node scripts/check.mjs` 和 `node scripts/runtime.test.cjs`，并手动验证索引导航、搜索、筛选、响应式布局、指针与键盘交互、参数控制，以及代码、提示词和下载示例。检查流程见 `MAINTENANCE.md`；脚本不能替代浏览器排版或 WebGL 验证。修复问题时附上复现与验证步骤。

## 交互、动效与封面规则

预览、复制代码和导出文件默认只响应真实用户操作。除非用户明确要求，不添加自动演示、虚拟光标、闲置循环或模拟输入；即使参考文档或原始组件自带，也不默认继承。保留用户主动触发的磁吸、弹簧、回弹和点击反馈。

索引界面默认采用浅色样式，组件封面使用浅色演示区的主体内容，不显示四角标识、主题图标和提示。鼠标移入或经过封面时唤起真实交互，移出后回到静止状态。封面悬停时不添加投影，保留组件自身由真实操作触发的交互反馈。

## 图标资源规则

所有版块、公共界面、组件封面、详情页及组件自身使用的图标，统一从 `G:\31Library\assets\icons`（仓库相对路径 `assets/icons/`）调用。使用相对 URL，按页面或样式文件的位置计算路径，兼容 GitHub Pages 仓库子路径，不将本机绝对路径写入网页代码。

需要的图标在目录中不存在时，图标位置保持空白，等待用户后续补充；不自行绘制，不使用其他图标库、Emoji、Unicode 符号、CSS 图形或临时 SVG 替代，也不引用不存在的文件。保留必要的布局空间、文字说明及控件的可访问名称，不显示破图或占位符号。具体规则见 `DESIGN.md` 的“图标”一节。

## 提交与拉取请求规范

现有提交历史混用简短中英文描述，偶尔使用 `update(scope):` 前缀，尚未强制统一格式。提交信息应清楚说明改动，每次提交聚焦一个主题。拉取请求应说明行为变化、关联相关问题、列出已执行的检查；涉及视觉变化时附上截图或录屏。
