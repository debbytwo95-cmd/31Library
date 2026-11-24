# Blur Reveal · 模糊显现验证记录

分类：组件 / 文字。项目：single-web/components/text/blur-reveal-studio/。

## 自动检查

- `node scripts/sync-catalog.mjs --check`：退出状态 0，通过。
- `node scripts/catalog-structure.test.mjs`：退出状态 0，通过。
- `node scripts/check.mjs`：退出状态 0，通过。
- `node scripts/runtime.test.cjs`：退出状态 0，通过。
- `node --check single-web/components/text/blur-reveal-studio/effect.js`：退出状态 0，通过。
- `node --check single-web/components/text/blur-reveal-studio/app.js`：退出状态 0，通过。
- `node scripts/blur-reveal.test.cjs`：退出状态 0，通过。
- `node scripts/delivery.test.cjs`：退出状态 0，通过。
- `node scripts/prompt-copy.test.cjs`：退出状态 0，通过。
- `node scripts/design.test.cjs`：退出状态 0，通过。
- `node scripts/check.mjs http://127.0.0.1:4173/31Library/`：退出状态 0，通过。

## 浏览器验证

- 根入口 /31Library/index.html：切换文字分类，搜索 Blur Reveal，点击标题进入正确项目。
- 组件入口 /31Library/single-web/components/index.html：切换文字分类，搜索“模糊显现”，启用 hover 筛选，点击标题进入正确项目。
- 封面：浅色、无工具栏，指针进入空白区域启动显现；移出后 data-revealing=false；点击文字通过公共桥接进入详情。
- 返回：详情面包屑返回原入口，文字分类、搜索和 hover 筛选恢复。
- 刷新：详情正常，默认字号48px、单字400ms、间隔30ms、模糊8px。
- 动画：真实点击后观察到各字不同的 opacity 与 blur；Enter 与空格可以重新激活。
- 参数：编辑中英文混排文字，并改为49px、450ms、35ms、9px；预览不自动播放，复制代码和提示词均包含当前参数。
- 主题与重置：深色可用；代码页签中重置恢复默认参数并保留深色及代码页签。
- 交付：剪贴板实际写入成功；下载 HTML 含内嵌字体及许可，无外部资源标签；源码、提示词及页面使用与接入区无参考信息。
- 导出复用：将真实下载文件复制到 download.html，构造两个实例；本地 HTTP 中操作首实例得到 [true,false]，实例独立。
- 响应式：390×844 下英文按词换行，中文正常换行，参数单列；页面 scrollWidth=375、视口390，无横向溢出。最后已恢复浏览器默认视口。
- HTTP 检查：仓库子路径下15个项目、123个页面及本地资源均通过。

## 已知限制与已有问题

- 浏览器禁止 file:// 协议，因此未执行直接打开文件的浏览器检查；下载文件已通过 HTTP 验证，并检查无外部资源依赖。
- 未使用实体触屏设备；点击、键盘已在浏览器验证，减少动态效果、取消、失焦、多实例与销毁已在组件测试覆盖。
- 浏览器记录了一条公共原生页面过渡的 ViewTransition opt-in disabled 兼容性提示；导航和组件功能正常，本次未修改公共过渡逻辑。
- 额外 git diff --check 报告原有 single-web/components/button/copy-button-studio/index.html:84 尾随空格；该文件在开始前已修改，本次未动。新登记项的独立空白检查通过。

截图：desktop.jpg、mobile.jpg。
