# 新增与维护清单

执行依据为 [STANDARDS.md](./STANDARDS.md)、[DESIGN.md](./DESIGN.md) 与 [NAMING.md](./NAMING.md)。状态反馈及完整响应式规则仍待后续补充。

## 新增项目

1. 判断属于组件、区块或实验室，确定稳定英文标识；同结构的参数变化保留在项目内部。
2. 建立入口 `index.html`、独立交互实现和必要资源。工作台样式与可复用效果样式分开；预览与导出调用同一实现。
3. 在 `assets/catalog-data.js` 登记名称、路径、分类、实际交互和技术标签、简介、必要来源及初始封面高度。无法确认的来源如实标记，不能猜测作者或技术。
4. 通过 `assets/cover.js`、`assets/cover.css` 与 `assets/site-shell.js` 接入封面和公共导航。封面只保留主体，真实操作触发，移出后静止。
5. 通过 `assets/delivery.js` 登记交付：`bundle()` 在异步读取资源前取得当前参数，返回组件结构、隔离样式和初始化逻辑；`prompt()` 描述同一组参数、单位、依赖和操作约束。下载为源码包时，`bundle(true)` 同时返回必要文件及许可。
6. 详情页说明输入能力、依赖、最少接入步骤，以及 `reset()`、`destroy()` 等实际提供的操作；没有可调参数时不增加空面板。

## 修改、改名与删除

- 修改效果：同时核对默认值、封面、详情预览、复制代码、示例与提示词。公共实现修改后检查所有调用项目。
- 改名或迁移：同步登记、浏览器标题、详情标题、交付名称、资源引用和说明；迁移路径时处理旧入口。
- 删除：清理索引与关联入口，再核对资源使用者，不能删除其他项目仍在使用的字体、图标或脚本。
- 普通迭代由 Git 保存；需要并列收录的不同设计使用有意义的名称。

## 发布前检查

```powershell
npm --prefix single-web/components/magnetic-button-studio run check
npm --prefix single-web/components/icon-button-studio run check
node scripts/check.mjs
node scripts/runtime.test.cjs
node scripts/delivery.test.cjs
```

启动 `node scripts/serve.mjs` 后，运行 `node scripts/check.mjs http://127.0.0.1:4173/31Library/`。核对真实地址及资源状态，避免依赖域名根路径。

浏览器手动检查：

- 索引搜索、筛选、封面跳转、返回后的筛选与滚动恢复。
- 封面与详情初始参数一致，无自动演示；组件自身的真实反馈保留。
- 鼠标、键盘、触屏、取消、失焦及系统减少动态效果；重置保留演示主题与页签。
- 调整一组明显不同的参数，检查代码、示例和提示词；按钮与光效 HTML 直接打开，地球源码包解压后运行 `node serve.cjs`。
- 将复制代码放入已有页面并创建两个实例，确认样式隔离、独立操作及销毁后无残留事件或动画。
- 宽屏、小屏、字体和内容留白正常；需要 WebGL 的项目检查实际加载与交互。

脚本检查覆盖登记、链接、部分交互状态及交付逻辑；不覆盖浏览器排版、真实设备输入或 WebGL 画面。
