'use strict';

// Video typography uses the same 1280×720 design grid at every export resolution.
function filmType(copy, x, baseline, size, color, font, width, align='left') {
  ctx.save();
  ctx.fillStyle=color;ctx.textAlign=align;
  ctx.font=size+'px "'+family(font)+'", sans-serif';
  ctx.fillText(copy,x,baseline,width);
  ctx.restore();
}
function filmRule(x,y,width,color) {
  ctx.fillStyle=color;ctx.fillRect(x,y,width,1.5);
}
function filmImage(key,x,y,width,height) {
  const im=imageOf(assetSource(key));if(!im)return false;
  const ratio=Math.min(width/im.width,height/im.height);
  const w=im.width*ratio,h=im.height*ratio;
  ctx.drawImage(im,x+(width-w)/2,y+(height-h)/2,w,h);
  return true;
}
function paperColors() {
  if(project.theme==='cinema')return {paper:'#1c2528',ink:'#fffaec',soft:'#babfb7',accent:'#deae84',mount:'#2a3436'};
  if(project.theme==='documentary')return {paper:'#edf0ed',ink:'#203237',soft:'#52696c',accent:'#28676a',mount:'#dce4e1'};
  return {paper:'#f6f1e7',ink:'#302c29',soft:'#71695e',accent:'#925444',mount:'#e8dfd0'};
}
function photoKeyForLetter() {
  if(project.family)return 'family';
  if(nowPhoto())return 'nowPhoto';
  if(beforePhoto())return 'beforePhoto';
  const i=project.photos.findLastIndex ? project.photos.findLastIndex(Boolean) : project.photos.map(Boolean).lastIndexOf(true);
  return i>=0?String(i):null;
}

// Keep Korean words together when possible. Split only long words that cannot fit a line.
function letterLines(copy,width,size) {
  ctx.font=size+'px "'+family(project.letterFont)+'", sans-serif';
  const result=[];
  for(const paragraph of copy.split(/\r?\n/)){
    let line='';
    for(const word of paragraph.trim().split(/\s+/)){
      if(!word)continue;
      const candidate=line?line+' '+word:word;
      if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
      if(line)result.push(line);
      line='';
      for(const char of word){
        if(line&&ctx.measureText(line+char).width>width){result.push(line);line='';}
        line+=char;
      }
    }
    result.push(line);
  }
  return result;
}
function drawLetterPage(phase) {
  const c=paperColors(),photoKey=beforePhoto()?'beforePhoto':photoKeyForLetter();
  ctx.fillStyle=c.paper;ctx.fillRect(0,0,1280,720);
  const left=photoKey?478:146, right=1180, lineWidth=right-left;
  if(photoKey){
    ctx.fillStyle=c.mount;ctx.fillRect(0,0,392,720);
    // An archive print with a generous lower margin, including uncropped vertical photos.
    ctx.fillStyle=c.paper;ctx.fillRect(37,91,318,477);
    filmImage(photoKey,49,103,294,419);
    filmType(photoKey==='beforePhoto'?'처음 학교에 온 날':(project.name||'나')+'의 졸업앨범',54,546,16,c.soft,project.captionFont,280);
  }
  filmType('마음의 편지',left,88,22,c.accent,project.captionFont,lineWidth);
  filmRule(left,113,lineWidth,c.accent);
  filmType(project.recipient||'소중한 분께',left,214,54,c.ink,project.titleFont,lineWidth);
  const copy=project.letter.trim()||'함께해 주셔서 고맙습니다.';
  const rows=letterLines(copy,lineWidth-10,32),perPage=5,pages=Math.max(1,Math.ceil(rows.length/perPage));
  const page=Math.min(pages-1,Math.floor(phase*pages));
  ctx.save();
  if(project.transition==='sequence'){
    const secondsOnPage=(phase*pages-page)*project.letterDuration/pages;
    ctx.globalAlpha*=Direction.ease(secondsOnPage/.45);
  }
  rows.slice(page*perPage,(page+1)*perPage).forEach((line,i)=>filmType(line,left,293+i*51,32,c.ink,project.letterFont,lineWidth));
  if(page===pages-1&&project.name)filmType(project.name+' 올림',right,604,26,c.ink,project.letterFont,lineWidth,'right');
  ctx.restore();
  filmRule(left,645,lineWidth,c.soft);
  if(project.school)filmType(project.school,left,678,17,c.soft,project.captionFont,450);
  filmType(String(page+1).padStart(2,'0')+' / '+String(pages).padStart(2,'0'),right,678,16,c.soft,project.captionFont,120,'right');
}
// Fit the final greeting like two lines of a printed dedication.
function endingLines(message, width) {
  const measure = text => ctx.measureText(text).width;
  if (measure(message) <= width) return [message];
  const chars = Array.from(message);
  let best, bestCost = Infinity;
  for (let i = 1; i < chars.length; i++) {
    const left = chars.slice(0, i).join('').trimEnd();
    const right = chars.slice(i).join('').trimStart();
    const a = measure(left), b = measure(right);
    if (!left || !right || Math.max(a,b) > width) continue;
    const wordBreak = /\s/u.test(chars[i-1]) || /\s/u.test(chars[i]);
    const cost = Math.abs(a-b) + (wordBreak ? 0 : width);
    if (cost < bestCost) { best = [left,right]; bestCost = cost; }
  }
  return best;
}

