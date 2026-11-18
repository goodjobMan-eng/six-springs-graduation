'use strict';

// Keep only tiny mouth-region patches for recently drawn images. The original stays intact.
const smilePatches = new WeakMap();
function getSmilePatch(image, points) {
  if (!image || !StudioModel.validPoints(points)) return null;
  const signature = points.flat().join(',');
  const last = smilePatches.get(image);
  if (last?.signature === signature) return last.patch;
  const [left, right, mouth] = points.map(([x,y]) => [x * image.width, y * image.height]);
  const dx = right[0] - left[0], dy = right[1] - left[1], eyeSpan = Math.hypot(dx,dy);
  if (eyeSpan < 5) return null;
  const cos = dx / eyeSpan, sin = dy / eyeSpan;
  const radius = Math.ceil(eyeSpan * 1.1);
  const x = Math.max(0, Math.floor(mouth[0] - radius));
  const y = Math.max(0, Math.floor(mouth[1] - radius));
  const w = Math.min(image.width - x, mouth[0] + radius - x);
  const h = Math.min(image.height - y, mouth[1] + radius - y);
  const scale = Math.min(1, 228 / Math.max(w,h));
  const width = Math.max(1, Math.round(w * scale)), height = Math.max(1, Math.round(h * scale));
  const scratch = document.createElement('canvas');
  scratch.width = width; scratch.height = height;
  const brush = scratch.getContext('2d', {willReadFrequently:true});
  brush.drawImage(image,x,y,w,h,0,0,width,height);
  const original = brush.getImageData(0,0,width,height);
  const frames = [];
  const displacements = new Float32Array(width * height * 2);
  for (let row=0; row<height; row++) for (let col=0; col<width; col++) {
    const px = x + (col+.5)*w/width - mouth[0], py = y + (row+.5)*h/height - mouth[1];
    const [a,b] = Direction.smileOffset((px*cos+py*sin)/eyeSpan, (-px*sin+py*cos)/eyeSpan);
    const i = (row*width+col)*2;
    displacements[i] = (a*cos-b*sin)*eyeSpan*width/w;
    displacements[i+1] = (a*sin+b*cos)*eyeSpan*height/h;
  }
  for (let stage=1; stage<=4; stage++) {
    const frame=document.createElement('canvas'); frame.width=width; frame.height=height;
    const out=brush.createImageData(width,height);
    for (let row=0; row<height; row++) for (let col=0; col<width; col++) {
      const i=row*width+col;
      const mx=displacements[i*2]*stage/4, my=displacements[i*2+1]*stage/4;
      if (Math.abs(mx)+Math.abs(my)<.005) continue;
      const sx=Math.max(0,Math.min(width-1,col-mx)), sy=Math.max(0,Math.min(height-1,row-my));
      const ax=Math.floor(sx), ay=Math.floor(sy), fx=sx-ax, fy=sy-ay;
      const a=(ay*width+ax)*4, b=(ay*width+Math.min(width-1,ax+1))*4;
      const c=(Math.min(height-1,ay+1)*width+ax)*4, d=c+b-a;
      for(let k=0;k<3;k++) out.data[i*4+k]=(1-fy)*((1-fx)*original.data[a+k]+fx*original.data[b+k])+fy*((1-fx)*original.data[c+k]+fx*original.data[d+k]);
      out.data[i*4+3]=Math.min(255,Math.round((Math.abs(mx)+Math.abs(my))*500));
    }
    frame.getContext('2d').putImageData(out,0,0);
    frames.push(frame);
  }
  const patch={frames,x,y,w,h};
  smilePatches.set(image,{signature,patch});
  return patch;
}

function drawSmilingPhoto(im,points,amount) {
  ctx.drawImage(im,0,0);
  if (amount<=0) return;
  const p=getSmilePatch(im,points);
  if (!p) return;
  const phase=Math.min(4,amount*4),base=Math.floor(phase);
  if(base>0)ctx.drawImage(p.frames[base-1],p.x,p.y,p.w,p.h);
  if(base<4){
    ctx.save();ctx.globalAlpha*=phase-base;
    ctx.drawImage(p.frames[base],p.x,p.y,p.w,p.h);ctx.restore();
  }
}

function smilingPair(phase) {
  const p=palette();
  for(const [i,key] of ['beforePhoto','nowPhoto'].entries()){
    const x=75+i*580,y=140,w=550,h=454,im=imageOf(assetSource(key));
    if(im){
      ctx.save();ctx.fillStyle=p.paper;ctx.fillRect(x,y,w,h);
      const scale=Math.min(w/im.width,h/im.height);
      ctx.translate(x+(w-im.width*scale)/2,y+(h-im.height*scale)/2);ctx.scale(scale,scale);
      drawSmilingPhoto(im,project.facePoints[key],Direction.ease((phase-.18-i*.24)/.26));
      ctx.restore();
    } else imageIn(key,x,y,w,h);
    write(i?'6학년의 나':'처음 학교에 온 날',x+w/2,633,24,p.ink);
  }
}
