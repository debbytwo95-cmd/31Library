# 验收记录

## 后续更新：闲置自动播放

按用户后续要求，封面、详情及交付共用实现现已默认开启自动扫动：余弦周期为 4600ms，指针进入时接管，离开后从当前波峰平滑恢复。后台、失焦、代码页签暂停；重置暂停，真实操作或返回预览后恢复。减少动态效果时不自动扫动。可传 `autoplay:false` 关闭，也可调用 `play()` / `pause()`。

此次重新执行四项必跑检查、项目语法及 HTTP 子路径检查，均通过；`weight-wave.test.cjs` 现为 6 项，新增自动扫动、指针接管与恢复、暂停及生命周期检查。浏览器在没有鼠标经过时多次读取字母样式，确认封面和详情的字重波峰持续移动；实际操作鼠标后可接管，移开后恢复。切至代码页签时字母回到基础字重，返回预览后继续。交付代码中确认 `autoplay:true` 及对应扫动实现。新截图为 `autoplay.jpg`。

## 首次验收（以下为开启自动播放前的记录）

2026-11-24，在 `node scripts/serve.mjs` 的 `http://127.0.0.1:4173/31Library/` 下完成。

## 自动检查

- `node scripts/sync-catalog.mjs`：完成登记及目录同步，文字分类沿用 `text / 文字`。
- 按顺序执行 `sync-catalog.mjs --check`、`catalog-structure.test.mjs`、`check.mjs`、`runtime.test.cjs`：全部通过。
- `node scripts/check.mjs http://127.0.0.1:4173/31Library/`：13 个项目、113 个页面及本地资源通过，无 404。
- `npm --prefix single-web/components/text/weight-wave-studio run check`：两个项目脚本语法通过。
- `node scripts/weight-wave.test.cjs`：4 项通过，覆盖初始静止、波峰与回弹、停帧、触摸接触与取消、键盘、参数、重置、缩放重测、失焦、销毁、多实例和减少动态效果。
- `node --test scripts/delivery.test.cjs scripts/prompt-copy.test.cjs scripts/design.test.cjs scripts/word-roll.test.cjs`：17 项通过。
- 新增项目的下载 HTML 中脚本通过 `vm.Script` 编译；字体已内嵌，修改后的文字、96px 字号、40% 波峰参数均在交付中。

## 浏览器实际验证

1. 从 `/31Library/index.html` 打开文字分类，搜索“字重”，勾选 hover，列表只显示新增项目；真实指针经过封面时各字母出现不同字重，离开后全部回到 300。点击卡片信息区进入正确详情；返回恢复搜索和筛选。
2. 从 `/31Library/single-web/components/index.html` 打开文字分类，搜索“weight”，点击封面文字进入同一详情；返回和刷新后仍保留文字分类、搜索词及正确项目地址。两个入口沿用共用目录数据和原有 base，没有另写卡片。
3. 详情刷新后资源及可变字体正常；真实指针移动和键盘操作产生波峰。修改文字为 `Move with weight`、字号为 96px、宽度为 40%，实际点击复制代码、复制提示词和下载按钮，核对剪贴板及下载内容与当前参数一致。交付无工作台外框，也没有仓库相对路径残留。
4. 切换深色主题和代码页签后点击重置：参数回到默认值，主题与代码页签保留，代码内容同步默认参数和深色外观。
5. 将实际下载的 HTML 放入临时验证页面，并添加第二实例；浏览器正常加载，两个实例显示当前文字。对第一实例按 Home 后第一实例形成波峰，第二实例保持 300；Escape 复位。导出页面没有控制台错误，验证后已清理临时页面。
6. 在 390×844 的浏览器视口检查详情预览、参数、说明和交付区域。无横向溢出，文字居中且完整，参数单列排列，主题按钮和交付按钮正常可见。截图为 `desktop.jpg`、`mobile.jpg`，只用于验收，不作为索引封面。

## 验证边界与已有状态

- 未使用实体触屏设备；触屏接触、松手和取消，以及减少动态效果分支由运行测试覆盖。未在浏览器中切换操作系统的减少动态效果设置。
- 下载文件已通过 HTTP 在浏览器运行，并检查自包含资源；没有另行在断网环境或 `file://` 下验收。
- 浏览器曾报告原生 View Transition 的 `opt-in disabled / Transition was aborted`，页面使用公共入场回退后正常显示，未修改公共过渡实现。
- 全仓 `git diff --check` 发现开始任务前已修改的 `single-web/components/button/copy-button-studio/index.html:84` 有行尾空白。保留该已有改动；本次没有修改该文件。
- 开始任务前的 DESIGN.md、MAINTENANCE.md、catalog-data.js、ui.css、Copy Button、Word Roll 项目和测试等工作均保留。
