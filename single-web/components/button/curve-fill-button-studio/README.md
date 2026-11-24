# Curve Fill Button · 曲线填充按钮

参考 https://annnimate.com/api/sandbox/iframe/curve-fill-button 。沿用四向最近边缘判断、八组 SVG 二次贝塞尔路径、500ms / power3.out 默认节奏；默认悬停填充为 #525252，暗色演示区使用白底黑字，悬停后白字，字体按 31Library 规范使用 Inter Semibold。

在仓库根目录运行 `npm --prefix single-web/components/button/curve-fill-button-studio run dev`，打开终端显示的地址。无需安装依赖。工作台使用仓库共用导航、字体、布局、封面和交付脚本。

- 只响应真实鼠标、键盘与触屏输入，默认静止。
- 可调时长、圆角、方向、缓动和颜色；预设只调整节奏。
- 重置清除临时状态并恢复默认参数，保留主题与页签。
- 复制代码、下载单文件 HTML、复制提示词均同步当前参数。
- GSAP 3.15.0 本地提供，保留发行头部和许可链接；导出内嵌 GSAP、Inter 字体和字体许可。
- `effect.js` 为预览、封面和导出的同一交互实现。实例提供 `update(config)`、`reset()`、`destroy()`；组件专属类名支持多实例独立运行。

运行 `npm --prefix single-web/components/button/curve-fill-button-studio run check` 与仓库检查脚本。手动核对四向进入/离开、快速划过、Tab/Enter/空格、触屏取消、失焦、减少动态效果、参数、导出和窄屏布局。
