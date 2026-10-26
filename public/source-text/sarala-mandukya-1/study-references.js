/* Curated references belong only to authored study assistance. Source text never passes here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyReferences=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const letters=/[\p{L}\p{M}]/u;
 const dhatuURL=entry=>/^https:\/\/ashtadhyayi\.com\/dhatu\/\d+\.\d+$/.test(entry?.url||'')?entry.url:null;
 const sutraURL=id=>'https://ashtadhyayi.com/sutraani/'+id.split('.').join('/');
 function render(text,spans=[],roots={},terms=[]){
  text=String(text??'');let out='';
  const marks=spans.filter(s=>Number.isInteger(s.start)&&s.start>=0&&text.slice(s.start,s.start+s.text.length)===s.text&&roots[s.root]).map(s=>({...s,end:s.start+s.text.length}));
  const words=[...new Set(terms.filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(let i=0;i<text.length;){
   const reference=marks.find(s=>s.start===i);
   if(reference){
    const root=roots[reference.root],entries=root.alternatives||[root];
    out+=entries.map(entry=>{const url=dhatuURL(entry),title=entry.label+' · धातुपाठे पठतु';return url?`<a class="dhatu-link" href="${url}" target="_blank" rel="noopener" title="${esc(title)}" aria-label="${esc(title)}">${esc(entry.label)} <span aria-hidden="true">↗</span></a>`:esc(reference.text);}).join(' / ');
    if(root.alternatives)out+=` <span class="subtle-note">(${esc(root.ambiguityNote)})</span>`;
    out+=esc(reference.suffix||'');i=reference.end;continue;
   }
   const word=words.find(w=>text.startsWith(w,i)&&(i===0||!letters.test(text[i-1]))&&(i+w.length===text.length||!letters.test(text[i+w.length]))&&!marks.some(s=>s.start<i+w.length&&s.end>i));
   if(word){out+=`<strong class="taught-term">${esc(word)}</strong>`;i+=word.length;}else{out+=esc(text[i]);i++;}
  }
  return out;
 }
 return {render,dhatuURL,sutraURL};
});