function drawFilmEnding(elapsed, duration) {
  const c = paperColors();
  const key = photoKeyForLetter();
  const hasPhoto = key != null && imageOf(assetSource(key));
  const hold = Math.min(project.directed ? project.tailSeconds : 3, duration * .44);
  const fade = Math.min(1.4, duration * .13);
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, 0, 1280, 720);

  // Fade the whole photograph into the stock before printing the dedication.
  if (hasPhoto && elapsed < hold + fade) {
    ctx.save();
    ctx.globalAlpha = 1 - Direction.ease((elapsed - hold) / fade);
    filmImage(key, 44, 30, 1192, 660);
    ctx.restore();
    return;
  }
  const cardStart = hasPhoto ? hold + fade : 0;
  ctx.save();
  ctx.globalAlpha = Direction.ease((elapsed - cardStart) / Math.min(.85, duration * .1));
  const message = (project.ending || '').trim() || '함께해 주셔서 고맙습니다.';
  const signature = [project.school, project.name ? project.name + ' 올림' : ''].filter(Boolean).join('  ·  ');
  const width = 1024;
  let fontSize = 54, rows;
  while (!rows) {
    ctx.font = fontSize + 'px "' + family(project.titleFont) + '", sans-serif';
    rows = endingLines(message, width);
    if (!rows && fontSize <= 32) rows = letterLines(message, width, fontSize);
    if (!rows) fontSize -= 2;
  }
  const baseline = (signature ? 350 : 380) - (rows.length - 1) * 39;
  rows.forEach((line, i) => filmType(line, 640, baseline + i*78, fontSize, c.ink, project.titleFont, width, 'center'));
  if (signature) {
    const bottom = baseline + (rows.length-1)*78;
    filmRule(621, bottom+37, 38, c.accent);
    filmType(signature, 640, bottom+83, 22, c.soft, project.captionFont, 1000, 'center');
  }
  ctx.restore();
}
function drawGrowthPhoto(scene,t) {
  const c=paperColors(),g=scene.index,elapsed=t-scene.start;
  const n=g*2+(elapsed<project.photoDurations[g*2]?0:1);
  const phase=(t-composition.photoStarts[n])/project.photoDurations[n];
  ctx.fillStyle=c.paper;ctx.fillRect(0,0,1280,720);
  const pair=project.directed&&!project.singleGrowthPhotos&&n%2===1&&project.photos[n-1]&&project.photos[n];
  const spreads=project.transition==='sequence' && (g===1 || g===3) && project.photos[g*2] && project.photos[g*2+1];
  if(spreads && n%2===1){
    const reveal=Direction.ease((t-composition.photoStarts[n])/.52);
    const firstWidth=1184-604*reveal;
    imageIn(String(n-1),48,36,firstWidth,530,1);
    if(reveal>0){
      ctx.save();
      ctx.beginPath();ctx.rect(1232-584*reveal,36,584*reveal,530);ctx.clip();
      imageIn(String(n),648,36,584,530,phase);
      ctx.restore();
    }
  }else if(pair){
    imageIn(String(n-1),48,50,553,506,1);
    imageIn(String(n),621,50,611,506,phase);
  }else{
    imageIn(String(n),48,36,1184,530,phase);
  }
  filmRule(48,586,1184,c.soft);
  filmType((g+1)+'학년',49,650,36,c.ink,project.titleFont,215);
  const bridge=project.directed&&project.includeFamily&&g===5&&t>=composition.familyStart-3;
  const copy=bridge?bridgeLine():(project.photoCaptions[n]||project.captions[g]);
  const chosen=project.captionColor;
  // An intentional dark subtitle strip protects light custom text on pale album paper.
  if(copy){
    const light=parseInt(chosen.slice(1,3),16)*.299+parseInt(chosen.slice(3,5),16)*.587+parseInt(chosen.slice(5),16)*.114>135;
    const bg=light?'#303634':'#f2efe7';
    const size=project.captionSize;
    const rows=lines(copy,908,size,project.captionFont).slice(0,2);
    ctx.font=size+'px "'+family(project.captionFont)+'",sans-serif';
    const width=Math.min(975,Math.max(...rows.map(r=>ctx.measureText(r).width))+46);
    const height=rows.length*35+16;
    ctx.fillStyle=bg;ctx.fillRect(247,605,width,height);
    rows.forEach((r,i)=>filmType(r,270,640+i*35,size,chosen,project.captionFont,width-30));
  }
}

