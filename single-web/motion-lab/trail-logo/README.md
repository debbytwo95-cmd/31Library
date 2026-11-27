# Trail Logo · 拖尾标志

实验室 / WebGL2。31Library 图标与字标沿流动路径向画面深处挤出蓝色缎面拖尾，正面保持深色并带细亮边，叠加 “SECTION NN” 字形分区标注、景深模糊、辉光与胶片颗粒。视觉参考为 secondeight_ 发布的 Sixfold 标志动效视频（用户提供），标志替换为 31Library；实现是根据画面建立的模型，不代表原作者的技术实现。

## 运行

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/motion-lab/trail-logo/index.html`。页面需要通过 HTTP 打开，以便读取公共字体与交付资源。无 npm 依赖。

## 交互

- 初始停在静止构图（流动相位 1.6），不自动播放。
- “播放流动”开始连续流动，再次点击暂停；切到代码页签时暂停，重置回到静止构图并恢复默认参数。
- 鼠标在画面上移动会甩动拖尾，静止约 1 秒后收回；触屏按住拖动，松手或取消后收回，页面仍可纵向滚动。
- 索引封面在指针进入时播放，移出或窗口失焦后回到静止构图。
- 系统开启减少动态效果时，流动降为 0.3 倍速，指针拖拽降为 0.25 倍。
- 没有 WebGL2 时降级为 Canvas 2D 静态叠层。

## 实现

`effect.js` 中的 `mountTrailLogo(root, config)` 是预览、封面与导出的共同实现：

1. 画布排出图标（圆角方块，“31” 镂空）与字标，按亚像素透明度生成有符号距离场，上传为 R16F 纹理。
2. 路径由朝向平滑转动的运动体积分得到，按相位采样 256 点写入 RG32F 表；同一张纹理的第二行保存指针位移历史。
3. 第一遍着色器在深度方向按距离场下界步进，二分细化交点，用距离场梯度与路径切向合成侧壁法线并着色，输出颜色与深度。
4. 第二遍按深度做景深模糊（正面不模糊），叠加辉光与胶片颗粒。
5. 分区标注用独立 2D 画布按流动时间确定性绘制。

默认参数：文字 `31Library`、显示图标、颜色 `#5990df`、速度 1、长度 1、摆动 1、相位差 1、深度 1、光泽 1、辉光 1、景深 1、颗粒 0.08、指针 1、分区标注开启。

## 交付

工作台提供“复制组件代码”“下载示例”“复制提示词”，均使用当前参数。交付包含组件结构、隔离样式与原生 JavaScript，内嵌 Inter Semibold 及 SIL OFL 许可；分区标注使用系统等宽字体（工作台预览使用仓库内的 Cousine Bold）。下载的单文件 HTML 可直接打开，需要支持 WebGL2 的浏览器。

接入：放置 `.library-trail-logo` 结构，引入一次样式，在结构之后执行脚本。实例挂在 `root.libraryComponent`，提供 `update(config)`、`getConfig()`、`play(on)`、`isPlaying()`、`reset()`、`destroy()`；移除容器前调用 `destroy()` 清理事件、观察器、动画帧与 WebGL 资源。

## 检查

```bash
node --check single-web/motion-lab/trail-logo/effect.js
node --check single-web/motion-lab/trail-logo/app.js
node scripts/trail-logo.test.cjs
```
