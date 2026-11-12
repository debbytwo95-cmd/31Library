const fs=require('node:fs');
let html=fs.readFileSync('outputs/brand-signals.html','utf8');
const definitions=[
  {key:'grok',source:'grok',name:'Grok',color:'#e4e8ec',icon:'#ffffff',highlight:'#ffffff',detection:'#168fff',detectionText:'#ffffff',opacity:.69,scale:1.055,top:.035,offset:0,minDensity:.36,tagline:'A different angle.<br>A curious mind.<br>A new perspective.'},
  {key:'claude',source:'claude',name:'Claude',color:'#ffdfc9',icon:'#fff4e8',highlight:'#fff5ec',detection:'#ffdf00',detectionText:'#422419',opacity:.71,scale:1.015,top:.035,offset:0,minDensity:.30,tagline:'Room for thought.<br>Space for nuance.<br>Ideas taking shape.'},
  {key:'chatgpt',source:'openai',name:'ChatGPT',color:'#b9ebdc',icon:'#f3fff8',highlight:'#f3fff8',detection:'#ffffff',detectionText:'#143e34',opacity:.72,scale:1.045,top:.035,offset:0,minDensity:.34,tagline:'Start a conversation.<br>Follow an idea.<br>See where it leads.'}
];
for(const brand of definitions){
  const svg=fs.readFileSync(`work/ai-logo-paths/${brand.source}.svg`,'utf8');
  if(!svg.includes('viewBox="0 0 24 24"'))throw new Error('Unexpected viewBox: '+brand.name);
  brand.path=[...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]).join(' ');
  if(!brand.path)throw new Error('No vector path: '+brand.name);
  brand.fillRule=svg.includes('fill-rule="evenodd"')?'evenodd':'nonzero';
}
const brands=Object.fromEntries(definitions.map(({key,source,tagline,...brand})=>[key,brand]));
const start=html.indexOf('  const BRANDS = {'),end=html.indexOf('  // One temporary raster');
html=html.slice(0,start)+'  // Vector outlines: Lobe Icons (MIT), https://github.com/lobehub/lobe-icons\n  const BRANDS = '+JSON.stringify(brands,null,2)+';\n\n'+html.slice(end);
const swaps=[['apple','Apple',definitions[0]],['google','Google',definitions[1]],['tesla','Tesla',definitions[2]]];
for(const [oldKey,oldName,brand]of swaps){
  html=html.replaceAll(`card ${oldKey}`,`card ${brand.key}`).replaceAll(`data-brand="${oldKey}"`,`data-brand="${brand.key}"`).replaceAll(`data-source="${oldKey}"`,`data-source="${brand.key}"`).replaceAll(oldName,brand.name);
}
html=html.replace('.apple { --bg:linear-gradient(165deg,#f6f6f6 0%,#e5e5e5 100%); --fg:#171717; }','.grok { --bg:linear-gradient(155deg,#111316 0%,#20252b 100%); --fg:#f6f7f8; }');
html=html.replace('.google { --bg:linear-gradient(180deg,#10184c 0%,#1c3890 52%,#2d60ef 100%); --fg:#fff; }','.claude { --bg:linear-gradient(165deg,#8a432f 0%,#ba6d4c 58%,#cf8a64 100%); --fg:#fff7ef; }');
html=html.replace('.tesla { --bg:linear-gradient(160deg,#121212,#171112); --fg:#f7f7f7; }','.chatgpt { --bg:linear-gradient(160deg,#10392f 0%,#145345 60%,#1b6a56 100%); --fg:#effff5; }');
let taglineIndex=0;html=html.replace(/<h2 class="tagline">[\s\S]*?<\/h2>/g,()=>'<h2 class="tagline">'+definitions[taglineIndex++].tagline+'</h2>');
html=html.replace('ctx.fill(new Path2D(brand.path));',"ctx.fill(new Path2D(brand.path),brand.fillRule);");
html=html.replace('const w=7+Math.floor(hash(x+this.index*19,y+7)*6),h=8+Math.floor(hash(y,x+8)*9);','const w=4+Math.floor(hash(x+this.index*19,y+7)*5),h=6+Math.floor(hash(y,x+8)*7);');
html=html.replace('if(mean<.56)continue;','if(mean<this.brand.minDensity)continue;');
html=html.replace('))*.65)>15;', '))*.65)>11;');
// Keep selection separation explicit if the formatting of the original changes.
html=html.replace('((b.y+b.h/2)-(p.y+p.h/2))*.65)>15;', '((b.y+b.h/2)-(p.y+p.h/2))*.65)>11;');
html=html.replace('  <path fill="white" d="${brand.path}" />','  <path fill="white" fill-rule="${brand.fillRule}" d="${brand.path}" />');
html=html.replace('屏幕上看到的 Logo，包括左上角的小图标，都由竖线组成。','Grok 的斜切环、Claude 的放射线和 ChatGPT 的镂空结形，均保留各自的轮廓与负形。屏幕上的大小 Logo 都由竖线组成。');
// This is an independent deliverable; all previous versions remain intact.
fs.writeFileSync('outputs/ai-brand-signals.html',html);
console.log('Created outputs/ai-brand-signals.html ('+Buffer.byteLength(html)+' bytes)');
