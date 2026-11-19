import { mountEarth } from './effect.js';
const root = document.querySelector('.library-earth');
const original = root.cloneNode(true).outerHTML;
const effect = mountEarth(root);
root.libraryComponent = effect;
// Kept for local inspection; state belongs to this instance.
window.globeStudy = effect;
mountLabWorkbench({
  id: 'connected-earth', title: 'Connected Earth', archive: true,
  readme: '# Connected Earth\n\n需要支持 WebGL 的现代浏览器。解压后在当前文件夹运行 node serve.cjs（需 Node.js），访问 http://localhost:8000。也可使用任何静态 HTTP 服务，不能直接用 file:// 打开 ES 模块。\n\nindex.html 是完整示例；component.html 是可嵌入片段，需同级 effect.js 与 assets/。CSS 限定 .library-earth，JS 支持多个独立实例；删除实例前调用 root.libraryComponent.destroy()。修改 effect.js 路径时同步其资源路径。\n\n依赖：Three.js 与 OrbitControls，随包附带 MIT 许可；地图为 Three.js 示例素材，沿用 assets/earth.jpg；Noto Sans SC 字体与 SIL OFL 许可位于 assets/，Inter 字体及许可内嵌在组件样式。视觉参考：https://www.connected.earth/ 。地点为演示数据，无音频。\n\n初始静止，点击播放才连续旋转；拖拽、方向键、地点按钮触发真实交互。\n',
  async bundle(includeFiles = false) {
    const snapshot = effect.getConfig();
    const [css, font] = await Promise.all([LibraryDelivery.read(new URL('effect.css', import.meta.url).href), LibraryDelivery.fontCSS(true)]);
    const resources = ['effect.js','assets/three.module.js','assets/three.core.js','assets/OrbitControls.js','assets/THREE-LICENSE.txt','assets/earth.jpg'];
    const files = {};
    if (includeFiles) {
      const values = await Promise.all(resources.map(path => LibraryDelivery.read(new URL(path, import.meta.url).href, true)));
      resources.forEach((path,i) => { files[path] = values[i]; });
      files['assets/noto-sans-sc-variable.ttf'] = await LibraryDelivery.read(new URL('../../../../assets/fonts/noto-sans-sc-variable.ttf', import.meta.url).href, true);
      files['assets/NOTO-OFL.txt'] = await LibraryDelivery.read(new URL('../../../../assets/fonts/OFL.txt', import.meta.url).href);
      files['serve.cjs'] = await LibraryDelivery.read(new URL('../../../../assets/example-server.cjs', import.meta.url).href);
    }
    return {
      html: original, css: font + '\n' + css.replace(/\bInter\b/g, 'LibraryButtonInter').replace(/"Noto Sans SC"/g, 'LibraryControlsSC'), module: true,
      js: 'import { mountEarth } from "./effect.js";\ndocument.querySelectorAll(".library-earth").forEach(root=>{root.libraryComponent?.destroy();root.libraryComponent=mountEarth(root,'+JSON.stringify(snapshot)+');});',
      files
    };
  },
  prompt() {
    return '实现 Connected Earth · 交互地球。使用随包 Three.js 与 OrbitControls ES 模块，保留 MIT 许可；assets/earth.jpg 采样大陆点阵。半径 6，相机距离 18，视野 45°，大陆采样间距 4 px、点大小 0.05、透明度 0.8，海洋采样步长 8°、点大小 0.06、透明度 0.15，颜色 #c8c3bc。当前旋转速度 '+effect.getConfig().idleSpeed+'，环绕周期基准 120000 ms。保持点阵、48 个地点标记、环绕卡片景深和地点关联弧线。初始静止，真实按钮点击后才连续旋转，鼠标或触屏拖拽探索；Tab 聚焦，Enter/空格激活，地球方向键旋转。重置恢复默认视角并暂停；prefers-reduced-motion 降低速度、抑制卡片缩放并立即完成视角切换。禁止自动演示和虚拟光标。地点是演示数据，不虚构音频播放。使用 HTTP 服务运行，依赖与地图本地提供；样式限定 .library-earth，多个实例独立，销毁时清理监听、动画、几何、材质和 renderer。不包含网站导航、搜索和工作台。精确效果以组件代码为准，按目标技术栈接入。';
  }
});
