/* Publisher-paired commentary, independent works, and the अध्ययनसाहाय्यम् chip. */
window.MaitreyiCommentaries={create({stored,pairs,closeStudy,openStudy,openPanel,activeId,panelUnit}){
 const q=s=>document.querySelector(s),main=q('#reading');let selected=null,split=false,study=false,view='',generation=0;
 const base=new URL('.',(document.querySelector('script[src$="maitreyi-commentaries.js"]')||document.currentScript).src);
 const getJSON=url=>fetch(new URL(url,base)).then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
 let lastStudy=null,tikaSarala=null,tikaPada=null,vartikaIndex=null,vartikaPada={},pada=false,currentVerseUnit=null,followFrame=0,pinnedUnit=null,followTimer=0;const vartikaUnits=new Map(),verseRows=new Map();
 // Like Advaita Sharada's as-prefs: remember the chosen commentary, पार्श्वे layout and study chip.
 try{const saved=JSON.parse(localStorage.getItem('vp-commentary-prefs')||'{}');if(['anandagiri','vartika'].includes(saved.selected))selected=saved.selected;split=saved.split===true&&!!selected;study=saved.study===true;}catch{}
 const savePrefs=()=>{try{localStorage.setItem('vp-commentary-prefs',JSON.stringify({selected,split,study}));}catch{}};
 const names={anandagiri:'आनन्दगिरिटीका',vartika:'बृहदारण्यकोपनिषद्भाष्यवार्तिकम्'};
 const bar=document.createElement('nav');bar.className='vy-chips';bar.setAttribute('aria-label','व्याख्याः');
 const label=document.createElement('span');label.textContent='व्याख्याः —';bar.append(label);
 const buttons={};for(const [work,name]of Object.entries(names)){const b=document.createElement('button');b.textContent=name;b.dataset.commentary=work;b.setAttribute('aria-pressed','false');b.onclick=()=>{selected=selected===work?null:work;refresh();};buttons[work]=b;bar.append(b);}
 const studyChip=document.createElement('button');studyChip.className='study-chip';studyChip.textContent='अध्ययनसाहाय्यम्';studyChip.setAttribute('aria-pressed','false');
 /* R-021 (R1-069): the chip shows whether the panel is open, however it was opened; a tap closes an open panel */
 studyChip.onclick=()=>{const open=!q('#study-dialog')?.hidden;study=!open;savePrefs();if(open){closeStudy();return;}if(view){currentVerseUnit=null;followVerse();}else openStudy(activeId());};bar.append(studyChip);
 const dialog=q('#study-dialog');if(dialog)new MutationObserver(()=>studyChip.setAttribute('aria-pressed',String(!dialog.hidden))).observe(dialog,{attributes:true,attributeFilter:['hidden']});
 const side=document.createElement('button');side.className='parshve';side.textContent='पार्श्वे';side.setAttribute('aria-pressed','false');side.onclick=()=>{split=!split;if(split&&!selected&&!study)selected='anandagiri';refresh();};bar.append(side);main.prepend(bar);
 const independent=document.createElement('section');independent.id='commentary-view';independent.hidden=true;main.append(independent);
 const nav=document.createElement('nav');nav.className='commentary-nav';for(const [hash,name] of [['vartikam','भाष्यवार्तिकम्']]){const a=document.createElement('a');a.href='#'+hash;a.textContent=name;nav.append(a);}q('#lesson-list').after(nav);
 function cleanup(){main.querySelectorAll('.b1-pair').forEach(w=>{w.before(w.firstElementChild);w.remove();});main.querySelectorAll('.b1-commentary').forEach(e=>e.remove());}
 function credit(pack){const p=document.createElement('p');p.className='source-credit';const a=document.createElement('a');a.textContent=pack.credit+' ↗';a.href=pack.paragraphs[0].source_url;a.target='_blank';a.rel='noopener';p.append(a);return p;}
 function paragraph(row,verse=false){if(!verse&&pada&&tikaPada?.[row.id])return tikaSplit(row);const p=document.createElement(verse?'p':'div');p.className=verse?'unit commentary-verse':'vy-unit';p.id=row.id;p.dataset.sourceId=row.id;p.dataset.sourceHash=row.sha256;
 // Preserve the exact stored text; only existing line breaks become HTML breaks.
 const append=(node,text)=>text.split('\n').forEach((line,i)=>{if(i)node.append(document.createElement('br'));node.append(document.createTextNode(line));});
 const presentation=pairs.presentation?.[row.id];let cursor=0;
 if(presentation){if(presentation.sha256!==row.sha256)throw Error('Presentation/source mismatch');for(const range of presentation.pratikas){if(!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<cursor||range.end<=range.start||range.end>row.text.length)throw Error('Invalid publisher span');append(p,row.text.slice(cursor,range.start));const span=document.createElement('span');span.className='pratika';append(span,row.text.slice(range.start,range.end));p.append(span);cursor=range.end;}}
 append(p,row.text.slice(cursor));return p;}
 // पदच्छेदः of a ṭīkā paragraph: one split line per printed line; a pratīka line stays marked (Aditya, 2026-10-24).
 function tikaSplit(row){const p=document.createElement('div');p.className='vy-unit pada-view';p.id=row.id;p.dataset.sourceId=row.id;p.dataset.sourceHash=row.sha256;const starts=new Set((pairs.presentation?.[row.id]?.pratikas||[]).map(r=>r.start)),split=tikaPada[row.id];let pos=0,k=0;
  for(const line of row.text.split('\n')){const start=pos;pos+=line.length+1;if(!line.replace(/\u00ad/g,'').trim())continue;if(k)p.append(document.createElement('br'));const text=split[k++]??line;if(starts.has(start)){const s=document.createElement('span');s.className='pratika';s.textContent=text;p.append(s);}else p.append(document.createTextNode(text));}return p;}
 // Our simple-Sanskrit explanation sits under its ṭīkā paragraph, labelled so it is never read as Ānandagiri's words.
 function saralaNote(id){const n=tikaSarala?.[id];if(!n)return null;const d=document.createElement('div');d.className='tika-sarala';d.innerHTML=`<span class="tika-sarala-label">सरलव्याख्या</span> ${n.html}`;return d;}
 function block(title,rows,verse=false){const d=document.createElement('details');d.className='vy-block b1-commentary';const s=document.createElement('summary');s.textContent=title;d.append(s);for(const r of rows){d.append(paragraph(r,verse));const note=!verse&&saralaNote(r.id);if(note)d.append(note);}return d;}
 async function refresh(){const token=++generation;cleanup();savePrefs();for(const [work,b]of Object.entries(buttons))b.setAttribute('aria-pressed',String(selected===work));studyChip.setAttribute('aria-pressed',String(!q('#study-dialog')?.hidden));side.setAttribute('aria-pressed',String(split));main.classList.toggle('commentary-split',split&&!view&&!!selected);if(view||!selected)return;
 try{const work=selected,pack=await stored.load(work);if(work==='anandagiri'&&!tikaSarala)tikaSarala=await getJSON('runtime/tika-sarala.json').catch(()=>({}));if(work==='anandagiri'&&pada&&!tikaPada)tikaPada=await getJSON('runtime/tika-padaccheda.json').catch(()=>({}));if(token!==generation||view)return;const byId=new Map(pack.paragraphs.map(r=>[r.id,r]));
 if(work==='anandagiri'){for(const pair of pairs.pairs){const anchor=document.getElementById(pair.base);if(!anchor)throw Error('Missing paired source');const rows=pair.tika.map(id=>{const row=byId.get(id);if(!row)throw Error('Missing paired commentary');return row;});const wrapper=document.createElement('div');wrapper.className='b1-pair';anchor.before(wrapper);wrapper.append(anchor,block(names[work],rows));}}
 else{const d=block(names.vartika,pack.paragraphs,true);const a=document.createElement('a');a.href='#vartikam';a.textContent='भाष्यवार्तिकम् ↗';d.prepend(a);q('#lesson-content').append(d);}
 // Advaita Sharada keeps blocks closed in पार्श्वे; the reader opens each one.
 window.ScriptDisplay?.apply();
 }catch{if(token===generation){const p=document.createElement('p');p.className='b1-commentary source-status';p.textContent='पाठः अधुना न प्राप्तः।';main.append(p);}}}
 // While the study chip is on, the right-hand panel follows the mantra being read.
 function onActive(id){if(study&&!view&&id&&panelUnit()!==id)openStudy(id);}
 async function openVartikaStudy(unit,verseLabel){
  let u=vartikaUnits.get(unit);if(!u){u=await getJSON(`runtime/vartika-study/${unit}.json`);vartikaUnits.set(unit,u);}
  lastStudy={unit,verseLabel};
  // The verse heads the panel and follows the पदच्छेदः switch, like the reading area.
  const verse=u.paragraphs.map(id=>verseRows.get(id)).filter(Boolean).map(row=>{const n=verseNode(row);n.removeAttribute('id');n.classList.add('study-verse');return n.outerHTML;}).join('');
  /* R-021 (R1-025): the list marks the verse the panel shows; (R1-075) no-change junctions fold, समासः opens */
  document.querySelectorAll('.vy-current').forEach(e=>e.classList.remove('vy-current'));u.paragraphs.forEach(id=>document.getElementById(id)?.classList.add('vy-current'));
  const shape=h=>h.replace(/<h4>(विकारः नास्ति[^<]*)<\/h4>(<p class="study-flow">[\s\S]*?<\/p>)?(<ul>[\s\S]*?<\/ul>)?/g,'<details class="sandhi-none"><summary>$1</summary>$2$3</details>').replace('<details class="study-subsection"><summary>समासः</summary>','<details class="study-subsection" open><summary>समासः</summary>');
  const back=u.paragraphs[0]?`<p class="vy-back"><button class="text-link" data-vy-scroll="${u.paragraphs[0]}">↑ ${verseLabel}</button></p>`:'';
  const html=`<section class="study-group" data-part="vartika">${back}${verse?`<div class="study-verse-box">${verse}</div>`:''}${u.sections.filter(s=>s.name!=='पदच्छेदः').map((s,i)=>`<details class="study-section"${i===0?' open':''}><summary>${s.name}</summary><div class="study-section-content">${shape(s.html)}</div></details>`).join('')}</section>`;
  openPanel(`भाष्यवार्तिकम् · ${verseLabel} · अध्ययनसाहाय्यम्`,html);
 }
 async function route(hash){const next=hash==='vartikam'?hash:'';
 // Vārtikasāra is withheld until proofread (Aditya, 2026-10-16).
 if(!next&&!view)return false;
 ++generation;cleanup();view=next;closeStudy();if(view&&location.hash!=='#'+view)history.replaceState(null,'','#'+view);bar.hidden=false;for(const b of [...Object.values(buttons),side])b.hidden=!!view;independent.hidden=!view;for(const e of [...main.children])if(e!==bar&&e!==independent)e.hidden=!!view;
 document.body.classList.toggle('commentary-view-open',!!view);nav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+view));document.querySelectorAll('.lesson-link').forEach(a=>{if(view){a.classList.remove('active');a.removeAttribute('aria-current');}});main.classList.remove('commentary-split');
 if(!view){independent.replaceChildren();await refresh();if(study)openStudy(activeId());return false;}
 independent.replaceChildren();const h=document.createElement('h1');h.textContent=names.vartika;independent.append(h);const sub=document.createElement('p');sub.className='chapter-head';sub.textContent='॥ द्वितीयाध्यायस्य '+(document.body.dataset.scope==='2.5'?'पञ्चमं':'चतुर्थं')+' ब्राह्मणम् ॥';independent.append(sub);
 const token=generation;try{const pack=await stored.load('vartika');if(!vartikaIndex){const idx=await getJSON('runtime/vartika-study/index.json').catch(()=>({paragraphs:{},padaccheda:{}}));vartikaIndex=idx.paragraphs;vartikaPada=idx.padaccheda||{};}if(token!==generation)return true;
 const done=new Set();
 for(let start=0;start<pack.paragraphs.length;start+=30){if(token!==generation)return true;const f=document.createDocumentFragment();
  pack.paragraphs.slice(start,start+30).forEach((row,k)=>{verseRows.set(row.id,row);f.append(verseNode(row));const unit=vartikaIndex[row.id],next=pack.paragraphs[start+k+1];
   // One अध्ययनसाहाय्यम् button per study unit, under its last verse (a कुलकम् spans several verses).
   if(unit&&!done.has(unit)&&vartikaIndex[next?.id]!==unit){done.add(unit);const label=([...row.text.matchAll(/।।\s*([०-९]+)\s*।।/g)].pop()||[])[1]||'';/* the last verse may carry the brāhmaṇa colophon after its number */const b=document.createElement('button');b.className='study-pill vartika-study-pill';b.textContent='अध्ययनसाहाय्यम्';b.dataset.vstudy=unit;b.onclick=()=>{pinnedUnit=unit;currentVerseUnit=unit;openVartikaStudy(unit,label?'श्लोकः '+label:unit);};f.append(b);}});
  independent.append(f);await new Promise(r=>setTimeout(r,0));}
 independent.append(credit(pack));window.ScriptDisplay?.apply();if(study){currentVerseUnit=null;followVerse();}}catch{const p=document.createElement('p');p.textContent='पाठः अधुना न प्राप्तः।';independent.append(p);}return true;
 }
 // पदच्छेदः for a verse: the split words of each printed verse in it, from its study unit.
 function verseNode(row){if(!pada||!vartikaPada[row.id])return paragraph(row,true);const p=document.createElement('p');p.className='unit commentary-verse pada-view';p.id=row.id;p.dataset.sourceId=row.id;
  const nums=[...row.text.matchAll(/।।\s*([०-९]+)\s*(?:।।|$)/g)].map(m=>m[1]);vartikaPada[row.id].forEach((halves,i)=>{halves.forEach((h,j)=>{if(i||j)p.append(document.createElement('br'));p.append(document.createTextNode(h+(j<halves.length-1?' ॥':(nums[i]?` ॥ ${nums[i]} ॥`:' ॥'))));});});return p;}
 function setPada(v){pada=v;if(view!=='vartikam')return;for(const [id,row]of verseRows){const old=document.getElementById(id);if(old)old.replaceWith(verseNode(row));}if(lastStudy&&document.querySelector('.study-group[data-part="vartika"]'))openVartikaStudy(lastStudy.unit,lastStudy.verseLabel);window.ScriptDisplay?.apply();}
 // With the study chip on, the panel follows the verse at the top of the reading area.
 function followVerse(){if(!study||view!=='vartikam'||followFrame)return;followFrame=requestAnimationFrame(()=>{followFrame=0;const top=(q('.topbar')?.getBoundingClientRect().bottom||0)+(bar.getBoundingClientRect().height||0)+12;
  /* a pinned verse holds the panel until it is more than one screen away */
  if(pinnedUnit){const own=[...independent.querySelectorAll('.commentary-verse')].filter(e=>vartikaIndex?.[e.id]===pinnedUnit);const r=own.length?{top:own[0].getBoundingClientRect().top,bottom:own.at(-1).getBoundingClientRect().bottom}:null;if(r&&r.bottom>-innerHeight&&r.top<2*innerHeight)return;pinnedUnit=null;}
  const v=[...independent.querySelectorAll('.commentary-verse')].find(e=>e.getBoundingClientRect().bottom>top&&vartikaIndex?.[e.id]);if(!v)return;const unit=vartikaIndex[v.id];if(unit===currentVerseUnit)return;
  clearTimeout(followTimer);followTimer=setTimeout(()=>{if(pinnedUnit)return;currentVerseUnit=unit;const nums=[...(verseRows.get(v.id)?.text||'').matchAll(/।।\s*([०-९]+)\s*(?:।।|$)/g)].map(m=>m[1]);openVartikaStudy(unit,nums.length?'श्लोकः '+nums.join('–'):unit);},300);});}
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-vy-scroll]');if(!b)return;document.getElementById(b.dataset.vyScroll)?.scrollIntoView({block:'center',behavior:'smooth'});});
 addEventListener('scroll',followVerse,{passive:true});
 // The ṭīkā paragraphs paired with one mantra's bhāṣya, for the study panel.
 function tikaPairsFor(unit){return pairs.pairs.filter(pr=>document.getElementById(pr.base)?.closest('[data-lesson]')?.dataset.lesson===unit);}
 function hasTika(unit){return tikaPairsFor(unit).length>0;}
 async function tikaFor(unit){const pack=await stored.load('anandagiri');if(!tikaSarala)tikaSarala=await getJSON('runtime/tika-sarala.json').catch(()=>({}));if(pada&&!tikaPada)tikaPada=await getJSON('runtime/tika-padaccheda.json').catch(()=>({}));const byId=new Map(pack.paragraphs.map(r=>[r.id,r])),box=document.createElement('div');
  for(const pr of tikaPairsFor(unit))for(const id of pr.tika){const row=byId.get(id);if(!row)continue;const n=paragraph(row);n.removeAttribute('id');n.classList.add('study-tika');box.append(n);const note=saralaNote(id);if(note)box.append(note);}box.append(credit(pack));return box.innerHTML;}
 function studyOff(){study=false;savePrefs();studyChip.setAttribute('aria-pressed','false');}
 return {route,refresh,onActive,setPada,studyOff,hasTika,tikaFor,get active(){return !!view;}};
}};
