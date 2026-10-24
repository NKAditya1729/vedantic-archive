/* Continuous BU 2.4 reader. Source delivery follows the active live or verified stored-source profile.
 * Reading alignments are small; authored study banks load on first opening. */
(() => {
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deva=s=>String(s).replace(/\d/g,c=>'०१२३४५६७८९'[c]);
const base=new URL('.',document.currentScript.src), cache=new Map(), studies=new Map(), research=new Map(), loaded=new Map();
const panelLayers=new Map();
const media=matchMedia('(max-width:900px)');
let sourceClient=LiveSource,storedClient=null,commentaries=null;
let manifest,reading,results=[],active='2.4.0',panelId=null,panelResearch=false,panelRequest=0,routeRequest=0,sourceBusy=false,pada=false,spy=null,scrollFrame=0;
let lastFocus=null,ready=false,studyPart='mula';
const getStore=(k,f)=>{try{return JSON.parse(localStorage.getItem('vp-'+k))??f;}catch{return f;}};
const setStore=(k,v)=>{try{localStorage.setItem('vp-'+k,JSON.stringify(v));}catch{}};
let colors=getStore('colors',true)!==false,size=Number(getStore('size',20));
if(!Number.isFinite(size)||size<16||size>32)size=20;
function json(path){if(!cache.has(path))cache.set(path,fetch(new URL(path,base),{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('पाठः न प्राप्तः');return r.json();}).catch(e=>{cache.delete(path);throw e;}));return cache.get(path);}
const section=id=>document.getElementById('unit-'+id);
const record=id=>reading?.units.find(x=>x.id===id);
const meta=id=>manifest?.lessons.find(x=>x.id===id);
const live=id=>loaded.get(id);
const unitName=id=>id==='2.4.0'?'सम्बन्धभाष्यम्':'मन्त्रः '+deva(id.split('.').at(-1));
const hasStudy=id=>!!meta(id)?.runtime?.learner&&!!record(id)?.unit;
function notice(message){$('#source-status').innerHTML=message?`<div class="source-status"><p>${esc(message)}</p></div>`:'';}
function routeURL(id,view='',anchor=''){return '#'+id+(view?'/'+view:'')+(anchor?'/at/'+encodeURIComponent(anchor):'');}
function setRoute(id,view='',anchor='',push=false){const next=routeURL(id,view,anchor);if(location.hash!==next)history[push?'pushState':'replaceState'](null,'',next);}
function markActive(id){active=id;$$('.lesson-link').forEach(a=>{const current=a.dataset.lesson===id;a.classList.toggle('active',current);if(current)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});$$('.reading-unit .mula-box').forEach(box=>box.classList.toggle('source-target',box.closest('[data-lesson]')?.dataset.lesson===id));$$('.reading-unit').forEach(s=>s.classList.toggle('is-current',s.dataset.lesson===id));const col=$('.colophon');if(col)col.hidden=id!==reading?.units.at(-1)?.id;commentaries?.onActive?.(id);}
function readingTop(){const chips=$('.vy-chips');return Math.max($('.topbar').getBoundingClientRect().bottom,chips&&!chips.hidden?chips.getBoundingClientRect().bottom:0);}
function scrollToUnit(id){const el=section(id);if(el){markActive(id);const offset=readingTop()+20;window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-offset,behavior:'instant'});}}
function preservePosition(change){const el=section(active),offset=el?.getBoundingClientRect().top;change();if(el&&offset!=null){const next=section(active);window.scrollBy({top:next.getBoundingClientRect().top-offset,behavior:'instant'});}}
function nav(){ $('#lesson-list').innerHTML=reading.units.map(r=>`<a class="lesson-link${r.id==='2.4.0'?' source-intro':''}" href="#${esc(r.id)}" data-lesson="${esc(r.id)}" aria-label="${esc(unitName(r.id))}">${r.id==='2.4.0'?'सम्बन्धभाष्यम्':deva(r.id.split('.').at(-1))}</a>`).join('');markActive(active);}
function sourceAttributes(r){return `data-live-status="${esc(r.status)}" data-source-id="${esc(r.anchor)}" data-source-hash="${esc(r.actualHash||'')}" data-source-expected="${esc(r.expectedHash||'')}" data-source-request="${esc(r.request_url||'')}" data-source-response="${esc(r.response_url||'')}" data-source-origin="${r.origin_verified===true}" data-source-credentials="${esc(r.credentials||'')}"`;}
function sourceWarning(r){return r.status==='matched'?'':`<p class="source-status">${r.rawText?'मूलस्रोतसि पाठभेदः दृश्यते। अस्य अंशस्य वर्णसङ्केताः पदच्छेदश्च न दर्श्यन्ते।':'अस्य अंशस्य पाठः अधुना न प्राप्तः।'} <a href="${esc(r.source_url)}" target="_blank" rel="noopener">मूलस्रोते पठतु ↗</a></p>`;}
function pill(id,part='mula'){return hasStudy(id)?`<button class="study-pill" data-open-study="${esc(id)}" data-study-part="${part}" aria-controls="study-dialog" aria-expanded="${panelId===id}">अध्ययनसाहाय्यम् · ${part==='mula'?'मूलम्':'भाष्यम्'}</button>`:'';}
function bhashyaHTML(u,anchor,split){
 const html=UnitReader.bhashyaSource(u,split,{sourceOnly:true}),t=document.createElement('template');t.innerHTML=html;
 const intro=/_I\d+$/.test(anchor)&&anchor.includes('_V');
 return (intro?t.content.querySelector('.reading-intro'):t.content.querySelector('.reading-bhashya:not(.reading-intro)'))?.outerHTML||'';
}
function renderUnit(input,result){
 const u=result?.payload?.unit, ranks=new Map((input.lesson?.bhashya||[]).map(b=>[b.id,b.position==='before-mulam'?0:2]));
 const descriptors=(input.source_paragraphs||[]).filter(d=>!['BR_C02_S04','BR_C02_S04_E010'].includes(d.anchor)).sort((a,b)=>(a.target?.kind==='mula'?1:ranks.get(a.anchor)??2)-(b.target?.kind==='mula'?1:ranks.get(b.anchor)??2));
 const records=new Map((result?.paragraphs||[]).map(r=>[r.id,r]));
 let html='';
 for(const d of descriptors){
  if(!['mula','bhashya'].includes(d.target?.kind))continue;
  const r=records.get(d.id);if(!r)continue;
  const matched=r.status==='matched',isMula=d.target.kind==='mula';
  let body='';
  if(isMula){
   body=`<div class="mula-box" id="${esc(d.anchor)}"><p class="mula" ${sourceAttributes(r)}>${matched&&u?.mula?UnitReader.mulaSource(u,pada,{sourceOnly:true}):esc(r.rawText||'')}</p>${pill(input.id)}</div>`;
  }else{
   const prose=matched&&u?.bhashyam?bhashyaHTML(u,d.anchor,pada):`<p class="original reading-bhashya">${esc(r.rawText||'')}</p>`;
   body=`<div class="source-paragraph" id="${esc(d.anchor)}" ${sourceAttributes(r)}>${prose}</div>`;
  }
  html+=body+sourceWarning(r);
 }
 // One study button for the bhāṣya, after the unit's last bhāṣya paragraph (Aditya, 2026-10-23).
 if(descriptors.some(x=>x.target?.kind==='bhashya'))html+=`<div class="intro-study">${pill(input.id,'bhashya')}</div>`;
 const at=reading.units.findIndex(x=>x.id===input.id),prev=reading.units[at-1],next=reading.units[at+1];
 html+=`<nav class="unit-pager" aria-label="मन्त्राः">${prev?`<a href="#${esc(prev.id)}" data-goto="${esc(prev.id)}">← ${esc(unitName(prev.id))}</a>`:'<span></span>'}${next?`<a href="#${esc(next.id)}" data-goto="${esc(next.id)}">${esc(unitName(next.id))} →</a>`:''}</nav>`;
 return `<section class="reading-unit" id="unit-${esc(input.id)}" data-lesson="${esc(input.id)}" aria-label="${esc(unitName(input.id))}">${html}</section>`;
}
function finishReading(){
 const closing=results.at(-1)?.paragraphs?.find(r=>r.id===reading.closing?.id);
 if(closing?.rawText)$('#lesson-content').insertAdjacentHTML('beforeend',`<p class="colophon" id="${esc(closing.anchor)}" ${sourceAttributes(closing)}>${esc(closing.rawText)}</p>`);
 $('#padaccheda-toggle').disabled=!results.some(r=>r.payload?.unit&&UnitReader.canPadaccheda(r.payload.unit,{sourceOnly:true}));
 markActive(active);commentaries?.refresh();applyColors();applySize();annotateCitations();window.ScriptDisplay?.apply();watchSections();
}
function renderReading(){
 $('#lesson-content').innerHTML=reading.units.map((x,i)=>renderUnit(x,results[i])).join('');finishReading();
}
async function mountReading(){
 const content=$('#lesson-content'),offset=section(active)?.getBoundingClientRect().top;
 content.replaceChildren();
 // Parsing and mounting a whole brāhmaṇa at once blocks slower devices. Each
 // verified unit is independent, so yield between complete prose sections.
 for(let i=0;i<reading.units.length;i++){
  content.insertAdjacentHTML('beforeend',renderUnit(reading.units[i],results[i]));
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 finishReading();if(offset!=null)window.scrollBy({top:section(active).getBoundingClientRect().top-offset,behavior:'instant'});
}
function annotateCitations(){
 // Typography only: the exact text nodes remain unchanged when joined.
 for(const p of $$('.reading-bhashya')){const walk=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);
  for(const node of nodes){const text=node.nodeValue;if(!/\((?:बृ\.|छा\.|तै\.|कौ\.|शत\.|मो\.)/.test(text))continue;const re=/\((?:बृ\.|छा\.|तै\.|कौ\.|शत\.|मो\.)[^)]*\)/gu,frag=document.createDocumentFragment();let start=0;for(const m of text.matchAll(re)){frag.append(text.slice(start,m.index));const span=document.createElement('span');span.className='source-citation';span.textContent=m[0];frag.append(span);start=m.index+m[0].length;}frag.append(text.slice(start));node.replaceWith(frag);}
 }
}
function watchSections(){
 spy?.disconnect();spy=new IntersectionObserver(()=>requestScrollSpy(),{rootMargin:'-100px 0px -60% 0px',threshold:0});$$('.reading-unit').forEach(el=>spy.observe(el));requestScrollSpy();
}
function requestScrollSpy(){if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;if(!ready||commentaries?.active||media.matches&&panelId||document.body.classList.contains('paged-reading'))return;const limit=readingTop()+24;let selected=reading.units[0]?.id;for(const r of reading.units){if(section(r.id)?.getBoundingClientRect().top<=limit)selected=r.id;else break;}if(selected){markActive(selected);if(!panelId)setRoute(selected);}});}
async function loadSource(force=false){
 if(sourceBusy)return;sourceBusy=true;notice('अद्वैतशारदायाः पाठः आनीयते…');
 try{
  results=await sourceClient.loadMany([...reading.units,{source_paragraphs:[reading.closing]}],{force});
  loaded.clear();reading.units.forEach((r,i)=>loaded.set(r.id,results[i]));
  const any=results.some(r=>r.paragraphs.some(p=>p.rawText));
  if(!any){$('#source-status').innerHTML='<div class="source-status"><p>मूलस्रोतस्य पाठः अधुना न प्राप्तः।</p><button data-source-retry>पुनः प्रयत्नः</button><a href="https://advaitasharada.sringeri.net/read/brihadaranyaka-bhashya/2/#BR_C02_S04" target="_blank" rel="noopener">अद्वैतशारदायां पठतु ↗</a></div>';return false;}
  await mountReading();notice('');return true;
 }finally{sourceBusy=false;}
}
async function studyUnit(id,asResearch=false,complete=false){
 const metadata=meta(id)?.runtime;if(!metadata)throw Error('पाठः न प्राप्तः');
 const key=id+(asResearch?'/research':'')+(complete?'/complete':''),store=asResearch?research:studies;
 if(!store.has(key))store.set(key,(async()=>{
  const [raw,labels]=await Promise.all([json(asResearch?metadata.research:metadata.learner),json(manifest.reference_labels),asResearch?sourceClient.prefetch(metadata.research_requests||[]):null]);
  const payload=structuredClone(raw);
  if(asResearch&&complete&&metadata.research_parts?.length){
   const merge=(target,value)=>{for(const [key,child]of Object.entries(value||{})){if(child&&typeof child==='object'&&!Array.isArray(child)){if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key]))target[key]={};merge(target[key],child);}else if(Array.isArray(child))target[key]=[...(Array.isArray(target[key])?target[key]:[]),...structuredClone(child)];else target[key]=structuredClone(child);}return target;};
   const parts=await Promise.all(metadata.research_parts.map(json));for(const part of parts)merge(payload.unit,part.unit);
  }
  let source=live(id);
  const pending=(payload.source_paragraphs||[]).filter(d=>!source?.paragraphs.some(r=>r.id===d.id&&r.status==='matched'));
  if(pending.length){const evidence=await sourceClient.load({source_paragraphs:pending});source={paragraphs:[...(source?.paragraphs||[]),...evidence.paragraphs]};}
  const hydrated=await sourceClient.hydrate(payload,source);
  const u=hydrated.payload.unit;u.study_quotations=hydrated.payload.study_quotations||u.study_quotations||{};Object.assign(u,labels);return u;
 })().catch(e=>{store.delete(key);throw e;}));
 return store.get(key);
}
function studySection(item,index,prefix){const key=prefix+'-'+index,opened=index===0;panelLayers.set(key,item);return `<details class="study-section" data-lazy-study="${esc(key)}" data-study-name="${esc(item.name)}"${opened?' open':''}><summary>${esc(item.name)}</summary><div class="study-section-content" id="${esc(key)}"${opened?' data-rendered="true"':''}>${opened?(item.render?item.render():item.content):''}</div></details>`;}
async function fillStudySection(details){const key=details.dataset.lazyStudy,body=document.getElementById(key),item=panelLayers.get(key);if(body&&!body.dataset.rendered&&item){if(item.pending)return item.pending;item.pending=(async()=>{const result=item.render?item.render():item.content;if(result?.then)body.innerHTML='<p>विवरणम् आनीयते…</p>';const html=await result;if(body.isConnected){body.innerHTML=html;body.dataset.rendered='true';window.ScriptDisplay?.apply();}})();try{await item.pending;}catch{if(body.isConnected)body.innerHTML='<p>विवरणम् अधुना न प्राप्तम्। <button data-section-retry>पुनः प्रयत्नः</button></p>';}finally{item.pending=null;}}}
function hydrated(id){return results[reading.units.findIndex(x=>x.id===id)]?.payload?.unit;}
// The panel shows one part at a time; the tabs say whether the mūla or the bhāṣya is being studied.
function studyBody(u){
 panelLayers.clear();const hu=hydrated(panelId),hasMula=!!u.mula,hasTika=!!commentaries?.hasTika?.(panelId);if(!hasMula&&studyPart==='mula')studyPart='bhashya';if(!hasTika&&studyPart==='tika')studyPart='bhashya';
 const tabList=[...(hasMula?[['mula','मूलम्']]:[]),['bhashya','भाष्यम्'],...(hasTika?[['tika','आनन्दगिरिटीका']]:[])];
 const tabs=tabList.length>1?`<div class="study-tabs" role="tablist">${tabList.map(([k,n])=>`<button role="tab" data-study-part-tab="${k}" aria-selected="${studyPart===k}">${n}</button>`).join('')}</div>`:'';
 let html=tabs;
 if(studyPart==='mula'){const layers=UnitReader.mulaLayers(u,{lazy:true}),context=UnitReader.prasanga(u,'panel');
  if(context)layers.unshift({name:'प्रसङ्गः',content:context});
  html+=`<section class="study-group" data-part="mula">${layers.map((l,i)=>studySection(l,i,'mula-study')).join('')}</section>`;}
 else if(studyPart==='tika')html+=`<section class="study-group" data-part="tika"><p class="study-flow">टीका आनीयते…</p></section>`;
 else{const layers=UnitReader.bhashyaLayers(u,{padaccheda:pada,lazy:true}),context=UnitReader.prasanga(u,'panel-bhashya');
  if(context)layers.unshift({name:'प्रसङ्गः',content:context});
  html+=`<section class="study-group" data-part="bhashya">${layers.map((l,i)=>studySection(l,i,'bhashya-study')).join('')}</section>`;}
 return html+`<p class="research-link"><a href="${routeURL(panelId,'vimarshah')}" data-open-research="${esc(panelId)}">विमर्शः ↗</a></p>`;
}
function researchBody(u){panelLayers.clear();const owner=panelId;const layers=UnitReader.researchStudy(u,{lazy:true}).map(item=>({name:item.name,render:async()=>{const full=await studyUnit(owner,true,true);return UnitReader.researchStudy(full,{lazy:true}).find(x=>x.name===item.name)?.render()||'';}}));return `<button class="research-back" data-return-study>← अध्ययनसाहाय्यम्</button>${UnitReader.researchSource(u)}<section class="research-study"><h2>अध्ययनविवरणस्य प्रमाणानि</h2>${layers.map((l,i)=>studySection(l,i+1,'research-study')).join('')}</section>`;}
async function openLexicon(id,{push=true}={}){
 const owner=panelId||active,u=await studyUnit(owner),data=await json(manifest.lexicon);
 id=UnitReader.resolveAnchor(u,id);const aliases=data.lexicon_aliases||data.aliases||{};id=aliases[id]||id;
 const entry=data.entries.find(e=>e.id===id);if(!entry)return;
 const ids=new Set();const visit=v=>{if(!v||typeof v!=='object')return;for(const ref of Object.values(v.source_refs||{}))if(ref?.source_id)ids.add(ref.source_id);Object.values(v).forEach(visit);};visit(entry);
 const payload={entries:[entry],source_paragraphs:(data.source_paragraphs||[]).filter(d=>ids.has(d.id)||ids.has(d.anchor))};
 const prior=results.flatMap(r=>r.paragraphs||[]),pending=payload.source_paragraphs.filter(d=>!prior.some(r=>r.id===d.id&&r.status==='matched'));
 const extra=pending.length?await sourceClient.load({source_paragraphs:pending}):{paragraphs:[]};
 const hydrated=await sourceClient.hydrate(payload,{paragraphs:[...prior,...extra.paragraphs]});
 if(panelId!==owner)return;panelLayers.clear();$('#study-title').textContent=unitName(owner)+' · शब्दपरिचयः';
 $('#drawer-content').innerHTML=`<button class="research-back" data-return-study>← अध्ययनसाहाय्यम्</button>${UnitReader.lexicon({...u,lexicon_updates:hydrated.payload.entries})}`;
 window.ScriptDisplay?.apply();$('#study-dialog').scrollTop=0;setRoute(owner,'adhyayanam',id,push);
}
function panelMode(){const modal=!!panelId&&media.matches;$('#study-dialog').setAttribute('role',modal?'dialog':'region');if(modal)$('#study-dialog').setAttribute('aria-modal','true');else $('#study-dialog').removeAttribute('aria-modal');$('.layout').inert=modal;$('.topbar').inert=modal;}
function openFrame(id,asResearch){
 const sourceTop=section(id)?.getBoundingClientRect().top;if(!panelId||!$('#study-dialog').contains(document.activeElement))lastFocus=document.activeElement;panelId=id;panelResearch=asResearch;document.body.classList.add('study-open');$('#study-dialog').hidden=false;if(sourceTop!=null&&!media.matches)window.scrollBy({top:section(id).getBoundingClientRect().top-sourceTop,behavior:'instant'});
 $('#study-title').textContent=unitName(id)+' · '+(asResearch?'विमर्शः':(studyPart==='tika'?'आनन्दगिरिटीका':id!=='2.4.0'&&studyPart==='mula'?'मूलम्':'भाष्यम्')+' · अध्ययनसाहाय्यम्');
 $$('.study-pill').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.openStudy===id)));panelMode();
}
async function openStudy(id,{asResearch=false,anchor='',push=true,scroll=false,part=null}={}){
 if(!hasStudy(id))return;if(part)studyPart=part;
 const request=++panelRequest,was=panelId===id;openFrame(id,asResearch);setRoute(id,asResearch?'vimarshah':'adhyayanam',anchor,push);
 if(scroll&&!media.matches)scrollToUnit(id);
 $('#drawer-content').innerHTML='<p class="study-flow">अध्ययनसाहाय्यम् आनीयते…</p>';
 try{const u=await studyUnit(id,asResearch);if(request!==panelRequest)return;
  $('#drawer-content').innerHTML=asResearch?researchBody(u):studyBody(u);
  if(!asResearch&&studyPart==='tika')await fillTika(id,request);
  // Research identifiers remain in the DOM for stable links, never in learner prose.
  for(const el of $$('.research-id,pre.compound-tree',$('#drawer-content')))el.hidden=true;
  window.ScriptDisplay?.apply();$('#study-dialog').scrollTop=0;
  if(anchor)await jumpStudy(anchor,{push:false});else if(!was)$('#study-close').focus({preventScroll:true});
 }catch{if(request===panelRequest)$('#drawer-content').innerHTML='<p class="source-status">अध्ययनसाहाय्यम् अधुना न प्राप्तम्। <button data-panel-retry>पुनः प्रयत्नः</button></p>';}
}
// The ṭīkā of this mantra, with its सरलव्याख्या, inside अध्ययनसाहाय्यम् (Aditya, 2026-10-24).
async function fillTika(id,request){const box=$('#drawer-content .study-group[data-part="tika"]');if(!box)return;try{const html=await commentaries.tikaFor(id);if(request!==panelRequest)return;box.innerHTML=html;window.ScriptDisplay?.apply();}catch{if(request===panelRequest)box.innerHTML='<p class="source-status">टीका अधुना न प्राप्ता।</p>';}}
// Vārtika units and other non-mantra study open in the same right-hand panel (Aditya, 2026-10-23).
function openCustomPanel(title,html){if(!panelId)lastFocus=document.activeElement;++panelRequest;panelId='custom';panelResearch=false;document.body.classList.add('study-open');$('#study-dialog').hidden=false;$('#study-title').textContent=title;$('#drawer-content').innerHTML=html;panelMode();window.ScriptDisplay?.apply();$('#study-dialog').scrollTop=0;}
function closeStudy({push=true,focus=true}={}){const id=panelId;if(!id)return;if(id==='custom'){++panelRequest;panelId=null;document.body.classList.remove('study-open');$('#study-dialog').hidden=true;panelMode();if(focus&&lastFocus?.isConnected)lastFocus.focus({preventScroll:true});return;}const sourceTop=section(id)?.getBoundingClientRect().top;++panelRequest;panelId=null;panelResearch=false;document.body.classList.remove('study-open');$('#study-dialog').hidden=true;panelMode();if(sourceTop!=null&&!media.matches)window.scrollBy({top:section(id).getBoundingClientRect().top-sourceTop,behavior:'instant'});$$('.study-pill').forEach(b=>b.setAttribute('aria-expanded','false'));setRoute(id,'','',push);markActive(id);if(focus){const target=lastFocus?.isConnected?lastFocus:section(id)?.querySelector('.study-pill');target?.focus({preventScroll:true});}}
async function jumpStudy(id,{push=true}={}){
 let u=await studyUnit(panelId,panelResearch);id=UnitReader.resolveAnchor(u,id);
 const targetUnit=/^BU\.(2\.4\.\d+)/.exec(id)?.[1];
 if(targetUnit&&targetUnit!==panelId){await openStudy(targetUnit,{anchor:id,push});return;}
 if(id.startsWith('LEX.')){await openLexicon(id,{push});return;}
 const row=UnitReader.grammarEntry(u,id);if(row)id=row.id;
 let target=$('#drawer-content').querySelector('[id="'+CSS.escape(id)+'"]');
 if(!target){const details=$$('[data-lazy-study]',$('#drawer-content'));const preferred=row?details.filter(d=>d.dataset.studyName.includes('व्याकरण')):details;for(const d of preferred){await fillStudySection(d);target=$('#drawer-content').querySelector('[id="'+CSS.escape(id)+'"]');if(target)break;await new Promise(resolve=>setTimeout(resolve,0));}}
 if(!target&&!panelResearch){await openStudy(panelId,{asResearch:true,anchor:id,push});return;}
 if(!target)return;
 for(let p=target;p&&p!==$('#drawer-content');p=p.parentElement)if(p.matches('details'))p.open=true;
 target.scrollIntoView({block:'center',behavior:'instant'});target.classList.add('study-target');setTimeout(()=>target.classList.remove('study-target'),4500);
 setRoute(panelId,panelResearch?'vimarshah':'adhyayanam',id,push);window.ScriptDisplay?.apply();
}
async function openWord(element){
 const id=element.closest('[data-lesson]')?.dataset.lesson||panelId;if(!id)return;
 const tokenIds=(element.dataset.grammarTokens||element.dataset.grammarChoice||'').split(' ').filter(Boolean);
 const mulaIds=(element.dataset.mulaTargets||'').split(' ').filter(Boolean);
 $$('[data-mula-ids]').forEach(el=>el.classList.toggle('pratika-target',el.closest('[data-lesson]')?.dataset.lesson===id&&el.dataset.mulaIds.split(' ').some(t=>mulaIds.includes(t))));
 if(!tokenIds.length)return;
 await openStudy(id,{push:true});if(panelId!==id)return;
 const u=await studyUnit(id),tokens=[...(u.mula?.tokens||[]),...u.bhashyam.sentences.flatMap(s=>s.tokens||[])];
 const choices=tokenIds.map(t=>({id:t,token:tokens.find(x=>x.id===UnitReader.resolveToken(u,t)),row:UnitReader.grammarEntry(u,t)}));
 const row=choices.find(c=>c.row)?.row;if(row)await jumpStudy(row.id,{push:false});
 if(choices.length>1){const menu=document.createElement('nav');menu.className='word-choices';menu.setAttribute('aria-label','सन्धिस्थाने पदानि');menu.innerHTML='पदम् — '+choices.map(c=>`<button data-grammar-choice="${esc(c.id)}">${esc(c.token?.padam||'पदम्')}</button>`).join(' ');$('#drawer-content').prepend(menu);}
 window.ScriptDisplay?.apply();
}
function applyColors(){document.body.classList.toggle('no-colors',!colors);$('#color-toggle').setAttribute('aria-pressed',String(colors));}
function applySize(){document.body.style.setProperty('--font-size',size+'px');}
async function route({scroll=true}={}){
 const request=++routeRequest;let value;try{value=decodeURIComponent(location.hash.slice(1))||document.body.dataset.unitRoute||'';}catch{value='';}
 if(commentaries&&await commentaries.route(value))return;
 const match=/^(?:BU\.)?(2\.4\.(?:1[0-4]|[0-9]))(?:\/(adhyayanam|vimarshah))?(?:\/at\/(.+))?$/.exec(value);
 const cross=/^(2\.4\.(?:1[0-4]|[0-9]))\/((?:BU|LEX|VP)\..+)$/.exec(value);
 const stable=/^BU\.(2\.4\.(?:1[0-4]|[0-9]))\..+$/.exec(value);
 const id=match?.[1]||cross?.[1]||stable?.[1]||(value.startsWith('BR_C02_S04_V')?'2.4.'+Number(value.match(/_V(\d+)/)?.[1]):'2.4.0');
 if(!record(id))return;
 if(match?.[2]||cross||stable){await openStudy(id,{asResearch:match?.[2]==='vimarshah',anchor:match?.[3]||cross?.[2]||(stable?value:''),push:false,scroll});}
 else{if(panelId)closeStudy({push:false,focus:false});setRoute(id);if(scroll)scrollToUnit(id);}
 if(request===routeRequest)markActive(id);
}
$('#color-toggle').onclick=()=>{colors=!colors;setStore('colors',colors);applyColors();};
if($('#color-legend summary'))$('#color-legend summary').textContent='सङ्केताः';
$('#color-key').innerHTML=Object.entries(UnitReader.roles).filter(([name])=>name!=='समाधानम्').map(([name,[cls]])=>`<p><span class="dk-${esc(cls)}">${esc(name)}</span></p>`).join('');
$('#padaccheda-toggle').onclick=()=>{pada=!pada;$('#padaccheda-toggle').setAttribute('aria-pressed',String(pada));commentaries?.setPada(pada);if(commentaries?.active)return;preservePosition(renderReading);if(panelId&&panelId!=='custom')openStudy(panelId,{asResearch:panelResearch,push:false});};
$('#size-down').onclick=()=>{size=Math.max(16,size-2);setStore('size',size);preservePosition(applySize);};
$('#size-up').onclick=()=>{size=Math.min(32,size+2);setStore('size',size);preservePosition(applySize);};
$('#study-close').onclick=()=>{commentaries?.studyOff?.();closeStudy();};
$('#menu').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#menu').setAttribute('aria-expanded',String(open));};
media.addEventListener('change',panelMode);addEventListener('scroll',requestScrollSpy,{passive:true});addEventListener('popstate',()=>{if(ready)route();});addEventListener('hashchange',()=>{if(ready)route();});
document.addEventListener('toggle',e=>{if(e.target.matches('details[data-lazy-study]')&&e.target.open)fillStudySection(e.target);},true);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(panelId){e.preventDefault();closeStudy();}else{$('#sidebar').classList.remove('open');$('#menu').setAttribute('aria-expanded','false');$('#color-legend').open=false;}}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-grammar-tokens],[data-mula-targets]')){e.preventDefault();e.target.click();}
 if(e.key==='Tab'&&panelId&&media.matches){const focusable=$$('button,a[href],summary,select,[tabindex="0"]',$('#study-dialog')).filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
document.addEventListener('click',async e=>{
 const lesson=e.target.closest('[data-lesson].lesson-link,[data-goto]');if(lesson){e.preventDefault();const to=lesson.dataset.lesson||lesson.dataset.goto,follow=panelId&&panelId!=='custom'&&!media.matches&&hasStudy(to);if(commentaries?.active)await commentaries.route(to);if(panelId&&!follow)closeStudy({push:false,focus:false});$('#sidebar').classList.remove('open');$('#menu').setAttribute('aria-expanded','false');setRoute(to,'','',true);scrollToUnit(to);if(follow)await openStudy(to,{push:false});return;}
 const pill=e.target.closest('[data-open-study]');if(pill){await openStudy(pill.dataset.openStudy,{scroll:true,part:pill.dataset.studyPart||'mula'});return;}
 const tab=e.target.closest('[data-study-part-tab]');if(tab){await openStudy(panelId,{part:tab.dataset.studyPartTab,push:false});return;}
 const researchLink=e.target.closest('[data-open-research],[data-unit-research]');if(researchLink){e.preventDefault();await openStudy(researchLink.dataset.openResearch||panelId,{asResearch:true,anchor:researchLink.dataset.unitResearch||''});return;}
 const retrySection=e.target.closest('[data-section-retry]');if(retrySection){await fillStudySection(retrySection.closest('[data-lazy-study]'));return;}
 if(e.target.closest('[data-return-study]')){await openStudy(panelId);return;}
 if(e.target.closest('[data-source-retry]')){await loadSource(true);return;}
 if(e.target.closest('[data-panel-retry]')){await openStudy(panelId,{asResearch:panelResearch,push:false});return;}
 const lexicon=e.target.closest('[data-unit-lexicon]');if(lexicon){await openLexicon(lexicon.dataset.unitLexicon);return;}
 const jump=e.target.closest('[data-unit-jump]');if(jump){await jumpStudy(jump.dataset.unitJump);return;}
 const word=e.target.closest('[data-grammar-tokens],[data-grammar-choice],[data-mula-targets]');if(word){e.preventDefault();await openWord(word);return;}
 if(e.target.closest('[data-unit-reread]')){const id=panelId;closeStudy();scrollToUnit(id);return;}
 const local=e.target.closest('a[href^="#"]');if(local&&/^#(?:BU\.)?2\.4\./.test(local.getAttribute('href'))){e.preventDefault();history.pushState(null,'',local.getAttribute('href'));await route();}
});
applyColors();applySize();
(async()=>{
 try{manifest=await json('runtime/manifest.json');if(manifest.source_packs){storedClient=StoredSource.createClient({entries:manifest.source_packs,base:base.href});sourceClient=LiveSource.createClient({stored:storedClient});}reading=await json(manifest.reading||'runtime/reading.json');
  reading.units.sort((a,b)=>Number(a.id.split('.').at(-1))-Number(b.id.split('.').at(-1)));nav();
  const initialHash=location.hash;await loadSource();if(manifest.commentary_pairs){commentaries=MaitreyiCommentaries.create({stored:storedClient,pairs:await json(manifest.commentary_pairs),closeStudy:()=>closeStudy({push:false,focus:false}),openStudy:id=>openStudy(id,{push:false}),openPanel:(title,html)=>openCustomPanel(title,html),activeId:()=>active,panelUnit:()=>panelId});}if(document.fonts?.ready)await document.fonts.ready;ready=true;document.body.dataset.readerReady='true';
  // The first source rendering must not replace a shared deep link with the scroll-spy route.
  if(initialHash&&location.hash!==initialHash)history.replaceState(null,'',initialHash);
  await route({scroll:!!initialHash||!!document.body.dataset.unitRoute});requestScrollSpy();
 }catch{notice('पाठः न प्राप्तः। कृपया पृष्ठं पुनः उद्घाटयतु।');}
})();
})();
