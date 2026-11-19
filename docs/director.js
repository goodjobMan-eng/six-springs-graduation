'use strict';

function nextFilmDefaults() {
  const p = StudioModel.normalize(legacyDefaults());
  p.directed = true;
  p.includeFamily = false;
  p.transition = 'sequence';
  p.titleFont = 'gowunbatang';
  p.letterFont = 'gowunbatang';
  p.bridgeText = '';
  p.captions = Array(6).fill('');
  p.tailSeconds = 4;
  p.sceneVoices = {};
  p.photoDurations = Direction.growthCutDurations();
  p.singleGrowthPhotos = true;
  p.introDuration = 12;
  p.letterDuration = 40;
  p.endingDuration = 12;
  p.ending = '함께 걸어 주셔서 고맙습니다.';
  return p;
}

function restoreDirection(p, raw) {
  p.directed = raw.directed === true;
  p.singleGrowthPhotos = raw.singleGrowthPhotos === true;
  p.bridgeText = String(raw.bridgeText || '').slice(0,70);
  p.tailSeconds = StudioModel.clamp(raw.tailSeconds,3,5,4);
  p.sceneVoices = {};
  for (const key of ['intro','family','ending',...Array.from({length:6},(_,i)=>'grade'+i)]) {
    const item = raw.sceneVoices?.[key];
    if (!item || typeof item.data !== 'string' || item.data.length > 43e6) continue;
    if (!/^data:(audio\/[\w.+-]+|video\/webm|application\/octet-stream)(;codecs=[\w.,-]+)?;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.data)) continue;
    p.sceneVoices[key] = {data:item.data, name:String(item.name || '장면 목소리').slice(0,100), duration:StudioModel.clamp(item.duration,0,600,0)};
  }
  return p;
}

function bridgeLine() {
  const who = activeAdults().map(a=>a.label || '소중한 어른').join(', ');
  return project.bridgeText.trim() || (who + ', 내 입학식 날 기억나요?');
}

function directedFamily(phase,t) {
  const p=palette(), adults=activeAdults();
  const keys=adults.map((_,i)=>'adult'+i).filter(k=>assetSource(k));
  if(nowPhoto())keys.push('nowPhoto');
  const weights=Direction.familyWeights(keys.length,phase);
  const clip=clipAt(t);
  if(phase<.18 && !clip){
    if(nowPhoto()) overlap(['nowPhoto'],0,[1]);
    write(bridgeLine(),640,677,27,p.ink);return;
  }
  write(project.recipient || '마음의 편지',640,111,44,p.ink,project.titleFont);
  if (!clip || !drawClip(clip.asset,230,150,820,480)) overlap(keys,phase,weights);
  const solo=weights.findIndex(w=>w>.96);
  const key=keys[solo];
  let caption=keys.map(k=>k==='nowPhoto'?'나':project.adults[Number(k.slice(5))].label).join(' · ');
  if (key==='nowPhoto') caption='';
  else if (key) {
    const adult=project.adults[Number(key.slice(5))];
    caption=adult.memory || (adult.label + ', 이 사진 찍던 날 기억나요?');
  }
  write(caption,640,677,27,p.ink);
}

function sceneAudioSlots() {return Direction.voiceSlots(project,composition);}
async function decodeNarration(decode,offset) {
  const slots=sceneAudioSlots().filter(s=>s.end>offset);
  return Promise.all(slots.map(async slot=>{
    const asset=slot.key==='letter'?project.voice:project.sceneVoices?.[slot.key];
    if(!asset)return null;
    const buffer=await decode(asset);
    return {...slot,buffer,end:Math.min(slot.end,slot.start+buffer.duration)};
  })).then(results=>results.filter(Boolean));
}
function scheduleNarration(tracks,offset,ac,zero,voiceGain,sources) {
  for(const track of tracks){
    const begin=Math.max(offset,track.start);
    if(begin>=track.end)continue;
    const source=ac.createBufferSource();source.buffer=track.buffer;
    source.connect(voiceGain);
    source.start(zero+begin-offset,begin-track.start,track.end-begin);
    sources.push(source);
  }
}

function refreshDirector() {
  pause();save();renderEditor();renderTimeline();seek(Math.min(time,total));
}

