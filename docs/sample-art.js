'use strict';

function ellipseOn(brush,x,y,rx,ry,color) {
  brush.beginPath();brush.ellipse(x,y,rx,ry,0,0,Math.PI*2);brush.fillStyle=color;brush.fill();
}
function paintPerson(brush,variant,shirt) {
  const skin=['#e6b795','#deb18b','#dfaf90','#ce9d7e'][variant];
  const hair=['#382d29','#393538','#46322b','#302f30'][variant];
  // Shared drawing coordinates make the example landmarks repeatable.
  brush.fillStyle=shirt;
  brush.beginPath();brush.moveTo(73,600);brush.quadraticCurveTo(76,458,243,429);
  brush.quadraticCurveTo(301,468,357,428);brush.quadraticCurveTo(523,459,531,600);brush.fill();
  if(variant===2)ellipseOn(brush,300,287,130,162,hair);
  ellipseOn(brush,300,390,35,62,skin);
  for(const x of [194,406])ellipseOn(brush,x,276,15,22,skin);
  ellipseOn(brush,300,251,112,141,skin);
  brush.fillStyle=hair;brush.beginPath();brush.moveTo(186,259);
  brush.bezierCurveTo(152,82,311,66,375,110);
  brush.bezierCurveTo(435,147,418,231,408,257);
  brush.quadraticCurveTo(394,203,variant%2?346:369,175);
  brush.quadraticCurveTo(328,214,246,214);
  brush.quadraticCurveTo(275,192,277,178);
  brush.quadraticCurveTo(233,219,207,229);brush.lineTo(186,259);brush.fill();
  brush.strokeStyle=hair;brush.lineWidth=5;brush.lineCap='round';
  for(const x of [260,340]){
    brush.beginPath();brush.moveTo(x-12,252);brush.quadraticCurveTo(x,247,x+12,251);brush.stroke();
    ellipseOn(brush,x,270,6,8,'#312f31');ellipseOn(brush,x-1,268,1.5,1.8,'#fff9e8');
  }
  if(variant===1||variant===3){
    brush.strokeStyle='#625c51';brush.lineWidth=3;
    for(const x of [260,340]){brush.beginPath();brush.ellipse(x,269,29,22,0,0,Math.PI*2);brush.stroke();}
    brush.beginPath();brush.moveTo(289,267);brush.quadraticCurveTo(300,262,311,267);brush.stroke();
  }
  brush.strokeStyle='#b98268';brush.lineWidth=3;brush.beginPath();brush.moveTo(300,284);brush.quadraticCurveTo(290,301,302,304);brush.stroke();
  brush.strokeStyle='#965b51';brush.lineWidth=4;brush.beginPath();brush.moveTo(276,331);brush.quadraticCurveTo(300,340+variant,324,331);brush.stroke();
  brush.strokeStyle='#fff4dc';brush.lineWidth=6;brush.beginPath();brush.moveTo(252,434);brush.quadraticCurveTo(300,470,348,434);brush.stroke();
}
function illustratedPortrait(variant,shirt){
  const c=document.createElement('canvas');c.width=c.height=600;
  const b=c.getContext('2d');b.fillStyle=['#e8dbba','#d7e3dc','#dbcbc0','#ced6d6'][variant];b.fillRect(0,0,600,600);
  paintPerson(b,variant,shirt);return c.toDataURL('image/jpeg',.87);
}
function illustratedGroup(){
  const c=document.createElement('canvas');c.width=1000;c.height=650;const b=c.getContext('2d');
  b.fillStyle='#e9e0cc';b.fillRect(0,0,1000,650);b.fillStyle='#cbceae';b.fillRect(0,450,1000,200);
  for(const [v,x,y,s,color] of [[2,10,55,.93,'#aa6e58'],[3,412,56,.93,'#586f6c'],[1,280,213,.76,'#66809a']]){
    b.save();b.translate(x,y);b.scale(s,s);paintPerson(b,v,color);b.restore();
  }
  return c.toDataURL('image/jpeg',.88);
}
