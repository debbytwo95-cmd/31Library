# Orbit Gallery · 环绕画廊

以 Gionatan Nese 的 Creative Space 为参考的独立图片画廊工作台。

- 路径：`single-web/components/gallery/orbit-gallery-studio/index.html`
- 分类：组件 / 画廊
- 参考：https://www.gionatannese.com/?ref=minimal.gallery
- 无第三方运行库，不需要安装依赖或构建。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/components/gallery/orbit-gallery-studio/index.html`。

## 操作

鼠标移动产生球面视差，拖拽旋转，点击作品放大，点击空白/作品/关闭按钮或 Escape 返回。Tab 选择作品，Enter/空格打开，方向键旋转，Home 复位。取得焦点后滚轮旋转，其他时候不阻止页面滚动。触屏水平拖拽、轻触，保留纵向滚动；减少动态效果时关闭视差与过渡。

初始与闲置静止；操作后缓动收敛，移出收回临时视差，保留主动旋转角度。封面移出后回到初态。重置参数与临时状态，保留演示主题和预览/代码页签。

默认参数：18 张、展开 82%、作品宽 84px（桌面基准，小屏缩放）、纵深 42%、灵敏度 55%、聚焦 600ms。11 张静态作品图循环分配，不继承参考站视频、声音和闲置运动。参考站使用 WebGL，此实现采用 JavaScript 球面投影和 DOM 图像，视觉与互动机制按独立组件适配，不包含完整作品集网站。

## 交付与复用

复制组件代码、下载 HTML、复制提示词均使用当前参数。代码与示例内嵌同一图片和 Inter 字体及 SIL OFL 许可，可离线直接打开。把容器放入页面，引入样式/脚本后执行：

```js
const instance = LibraryOrbitGallery.mount(root, config, [
    { src: 'your-image.jpg', title: 'Your project', category: 'Photography' }
]);
instance.update({ size: 100 });
instance.reset(); // 重置交互姿态，不覆盖传入参数
instance.close();
instance.getConfig();
instance.destroy();
```

CSS 隔离在 `.library-orbit-gallery` 内，多个实例独立。重复挂载先清理旧实例；移除容器前 destroy 清理事件、ResizeObserver、pointer capture 和动画。基于现代浏览器的 ResizeObserver、Pointer Events 和 Web Animations API。

## 素材来源

`media/sources.json` 按 work-01 至 work-11 顺序记录原始图片地址和原始文件名。图片来自参考站公开作品，仅作复刻研究展示，原作者保留所有作品权利，不是素材的再许可；实际项目使用请替换为自有或已获许可图片。原图为静态作品内容，不作为界面图标使用。公共图标全部引用仓库 `assets/icons/` 的实际文件，不进入独立效果。导出附图片来源注释及字体许可。

## 验证

语法：`npm --prefix single-web/components/gallery/orbit-gallery-studio run check`。
行为：`node scripts/orbit-gallery.test.cjs`。
浏览器验证记录见 `verification/README.md`。
