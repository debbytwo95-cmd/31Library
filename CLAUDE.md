# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 工作方式（必须遵守）

- 在云端克隆的仓库副本里修改，在新分支上提交并推送，然后开 Pull Request 给用户审查。
- 不要直接合并 PR，也不要直接推送到 `master`；用户审查确认后再合并。
- 本地预览统一使用 `live-server`（在仓库根目录运行）。

## 项目概况

31Library 是纯静态的个人 UI 组件与动效实验资源库，部署在 GitHub Pages 的仓库子路径（https://debbytwo95-cmd.github.io/31Library/）。没有构建步骤、没有 npm 依赖、没有打包器，页面直接加载原生 JS/CSS。所有链接必须用相对 URL，不能依赖域名根路径。

规范文档是权威依据，改动前按需阅读：`STANDARDS.md`（网站规范总览）、`DESIGN.md`（视觉、token、图标）、`NAMING.md`（命名与改名流程）、`MAINTENANCE.md`（新增/修改/删除清单与完整发布前检查）、`AGENTS.md`（贡献指南）。复刻新效果按 `REPLICATION.md` 的流程执行。

## 常用命令

全部在仓库根目录运行（测试脚本用相对路径读文件，必须从根目录执行）：

```powershell
live-server                                     # 预览，http://127.0.0.1:8080/，按仓库路径访问各项目
live-server --port=8181 --no-browser --mount=/31Library:.   # 模拟 Pages 子路径
node scripts/check.mjs http://127.0.0.1:8181/31Library/      # 子路径下逐个请求所有资源

node scripts/sync-catalog.mjs                   # 按组件目录同步 catalog-data.js 路径/分类并生成 catalog-categories.js
node scripts/sync-catalog.mjs --check           # 只检查是否已同步
node scripts/check.mjs                          # 校验登记数据及所有页面引用的本地资源存在
node scripts/<name>.test.cjs                    # 各组件/公共模块测试，如 runtime、delivery、design、prompt-copy
npm --prefix single-web/components/<分类>/<项目> run check   # 有 package.json 的工作台做 node --check 语法检查
```

测试基于 `node:test`，每个文件独立运行；运行单个用例：`node --test --test-name-pattern="magnetic instances" scripts/runtime.test.cjs`。测试用 `vm` 加 DOM 桩加载浏览器脚本，不覆盖真实排版、触屏或 WebGL，视觉改动必须在浏览器中验证。`scripts/design.test.cjs` 检查公共 token 引用、状态色对比度、页面动效时长和组件变量隔离。

## 架构要点

**目录即分类。** 组件位于 `single-web/components/<分类>/<项目>/`（如 `button/magnetic-button-studio/`），分类由文件夹决定。`assets/catalog-data.js`（`window.LibraryCatalog`）只手写项目元数据（id、section、title、interactions、technologies、description、source、keywords、previewHeight）；`href` 和 `category` 由 `sync-catalog.mjs` 根据目录回写，`assets/catalog-categories.js` 是生成文件，不要手改（新分类的中文名可在生成清单中补充，同步时会保留）。新增项目要先在 catalog-data 登记再同步（未登记的目录会让同步报错），迁移、删除后同样要运行同步。`motion-lab/` 下的实验和区块不走目录分类，直接在 catalog-data 登记。

**索引与封面。** `index.html` 与 `single-web/components/index.html` 通过 `assets/catalog.js` 渲染分类、筛选、搜索和瀑布流卡片。卡片封面是对项目 `href` 加 `?cover=1` 的 iframe：详情页里的 `assets/cover.js` 识别后给 `<html>` 加 `data-cover`，页面切换为只显示组件主体；`assets/site-shell.js` 在封面模式下用 `postMessage`（`library:cover-size`、`library:cover-open`）回传高度和点击。

**公共外框。** 非封面模式下 `site-shell.js` 注入公共导航（替换 `.library-header` 占位）和页脚，按 URL 中的分类目录给 `.workspace` 设置 `data-category`，并自动加载 `assets/property-controls.{css,js}` 统一参数控件外观（滑块、开关、下拉、颜色等）。项目内不另写导航、页脚或参数控件样式。公共样式分层：`assets/tokens.css`（基础与语义 token）→ `assets/ui.css`（公共控件）→ `assets/site.css`（外框）→ `assets/workbench-base.css`（工作台基础）；组件自身配色、尺寸与动效参数独立管理，不引用其他项目目录的样式或字体。文字类工作台共用 `assets/studio-controls.js`。

**预览与导出共用同一实现。** 每个效果以 `mount(root, config)` 形式实现（如 `assets/button-runtime.js`、各项目的 `effect.js`），每次挂载自带状态，用 `AbortController` 管理事件，提供 `reset()`、`destroy()`（导出后挂在 `root.libraryComponent`），支持同页多个独立实例。工作台 `app.js` 负责参数面板并调用 `LibraryDelivery.register({ bundle, prompt, ... })`（`assets/delivery.js`）提供“复制组件代码 / 下载示例 / 复制提示词”。`bundle()` 必须在异步读取资源前取得当前参数；按钮与光效导出单文件 HTML（字体内联），地球导出含 Three.js、字体、许可和 `serve.cjs` 的 ZIP。修改公共实现后要检查所有调用项目。

## 必须遵守的规则

- **只响应真实操作**：预览、复制代码和导出文件不加自动演示、虚拟光标、闲置循环或模拟输入，即使参考原件自带也不继承（用户明确要求的除外）。保留用户触发的磁吸、弹簧、回弹和点击反馈。
- **封面**：索引默认浅色；封面只显示组件主体，不显示四角标识、主题图标和提示；鼠标移入唤起真实交互，移出回到静止；悬停不加投影。
- **详情页演示区**：不显示 LIVE PLAYGROUND 标识、底部操作提示、播放速度按钮及面板外的技术说明和英文标语；主题切换在右上角，主体居中，说明放在页面下方的原理与使用说明区。
- **图标**：只使用 `assets/icons/` 中实际存在且含义匹配的文件（相对 URL）。缺失时留空等待用户补充，不自绘，不用其他图标库、Emoji、Unicode 符号、CSS 图形或临时 SVG 替代，也不引用不存在的文件。
- 支持 `prefers-reduced-motion`、触屏、键盘、取消和失焦；`source` 来源无法确认时如实标注，不猜测。

## 风格与命名

- 沿用所在文件格式：索引 HTML 两空格缩进，共用 CSS 四空格，JS 格式随文件而异；不做无关格式调整，未配置格式化工具。
- 索引标题用“英文名称 · 中文名称”；id 与目录名一致，小写短横线；工作台目录带 `-studio` 后缀，入口统一 `index.html`。同一效果的变体在项目内部管理。
- 提交信息清楚说明改动、一次聚焦一个主题，现有历史常用 `chore:`、`refactor:`、`update(scope):` 前缀。PR 说明行为变化和已执行的检查，视觉改动附截图。
