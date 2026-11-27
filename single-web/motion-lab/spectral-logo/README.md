# Spectral Logo · 光谱字标

实验室中的 31Library 蓝色体积光字标。参考用户提供的 secondeight 视频（1080×1080，10.1 秒），以代码近似重建镂空字面、波动拖影与细线追踪框。没有使用视频贴图，也没有复制参考中的品牌图形。

在仓库根目录运行 `live-server`，访问 `http://127.0.0.1:8080/single-web/motion-lab/spectral-logo/index.html`。

- 原生 WebGL + Canvas 2D，无第三方运行依赖。字形距离场仅在字体就绪及文字变化时重建，56 层光体积由片元着色器合成。
- 初始静止；真实悬停播放、移出复位；点击或 Enter／空格锁定播放，再次点击暂停。触屏使用轻触。失焦、取消、隐藏和切换代码时停止。
- 调整文字、拖影深度、波动、辉光、流速、颜色和追踪框。浅色封面和深色详情共用同一实现。主题仅改变预览区。
- 复制代码、下载单文件 HTML、复制提示词同步当前参数。HTML 内嵌仓库 Inter 字体及 OFL 许可，可离线打开。
- `mountSpectralLogo(root, config)` 返回 `getConfig()`、`update(config)`、`play(boolean)`、`clear()`、`reset()`、`destroy()`，同时挂载到 `root.libraryComponent`。每个容器包含 `.spectral-surface` 与 `.spectral-tracking` 两个 canvas。
- `reset()` 恢复默认、暂停并保留主题；`destroy()` 移除监听、ResizeObserver、动画及 WebGL 资源。多实例互不影响。
- 减少动态效果时不启动持续动画，保留参数与静态短拖影。WebGL 不可用时回退为静态文字；浏览器 WebGL 上下文恢复时重新建立资源。