// Establish the child before introducing the title. Aligned portraits share one matte.
function drawMemoryOpening(phase) {
  const c=paperColors();
  ctx.fillStyle=c.paper;ctx.fillRect(0,0,1280,720);
  const keys=['beforePhoto','nowPhoto'].filter(key=>assetSource(key));
  const blend=Direction.ease((phase-.31)/.38);
  overlap(keys,phase,keys.length===2?[1-blend,blend]:[1]);
  ctx.save();
  ctx.globalAlpha=Direction.ease((phase-.08)/.12);
  filmType(project.filmTitle,640,102,46,c.ink,project.titleFont,1110,'center');
  ctx.restore();
  const hasBoth=keys.length===2;
  const first=hasBoth?phase<.5:keys[0]==='beforePhoto';
  ctx.save();
  ctx.globalAlpha=hasBoth?Direction.ease(Math.abs(phase-.5)/.07):1;
  filmType(first?'처음 학교에 온 날':'졸업을 앞둔 오늘',640,677,27,c.soft,project.captionFont,950,'center');
  ctx.restore();
}

// Keep cuts crisp inside the montage. Leave a breath before the letter, with or without family photos.
function drawChapterFade(scene,elapsed) {
  let opacity=0;
  const precedesLetter=scene.kind==='family'||(scene.kind==='grade'&&scene.index===5&&!project.includeFamily);
  if(precedesLetter) opacity=Direction.ease((elapsed-scene.duration+.65)/.65);
  if(scene.kind==='letter') opacity=1-Direction.ease(elapsed/.55);
  if(opacity<=0)return;
  ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=paperColors().paper;ctx.fillRect(0,0,1280,720);ctx.restore();
}

function memoryMusicLevel(t) {
  const intoLetter=Direction.ease((t-composition.letterStart+1.5)/1.5);
  const outOfLetter=Direction.ease((t-composition.endingStart)/1.8);
  return 1-.45*intoLetter*(1-outOfLetter);
}

function drawOpeningSlate() {
  const im=schoolPlates[0];
  ctx.fillStyle='#302f29';ctx.fillRect(0,0,1280,720);
  if(im?.naturalWidth){
    const h=im.height*720/1280;
    ctx.drawImage(im,0,(im.height-h)*.5,im.width,h,0,0,1280,720);
  }
  const shade=ctx.createLinearGradient(0,70,780,650);
  shade.addColorStop(0,'rgba(20,22,18,.68)');shade.addColorStop(1,'rgba(22,20,17,.12)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
  filmType(project.school||'나의 초등학교 6년',70,103,27,'#f0e9d5',project.captionFont,720);
  filmType('처음 학교에',64,398,103,'#fff9e9',project.titleFont,940);
  filmType('온 날',64,515,103,'#fff9e9',project.titleFont,940);
  filmRule(70,592,52,'#e7c396');
  filmType(project.filmTitle,70,643,27,'#fff8e7',project.captionFont,950);
}
