# 验证记录

日期：2026-11-26。服务：仓库 `node scripts/serve.mjs`，端口 4173，仓库子路径 `/31Library/`。使用实际浏览器进行页面、鼠标和键盘验证。

## 两个索引入口

- 从 `/31Library/index.html` 选择“画廊”，搜索 `Orbit`，点击卡片标题进入正确详情。
- 详情面包屑返回根索引，恢复画廊分类与搜索词。
- 从 `/31Library/single-web/components/index.html` 选择“画廊”，搜索 `环绕`，选择 `drag` 筛选。
- 封面 iframe 使用正确组件路径和 `?cover=1`。指针进入时图像坐标改变；移出时回到默认位置，无闲置运动。封面只展示主体，无主题控件或操作标识。
- 激活封面作品后进入正确详情；从组件索引点击标题也进入详情。面包屑返回保留分类、搜索及筛选；刷新后正常显示。

## 详情与交付

- 鼠标点击作品、关闭按钮、Escape 和 Enter 聚焦/退出均验证。发现关闭按钮和主题控件重叠后移至左上，重新验证通过。
- 实际鼠标拖拽、已聚焦画廊的滚轮旋转、方向键旋转均改变图像坐标；松手后 dragging=false。
- 参数调整为 12 张、110px，预览数量、数值输出、代码和提示词一致。深色主题可用；在代码页签重置后参数恢复默认，保留主题和页签。
- “复制组件代码”完成后剪贴板约 1.4MB，包含 count=12、size=110、11 张 data URI 图片；代码面板内容与复制一致。
- 实际点击“下载示例”生成 HTML，下载文件在独立浏览器页面中显示 12 张图像，全部正常加载，无外部 script/link 依赖；作品可聚焦至约 336×450px 并关闭。
- 将下载内容放入宿主页面并创建两个画廊实例。旋转第一个时第二个坐标不变；宿主普通按钮仍为原生 2px 边框、Arial、static。销毁第一实例后数量为 0，第二实例仍为 12。验证临时 HTML 已清理。
- 390×844 视口验证详情布局、聚焦和关闭；文档 scrollWidth=375px，小于视口390px，无横向溢出，参数面板为单列。已恢复浏览器默认视口。
- 所有 18 张显示图像（11 张素材循环分配）加载成功；CSS、JavaScript、字体、公共图标及双索引路径通过仓库子路径 HTTP 检查。

## 自动检查

全部退出码 0：

1. `node scripts/sync-catalog.mjs --check`
2. `node scripts/catalog-structure.test.mjs`（3 项）
3. `node scripts/check.mjs`
4. `node scripts/runtime.test.cjs`（6 项）
5. `npm --prefix single-web/components/gallery/orbit-gallery-studio run check`
6. `node scripts/orbit-gallery.test.cjs`（6 项：静止/收敛、多实例、取消/焦点、滚轮、减少动态效果、生命周期、透视边界和交付快照）
7. `node scripts/delivery.test.cjs`（1 项）
8. `node scripts/prompt-copy.test.cjs`（5 项）
9. `node scripts/design.test.cjs`（6 项）
10. `node scripts/check.mjs http://127.0.0.1:4173/31Library/`（19 个项目、143 个页面与本地资源）

新行为测试首次运行遇到测试替身的文本节点类型错误，已修正并重新通过；未发现既有检查失败。浏览器记录到公共页面原生 ViewTransition 的 `opt-in disabled` 环境提示，页面正常使用现有回退，未发现本项目资源 404 或运行异常。

未用真实触屏硬件测试；触屏取消和减少动态效果由行为测试覆盖，不宣称完成真实设备或系统级设置切换验证。未对参考站 WebGL、视频材质、声音与案例页面作整站复刻；本次收录的是静态图片的独立画廊。
