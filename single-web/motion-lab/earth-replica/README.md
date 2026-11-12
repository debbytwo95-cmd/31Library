# Connected Earth 地球效果复刻

以 https://www.connected.earth/ 的头部地球为参考，独立编写的静态实现。

- Three.js 透明点阵球体：大陆纹理采样、稀疏海洋点阵、彩色地点标记。
- 与参考一致的球体、相机、点大小、透明度和入场减速参数。
- 环绕卡片、远近透明度与景深模糊、悬停联动、地点连线。
- 支持拖动旋转、暂停、重新播放、仅看地球、移动端和减少动态效果偏好。
- 地点与卡片数据为本地演示数据，不连接原网站的录音数据库。
- 依赖与地球纹理均已保存在 `dist/assets`，运行不需要外部 CDN。

## 本地运行

安装 Node.js 后，在本目录运行 `node serve.cjs`，打开终端显示的本地网址。
不要直接双击 `dist/index.html`，浏览器会限制 file 协议下的 ES 模块加载。

## 文件

`dist/globe.js`：地球、采样、镜头、交互与环绕动画；文件顶部 `config` 为视觉参数。
`dist/style.css`：头部构图、背景、入场、景深与响应式。
`dist/index.html`：独立页面。

Three.js 与 OrbitControls 使用 MIT License，详见 `dist/assets/THREE-LICENSE.txt`。地球纹理来自 Three.js 示例资源。

验证限制：参考页面源代码与资源已核对；当前环境的浏览器观察及截图工具不可用，未完成逐帧视觉比对。
