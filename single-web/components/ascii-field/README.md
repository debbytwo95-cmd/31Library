# ASCII Field · 字符光场

参考 https://uibrik.com/components/ascii-field 的公开预览与属性说明（源码为付费内容，未参考）。使用原生 Canvas 2D，按画面与属性描述建立近似实现，不代表原作者代码。

在仓库根目录运行 `node scripts/serve.mjs`，进入“组件 → 背景”分类，或打开终端地址下的 `single-web/motion-lab/ascii-field/index.html`。按分类调整不改变稳定路径的约定，保留原页面地址。

- `index.html`：背景组件详情；演示区在上，参数面板在下（宽屏三列、中屏两列、窄屏单列），参数行由公共 property-controls 统一样式。沿用公共 lab-workbench 与 lab 封面尺寸样式，界面归属为组件。
- `effect.js`：预览、封面与交付共用的渲染器 `mountAsciiField(root, config)`，提供 `update`、`play`、`reset`、`getConfig`、`destroy`。
- `app.js`：参数同步、重置、封面唤起与三种交付登记。
- `styles.css`：仅工作台使用的样式。

参数沿用参考组件的属性：color / colors（多色）、pattern（flow、waves、rings）、characters、cellSize、scale、density、fade、glow、twinkle、speed、seed、animate、interactive、radius、magnify、wake、background。

按用户要求保存当前调节为默认值：行高 9px、形状尺度 0.4、辉光 0.53、闪烁 0.23、种子 28，漂移动画默认开启，其余参数保持当前值。真实指针移入显示透镜与拖尾、点击发出涟漪；关闭漂移后初始静止，重置恢复默认外观参数并暂停漂移；封面在指针移入时漂移，移出回到静止。静止透镜收敛、交互余波结束后停止逐帧绘制，离开视口或切到后台暂停。减少动态效果时不漂移、不发出涟漪。

触屏只在按住时显示透镜，并捕获当前触点；松手、取消、失焦后释放。纵向滑动仍可滚动页面。键盘聚焦光场后按 Enter / 空格，从中心发出涟漪，不模拟悬停。自定义背景开关及色板均同步至三种交付。

修改后运行 `node scripts/ascii-field.test.cjs`、`node --check` 与仓库检查脚本，并在浏览器核对三种形态、透镜、拖尾、点击涟漪、多色、窄屏布局与导出示例。专项检查覆盖默认参数、暂停时无循环、静止透镜收敛、余波衰减、触点释放、后台暂停、减少动态效果、多实例销毁，以及实际工作台参数的代码与提示词同步。
