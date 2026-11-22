# 31Library 命名规范

本规范用于新增项目、索引收录和资源命名，以现有组件的双语名称与 `-studio` 目录风格为基础。展示名称便于识别，项目标识便于检索和长期引用；具体后缀及目录规则属于本仓库约定。

## 1. 展示名称与项目标识

| 使用位置 | 格式 | 现有示例 |
| --- | --- | --- |
| 索引卡片标题 | `英文名称 · 中文名称` | `Magnetic Button · 磁吸按钮` |
| 详情页主标题 | 英文名称，实词首字母大写 | `Magnetic Button` |
| 浏览器标题 | `英文名称 — 31Library` | `Magnetic Button — 31Library` |
| 项目标识、目录名 | 小写英文，单词用短横线连接 | `magnetic-button-studio` |
| `package.json` 的 `name` | 与项目目录名一致 | `magnetic-button-studio` |

中文名称应直接描述特征和对象；英文名称优先采用通用 UI 术语。默认使用“主要特征 + 对象”，如 `Magnetic Button / 磁吸按钮`、`Flip Card / 翻转卡片`、`Particle Text / 粒子文字`。名称只保留最能区分项目的特征，其余写入说明和标签。

已有 `Icon Button · 扩散箭头按钮` 保留兼容名称。后续新增项目应让中英文表达同一核心含义，例如 `Ripple Button · 涟漪按钮`。仅含图标的按钮可称为 `Icon Button`；包含文字、箭头或图标的按钮，应优先根据其主要用途或效果命名。需要调整已有名称时，同时核对标题、索引和导出内容。

避免“高级按钮”“酷炫效果”“效果一”“新版”等含义不明确的名称，也不将作者名、框架、全部交互或实现细节堆入名称。参考来源单独记录。

## 2. 英文标识与后缀

标识采用 kebab-case：以小写英文字母开头，仅包含小写字母、数字和单个短横线，不含空格、中文或下划线。例如 `hold-to-confirm-button`；不使用 `Button_01`、`newButton`、`button-final`。

- 基础名称采用“特征或用途 + 对象”，如 `magnetic-button`、`sidebar-navigation`。通用对象名优先使用 `button`、`card`、`text`、`dialog`、`tooltip`、`carousel`，同一概念保持同一译法。
- 含参数调节、实时预览及代码复制或导出的组件工作台，使用 `<基础名称>-studio`，与现有两个按钮项目一致。
- 独立演示或实验直接使用基础名称，如 `particle-text`、`fluid-glow`；`studio` 不代表成熟度或版本号。
- 同一版块内标识必须唯一。目录名就是完整项目标识，包含适用的 `-studio` 后缀；展示标题通常省略该后缀。
- 标识被链接引用后保持稳定。颜色、圆角、速度、框架和发布日期通常不进入项目标识。

## 3. 版块、目录与分类

| 版块 | 目录约定 | 入口示例 |
| --- | --- | --- |
| 组件 Components | `single-web/components/<category>/<project>/` | `single-web/components/button/magnetic-button-studio/index.html` |
| 区块 Blocks | 新增时使用 `single-web/blocks/` | `single-web/blocks/sidebar-navigation/index.html`（规划示例） |
| 实验室 Motion Lab | `single-web/motion-lab/` | `single-web/motion-lab/fluid-glow/index.html` |

组件是按钮、卡片等独立 UI 单元；区块是导航、表单、页头等组合区域；实验室用于探索性视觉与交互效果。实验室沿用当前 `motion-lab` 路径，展示文案可使用“实验室”。

页面入口统一为 `index.html`；已有地球实验保留 `earth-replica/dist/index.html`。组件的第一层目录就是分类：`button`（按钮）、`background`（背景）、`label`（标签）、`text`（文字）。新项目放入对应分类目录；出现新分类时，先新建同名分类目录，再放入项目。分类目录名使用小写英文与短横线。交互和技术标签只记入项目信息，不增加目录层级。

分类与项目路径以实际文件夹为准。登记项目信息后运行 `node scripts/sync-catalog.mjs`，同步索引路径和分类清单；项目自带预览服务启动时也会自动同步。项目改变分类时保留标识，但同步修改目录、引用和入口。空分类通过 `.gitkeep` 保留。

## 4. 变体、状态与历史版本

同一组件的颜色、大小、圆角、主题和速度作为参数或变体管理。主要视觉结构、用途或交互机制明显不同，再建立独立项目，例如“磁吸按钮”和“长按确认按钮”。

变体与状态按维度命名，避免组合成冗长项目名：

| 维度 | 推荐名称 | 用法 |
| --- | --- | --- |
| 动效预设 | `default`、`soft`、`snappy` | 沿用现有预设键，中文标签可按效果描述 |
| 主题 | `light`、`dark` | 同一项目内切换 |
| 尺寸 | `small`、`medium`、`large` | 同一配置维度保持一致 |
| 状态 | `active`、`disabled`、`loading` | 按实际行为记录，勿与项目名称混用 |

修改历史交由 Git 管理，不为普通迭代新增 `v2`、`final`、`final-new` 等项目目录。索引默认展示当前可用版本；已有分析和历史资料保留原路径，确需并列收录的设计使用有意义的名称区分。

## 5. 文件、资源与代码命名

- 沿用现有文件职责：`index.html` 为入口，`app.js` 为组件交互，`shell.js` 为页面外壳交互，`styles.css` 为页面样式，`button.css` 为独立按钮样式。按实际需要拆分，不要求创建全部文件。
- 新增资源使用用途明确的 kebab-case 名称，如 `arrow-right.svg`、`earth-texture.jpg`、`cover.webp`。交互封面无需额外生成静态图。
- 保留工具固定名称，如 `README.md`、`AGENTS.md`、`NAMING.md`；第三方文件、许可证和已有哈希资源保持原名。
- JavaScript 变量与函数沿用 camelCase，如 `cornerRadius`、`wireButton`。新增 CSS 类和自定义属性使用小写短横线，如 `.preview-panel`、`--arrow-delay`，状态类可沿用 `.is-active`。
- 复杂组件可采用 BEM 的 `.component__part--variant` 区分主体、子元素与变体；同一组件保持一种风格，已有代码按所在文件约定维护。
- 独立效果的下载文件使用基础名称，如 `magnetic-button.html`；仅导出效果时不附加工作台后缀。

## 6. 收录信息与改名流程

新增项目应记录：中英文名称、项目标识、所属版块、内容分类、实际支持的交互、技术标签、简短说明；参考来源和关联项目按需补充。项目信息在 `assets/catalog-data.js` 维护；`assets/catalog-categories.js` 根据分类文件夹生成，不再在页面脚本中维护固定分类列表。

改名前先检查同版块是否重名，再同步核对目录、`package.json`、索引链接、页面标题、资源引用、README 和复制或导出的内容。路径变化时处理旧入口，检查仓库子路径下的相对链接。展示文案调整通常无需改变稳定标识。

本次更新替换原命名说明，现有项目的实际改名需按上述流程单独实施。

## 参考依据

- [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction)：参考常见 UI 对象术语，如 Dialog、Tooltip、Slider。
- [npm 包命名指南](https://docs.npmjs.com/package-name-guidelines/)：参考名称应清晰、唯一且不含大写字母的原则；本仓库进一步统一使用 kebab-case。
- [BEM 命名约定](https://getbem.com/naming/)：参考主体、子元素与修饰符的区分方式，用于可选的 CSS 组织。
