  capture=true;advance(0,1);capture=false;
  const colors=[['#111316','#20252b'],['#8a432f','#cf8a64'],['#10392f','#1b6a56']];
  const taglines=[['A different angle.','A curious mind.','A new perspective.'],['Room for thought.','Space for nuance.','Ideas taking shape.'],['Start a conversation.','Follow an idea.','See where it leads.']];
  let defs='',body='';
  for(let i=0;i<3;i++){
    const b=Object.values(brands)[i];
    defs+=`<linearGradient id="bg${i}" x2=".3" y2="1"><stop stop-color="${colors[i][0]}"/><stop offset="1" stop-color="${colors[i][1]}"/></linearGradient>`;
    body+=`<svg x="${128+i*562}" y="180" width="540" height="720" viewBox="0 0 540 720"><rect width="540" height="720" fill="url(#bg${i})"/>${cards[i].art.ctx.nodes.join('')}<g transform="translate(63,64)">${cards[i].icon.ctx.nodes.join('')}</g><text x="110" y="96" font-family="Arial" font-size="32" font-weight="600" letter-spacing="-1.4" fill="${b.icon}">${b.name}</text>`;
    for(let j=0;j<3;j++)body+=`<text x="63" y="${467+j*49}" font-family="Arial" font-size="36" letter-spacing="-.18" fill="${b.icon}">${taglines[i][j]}</text>`;
    body+=`<text x="63" y="644" font-family="Arial" font-size="23" fill="${b.icon}">Reveal the source →</text></svg>`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${defs}</defs><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile('work/ai-canvas-preview.png');
  // The negative center of the ChatGPT knot must survive the even-odd fill.
  const brand=brands.chatgpt,w=336,h=448,size=w*brand.scale,tx=(w-size)/2+brand.offset*w,ty=brand.top*h;
  const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="black"/><path fill="white" fill-rule="${brand.fillRule}" transform="translate(${tx} ${ty}) scale(${size/24})" d="${brand.path}"/></svg>`;
  const raw=await sharp(Buffer.from(source)).ensureAlpha().raw().toBuffer();
  const center=(Math.round(ty+size*.5)*w+Math.round(tx+size*.5))*4;
  assert.ok(raw[center]<10,'ChatGPT center remains a negative-space opening');
  console.log('Offline Canvas preview saved; ChatGPT negative space verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
