# Fluid Glow · 流体光效

使用原生 Canvas 2D，将 18 根参数曲线、相位波动和离屏画布三层辉光合成为光带。视觉参考为 uiuxarih 视频研究；实现为近似模型，不推断原作者使用的技术。

在仓库根目录运行 `live-server`，进入实验室或访问 `http://127.0.0.1:8080/single-web/motion-lab/fluid-glow/index.html`。

- `index.html`：统一实验室详情与实际参数面板。
- `effect.js`：预览及交付共用的 Canvas 渲染器，提供 update/play/reset/getConfig/destroy。
- `light.js`：参数、重置和三种交付登记。
- `uiuxarih.mp4`、旧 `style.css` 及 `versions/`：原有参考资料，保留用于研究。

参数包含流速、交织、辉光、间距、弯曲、粗细模式、随机宽度、颜色与位移；重置恢复默认值并暂停。随机模式交付保留当前每根光线的宽度。初始静止，真实点击播放后运动；封面响应真实指针进入，移出恢复静态。

复制组件代码接入已有页面；下载 HTML 可直接打开，无外部依赖；提示词同步当前参数及约束。多个完整容器独立运行，删除前调用 `root.libraryComponent.destroy()` 清理观察器、播放事件和动画。

修改后运行仓库的资源及交互检查，并在浏览器检查绘制、键盘、触屏、减少动态效果及导出示例。
