const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const cssFiles = ['tokens.css','site.css','ui.css','catalog.css','lab-workbench.css','cover.css','site-motion.css'];
const sheets = cssFiles.map(name => fs.readFileSync('assets/' + name, 'utf8'));
const tokens = new Map([...sheets[0].matchAll(/(--library-[\w-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
function resolve(name, path = []) {
    assert.ok(!path.includes(name), 'Token cycle: ' + [...path,name].join(' -> '));
    assert.ok(tokens.has(name), 'Unknown foundation token: ' + name);
    return tokens.get(name).replace(/var\((--library-[\w-]+)\)/g, (_, ref) => resolve(ref, [...path,name]));
}
function luminance(hex) {
    const c = hex.replace('#','').match(/../g).map(value => parseInt(value,16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
function contrast(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }

test('public styles reference valid, defined tokens without foundation cycles', () => {
    const declared = new Set();
    for (const css of sheets) for (const match of css.matchAll(/(--library-[^:;{}()\s]+)\s*:/g)) {
        assert.match(match[1], /^--library-[a-z0-9-]+$/); declared.add(match[1]);
    }
    for (const css of sheets) for (const match of css.matchAll(/var\((--library-[\w-]+)/g)) assert.ok(declared.has(match[1]), 'Undefined token: ' + match[1]);
    for (const name of tokens.keys()) resolve(name);
});

test('feedback text meets the documented contrast target on its actual background', () => {
    const white=resolve('--library-bg-page');
    for(const state of ['danger','success','warning','info']) assert.ok(contrast(resolve('--library-status-'+state),white)>=4.5,state+' on white');
    for(const state of ['success','warning']) assert.ok(contrast(resolve('--library-status-'+state),resolve('--library-status-'+state+'-bg'))>=4.5,state+' on subtle background');
});

test('page motion follows tokens, stays within 800ms and honors reduced motion', async () => {
    const listeners={}, mediaListeners={}, animations=[];
    const media={matches:false,addEventListener:(name,fn)=>mediaListeners[name]=fn};
    let duration=resolve('--library-duration-content');
    const nodes=Array.from({length:12},()=>({animate(frames,options){let done;const animation={options,cancelled:false,finished:new Promise(resolve=>done=resolve),cancel(){this.cancelled=true;done();}};animations.push(animation);return animation;}}));
    const window={addEventListener:(name,fn)=>listeners[name]=fn};
    const context={window,document:{documentElement:{hasAttribute:()=>false,setAttribute(){}},querySelectorAll:()=>nodes},matchMedia:()=>media,getComputedStyle:()=>({getPropertyValue:name=>name==='--library-duration-content'?duration:resolve(name)}),requestAnimationFrame:fn=>fn()};
    vm.runInNewContext(fs.readFileSync('assets/site-motion.js','utf8'),context);
    window.LibraryMotion.updateCatalog(true);
    assert.ok(animations.every(a=>a.options.easing==='ease-in'&&a.options.duration===600&&a.options.duration+a.options.delay<=800));
    duration='700ms'; window.LibraryMotion.updateCatalog(true);
    assert.ok(animations.slice(12).every(a=>a.options.duration===700&&a.options.duration+a.options.delay<=800));
    media.matches=true; mediaListeners.change(); assert.ok(animations.every(a=>a.cancelled));
    window.LibraryMotion.updateCatalog(true); assert.equal(animations.length,24);
    media.matches=false;
    listeners.pagereveal({type:'pagereveal',viewTransition:{ready:Promise.reject(new Error('Native transition unavailable')),finished:Promise.resolve(),skipTransition(){}}});
    await Promise.resolve(); await Promise.resolve();
    assert.equal(animations.length,36,'a skipped native arrival falls back to normal site motion');
    await Promise.resolve();
});

test('reusable icon effect has its own variable namespace and no website token dependency', () => {
    const css=fs.readFileSync('single-web/components/icon-button-studio/button.css','utf8');
    assert.doesNotMatch(css,/var\(--library-/);
    for(const match of css.matchAll(/(--[a-z][\w-]*)/g)) assert.ok(match[1].startsWith('--icon-button-'),match[1]);
});

test('all live pages use shared header and footer placeholders without project overrides', () => {
    const window = {};
    vm.runInNewContext(fs.readFileSync('assets/catalog-data.js', 'utf8'), { window });
    const pages = ['index.html', 'single-web/components/index.html', ...window.LibraryCatalog.map(item => item.href)];
    for (const page of pages) {
        const html = fs.readFileSync(page, 'utf8');
        assert.equal((html.match(/<header class="library-header"><\/header>/g) || []).length, 1, page);
        assert.equal((html.match(/<footer class="library-footer"><\/footer>/g) || []).length, 1, page);
        assert.doesNotMatch(html, /class="(?:site-header|site-footer|header)"/, page);
        assert.match(html, /src="[^"\n]*assets\/site-shell\.js"/, page);
    }
    const ownStyles = ['assets/catalog.css', 'assets/ui.css', 'assets/lab-workbench.css',
        'single-web/components/magnetic-button-studio/styles.css', 'single-web/components/icon-button-studio/styles.css'];
    for (const file of ownStyles) {
        const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        assert.doesNotMatch(css, /(?:\.library-(?:header|footer)|\.site-footer)\b|(?:^|})\s*footer\s*\{/, file);
    }
});
