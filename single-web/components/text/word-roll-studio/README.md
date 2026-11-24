# Word Roll · 单词滚动

分类：Components / text（文字）。参考用户提供的 DesignBookmark Word Roll 单页代码。

逐字向上滚动切换词组，保留独立字母弹簧、错峰、透明度和文字槽宽度弹簧。默认每 2400ms 自动循环轮换，点击、轻触或 Enter／空格可立即切换，手动切换后重新计算完整轮换间隔。索引封面在真实悬停期间循环轮换，移出暂停并复位。

在仓库根目录运行 `node scripts/serve.mjs`，访问 `http://127.0.0.1:4173/31Library/single-web/components/text/word-roll-studio/`。

页面提供前缀、词组、轮换间隔、字号、错峰、刚度和阻尼调节，复制组件代码、下载单文件 HTML 与复制提示词均使用当前配置。字体通过公共交付工具内嵌 Inter 及 OFL 许可，无外部运行库。

复用：放置 `.library-word-roll` 结构，引入 `word-roll.css` 与 `effect.js`，调用 `LibraryWordRoll.mount(root, config)`。返回 `next()`、`update(config)`、`reset()`、`play()`、`pause()`、`destroy()`；重置恢复当前配置首词，重置后继续按间隔轮换，暂停和销毁清理计时器，销毁还释放事件、观察器与动画帧。多实例独立，系统减少动态效果时直接切换。

默认参数：`prefix: 'Built for'`，`words: ['designers', 'founders', 'makers', 'teams']`，`interval: 2400` ms，`fontSize: 44` px，`stagger: 28` ms，`stiffness: 420` s⁻²，`damping: 26` s⁻¹。宽度弹簧固定为 320 / 30。每个词组最多 40 个字符、最多 12 组，支持中文与可用时的 Unicode 字素分段。

来源：https://designbookmark.com/motion#db-word-roll

失焦、页面隐藏或切到代码页签时暂停，恢复前台或返回预览后重新计时。`autoplay: false` 可让嵌入方手动调用 `play()` 启动。
