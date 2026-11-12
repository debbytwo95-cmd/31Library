const fs=require('node:fs');
let html=fs.readFileSync('outputs/ai-brand-signals-spring.html','utf8');
const definitions=[
  {key:'tiktok',name:'TikTok',color:'#f7f9fa',icon:'#ffffff',opacity:.78,scale:1.035,top:.035,offset:0,layers:[{color:'#25F4EE',dx:-.17,dy:-.18,opacity:.95,width:1},{color:'#FE2C55',dx:.17,dy:.18,opacity:.95,width:1},{color:'#ffffff',dx:0,dy:0,opacity:.9,width:.70}]},
  {key:'x',name:'X',color:'#111111',icon:'#111111',opacity:.79,scale:1.01,top:.04,offset:0},
  {key:'instagram',name:'Instagram',color:'#fff6eb',icon:'#ffffff',opacity:.84,scale:.98,top:.035,offset:0}
];
for(const brand of definitions){
  const svg=fs.readFileSync(`work/social-logo-paths/${brand.key}.svg`,'utf8');
  if(!svg.includes('viewBox="0 0 24 24"'))throw new Error('Unexpected viewBox: '+brand.name);
  brand.path=[...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]).join(' ');
  if(!brand.path)throw new Error('Missing path: '+brand.name);
  brand.fillRule=svg.includes('fill-rule="evenodd"')?'evenodd':'nonzero';
}
const start=html.indexOf('  // Vector outlines:'),end=html.indexOf('  // One temporary raster');
if(start<0||end<0)throw new Error('Missing brand block');
const brands=Object.fromEntries(definitions.map(({key,...brand})=>[key,brand]));
html=html.slice(0,start)+'  // Vector outlines: Simple Icons, https://github.com/simple-icons/simple-icons\n  const BRANDS = '+JSON.stringify(brands,null,2)+';\n\n'+html.slice(end);
for(const [oldKey,oldName,brand]of [['grok','Grok',definitions[0]],['claude','Claude',definitions[1]],['chatgpt','ChatGPT',definitions[2]]]){
  html=html.replaceAll(`card ${oldKey}`,`card ${brand.key}`).replaceAll(`data-brand="${oldKey}"`,`data-brand="${brand.key}"`).replaceAll(`data-source="${oldKey}"`,`data-source="${brand.key}"`).replaceAll(oldName,brand.name);
}
html=html.replace(/  \.grok \{[^\n]+\}/,'  .tiktok { --bg:linear-gradient(155deg,#080b0e 0%,#101418 100%); --fg:#f7f9fa; --sub:#a9bac0; --rule:#3d474d; }');
html=html.replace(/  \.claude \{[^\n]+\}/,'  .x { --bg:linear-gradient(155deg,#fafafa 0%,#e7e7e7 100%); --fg:#111111; --sub:#747474; --rule:#bdbdbd; }');
html=html.replace(/  \.chatgpt \{[^\n]+\}/,'  .instagram { --bg:radial-gradient(circle at 8% 105%,#ffda79 0%,#f99b49 22%,#ef4866 46%,transparent 68%),linear-gradient(145deg,#5356da 0%,#9b39b8 42%,#d83184 78%,#ef4866 100%); --fg:#fff9f2; --sub:#ffe1e5; --rule:#ffffff66; }');
html=html.replace('01 / GROK','01 / TIKTOK').replace('02 / CLAUDE','02 / X').replace('03 / GPT','03 / INSTAGRAM');
const captions=['Make every beat move.','What’s happening?','Capture the everyday.'];let index=0;
html=html.replace(/<h2 class="tagline">[\s\S]*?<\/h2>/g,()=>'<h2 class="tagline">'+captions[index++]+'</h2>');
html=html.replace(/SVG 路径只在初始化时栅格化一次，[\s\S]*?大小 Logo 都由竖线组成。/,'SVG 路径只在初始化时栅格化一次，采样为 56 × 112 的亮度表。TikTok 的音符、X 的交叉字形和 Instagram 的相机轮廓，均由竖线呈现。TikTok 的青红叠色同样由竖线分层绘制。');
const iconStart=html.indexOf('    drawIcon() {'),iconEnd=html.indexOf('    draw(time,dt) {',iconStart);
html=html.slice(0,iconStart)+fs.readFileSync('work/social-draw-icon.js','utf8')+html.slice(iconEnd);
const strokeStart=html.indexOf('      ctx.strokeStyle=this.brand.color;\n      for(let level=0;level<4;level++){');
const strokeEnd=html.indexOf('      ctx.globalAlpha=1;this.drawRain(time);',strokeStart);
if(strokeStart<0||strokeEnd<0)throw new Error('Missing strand render block');
html=html.slice(0,strokeStart)+`      // Each color layer shares the same four-weight field and spring offsets.
      const layers=this.brand.layers||[{color:this.brand.color,dx:0,dy:0,opacity:1,width:1}];
      for(const layer of layers){
        ctx.strokeStyle=layer.color;
        const dx=layer.dx*cw,dy=layer.dy*ch;
        for(let level=0;level<4;level++){
          ctx.globalAlpha=this.brand.opacity*layer.opacity*(level===0?.62:level===1?.8:1);
          ctx.lineWidth=weights[level]*layer.width;ctx.lineCap=level<2?'butt':'round';ctx.beginPath();
          const points=buckets[level];
          for(let i=0;i<points.length;i+=3){ctx.moveTo(points[i]+dx,points[i+1]+dy);ctx.lineTo(points[i]+dx,points[i+2]+dy);}
          ctx.stroke();
        }
      }
`+html.slice(strokeEnd);
html=html.replace('      for(let i=0;i<18;i++){','      for(let i=0;i<18;i++){\n        if(this.brand.layers)ctx.strokeStyle=this.brand.layers[i%2].color;');
fs.writeFileSync('outputs/social-brand-signals-spring.html',html);
console.log('Created outputs/social-brand-signals-spring.html ('+Buffer.byteLength(html)+' bytes)');
