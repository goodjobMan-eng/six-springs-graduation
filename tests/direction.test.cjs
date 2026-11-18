const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../docs/direction.js'),M=require('../docs/model.js');
test('each adult has a solo, all three share a moment, and the child holds the last frame',()=>{
  for(const n of [1,2,3])for(let frame=0;frame<=100;frame++){
    const w=D.familyWeights(n,frame/100);assert.ok(w.every(x=>x>=0));assert.ok(Math.abs(1-w.reduce((a,b)=>a+b))<1e-6);
  }
  assert.deepEqual(D.familyWeights(3,.15),[1,0,0]);assert.deepEqual(D.familyWeights(3,.35),[0,1,0]);
  assert.ok(D.familyWeights(3,.60).every(x=>x>.32));assert.deepEqual(D.familyWeights(3,.9),[0,0,1]);
  assert.deepEqual(D.familyWeights(2,.9),[0,1]);
});
test('narration starts over preceding image and reserves a silent tail, including with family omitted',()=>{
  const p=M.normalize({includeFamily:true});Object.assign(p,{directed:true,tailSeconds:4});
  for(const include of [true,false]){p.includeFamily=include;const timeline=M.timeline(p),slots=D.voiceSlots(p,timeline);
    if(include)assert.equal(slots.find(x=>x.key==='family').start,timeline.familyStart-3);
    assert.equal(slots.at(-1).end,timeline.total-4);
    slots.slice(1).forEach((s,i)=>assert.equal(slots[i].end,s.start));
  }
});
test('expression moves both corners upward, keeps distant pixels unchanged and survives project normalization',()=>{
  const [x,y]=D.smileOffset(.34,0),[u,v]=D.smileOffset(-.34,0);assert.ok(x>0&&y<-.08);assert.equal(u,-x);assert.equal(v,y);assert.deepEqual(D.smileOffset(.2,.6),[0,0]);
  const p=M.normalize({introMode:'smile',resolution:'480',edits:{3:{effect:'smile'}},facePoints:{3:[[.3,.3],[.7,.3],[.5,.6]]}});M.normalize(p);assert.equal(p.edits[3].effect,'smile');assert.equal(p.introMode,'smile');assert.ok(p.facePoints[3]);assert.equal(p.resolution,'480');
});
