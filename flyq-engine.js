export const VOW_MAP = {'ą':'a','ę':'e','ó':'o','ź':'z','ż':'z','ś':'s','ć':'c','ń':'n','ł':'l'};
export function normChar(c){ return VOW_MAP[c]||c; }
export function tokenize(text){
  const m = text.toLowerCase().match(/[a-ząćęłńóśźż\w']+/g);
  return (m||[]).map(t=>t.replace(/^['-]+|['-]+$/g,'')).filter(Boolean);
}
const VOW = new Set(['a','e','i','o','u','y','ą','ę','ó']);
export function vowelSeq(s){
  const out=[];
  for(const ch of s.toLowerCase()){ if(VOW.has(ch)) out.push(normChar(ch)); }
  return out;
}
export function syllCountWord(w){
  w=w.toLowerCase();
  const m=w.match(/[aeiouyąęó]+/g);
  return m?m.length:1;
}
export function tail(s,n){
  const v=vowelSeq(s);
  return v.slice(-n).join('');
}
export function analyze(name,text){
  const t0=performance.now();
  const tokens=tokenize(text);
  const N=tokens.length;
  const V=new Set(tokens).size;
  const TTR=N?V/N*100:0;
  const rawLines=text.split(/\n+/).map(l=>l.replace(/\[.*?\]|\(.*?\)/g,'').trim()).filter(l=>l.length>1);
  const lines=rawLines.slice(0,400);
  let syllTotal=0, wordTotal=0;
  const details=lines.map(l=>{
    const ws=tokenize(l);
    let s=0; for(const w of ws) s+=syllCountWord(w);
    syllTotal+=s; wordTotal+=ws.length;
    return {text:l, vowels:vowelSeq(l).join(''), t2:tail(l,2), t3:tail(l,3), syll:s, words:ws.length};
  });
  const L=details.length||1;
  let rhymeHits=0, multiHits=0;
  for(let i=0;i<details.length;i++){
    let r=false,m=false;
    for(const j of [i+1,i+2]){
      if(j>=details.length) continue;
      if(details[i].t2 && details[i].t2===details[j].t2) r=true;
      if(details[i].t3 && details[i].t3.length>=3 && details[i].t3===details[j].t3) m=true;
    }
    if(r) rhymeHits++; if(m) multiHits++;
  }
  const rhymeDensity=details.length?rhymeHits/details.length*100:0;
  const multiDensity=details.length?multiHits/details.length*100:0;
  const avgSyll=syllTotal/L, avgWords=wordTotal/L;
  const variance=details.reduce((a,d)=>a+Math.pow(d.syll-avgSyll,2),0)/L;
  const flowScore=Math.max(0,100-variance*6);
  const compressScore=Math.max(0,Math.min(100,(avgSyll-4)/10*100));
  const groups={};
  details.forEach((d,i)=>{ if(!d.t2) return; (groups[d.t2]=groups[d.t2]||[]).push(i); });
  return {name,N,V,TTR,lines:details,L,avgSyll,avgWords,rhymeDensity,multiDensity,flowScore,compressScore,groups,ms:performance.now()-t0};
}
export function verdict(a,b){
  const d=[];
  d.push(a.TTR>b.TTR? a.name+' ma bogatsze słownictwo (TTR '+a.TTR.toFixed(1)+'% vs '+b.TTR.toFixed(1)+'%)' : b.name+' ma bogatsze słownictwo (TTR '+b.TTR.toFixed(1)+'% vs '+a.TTR.toFixed(1)+'%)');
  d.push(a.rhymeDensity>b.rhymeDensity? a.name+' gęściej rymuje ('+a.rhymeDensity.toFixed(0)+'% vs '+b.rhymeDensity.toFixed(0)+'%)' : b.name+' gęściej rymuje ('+b.rhymeDensity.toFixed(0)+'% vs '+a.rhymeDensity.toFixed(0)+'%)');
  d.push(a.multiDensity>b.multiDensity? a.name+' wygrywa multisylabiki ('+a.multiDensity.toFixed(0)+'% vs '+b.multiDensity.toFixed(0)+'%)' : b.name+' wygrywa multisylabiki ('+b.multiDensity.toFixed(0)+'% vs '+a.multiDensity.toFixed(0)+'%)');
  d.push(a.avgSyll>b.avgSyll? a.name+' mocniej kompresuje sylaby ('+a.avgSyll.toFixed(1)+'/wers vs '+b.avgSyll.toFixed(1)+'/wers)' : b.name+' mocniej kompresuje sylaby ('+b.avgSyll.toFixed(1)+'/wers vs '+a.avgSyll.toFixed(1)+'/wers)');
  const score=(x)=>x.TTR*0.35+x.rhymeDensity*0.3+x.multiDensity*0.25+x.compressScore*0.1;
  const w=score(a)>=score(b)?a:b;
  return d.join('. ')+'. Werdykt: '+w.name+' bierze pojedynek stylów.';
}
