import {analyze, verdict} from "./flyq-engine.js";
import {CORPUS, ARTISTS} from "./demo-corpus.js";
import {geniusTop10Lyrics} from "./genius.js";
const $=id=>document.getElementById(id);
const dl=$("artList"); dl.innerHTML=ARTISTS.map(a=>'<option value="'+a+'">').join("");
const CACHE_KEY="flyq_cache_v1";
const cache=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
function saveCache(){ try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache));}catch(e){} }
function fill(name,ta){ if(CORPUS[name]) ta.value=CORPUS[name]; }
$("aText").value=CORPUS["Kaz Bałagane"]; $("bText").value=CORPUS["Belmondawg"];
$("aInput").addEventListener("change",e=>fill(e.target.value,$("aText")));
$("bInput").addEventListener("change",e=>fill(e.target.value,$("bText")));
const PAL=["#ff2b2b","#00f0ff","#ffe600","#7CFF00","#ff7ce5","#9d7bff","#ff8c00","#00ff9d"];
function tailColor(t2){
  if(!t2) return "transparent";
  let h=0; for(const c of t2) h=(h*31+c.charCodeAt(0))>>>0;
  return PAL[h%PAL.length]+"44";
}
function heat(el,res){
  el.innerHTML="";
  const MAXH=80;
  res.lines.slice(0,MAXH).forEach(d=>{
    const s=document.createElement("span");
    s.textContent=d.text+" \n";
    s.style.background=tailColor(d.t2);
    s.title="v:["+d.vowels+"] t2:"+d.t2+" t3:"+d.t3+" syl:"+d.syll;
    el.appendChild(s);
  });
  if(res.lines.length>MAXH){ const m=document.createElement("div"); m.style.opacity=.6; m.textContent="… +"+(res.lines.length-MAXH)+" wersów (pełny tekst w polu powyżej, metryki liczone na całości)"; el.appendChild(m); }
}
function drawRadar(a,b){
  const c=$("radar"),x=c.getContext("2d");
  const W=c.width,H=c.height,cx=W/2,cy=H/2+10,R=150;
  x.clearRect(0,0,W,H); x.fillStyle="#000"; x.fillRect(0,0,W,H);
  const labels=["TTR\nSŁOWNIK","RYM\nDENSITY","MULTI\nSYLABY","KOMPRESJA\nSYLAB"];
  const vals=q=>[q.TTR,q.rhymeDensity,q.multiDensity,q.compressScore].map(v=>Math.max(0,Math.min(100,v)));
  const A=vals(a),B=vals(b);
  x.strokeStyle="#333"; x.fillStyle="#666"; x.font="10px monospace"; x.textAlign="center";
  for(let ring=1;ring<=4;ring++){
    x.beginPath();
    for(let i=0;i<4;i++){ const ang=-Math.PI/2+i*Math.PI/2; const r=R*ring/4;
      const px=cx+Math.cos(ang)*r,py=cy+Math.sin(ang)*r; i?x.lineTo(px,py):x.moveTo(px,py); }
    x.closePath(); x.stroke();
    x.fillText(String(ring*25),cx+4,cy-R*ring/4);
  }
  for(let i=0;i<4;i++){ const ang=-Math.PI/2+i*Math.PI/2;
    x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(ang)*R,cy+Math.sin(ang)*R); x.stroke();
    x.fillStyle="#aaa"; x.fillText(labels[i],cx+Math.cos(ang)*(R+34),cy+Math.sin(ang)*(R+30));
  }
  function poly(V,col,fill){ x.beginPath();
    V.forEach((v,i)=>{ const ang=-Math.PI/2+i*Math.PI/2; const r=R*v/100;
      const px=cx+Math.cos(ang)*r,py=cy+Math.sin(ang)*r; i?x.lineTo(px,py):x.moveTo(px,py); });
    x.closePath(); x.fillStyle=fill; x.fill(); x.strokeStyle=col; x.lineWidth=2; x.stroke(); x.lineWidth=1;
    V.forEach((v,i)=>{ const ang=-Math.PI/2+i*Math.PI/2; const r=R*v/100;
      x.fillStyle=col; x.beginPath(); x.arc(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,3,0,7); x.fill(); });
  }
  poly(A,"#ff2b2b","rgba(255,43,43,.18)"); poly(B,"#00f0ff","rgba(0,240,255,.15)");
  x.fillStyle="#ff2b2b"; x.fillRect(14,12,28,10); x.fillStyle="#ddd"; x.fillText(a.name,110,20);
  x.fillStyle="#00f0ff"; x.fillRect(14,28,28,10); x.fillStyle="#ddd"; x.fillText(b.name,110,36);
}
function bars(a,b){
  const rows=[["TTR %","TTR"],["Gęstość rymu %","rhymeDensity"],["Multisyllabic %","multiDensity"],["Kompresja (sylab/wers)","avgSyll",14],["Flow score","flowScore"],["Słów / typów","N",null,true]];
  let h="";
  const defs=[["Bogactwo słownika (TTR)","TTR",v=>v.toFixed(1)+"%"],["Gęstość rymów","rhymeDensity",v=>v.toFixed(1)+"%"],["Multisylabiki","multiDensity",v=>v.toFixed(1)+"%"],["Śr. sylab / wers","avgSyll",v=>v.toFixed(2)]];
  for(const [lab,k,fmt] of defs){
    const va=a[k],vb=b[k]; const mx=Math.max(va,vb,1);
    h+='<div><div class="bar-row"><b>'+lab+'</b><br>'+a.name+': '+fmt(va)+'<div class="bar-track"><div class="bar-fill fill-a" style="width:'+(va/mx*100).toFixed(1)+'%"></div></div>'+b.name+': '+fmt(vb)+'<div class="bar-track"><div class="bar-fill fill-b" style="width:'+(vb/mx*100).toFixed(1)+'%"></div></div></div></div>';
  }
  $("bars").innerHTML=h;
  $("table").innerHTML='<table><tr><th></th><th>'+a.name+'</th><th>'+b.name+'</th></tr><tr><td>Wyrazy N / unikalne V</td><td>'+a.N+' / '+a.V+'</td><td>'+b.N+' / '+b.V+'</td></tr><tr><td>Wersy</td><td>'+a.L+' (śr. '+a.avgWords.toFixed(1)+' sł./wers)</td><td>'+b.L+' (śr. '+b.avgWords.toFixed(1)+' sł./wers)</td></tr><tr><td>TTR</td><td>'+a.TTR.toFixed(2)+'%</td><td>'+b.TTR.toFixed(2)+'%</td></tr><tr><td>Rhyme density</td><td>'+a.rhymeDensity.toFixed(1)+'%</td><td>'+b.rhymeDensity.toFixed(1)+'%</td></tr><tr><td>Multi density</td><td>'+a.multiDensity.toFixed(1)+'%</td><td>'+b.multiDensity.toFixed(1)+'%</td></tr></table>';
}
window.runBattle=function(){
  const na=$("aInput").value.trim()||"A", nb=$("bInput").value.trim()||"B";
  const ta=$("aText").value, tb=$("bText").value;
  const t0=performance.now(); let hits=[];
  function get(n,t){
    const k=n+"::"+t.length+"::"+t.slice(0,64);
    if(cache[k]){ hits.push(n); return {...cache[k],cached:true}; }
    const r=analyze(n,t); cache[k]={...r,ms:0}; return {...r,cached:false};
  }
  const A=get(na,ta), B=get(nb,tb); saveCache();
  const ms=(performance.now()-t0).toFixed(1);
  drawRadar(A,B); bars(A,B);
  $("verdict").textContent=verdict(A,B);
  $("ha").textContent=na; $("hb").textContent=nb;
  heat($("heatA"),A); heat($("heatB"),B);
  $("status").textContent=(hits.length?("CACHE HIT ["+hits.join(", ")+"] ~0.3ms · "):"COMPUTE fresh · ")+"battle "+ms+"ms · N:"+A.N+"/"+B.N;
};
$("runBtn").onclick=runBattle;
async function loadTop10(side){
  const inp=side==="A"?$("aInput"):$("bInput"), ta=side==="A"?$("aText"):$("bText");
  const btn=side==="A"?$("gA"):$("gB");
  btn.disabled=true; const old=btn.textContent; btn.textContent="⏳ POBIERAM…";
  $("gStatus").textContent="start: "+inp.value;
  try{
    const t0=performance.now();
    const res=await geniusTop10Lyrics(inp.value, m=>{ $("gStatus").textContent=m; });
    ta.value=res.combined||ta.value;
    inp.value=res.artist||inp.value;
    $("trackPanel").hidden=false;
    $("tracks").innerHTML+=" <b style='color:"+(side==="A"?"#ff2b2b":"#00f0ff")+"'>"+res.artist+"</b> ("+res.tracks.length+" utworów"+(res.cached?", cache":"")+"):<br>"+res.tracks.map((t,i)=>(i+1)+". "+t.title+" <span style='opacity:.5'>"+t.lines+" wersów</span>").join("<br>")+"<br><br>";
    $("gStatus").textContent=(res.cached?"CACHE HIT":"Pobrano "+res.tracks.length+" utworów")+" w "+((performance.now()-t0)/1000).toFixed(1)+"s → RUN BATTLE!";
    runBattle();
  }catch(e){ $("gStatus").textContent="Błąd: "+String(e).slice(0,200); }
  btn.disabled=false; btn.textContent=old;
}
$("gA").onclick=()=>loadTop10("A");
$("gB").onclick=()=>loadTop10("B");
runBattle();
