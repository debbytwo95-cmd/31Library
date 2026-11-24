# Scrubber · 数值拖动滑块

参考 [SmoothUI Scrubber](https://smoothui.dev/docs/components/scrubber)（Edu Calvo）及其[官方组件源码](https://smoothui.dev/r/scrubber.json)，使用原生 HTML、CSS、JavaScript 重建。

保留 36px 高、8px 圆角、填充、内部等距刻度、实时数值与弹性手柄。按 31Library 规范使用浅色默认主题与 Inter 数值字体。原版 React、Motion、Tailwind 的运行依赖在此由独立样式和弹簧积分实现替代；弹簧参数近似原版 0.25s、bounce 0.1 的反馈，未使用原版运行库。

## 本地运行

在仓库根目录运行：

```powershell
npm --prefix single-web/components/slider/scrubber-studio run dev
npm --prefix single-web/components/slider/scrubber-studio run check
```

访问 `http://127.0.0.1:4176/31Library/single-web/components/slider/scrubber-studio/index.html`。工作台需 HTTP 以读取交付资源；下载的 `scrubber.html` 自包含，可直接打开。

## 复用

复制组件代码中的 HTML、CSS 和 JavaScript。仅导出组件，不包含导航、参数面板或封面逻辑。下载内嵌字体及 OFL 许可。

初始化 `LibraryScrubber.mount(root, config)`；同一实例只挂载一次，重新初始化前调用 `destroy()`。

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `label` | `Value` | 可见标签和可访问名称，空值回退为 Value |
| `value` | `0.5` | 初始值，按范围与步长规整 |
| `min / max` | `0 / 1` | 有限数值，max 须大于 min |
| `step` | `0.01` | 正数，以 min 为起点吸附；两端始终可达 |
| `decimals` | `2` | 显示小数位，0–6；不改变实际值精度 |
| `ticks` | `9` | 内部等距刻度数，0–50；0 隐藏 |
| `width` | `320` | px，160–800；最大不超过父容器 |
| `onValueChange` | — | 值实际改变时回调 `(value) => {}` |

实例接口：`value` 读取当前值；`config` 返回参数快照；`setValue(value, notify = true)` 改值并可触发回调；`update(config)` 静默更新参数；`settle()` 清理临时状态并停稳；`reset()` 恢复挂载时参数；`destroy()` 取消动画、指针捕获和事件监听。`data-appearance="light|dark"` 控制组件主题。

支持鼠标、触笔、触屏拖动；方向键、Home、End；ARIA slider。触屏不模拟悬停。取消、失焦、后台均清理临时状态。尊重减少动态效果，无自动演示，动画停稳后停止帧循环。多个实例独立运行。

## 验证

- 索引搜索 Scrubber，筛选“滑块”和“拖拽”，封面可真实操作，移出复位。
- 拖动到边缘，方向键、Home/End；手动设置范围 -2 至 2、步长 0.1，验证负数与小数步长。
- 改名称、范围、步长、小数位、刻度和宽度，确认预览、代码、提示词和下载一致。
- 无效范围显示说明并保留上一组有效参数；修正后恢复更新。
- 重置保留主题与页签；触屏取消和失焦不残留拖拽。
- 在现有页面放入两个实例，单独操作、重置和销毁。
- 相关回归：`node scripts/scrubber.test.cjs`；仓库检查按 `MAINTENANCE.md` 执行。
