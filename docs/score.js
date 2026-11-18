'use strict';

const scorePrompts = {
  documentary: {
    name:'처음 학교에 온 날 · 다큐멘터리',
    text:"An original instrumental score, about {duration}, for a Korean elementary school graduation film. 78 BPM, gentle 4/4. Open with four felt-piano notes, like a child pausing at a classroom door. For the six school years, add fingerpicked acoustic guitar and a soft brushed rhythm. When childhood photos of two generations dissolve together, let a solo cello answer the opening piano phrase. Under the child's spoken letter, drop the beat and use sparse low piano chords with long rests. For the family portrait, return to the four opening notes and let the final chord ring for four seconds. Intimate, warm, quietly hopeful. No vocals, choir or trailer drums."
  },
  lively: {
    name:'우리 반의 하루 · 어쿠스틱 팝',
    text:"Instrumental coming-of-age montage, about {duration}, 96 BPM. Start with a playful muted acoustic guitar figure. Bring in brushed snare, warm bass and a light piano melody during school snapshots. Thin the arrangement to solo guitar for a child's spoken letter. Bring back the opening figure once for a smiling family portrait, ending on a gently sustained chord. Youthful, candid school documentary. No vocals, claps or abrupt drop."
  }
};

function mountScoreTools(){
  const panel=document.createElement('details');
  panel.className='options score-options';
  panel.innerHTML='<summary>교사용 · 수노 음악 준비</summary><label class="field">곡 분위기<select id="scoreStyle"></select></label><textarea id="scorePrompt" aria-label="수노 프롬프트" readonly></textarea><button class="outline" id="copyScore">프롬프트 복사</button><p class="small-note">수노에서 연주곡으로 만든 뒤, 위의 배경음악에 파일을 넣어 주세요. 반 전체가 같은 곡으로 시작하려면 아래 파일을 함께 나눠 주세요.</p><button class="outline" id="classScore" disabled>음악만 담은 학급 시작 파일 저장</button>';
  $('#editorBody').append(panel);
  const select=panel.querySelector('select'), field=panel.querySelector('textarea');
  for(const [key,value] of Object.entries(scorePrompts))select.add(new Option(value.name,key));
  const show=()=>{const seconds=Math.round(total);
    field.value=scorePrompts[select.value].text.replace('{duration}',Math.floor(seconds/60)+' min '+seconds%60+' sec');};
  select.onchange=show;show();
  panel.querySelector('#copyScore').onclick=async()=>{
    try{await navigator.clipboard.writeText(field.value);toast('수노 프롬프트를 복사했어요.');}
    catch{field.focus();field.select();toast('선택한 프롬프트를 복사해 주세요.');}
  };
  const button=panel.querySelector('#classScore');
  button.disabled=!project.bgm;
  button.onclick=()=>{
    if(!project.bgm)return;
    const blank=defaults();blank.music='upload';blank.bgm=project.bgm;
    blank.musicOffset=project.musicOffset;blank.volume=project.volume;
    download(new Blob([JSON.stringify(blank)],{type:'application/json'}),'졸업영화_학급시작_음악.json');
    toast('학생은 ‘작업 불러오기’에서 이 파일을 골라 시작해요.');
  };
}
