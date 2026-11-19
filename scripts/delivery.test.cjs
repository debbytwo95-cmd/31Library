const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('earth archive includes current code, local dependencies, fonts, licenses and startup script', async t => {
    const base = 'http://library.test/31Library/';
    const directory = 'single-web/motion-lab/earth-replica/dist/';
    const document = { currentScript: { src: base + 'assets/delivery.js' } }, window = {};
    const context = vm.createContext({ document,window,URL,Blob,TextEncoder,btoa,fetch:async url=>{
        const filename=decodeURIComponent(new URL(url).pathname.replace('/31Library/',''));
        const data=fs.readFileSync(filename);
        return {ok:true,text:async()=>data.toString('utf8'),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
    }});
    vm.runInContext(fs.readFileSync('assets/delivery.js','utf8'),context);
    context.LibraryDelivery=window.LibraryDelivery;
    const html=fs.readFileSync(directory+'index.html','utf8');
    const begin=html.indexOf('<div class="library-earth">'), end=html.indexOf('</div></div>\n          <div class="code-panel"',begin);
    assert.ok(begin>0&&end>begin);
    const markup=html.slice(begin,end);
    const root={cloneNode:()=>({outerHTML:markup})}; document.querySelector=()=>root;
    let options;
    context.mountEarth=()=>({getConfig:()=>({idleSpeed:1.25})});
    context.mountLabWorkbench=value=>{options=value;};
    const code=fs.readFileSync(directory+'globe.js','utf8').replace(/^import[^\n]+\n/,'').replaceAll('import.meta.url',JSON.stringify(base+directory+'globe.js'));
    vm.runInContext(code,context);
    const light=await options.bundle(); assert.equal(Object.keys(light.files).length,0);
    const bundle=await options.bundle(true);
    assert.match(bundle.js,/"idleSpeed":1.25/); assert.match(options.prompt(),/1.25/);
    assert.doesNotMatch(bundle.html,/library-header|main-shell|id="/);
    assert.match(bundle.css,/LibraryControlsSC/); assert.match(bundle.css,/data:font\/ttf;base64/);
    for(const key of ['effect.js','assets/three.module.js','assets/three.core.js','assets/OrbitControls.js','assets/THREE-LICENSE.txt','assets/earth.jpg','assets/noto-sans-sc-variable.ttf','assets/NOTO-OFL.txt','serve.cjs']) assert.ok(bundle.files[key],key);
    const decoder=new TextDecoder();
    assert.match(decoder.decode(bundle.files['assets/OrbitControls.js']),/from '\.\/three.module.js'/);
    assert.match(decoder.decode(bundle.files['effect.js']),/from '\.\/assets\/three.module.js'/);
    const files={'index.html':window.LibraryDelivery.example(bundle,options.title),'component.html':window.LibraryDelivery.snippet(bundle),'README.md':options.readme,'prompt.txt':options.prompt(),...bundle.files};
    const zip=window.LibraryDelivery.zip(files), data=new Uint8Array(await zip.arrayBuffer()), view=new DataView(data.buffer);
    let offset=0,count=0;
    while(view.getUint32(offset,true)===0x04034b50){
        const size=view.getUint32(offset+18,true),nameSize=view.getUint16(offset+26,true),extraSize=view.getUint16(offset+28,true);
        const name=decoder.decode(data.slice(offset+30,offset+30+nameSize)); assert.ok(files[name],name);
        const start=offset+30+nameSize+extraSize;
        const expected=typeof files[name]==='string'?new TextEncoder().encode(files[name]):new Uint8Array(files[name]);
        assert.equal(size,expected.length); assert.deepEqual(data.slice(start,start+size),expected); offset=start+size;count++;
    }
    assert.equal(count,Object.keys(files).length); assert.equal(view.getUint32(offset,true),0x02014b50);
    assert.equal(view.getUint32(data.length-6,true),offset);
    t.diagnostic(`${count} files, ${data.length} bytes; binary payloads preserved.`);
});
