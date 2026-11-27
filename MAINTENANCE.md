# 新增与维护清单

执行依据为 [STANDARDS.md](./STANDARDS.md)、[DESIGN.md](./DESIGN.md) 与 [NAMING.md](./NAMING.md)。状态反馈及完整响应式规则仍待后续补充。

每次让 AI 复刻效果时，可复制[效果复刻指令模板](./REPLICATION.md)，其中包含登记、同步索引、双入口跳转及仓库子路径验证要求。

## 新增项目

1. 判断属于组件、区块或实验室，确定稳定英文标识；同结构的参数变化保留在项目内部。
2. 组件放在 `single-web/components/<分类>/<项目>/`；新分类先建立分类目录。当前分类为 `button`、`background`、`slider`、`tabs`、`text`，空分类保留 `.gitkeep`。在项目内建立入口 `index.html`、独立交互实现和必要资源；预览与导出调用同一实现。
3. 在 `assets/catalog-data.js` 登记项目名称、实际交互和技术标签、简介、来源及初始封面高度，再运行 `node scripts/sync-catalog.mjs`，按文件夹同步路径、分类及 `assets/catalog-categories.js`；新分类可在生成清单中补充中文展示名，下一次同步会保留。项目自带预览服务启动时自动同步。无法确认的来源如实标记。
4. 通过 `assets/cover.js`、`assets/cover.css` 与 `assets/site-shell.js` 接入封面、公共导航和页脚。页面仅保留 `.library-header`、`.library-footer` 占位，公共外框样式统一引用 `assets/site.css`，不在项目内另写导航或页脚间距。封面只保留主体，真实操作触发，移出后静止。
5. 通过 `assets/delivery.js` 登记交付：`bundle()` 在异步读取资源前取得当前参数，返回组件结构、隔离样式和初始化逻辑；`prompt()` 描述同一组参数、单位、依赖和操作约束。下载为源码包时，`bundle(true)` 同时返回必要文件及许可。
6. 详情页说明输入能力、依赖、最少接入步骤，以及 `reset()`、`destroy()` 等实际提供的操作；没有可调参数时不增加空面板。
7. 参数区使用 `.settings` 与关联原生输入的 `label`；通过公共外框自动加载 `assets/property-controls.css`、`assets/property-controls.js`，统一滑块、开关、下拉、文本和颜色属性样式，不在项目内另写参数控件外观。程序修改滑块值时同步原有 `--progress`，或提供 `input` / `change` 及预设、重置入口，使公共进度同步。
8. 背景分类使用 `data-category="background"`；公共外框会按 URL 中的分类目录同步标记。背景铺满圆角预览面板，外层浅灰模块仍保留 20px 留白。
9. 公用工作台基础样式放在 `assets/workbench-base.css`，字体与图标放在 `assets/fonts/`、`assets/icons/`。项目只维护自身效果和必要的布局差异，不从其他项目目录借用公共样式或字体。

10. 所有图标均从仓库根目录的 `assets/icons/` 选取实际存在且含义匹配的资源，并使用相对 URL。需要的图标缺失时留空，等待用户补充；不自行绘制，不使用其他图标库、Emoji、Unicode 符号、CSS 图形或临时 SVG 替代，不创建不存在的资源引用。保留必要布局空间、文字及可访问名称；复制代码与下载示例同步遵循此规则，详见 `DESIGN.md` 的“图标”一节。

## 修改、改名与删除

- 修改效果：同时核对默认值、封面、详情预览、复制代码、示例与提示词。公共实现修改后检查所有调用项目。
- 改名或迁移：同步登记、浏览器标题、详情标题、交付名称、资源引用和说明；迁移路径时处理旧入口。
- 删除：清理索引与关联入口，再核对资源使用者，不能删除其他项目仍在使用的字体、图标或脚本。
- 普通迭代由 Git 保存；需要并列收录的不同设计使用有意义的名称。

## 发布前检查

```powershell
npm --prefix single-web/components/button/magnetic-button-studio run check
npm --prefix single-web/components/button/icon-button-studio run check
npm --prefix single-web/components/button/curve-fill-button-studio run check
npm --prefix single-web/components/slider/scrubber-studio run check
node scripts/sync-catalog.mjs --check
node scripts/catalog-structure.test.mjs
node scripts/check.mjs
node scripts/runtime.test.cjs
node scripts/tab-pill.test.cjs
node scripts/word-roll.test.cjs
node scripts/pixel-word-swap.test.cjs
node scripts/weight-wave.test.cjs
node scripts/scrubber.test.cjs
node scripts/delivery.test.cjs
node scripts/prompt-copy.test.cjs
node scripts/curve-fill.test.cjs
node scripts/ascii-field.test.cjs
node scripts/design.test.cjs
```

检查仓库子路径时，另开终端在仓库根目录运行 `live-server --port=8181 --no-browser --mount=/31Library:.`，再运行 `node scripts/check.mjs http://127.0.0.1:8181/31Library/`。核对真实地址及资源状态，避免依赖域名根路径。

浏览器手动检查：

- 图标来源统一为 `assets/icons/`，相对路径有效；缺失图标保持空白，无替代图标、破图或占位符号，控件文字、可访问名称与功能保留；导出中的实际图标资源可用。

- 索引搜索、筛选、封面跳转、返回后的筛选与滚动恢复。
- 封面与详情初始参数一致，无自动演示；组件自身的真实反馈保留。
- 鼠标、键盘、触屏、取消、失焦及系统减少动态效果；重置保留演示主题与页签。
- 调整一组明显不同的参数，检查代码、示例和提示词；按钮与光效 HTML 直接打开，地球源码包解压后运行 `node serve.cjs`。
- 将复制代码放入已有页面并创建两个实例，确认样式隔离、独立操作及销毁后无残留事件或动画。
- 宽屏、小屏、字体和内容留白正常；需要 WebGL 的项目检查实际加载与交互。
- 列表和各详情页的导航、页脚左右对齐，字体和内边距一致；短页与长页切换不因滚动条出现而横向跳动。

脚本检查覆盖登记、链接、部分交互状态及交付逻辑；不覆盖浏览器排版、真实设备输入或 WebGL 画面。