function presetPanel() {
  return '<section class="director-panel"><label class="preset-toggle"><input id="directedPreset" type="checkbox" '+(project.directed?'checked':'')+'><strong>장면 사이 목소리와 여운</strong></label><p>6학년 사진 위로 어른에게 건네는 첫마디를 먼저 들려줄 수 있어요. 엔딩은 함께 찍은 사진과 마지막 인사로 마쳐요.</p></section>';
}

function recordingForScene(key) {
  const slot=sceneAudioSlots().find(s=>s.key===key);
  if(!slot)return;
  pause();
  const owner=project, limit=slot.end-slot.start;
  const d=makeDialog(slot.title+' 목소리',`<p>한 문장을 들려주세요. 이 장면에는 최대 ${limit}초가 들어가요.</p><p id="micStatus" role="status">준비되면 녹음을 눌러주세요.</p><div class="button-row"><button class="primary" id="sceneRecord">녹음 시작</button><button class="outline" id="sceneImport">음성 파일 고르기</button></div><input type="file" id="sceneAudioFile" accept="audio/*" hidden>`);
  const start=d.querySelector('#sceneRecord'),status=d.querySelector('#micStatus'),picker=d.querySelector('#sceneAudioFile'),importer=d.querySelector('#sceneImport');
  let stream,mic,timer,cancelled=false;
  function release(){clearInterval(timer);stream?.getTracks().forEach(track=>track.stop());}
  function storeAsset(asset){
    if(cancelled||owner!==project)return;
    owner.sceneVoices[key]=asset;save();d.close();renderEditor();toast('장면에 목소리를 넣었어요.');
  }
  d.addEventListener('close',()=>{cancelled=true;if(mic?.state==='recording')mic.stop();release();});
  importer.onclick=()=>picker.click();
  picker.onchange=async()=>{
    const f=picker.files[0];if(!f)return;
    if(f.size>30*1024*1024){status.textContent='30MB 이하의 음성 파일을 골라주세요.';return;}
    start.disabled=importer.disabled=true;let ac;
    try{
      ac=new (window.AudioContext||window.webkitAudioContext)();
      const buffer=await ac.decodeAudioData(await f.arrayBuffer());
      const data=(await dataURL(f)).replace(/^data:[^;]*;/,'data:audio/x-local;');
      storeAsset({data,name:f.name,duration:buffer.duration});
    }catch{status.textContent='이 음성을 읽지 못했어요. MP3나 WAV 파일로 시도해 주세요.';}
    finally{if(ac)await ac.close();start.disabled=importer.disabled=false;}
  };
  start.onclick=async()=>{
    if(mic?.state==='recording'){mic.stop();return;}
    start.disabled=importer.disabled=true;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(cancelled){release();return;}
      mic=new MediaRecorder(stream);const chunks=[];
      mic.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const began=performance.now();
      mic.onstop=async()=>{
        release();if(cancelled)return;
        start.disabled=true;
        try{const blob=new Blob(chunks,{type:mic.mimeType});storeAsset({data:await dataURL(blob),name:slot.title+' 녹음',duration:(performance.now()-began)/1000});}
        catch{status.textContent='녹음을 저장하지 못했어요. 다시 시도해 주세요.';start.disabled=importer.disabled=false;}
      };
      mic.start();start.disabled=false;start.textContent='녹음 마치기';
      status.textContent='녹음 중…';
      timer=setInterval(()=>{const elapsed=(performance.now()-began)/1000;status.textContent='녹음 중 '+fmt(elapsed)+' / '+fmt(limit);if(elapsed>=limit&&mic.state==='recording')mic.stop();},200);
    }catch{release();status.textContent='마이크를 사용할 수 없어요. 음성 파일을 고를 수 있어요.';start.disabled=importer.disabled=false;}
  };
  d.showModal();
}

let voiceSelection='family';
function renderVoiceTools(container) {
  const slots=sceneAudioSlots().filter(s=>s.key!=='letter');
  const slot=slots.find(s=>s.key===voiceSelection)||slots[0];
  voiceSelection=slot.key;
  const asset=project.sceneVoices[slot.key];
  const section=document.createElement('section');section.className='director-panel';
  section.innerHTML=`<h3>장면별 한마디</h3><label class="field">목소리를 넣을 장면<select id="voiceScene">${slots.map(s=>`<option value="${s.key}" ${s.key===slot.key?'selected':''}>${s.title}</option>`).join('')}</select></label><p>${slot.key==='family'&&project.directed?esc(bridgeLine()):'이 사진을 볼 때 떠오르는 말을 들려주세요.'}</p><div class="button-row"><button class="outline" id="addSceneVoice">녹음 또는 파일 넣기</button><button class="outline" id="listenScene">장면 듣기</button></div>${asset?`<p>${esc(asset.name)} <button class="text-button" id="removeSceneVoice">삭제</button></p>`:''}`;
  container.prepend(section);
  section.querySelector('#voiceScene').onchange=e=>{voiceSelection=e.target.value;renderEditor();};
  section.querySelector('#addSceneVoice').onclick=()=>recordingForScene(slot.key);
  section.querySelector('#listenScene').onclick=()=>{pause();seek(slot.start);play();};
  if(asset)section.querySelector('#removeSceneVoice').onclick=()=>{delete project.sceneVoices[slot.key];refreshDirector();};
}

