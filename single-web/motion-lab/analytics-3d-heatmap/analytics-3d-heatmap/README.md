# Analytics · Tasks shipped 3D

一个 Analytics 仪表盘页面。点击「Tasks shipped」卡片会滑出右侧抽屉，里面是用 three.js 绘制的 3D 热力柱状图，可以在 3D 和平面 Grid 之间带动画切换。

## 目录结构

```
analytics-3d-heatmap/
├── index.html           页面结构（侧边栏、仪表盘、抽屉）
├── css/style.css        全部样式（颜色、缓动等集中在 :root 变量里）
├── js/main.js           数据、图表、交互、three.js 3D 热力图
├── single-file/
│   └── index.html       同样的内容合并成一个文件，双击就能打开
├── package.json         可选：本地静态服务器脚本
└── README.md
```

## 运行

页面通过 importmap 从 jsDelivr CDN 加载 three.js（r160），运行时需要联网。

- **最简单：** 直接用浏览器打开 `single-file/index.html`。
- **多文件版本：** `js/main.js` 是 ES module，浏览器不允许从 `file://` 加载，需要起一个本地服务器：

  ```bash
  npx serve .          # 或者 npm run dev
  # 或
  python3 -m http.server 5173
  ```

  然后访问 http://localhost:5173 。

## 交互

| 操作 | 效果 |
|---|---|
| 鼠标移到收入曲线上 | 提示框和标记点跟随移动 |
| 鼠标移到小热力图的点上 | 显示当天的任务数 |
| 点击「Tasks shipped」卡片 | 抽屉滑出，3D 柱子依次长出 |
| 悬停 3D 柱子 | 柱子变黑，弹出详情框（项目拆分、参与人数） |
| 在 3D 视图里拖动 / 双击 | 旋转视角 / 恢复默认角度 |
| 点击 3D / Grid | 柱子压平、镜头转成俯视（或反向播放） |
| 点关闭按钮、按 Esc、点抽屉外 | 关闭抽屉 |

## 常改的参数（js/main.js）

- `VIEWS`：两种视图的镜头参数
  - `az`：水平旋转角度（度）
  - `el`：俯仰角度（度）。Grid 视图是 89.9，也就是正俯视
  - `ppu`：每个世界单位对应多少像素，相当于缩放
  - `tx` / `ty` / `tz`：镜头对准的中心点，用来上下左右挪动画面
- `BAR_MAX`：最高那根柱子的高度
- `Heatmap3D.setMode()` / `intro()`：切换和入场动画的时长、延迟
- 数据部分（`V` 数组）：现在是随机生成的示例数据，替换成真实数据即可；`level()` 决定颜色分档

颜色在 `css/style.css` 顶部的 `:root` 里（`--or` 是主橙色，`--l0`…`--l4` 是热力分档），JS 里的 `LV` 数组需要同步修改。

## 离线使用

如果需要完全离线，下载 three.js 的 `three.module.js`（0.160.0）放到 `js/vendor/`，再把 `index.html` 里 importmap 的地址改成 `./js/vendor/three.module.js`。
