'use strict';

const memoryPrompts = [
  ['처음 교실에 들어간 나', '그날 내 옆에 있던 것'],
  ['친해지고 싶었던 친구', '둘이 자주 하던 놀이'],
  ['처음 도전한 일', '끝나고 난 뒤의 표정'],
  ['평범한 쉬는 시간', '그날 유독 웃겼던 순간'],
  ['잘하고 싶어 연습한 일', '다시 해 보던 날'],
  ['기억하고 싶은 교실 풍경', '졸업을 앞둔 지금의 나']
];
const schoolPlates=sceneStills.map(src=>{const im=new Image();im.onload=()=>{if(typeof composition!=='undefined'&&composition&&!playing&&!exporting)draw();};im.src=src;return im;});

function addNextGrowthPhoto() {
  if(mediaBusy||exporting||recorder?.state==='recording')return;
  const index=project.photos.findIndex(photo=>!photo);
  if(index<0){setSceneEditor('grade',grade);return;}
  setSceneEditor('grade',Math.floor(index/2));
  selectedPhoto=index;photoTarget=String(index);
  renderEditor();seek(composition.photoStarts[index]);
  $('#photoInput').click();
}

function storyBoard() {
  const row=(id,name,detail,count)=>`<button class="story-row" data-story="${id}"><span><b>${name}</b><small>${detail}</small></span><em>${count}</em><i aria-hidden="true">›</i></button>`;
  return `<div class="story-sheet"><div class="story-head"><h2>나의 장면 구성</h2><span>${fmt(total)}</span></div><p>${photoCount()?'편집할 장면을 골라 주세요.':'처음이라면 하루의 예시 영화를 먼저 보세요.'}</p>
    <button class="outline" data-story="sample">▶ 하루의 졸업영화 예시 보기</button>
    <button class="story-start" data-story="first">시작하기 · ${photoCount()===12?'성장 사진 보기':photoCount()?'다음 사진 넣기':'첫 사진 넣기'} <span>→</span></button>
    ${row('intro','처음과 지금','입학식 사진 한 장 + 지금 내 얼굴 한 장','사진 2장')}
    ${row('grade','여섯 해의 기억','한 학년에 두 장씩. 예를 들면 운동회에서 달리는 나와 결승선에서 웃는 나',photoCount()+' / 12장')}
    ${row('letter','마음의 편지','둘이 기억하는 하루로 시작해요. 편지 속에 어릴 적 가족사진도 넣을 수 있어요.',project.letter.trim()?'작성됨':'편지 1통')}
    ${row('ending','마지막 인사','함께 찍은 사진 한 장과 마지막 한마디. “다음엔 내가 먼저 손잡아 줄게요.”','사진 1장')}
    </div>`;
}

function setSceneEditor(kind,index=0){
  if(mediaBusy||exporting||recorder?.state==='recording')return;
  pause();
  if(kind==='grade'){grade=index;selectedPhoto=grade*2;}
  const next={intro:2,grade:1,family:3,letter:3,ending:5}[kind];
  changeStep(next);
  const scene=composition.scenes.find(s=>s.kind===kind&&(kind!=='grade'||s.index===index));
  if(scene)seek(scene.start+(kind==='ending'?scene.duration*.82:0));
  const body=$('#editorBody');
  body.scrollTop=0;
  if(kind==='family'){
    const section=body.querySelector('.meeting-section');
    if(section)section.scrollIntoView({block:'nearest'});
  }
  if(matchMedia('(max-width:830px)').matches && kind!=='family')$('.editor').scrollIntoView({block:'start'});
}

function dressEditor(){
  const body=$('#editorBody');
  $('.editor').classList.toggle('story-mode',step===0);
  if(step===0){
    body.querySelectorAll('[data-story]').forEach(button=>button.onclick=()=>{
      const kind=button.dataset.story;
      if(kind==='sample'){
        const demo=document.querySelector('#demoBtn');
        const previous=project;
        Promise.resolve(demo.onclick()).then(()=>{if(previous!==project)play();});
      }else if(kind==='first')addNextGrowthPhoto();else setSceneEditor(kind);
    });
  }
  if(step===1){
    const tabs=body.querySelector('.photo-tabs');
    const description=body.querySelector('.section-desc');
    const hint=body.querySelector('.hint-box'),identity=body.querySelector('.field-row');
    description.after(tabs);
    if(hint&&identity){
      const info=document.createElement('details');info.className='options';
      info.innerHTML='<summary>내 이름 · 학교 · 오프닝 사진 안내</summary>';
      body.append(info);info.append(identity,hint);
    }
    const nextIndex=project.photos.findIndex(photo=>!photo);
    if(nextIndex>=0){
      const add=document.createElement('button');add.className='outline next-empty-photo';
      add.textContent=(Math.floor(nextIndex/2)+1)+'학년 '+(nextIndex%2===0?'첫 번째':'두 번째')+' 사진 넣기 →';
      add.onclick=addNextGrowthPhoto;
      body.querySelector('.small-note').after(add);
    }
    const pair=body.querySelector('.upload-row');
    if(pair){
      pair.querySelectorAll('.photo-box').forEach((box,i)=>{
        const caption=document.createElement('div');caption.className='shot-label';
        caption.textContent=memoryPrompts[grade][i];box.after(caption);
        caption.style.gridColumn=String(i+1);
      });
    }
  }
  $('#nextStep').textContent=['성장 사진 편집 →','처음과 지금 →','편지 쓰기 →','소리 편집 →','엔딩과 저장 →','장면 구성으로'][step];
  $('#stepHelp').textContent=['','학년마다 두 장','입학 사진 · 가족 사진','내가 읽는 편지','음악 · 목소리','기기에 영상 저장'][step];
}