function mountDirectionTools(){
  const b=$('#editorBody');
  if(step===0||step===5){
    b.insertAdjacentHTML(step===0?'beforeend':'afterbegin',presetPanel());
    $('#directedPreset').onchange=e=>{project.directed=e.target.checked;refreshDirector();};
  }
  if(step===3 && project.includeFamily && project.directed){
    const sections=b.querySelectorAll('.meeting-section');
    sections[0].insertAdjacentHTML('afterbegin',`<label class="field">사진을 보여 주기 전에 건넬 첫마디<input id="bridgeLine" maxlength="70" value="${esc(project.bridgeText)}" placeholder="${esc(bridgeLine())}"></label><div class="button-row"><button class="outline" id="recordBridge">이 문장 녹음하기</button><button class="outline" id="playBridge">연결 장면 재생</button></div>`);
    $('#bridgeLine').oninput=e=>{project.bridgeText=e.target.value;save();draw();};
    $('#recordBridge').onclick=()=>recordingForScene('family');
    $('#playBridge').onclick=()=>{pause();seek(composition.familyStart-3);play();};
  }
  if(step===1){
    const timingButton=document.createElement('button');
    timingButton.type='button';
    timingButton.className='outline';
    timingButton.textContent='성장 사진 12장에 빠른 컷 적용 · 총 44초';
    $('#applyDuration').after(timingButton);
    timingButton.onclick=()=>{
      pause();
      project.photoDurations=Direction.growthCutDurations();
      project.singleGrowthPhotos=true;
      save();renderTimeline();renderEditor();seek(composition.photoStarts[selectedPhoto]);
      toast('성장 사진 12장의 길이를 3~5초로 맞췄어요.');
    };
    const hints=['입학 무렵 내 모습과 처음 해 본 일','친구와 함께한 순간과 평범한 하루','새로 도전한 일과 그 뒤의 표정','가장 웃겼던 날과 그날 함께한 사람','오래 연습한 일과 해냈던 순간','간직하고 싶은 교실 모습과 지금의 내 얼굴'];
    b.querySelector('.section-desc').textContent=(grade+1)+'학년 사진 두 장을 골라주세요. '+hints[grade]+' 중에서 골라도 좋아요.';
    const n=String(selectedPhoto);
    $('#cropPhoto').insertAdjacentHTML('afterend',`<button class="outline smile-action" id="smilePhoto">${project.edits[n].effect==='smile'?'✓ ':''}사진 속 얼굴 미소 짓기</button>`);
    $('#smilePhoto').onclick=()=>openAlignment(n);
  }
  if(step===3)b.querySelector('.hint-box').innerHTML='<b>나만 기억하는 고마운 하루</b><br>어디에서 무슨 일이 있었나요?<br>그때 그분이 해 준 말이나 행동은요?<br>오늘 그분께 직접 하고 싶은 말은요?';
  if(step===4)renderVoiceTools(b);
  if(step===5){
    $('#exportBtn').insertAdjacentHTML('beforebegin','<button class="outline test-export" id="testOpening">첫 장면만 시험 저장</button>');
    $('#testOpening').onclick=()=>exportVideo(true);
  }
  if(step===5 && project.directed){
    $('#exportBtn').insertAdjacentHTML('beforebegin',`<label class="field">엔딩 사진을 보여주는 시간<select id="tailHold">${[3,4,5].map(n=>`<option ${n===project.tailSeconds?'selected':''}>${n}</option>`).join('')}</select>초</label>`);
    $('#tailHold').onchange=e=>{project.tailSeconds=Number(e.target.value);if(project.endingDuration<project.tailSeconds+1)project.endingDuration=project.tailSeconds+1;refreshDirector();};
  }
}
