export async function geniusSearchArtist(name){
  const sf = root.superFetch;
  const r = await sf("https://genius.com/api/search/multi?q="+encodeURIComponent(name));
  const j = await r.json();
  const secs = j.response?.sections||[];
  const ah = secs.find(s=>s.type==="artist")?.hits?.[0];
  if(ah) return {id:ah.result.id, name:ah.result.name, url:ah.result.url};
  const th = secs.find(s=>s.type==="top_hit")?.hits?.find(h=>h.type==="artist");
  if(th) return {id:th.result.id, name:th.result.name, url:th.result.url};
  const sh = secs.find(s=>s.type==="song")?.hits?.[0]?.result;
  if(sh) return {id:null, name:sh.primary_artist?.name||name, url:null, fallbackSongs:secs.find(s=>s.type==="song").hits.map(h=>({title:h.result.full_title, url:h.result.url}))};
  throw new Error("Nie znaleziono artysty");
}
export async function geniusTopSongs(artistId, per=10){
  const sf = root.superFetch;
  const out=[];
  for(const page of [1,2]){
    const r = await sf("https://genius.com/api/artists/"+artistId+"/songs?sort=popularity&per_page="+per+"&page="+page);
    const j = await r.json();
    for(const s of (j.response?.songs||[])) out.push({title:s.full_title, url:s.url});
    if(out.length>=per || !(j.response?.next_page)) break;
  }
  return out.slice(0,per);
}
export function extractLyrics(html){
  const doc = new DOMParser().parseFromString(html,"text/html");
  const conts=[...doc.querySelectorAll('[data-lyrics-container="true"]')];
  let t = conts.map(d=>{
    const c=d.cloneNode(true);
    c.querySelectorAll("br").forEach(b=>b.replaceWith("\n"));
    c.querySelectorAll("div,p").forEach(el=>el.append("\n"));
    let x=c.innerText||c.textContent||"";
    return x;
  }).join("\n");
  t=t.replace(/^\d+ Contributors.*?Lyrics/s,"");
  t=t.replace(/([^\n])(\[[^\[\]]+\])/g,"$1\n$2");
  t=t.split("\n").map(l=>l.trim()).filter(l=>l && !/^\d+ Contributors/.test(l)).join("\n");
  return t.trim();
}
export async function geniusTop10Lyrics(name, onProg){
  const sf = root.superFetch;
  const key="flyq_genius_v2_"+name.toLowerCase().trim();
  try{ const c=JSON.parse(localStorage.getItem(key)||"null"); if(c&&c.combined){ onProg?.("CACHE HIT: "+c.tracks.length+" utworów ("+c.combined.length+" znaków)"); return {...c, cached:true}; } }catch(e){}
  const a = await geniusSearchArtist(name);
  onProg?.("Artysta: "+a.name+" → pobieram top 10…");
  let songs = a.fallbackSongs?.slice(0,10) || await geniusTopSongs(a.id, 10);
  const tracks=[]; let combined="";
  for(let i=0;i<songs.length;i++){
    onProg?.("Utwór "+(i+1)+"/"+songs.length+": "+songs[i].title);
    try{
      const html=await sf(songs[i].url).then(r=>r.text());
      let lyr=extractLyrics(html);
      lyr=lyr.split("\n").map(l=>l.trim()).filter(l=>l && !/^\d+ Contributors/.test(l)).join("\n");
      if(lyr.length>300){ tracks.push({title:songs[i].title, url:songs[i].url, lines:lyr.split("\n").length}); combined+="\n\n["+songs[i].title+"]\n"+lyr; }
    }catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  combined=combined.trim().split("\n").slice(0,450).join("\n");
  const res={artist:a.name, tracks, combined};
  try{ localStorage.setItem(key, JSON.stringify(res)); }catch(e){}
  return {...res, cached:false};
}
