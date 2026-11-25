# 字体资源

`caveat-variable.ttf` 来自 [Google Fonts 官方 Caveat 目录](https://github.com/google/fonts/tree/main/ofl/caveat)，400–700 可变字重，仅用于 Direction Aware Selection 中的手写文字标注；不改变公共 UI 字体。许可为 `CAVEAT-OFL.txt`，复制代码与下载示例内嵌同一字体及许可。

`inter-variable.woff2` 来自 [Inter 官方仓库](https://github.com/rsms/inter/blob/master/docs/font-files/InterVariable.woff2)，保留完整 100–900 字重轴，仅供 Weight Wave 等需要连续字重的效果使用，不改变公共 UI 字重映射。许可为 `INTER-OFL.txt`；字重波浪交付内嵌字体及许可，可离线使用。

`noto-sans-sc-variable.ttf` 为本机已安装的 Noto Sans SC 可变字体原文件，用于完整中文覆盖；公共界面仅使用 400、500、700 三档字重。字体内嵌版权为 Adobe，保留字体名称 Source，内嵌授权声明为 SIL Open Font License 1.1。授权文本见 `OFL.txt`。

Inter 与 Cousine 的公共字体文件统一存放在本目录，通过 `assets/fonts.css` 引用，不再依赖某个组件目录或外部字体服务。Inter 仅使用 400、600 字形，500–700 的英文强调请求统一映射到 Semibold；中文由 Noto Sans SC 单独匹配。

Inter 的许可文本见 `INTER-OFL.txt`，版权说明核对自 Inter 项目的官方许可。按钮示例内嵌 Inter Semibold 和许可；地球示例同时嵌入 Inter Regular / Semibold，并在源码包中提供完整 Noto Sans SC 与 `OFL.txt`。这些交付不会引用本机安装字体的绝对路径。
