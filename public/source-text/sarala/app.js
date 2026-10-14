'use strict';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deva = s => String(s).replace(/\d/g,d=>'०१२३४५६७८९'[d]);
const safeURL = u => { try { const v=new URL(u,location.href); return ['http:','https:'].includes(v.protocol) ? esc(v.href) : '#'; } catch { return '#'; } };
const readStore = (key, fallback) => {try{return JSON.parse(localStorage.getItem('vp-'+key))??fallback;}catch{return fallback;}};
let storageAvailable = true;
const writeStore = (key,v)=>{try{localStorage.setItem('vp-'+key,JSON.stringify(v));return true;}catch{storageAvailable=false;return false;}};
let referenceData={roots:{},sutras:{},resources:[]};
let specUnits=[],searchIndex=null,searchResults=[];
const runtimeBase=new URL('.',document.currentScript.src);
let runtimeManifest=null,runtimeLabels={},sourceCaptureIndex=null,navigationRequest=0,searchRequest=0;
const resourceCache=new Map(),researchUnits=new Map();
const resourceURL=p=>new URL(p,runtimeBase).href;
function resource(p){if(!resourceCache.has(p))resourceCache.set(p,fetch(resourceURL(p),{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('पाठः न प्राप्तः');return r.json();}).catch(e=>{resourceCache.delete(p);throw e;}));return resourceCache.get(p);}
const unitFor=lesson=>{const id=lesson?.runtime?.unit_id||'BU.'+lesson?.id;return researchMode&&researchUnits.has(id)?researchUnits.get(id):specUnits.find(u=>u.unit_id===id);};
const studyPayloads=new Map(),researchPayloads=new Map();
function applyLessonPayload(lesson,payload){
 delete lesson.mulam; Object.assign(lesson,payload.lesson);
 if(payload.unit){const unit={...payload.unit,...runtimeLabels,study_quotations:payload.unit.study_quotations||payload.study_quotations||{}};const index=specUnits.findIndex(u=>u.unit_id===unit.unit_id);if(index<0)specUnits.push(unit);else specUnits[index]=unit;}
}
async function ensureLesson(lesson,asResearch=false){
 if(!lesson._runtimeLoaded){const payload=await resource(lesson.runtime.learner);studyPayloads.set(lesson.id,payload);applyLessonPayload(lesson,payload);lesson._runtimeLoaded=true;lesson._sourceParagraphs=payload.source_paragraphs;}
 if(asResearch&&lesson.runtime.research&&!researchPayloads.has(lesson.runtime.unit_id)){
  const raw=await resource(lesson.runtime.research);researchPayloads.set(lesson.runtime.unit_id,raw);researchUnits.set(lesson.runtime.unit_id,raw.unit||raw);
 }
 if(!lesson._livePromise)lesson._livePromise=refreshLiveLesson(lesson);
 else if(asResearch&&lesson._liveResult)await hydrateResearch(lesson);
 return lesson;
}
async function hydrateResearch(lesson){
 const raw=researchPayloads.get(lesson.runtime.unit_id);if(!raw)return;
 const payload=raw.unit?raw:{...studyPayloads.get(lesson.id),unit:raw};
 const result=await LiveSource.hydrate(payload,lesson._liveResult);
 const unit=result.payload.unit;unit.study_quotations=unit.study_quotations||payload.study_quotations||{};
 researchUnits.set(lesson.runtime.unit_id,unit);
}
async function refreshLiveLesson(lesson,force=false){
 const result=await LiveSource.load(studyPayloads.get(lesson.id),{force});
 applyLessonPayload(lesson,result.payload);lesson._liveResult=result;
 await hydrateResearch(lesson);
 if(current===lesson&&!document.body.classList.contains('home-view')&&(decodeURIComponent(location.hash.slice(1))===lesson.id||decodeURIComponent(location.hash.slice(1)).startsWith(lesson.id+'/'))){const context=$('#study-context').value,opened=$$('.study-control[aria-expanded="true"]').map(b=>b.dataset.studyName),top=window.scrollY,drawerTop=$('#study-dialog').scrollTop;render(lesson,false,researchMode);if(panelKind==='study'){updateStudyContext(context);for(const name of opened){const control=$$('.study-control').find(b=>b.dataset.studyName===name);if(control)toggleStudy(control);}}window.scrollTo({top,behavior:'instant'});$('#study-dialog').scrollTop=drawerTop;}
 return result;
}
function sourceRecord(l,kind,id){const descriptor=l._sourceParagraphs?.find(d=>d.target?.kind===kind&&(!id||d.target.bhashya_id===id));return l._liveResult?.paragraphs.find(r=>r.id===descriptor?.id);}
function hasMula(l){return !!(l.mulam||l._sourceParagraphs?.some(d=>d.target?.kind==='mula'));}
function sourceNotice(l,record){
 if(record?.status==='matched')return '';
 const pending=!l._liveResult,changed=record?.status==='mismatch';
 const message=pending?'अद्वैतशारदायाः पाठः आनीयते। अध्ययनसाहाय्यम् अधः उपलब्धम्।':changed?'मूलस्रोतसि पाठभेदः दृश्यते। अस्य अंशस्य वर्णसङ्केताः पदच्छेदश्च न दर्श्यन्ते।':'मूलस्रोतस्य पाठः अधुना न प्राप्तः। अध्ययनसाहाय्यम् तु उपलब्धम्।';
 return `<aside class="source-status" role="status" data-live-status="${pending?'pending':record?.status||'failed'}" data-source-id="${esc(record?.id||'')}" data-source-hash="${esc(record?.actualHash||'')}" data-source-expected="${esc(record?.expectedHash||'')}" data-source-request="${esc(record?.request_url||'')}" data-source-response="${esc(record?.response_url||'')}" data-source-origin="${record?.origin_verified===true}" data-source-credentials="${esc(record?.credentials||'')}"><p>${message}</p>${pending?'':`<button data-source-retry>पुनः प्रयत्नः</button>`} <a href="${safeURL(record?.source_url||l.sourceUrl)}" target="_blank" rel="noopener">मूलस्रोते पठतु ↗</a></aside>`;
}
function liveMula(l,unit){const r=sourceRecord(l,'mula');return (r?.status==='matched'?`<p class="mula" data-live-status="matched" data-source-id="${esc(r.id)}" data-source-hash="${r.actualHash}" data-source-expected="${r.expectedHash}" data-source-request="${esc(r.request_url)}" data-source-response="${esc(r.response_url)}" data-source-origin="${r.origin_verified}" data-source-credentials="${r.credentials}">${unit?UnitReader.mulaSource(unit,readingPadaccheda):esc(l.mulam)}</p>`:(r?.rawText?`<p class="mula">${esc(r.rawText)}</p>`:''))+sourceNotice(l,r);}
function liveBhashya(l,b,unit){const r=sourceRecord(l,'bhashya',b.id);return (r?.status==='matched'?`<div data-live-status="matched" data-source-id="${esc(r.id)}" data-source-hash="${r.actualHash}" data-source-expected="${r.expectedHash}" data-source-request="${esc(r.request_url)}" data-source-response="${esc(r.response_url)}" data-source-origin="${r.origin_verified}" data-source-credentials="${r.credentials}">${unit?(researchMode?UnitReader.researchSource(unit):UnitReader.bhashyaSource(unit,readingPadaccheda)):researchMode?legacyResearch(b,l):`<p class="original">${annotated(b)}</p>`}</div>`:(r?.rawText?`<p class="original">${esc(r.rawText)}</p>`:''))+sourceNotice(l,r);}
let data=[], independentWorks=[], independentLessons=[], catalogue=[], current, mode='original', marks=readStore('marks',[]), notes=readStore('notes',{}), color=readStore('colors',true)!==false, size=readStore('size',20);
if(!Array.isArray(marks))marks=[]; if(!notes||Array.isArray(notes)||typeof notes!=='object')notes={};
const roles={pratika:'प्रतीकम्',question:'पूर्वपक्षः',answer:'सिद्धान्तः',citation:'उद्धरणम्'};
const allLessons=()=>[...data,...independentLessons];
const activeLessons=()=>current?.workId?independentLessons.filter(l=>l.workId===current.workId):[...data,...Object.values(runtimeManifest?.source_links||{}).map(l=>({...l,id:l.route,reviewStatus:'source-only',_sourceOnly:true}))].sort((a,b)=>Number(a.id.split('.').at(-1))-Number(b.id.split('.').at(-1)));
let researchMode=false, readingPadaccheda=false;
let showBhashya=true, panelKind=null, sideBySide=false, remotePage=null, sourceRequest=0, companionRequest=0;
const companionPaths={};
const sourceTreeHTML=$('.source-tree').innerHTML;
function notice(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('#toast').hidden=true,2800);}
function showInfo(title,html){$('#info-title').textContent=title;$('#info-body').innerHTML=html;$('#info-dialog').showModal();}
function p(text){return (Array.isArray(text)?text:[text]).filter(Boolean).map(x=>`<p>${esc(x)}</p>`).join('');}
function teaching(text,terms=[],entry={},field='sarala'){
 return `<p class="study-flow">${(Array.isArray(text)?text:[text]).map((t,i)=>t?studyText(t,entry,Array.isArray(text)?field+'.'+i:field,terms):'').filter(Boolean).join(' ')}</p>`;
}
function studyParagraphs(text,entry,field){return teaching(text,[],entry,field);}
function layer(name,content,hint=''){return `<details class="layer" data-study-transliterate><summary>${esc(name)}${hint?`<small>${esc(hint)}</small>`:''}</summary><div class="layer-content">${content}</div></details>`;}
function links(items){return `<div class="reference-links">${(items||[]).map(l=>`<a href="${safeURL(l.url||l.sourceUrl)}" target="_blank" rel="noopener">${esc(l.label||l.title)} ↗</a>`).join('')}</div>`;}
function annotated(b,labels=false){
 const text=b.original||'';const spans=[];
 // All spans are explicitly positioned draft content annotations, never grammatical keyword guesses.
 for(const r of (b.roleSpans||[])){let i=Number.isInteger(r.start)?r.start:text.indexOf(r.text);if(i>=0&&text.slice(i,i+r.text.length)===r.text&&roles[r.role])spans.push({start:i,end:i+r.text.length,role:r.role});}
 for(const item of(b.pratikaSpans||b.pratikas||[])){const t=typeof item==='string'?item:item.text;let i=typeof item==='object'&&Number.isInteger(item.start)?item.start:text.indexOf(t);if(i>=0&&t&&text.slice(i,i+t.length)===t)spans.push({start:i,end:i+t.length,role:'pratika'});}
 for(const span of spans){while(span.end<text.length&&/\p{M}/u.test(text[span.end]))span.end++;}
 spans.sort((a,b)=>a.start-b.start||b.end-a.end);let out='',pos=0;
 for(const s of spans){if(s.start<pos)continue;out+=esc(text.slice(pos,s.start));out+=`<span class="${esc(s.role)}" title="${esc(roles[s.role])}">${esc(text.slice(s.start,s.end))}${labels?`<sup class="discourse-mark" aria-hidden="true">${({pratika:'प्र',question:'पू',answer:'सि',citation:'उद्'})[s.role]||''}</sup>`:''}</span>`;pos=s.end;}
 return out+esc(text.slice(pos));
}
function hasResearch(lesson){return !!lesson&&!lesson.workId&&!!lesson.bhashya?.length&&!!(lesson.hasResearch||unitFor(lesson)||lesson.padaccheda||lesson.anvaya);}
function researchLink(lesson){return hasResearch(lesson)?`<a class="source-link local-route" href="#${esc(lesson.id)}/vimarshah">विमर्शः ↗</a>`:'';}
function legacyResearch(b,lesson){const spans=[...(b.roleSpans||[]),...(b.pratikaSpans||b.pratikas||[]).map(r=>typeof r==='string'?{text:r,role:'pratika'}:r)];return `<section class="research-sentence"><h3><span class="research-id" data-no-transliterate>${esc(b.id)}</span></h3><p class="scope-note">अत्र पूर्वप्रारूपस्य अनुच्छेदविभागः दर्शितः। वाक्यशः टीकाप्रमाणानि अद्यापि न सङ्गृहीतानि।</p><p class="original">${annotated(b,true)}</p><details class="research-roles"><summary>पूर्वप्रारूपस्य चिह्निताः अंशाः</summary>${spans.map(r=>`<article class="research-role"><p><b>${esc(roles[r.role]||'प्रतीकम्')}</b></p><blockquote>${esc(r.text||'')}</blockquote>${r.editorialNote?`<p>${esc(r.editorialNote)}</p>`:''}</article>`).join('')}</details><p><a href="${safeURL(lesson.sourceUrl.split('#')[0]+'#'+(b.sourceAnchor||b.id))}" target="_blank" rel="noopener">भाष्यांशस्य स्रोतः ↗</a></p></section>`;}
function lessonRoute(id){const research=id.endsWith('/vimarshah'),base=research?id.slice(0,-10):id,lesson=allLessons().find(l=>l.id===base);return lesson&&(!research||hasResearch(lesson))?{lesson,research}:null;}

let bankSequence=0;
function studyBank(items,label='अध्ययनसाहाय्यम्'){
 const available=items.filter(x=>x&&(x.content||x.action));if(!available.length)return '';
 const id='study-'+(++bankSequence);
 return `<div class="study-bank" data-study-transliterate><div class="study-controls" role="group" aria-label="${esc(label)}">${available.map((x,i)=>`<button type="button" class="study-control" data-study-name="${esc(x.name)}" id="${id}-button-${i}" ${x.action?`data-study-action="${esc(x.action)}" aria-pressed="${readingPadaccheda}"`: `aria-expanded="false" aria-controls="${id}-panel-${i}"`}>${esc(x.name)}<span aria-hidden="true">＋</span></button>`).join('')}</div>${available.map((x,i)=>x.action?'':`<section class="study-panel" id="${id}-panel-${i}" role="region" aria-labelledby="${id}-button-${i}" hidden>${x.hint?`<p class="panel-hint">${esc(x.hint)}</p>`:''}${x.content}</section>`).join('')}</div>`;
}
// Only terminal punctuation in added definitions is replaced by the entry separator.
function inlineDefinition(value){return esc(String(value??'').trim().replace(/(?<!।)।$/u,''));}
function studyText(text,entry={},field='description',terms=[]){return StudyReferences.render(text,entry.referenceSpans?.[field]||[],referenceData.roots,terms);}
function grammarDefinition(entry){return studyText(String(entry.description||'').trim().replace(/(?<!।)।$/u,''),entry);}
function ruleReferences(entry){
 const refs=(entry.sutraRefs||[]).filter(r=>referenceData.sutras[r.id]);
 if(!refs.length)return entry.url?`<p class="legacy-reference"><a href="${safeURL(entry.url)}" target="_blank" rel="noopener">${esc(entry.sutra||'व्याकरणस्रोतः')} ↗</a></p>`:'';
 return `<details class="rule-references"><summary>सम्बद्धानि सूत्राणि <small>(${deva(refs.length)})</small></summary><div>${[...new Set(refs.map(r=>r.note))].map(note=>{const group=refs.filter(r=>r.note===note);return `<p>${group.map(r=>`<a href="${StudyReferences.sutraURL(r.id)}" target="_blank" rel="noopener">${esc(referenceData.sutras[r.id].title)} · ${deva(r.id)} ↗</a>`).join(' · ')}<span class="rule-note">${studyText(note,group[0],'note')}</span></p>`;}).join('')}</div></details>`;
}
function inlineTerms(items,textKey){
 const seen=new Set(),rows=items.filter(g=>{const key=JSON.stringify([g.word,g[textKey]]);if(seen.has(key))return false;seen.add(key);return true;});
 return `<p class="inline-gloss study-flow">${rows.map(g=>`<span class="term-entry"><b>${esc(g.word)}</b> — ${textKey==='description'?grammarDefinition(g):studyText(String(g[textKey]??'').trim().replace(/(?<!।)।$/u,''),g,textKey)}${g.url?` <a class="source-link" href="${safeURL(g.url)}" target="_blank" rel="noopener">(${esc(g.sutra||'व्याकरणस्रोतः')} ↗)</a>`:''}</span>`).join('; ')}।</p>`;
}
function inlineRuleReferences(entry){
 const refs=(entry.sutraRefs||[]).filter(r=>referenceData.sutras[r.id]);
 if(!refs.length)return entry.url?` (${linksInline(entry.url,entry.sutra||'व्याकरणस्रोतः')})`:'';
 return refs.map(r=>` (${linksInline(StudyReferences.sutraURL(r.id),referenceData.sutras[r.id].title+' · '+deva(r.id))} — ${studyText(r.note||'',r,'note')})`).join('');
}
function linksInline(url,label){return `<a href="${safeURL(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;}
function grammarEntries(items){
 const seen=new Set(),rows=items.filter(g=>{const key=JSON.stringify(g);if(seen.has(key))return false;seen.add(key);return true;});
 return `<p class="grammar-entries study-flow">${rows.map(g=>typeof g==='string'?esc(g):`<span class="term-entry"><b>${esc(g.form||g.word)}</b>${g.split?` = ${studyText(g.split,g,'split')}`:''}${g.vigraha?` — ${studyText(g.vigraha,g,'vigraha')}`:''}${g.type?` (${studyText(g.type,g,'type')})`:''}${g.explanation||g.description?` — ${studyText(g.explanation||g.description,g,g.explanation?'explanation':'description')}`:''}${inlineRuleReferences(g)}</span>`).join('; ')}।</p>`;
}
function grammarSection(l){
 const groups=[];
 if(l.grammar?.length)groups.push({name:'पदरूपाणि',content:l.grammar.some(g=>g.sutraRefs?.length)?grammarEntries(l.grammar):inlineTerms(l.grammar,'description')});
 for(const [key,label] of [['sandhi','सन्धिः'],['samasa','समासः'],['krdanta','कृदन्तः'],['taddhita','तद्धितान्तः'],['karaka','कारकाणि'],['dhatu','धातवः'],['avyaya','अव्ययानि'],['prayoga','प्रयोगः'],['pratyaya','प्रत्ययाः']]){
  const items=l[key]||[],note=l[key+'Note'];
  const content=(note?`<p class="subtle-note">${studyText(note,l,key+'Note')}</p>`:'')+(items.length?grammarEntries(items):'');
  if(content)groups.push({name:label,content});
 }
 return (l.grammarNote?`<p class="subtle-note">${studyText(l.grammarNote,l,'grammarNote')}</p>`:'')+studyBank(groups,'व्याकरणविभागाः');
}
function referenceDirectory(){
 const resources=referenceData.resources||[];
 return layer('व्याकरणसन्दर्भाः',`<p class="subtle-note">अधिकाध्ययनाय अष्टाध्यायी-जालस्थाने प्रवेशाः। सूत्रस्य विवरणं तस्य पृष्ठे पठनीयम्।</p>${[...new Set(resources.map(r=>r.group))].map(group=>`<section class="reference-group"><h3>${esc(group)}</h3>${resources.filter(r=>r.group===group).map(r=>`<p><a href="${safeURL(r.url)}" target="_blank" rel="noopener">${esc(r.label)} ↗</a><span>${esc(r.description)}</span></p>`).join('')}</section>`).join('')}`);
}
function layerSet(l){const unit=unitFor(l);if(unit)return UnitReader.prasanga(unit,'study')+studyBank(UnitReader.mulaLayers(unit),'मूलपाठस्य अध्ययनसाहाय्यम्');const items=[];
 if(l.anvaya)items.push({name:'अन्वयः',content:studyParagraphs(l.anvaya,l,'anvaya')+(l.anvayaNote?`<p class="subtle-note">${studyText(l.anvayaNote,l,'anvayaNote')}</p>`:'')});
 if(l.padartha?.length)items.push({name:'पदार्थः',content:inlineTerms(l.padartha,'meaning')});
 const grammar=grammarSection(l);if(grammar)items.push({name:'व्याकरणपरिचयः',content:grammar});
 if(l.sarala?.length)items.push({name:'सरलार्थः',content:teaching(l.sarala,(l.padartha||[]).map(t=>t.word),l)});
 return (items.length?'<p class="scope-note">पूर्वप्रारूपम्। नूतनमानदण्डैः समीक्षा कर्तव्या।</p>':'')+studyBank(items,'मूलपाठस्य अध्ययनसाहाय्यम्')||p('अस्य पाठस्य पदच्छेदादिविवरणानि अद्यापि न रचितानि।');
}
function bhashyaLayers(b){const unit=unitFor(current);if(unit)return studyBank(UnitReader.bhashyaLayers(unit,{padaccheda:readingPadaccheda}),'भाष्यस्य अध्ययनसाहाय्यम्');const items=[];
 if(b.bridge?.length)items.push({name:'भाष्यपरिचयः',content:inlineTerms(b.bridge,'explanation')});
 if(b.grammarStudy){const grammar=grammarSection(b.grammarStudy);if(grammar)items.push({name:'भाष्यपदव्याकरणपरिचयः',content:grammar});}
 if(b.sarala?.length)items.push({name:'सरलभाष्यव्याख्या',content:teaching(b.sarala,(b.bridge||[]).map(t=>t.word),b)});
 if(b.annotationNote)items.push({name:'पाठटिप्पणी',content:studyParagraphs(b.annotationNote,b,'annotationNote')});
 for(const section of b.sections||[])items.push({name:section.title||'विवरणम्',content:studyParagraphs(section.sarala||section.explanation||section.text,section,section.sarala?'sarala':section.explanation?'explanation':'text')});
 const exchanges=(b.roleSpans||[]).filter(r=>['question','answer'].includes(r.role));
 if(exchanges.length)items.push({name:'प्रश्नोत्तरविभागः',content:exchanges.map(r=>`<p class="exchange-label ${esc(r.role)}">${roles[r.role]}</p><p>${esc(r.text)}</p>`).join('')});
 return studyBank(items,'भाष्यस्य अध्ययनसाहाय्यम्')||p('अस्य भाष्यांशस्य सरलविवरणम् अद्यापि न रचितम्।');
}
function collapseBank(bank){
 for(const button of $$('.study-controls > button',bank).filter(b=>b.closest('.study-bank')===bank&&!b.dataset.studyAction)){button.setAttribute('aria-expanded','false');button.querySelector('span').textContent='＋';$('#'+button.getAttribute('aria-controls')).hidden=true;}
}
function toggleStudy(button){
 if(button.dataset.studyAction==='padaccheda'){setPadaccheda(!readingPadaccheda,true);return;}
 const open=button.getAttribute('aria-expanded')!=='true';collapseBank(button.closest('.study-bank'));
 button.setAttribute('aria-expanded',String(open));button.querySelector('span').textContent=open?'−':'＋';$('#'+button.getAttribute('aria-controls')).hidden=!open;
}
function renderNav(){const q='';let n=0;$('#lesson-list').innerHTML=activeLessons().map(l=>{
 const match=!q||JSON.stringify(l).normalize('NFC').toLowerCase().includes(q);if(match)n++;
 const title=l.shortTitle||(l.id==='2.4.0'?'सम्बन्धभाष्यम्':(l.workId?'श्लोकः ':'मन्त्रः ')+deva((l.nativeId||l.id).split('.').at(-1)));const status=l.reviewStatus==='source-only'?'मूलम् · भाष्यम्':'सविवरणम् · समीक्ष्यम्';
 const linkLabel=l.id==='2.4.0'?'सम्बन्धभाष्यम्':((runtimeManifest?.archive_mode?'मन्त्रः ':'')+deva((l.nativeId||l.id).split('.').at(-1)));
 if(l._sourceOnly)return `<a class="lesson-link ${l.id==='2.4.0'?'source-intro':''}" href="${safeURL(l.sourceUrl)}" target="_blank" rel="noopener" title="${esc(title+' · मूलस्रोते पठनम्')}" aria-label="${esc(deva(l.id)+' · '+title+' · मूलस्रोते पठनम्')}">${linkLabel}</a>`;
 return `<button class="lesson-link ${l.id==='2.4.0'?'source-intro':''} ${l.reviewStatus==='draft'?'has-study':''} ${current?.id===l.id?'active':''}" data-lesson="${esc(l.id)}" title="${esc(title+' · '+status)}" aria-label="${esc(deva(l.nativeId||l.id)+' · '+title+' · '+status)}" ${match?'':'hidden'} ${current?.id===l.id?'aria-current="page"':''}>${linkLabel}</button>`;
 }).join('');$('#search-empty').hidden=n!==0;$('#bookmark-count').textContent=deva(marks.length);}
function render(l,scroll=true,asResearch=false){
 if(current?.id!==l.id||asResearch)readingPadaccheda=false;researchMode=asResearch&&hasResearch(l);document.body.classList.toggle('research-view',researchMode);if(researchMode)closeStudy(false);
 remotePage=null;++sourceRequest;document.body.classList.remove('home-view','remote-reader');$('#home').hidden=true;$('.layout').hidden=false;
 bankSequence=0;if(current?.workId!==l.workId)$('#lesson-search').value='';current=l;configureReader(l); const routeHash='#'+encodeURIComponent(l.id)+(researchMode?'/vimarshah':'');if(location.hash!==routeHash)history.replaceState(null,'',routeHash);writeStore('last',l.id);$('#breadcrumb-id').textContent=deva(l.nativeId||l.id);
 const unit=unitFor(l);$('#unit-tools').hidden=!unit;$('#bhashya-toggle').hidden=researchMode||!!l.workId||!hasMula(l);
 if(runtimeManifest?.archive_mode){
  const unitLabel=l.id==='2.4.0'?'सम्बन्धभाष्यम्':('मन्त्रः '+deva((l.nativeId||l.id).split('.').at(-1)));
  $('.reader-context h1').textContent=runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्';
  $('.reader-context > span').textContent=l.id==='2.4.0'?'सम्बन्धभाष्यम्':('द्वितीयोऽध्यायः · चतुर्थं ब्राह्मणम् · '+unitLabel);
  $('.breadcrumb-book').textContent=runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्';
  $('#breadcrumb-id').textContent=unitLabel;
  document.title=(runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्')+' · '+unitLabel+(researchMode?' · विमर्शः':'');
 } else if(researchMode){$('.reader-context h1').textContent='विमर्शः';document.title='वेदान्तपाठशाला · '+deva(l.id)+' · विमर्शः';}
 const bm=marks.includes(l.id);
 const before=(l.bhashya||[]).filter(b=>b.position==='before-mulam');
 const after=(l.bhashya||[]).filter(b=>b.position!=='before-mulam');
 $('#lesson-content').innerHTML=`${unit&&!researchMode?UnitReader.prasanga(unit):''}<section id="mula">${before.map(b=>`<article class="bhashya-intro" id="${esc(b.id)}"><p class="text-title">अवतारिका</p>${liveBhashya(l,b,unit)}${studyEntry(b.id,'अवतारिकायाः अध्ययनसाहाय्यम्')}</article>`).join('')}<div class="lesson-top"><div class="section-kicker"><span class="label-line"></span>${l.workId?'वार्तिकम्':hasMula(l)?'मूलम्':'सम्बन्धभाष्यम्'} <span>${deva(l.nativeId||l.id)}</span></div><div class="verse-actions"><button id="copy-verse" class="icon" aria-label="पाठस्य प्रतिलिपिः">⧉</button><button id="bookmark" class="icon" aria-label="पाठः चिह्न्यताम्" aria-pressed="${bm}">${bm?'⚑':'⚐'}</button></div></div>${hasMula(l)?liveMula(l,unit):''}<a class="source-link" href="${safeURL(l.sourceUrl)}" target="_blank" rel="noopener">स्रोतः · अद्वैतशारदा · ${deva(l.nativeId||l.id)} ↗</a> ${researchMode?`<a class="source-link local-route" href="#${esc(l.id)}">मूलपाठः ↩</a>`:researchLink(l)}${hasMula(l)?studyEntry('mula','मूलपाठस्य अध्ययनसाहाय्यम्'):''}</section>
 <section class="bh-section" id="bhashya"><div class="bh-heading"><h2>${hasMula(l)?'शाङ्करभाष्यम्':'सम्बन्धभाष्यम्'}</h2><span class="source-link">श्रीशङ्करभगवत्पादाः</span></div>${researchMode?'<p class="bh-preamble">भाष्यपाठः सुरक्षितः। वर्णसङ्केताः अध्ययनार्थम् आरोपिताः।</p>':''}${after.map((b,i)=>`<article id="${esc(b.id)}">${l.bhashya.length>1?`<p class="paragraph-number">भाष्यांशः ${deva(i+1)}</p>`:''}${liveBhashya(l,b,unit)}${studyEntry(b.id,'भाष्यस्य अध्ययनसाहाय्यम्')}</article>`).join('')}${researchMode&&unit?UnitReader.researchStudy(unit):''}${researchMode&&unit?.parikshaniya_suchi?.length?'<p class="research-review-link"><a href="#unit-review-list" data-unit-review-list>समीक्षकाणां कृते परीक्षणीयसूची</a></p>':''}</section>
 <section id="personal-note" class="personal-note"><details class="layer" data-study-transliterate><summary>मम टिप्पणी <small>अस्मिन्नेव पठनसाधने रक्ष्यते</small></summary><div class="layer-content"><label for="note" class="text-title">अध्ययनटिप्पणी अथवा संशोधनसूचना</label><textarea id="note" placeholder="अत्र लिखतु…">${esc(notes[l.id]||'')}</textarea><div class="note-footer"><span id="note-status">टिप्पणी स्वयमेव रक्ष्यते। अन्यस्मै न प्रेष्यते।</span><button id="export-note">टिप्पण्यः अवतार्यन्ताम् ↓</button></div></div></details></section>`;
 const list=activeLessons(),i=list.indexOf(l),step=(target,n,label)=>target?._sourceOnly?`<a href="${safeURL(target.sourceUrl)}" target="_blank" rel="noopener">${label}</a>`:`<button data-step="${n}" ${!target?'disabled':''}>${label}</button>`;$('#pager').innerHTML=`${step(list[i-1],-1,'← पूर्वः पाठः')}<span class="muted">${deva(i+1)} / ${deva(list.length)}</span>${step(list[i+1],1,'अग्रिमः पाठः →')}`;
 renderNav();$('#bookmark').onclick=()=>{marks=marks.includes(l.id)?marks.filter(x=>x!==l.id):[...marks,l.id];writeStore('marks',marks);$('#bookmark').setAttribute('aria-pressed',String(marks.includes(l.id)));$('#bookmark').textContent=marks.includes(l.id)?'⚑':'⚐';renderNav();};
 $('#note').addEventListener('input',e=>{notes[l.id]=e.target.value;const ok=writeStore('notes',notes);$('#note-status').textContent=ok?'रक्षिता। अस्मिन्नेव पठनसाधने उपलब्धा।':'रक्षणं न शक्यम्। अवतारणेन टिप्पणीं रक्षतु।';});
 $('#export-note').onclick=exportNotes;
 const copyText=hasMula(l)?sourceRecord(l,'mula')?.rawText||'':l._liveResult?.paragraphs.find(r=>r.rawText)?.rawText||'';
 $('#copy-verse').disabled=!copyText;
 $('#copy-verse').onclick=async()=>{try{await navigator.clipboard.writeText((copyText)+'\n'+l.sourceUrl);notice('पाठः स्रोतसा सह प्रतिलिपीकृतः।');}catch{showInfo('प्रतिलिप्यर्थं पाठः',p(copyText)+p(l.sourceUrl));}};
 $('#sidebar').classList.remove('open');$('#menu').setAttribute('aria-expanded',String(!window.matchMedia('(max-width: 900px)').matches&&!document.body.classList.contains('nav-folded')));
 updateStudyContext();syncSourceMode();renderLegend();
 if(panelKind==='anandagiri')loadCompanion('anandagiri');
 syncPanelLayout();
 if(scroll){window.scrollTo({top:0,behavior:'instant'});$('#reading').focus({preventScroll:true});}
}
async function select(id,{scroll=true,push=true,anchor='',chunk}={}){
 const request=++navigationRequest;
 ++sourceRequest;
 if(id.includes('/at/')){[id,anchor]=id.split('/at/');}
 const stableLink=/^(\d+\.\d+\.\d+)\/((?:BU|LEX|VP|CARD)\..+)$/.exec(id);if(stableLink){id=stableLink[1];anchor=stableLink[2];}
 const part=/\?chunk=(\d+)$/.exec(id);if(part){chunk=Number(part[1]);id=id.slice(0,part.index);}
 if(id.startsWith('corpus/')){const [,work,...path]=id.split('/');if(push)history.pushState(null,'','#'+id+(anchor?'/at/'+encodeURIComponent(anchor):Number.isInteger(chunk)?'?chunk='+chunk:''));return renderSourceWork(work,path.join('/'),{anchor,chunk});}
 const route=lessonRoute(id);if(!route){const link=runtimeManifest.source_links?.[id];if(link)showSourceDestination(typeof link==='string'?link:(link.sourceUrl||link.source_url));return;}
 const h='#'+encodeURIComponent(route.lesson.id)+(route.research?'/vimarshah':'');if(push&&location.hash!==h)history.pushState(null,'',h);
 try{await ensureLesson(route.lesson,route.research);if(request!==navigationRequest)return;render(route.lesson,scroll,route.research);if(anchor)await jumpUnit(anchor);}
 catch{if(request===navigationRequest)notice('पाठः न प्राप्तः। कृपया पुनः प्रयतताम्।');}
}
function exportNotes(){const text={format:'vedanta-pathashala-notes-v1',exported:new Date().toISOString(),notes:Object.entries(notes).map(([id,text])=>({id,text,sourceUrl:allLessons().find(x=>x.id===id)?.sourceUrl})),bookmarks:marks};const url=URL.createObjectURL(new Blob([JSON.stringify(text,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='vedanta-study-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function catalogueHTML(q=''){
 const items=catalogue.filter(c=>JSON.stringify(c).normalize('NFC').toLowerCase().includes(q));
 return [...new Set(items.map(x=>x.category))].map(g=>`<section class="catalogue-group"><h3>${esc(g)}</h3><div class="catalogue-grid">${items.filter(x=>x.category===g).map(c=>{const unit=independentWorks.find(w=>w.id===c.slug)?.units[0],study=c.slug==='brihadaranyaka-bhashya'?'2.4.1':unit?.id;return `<div class="catalogue-item"><div><a href="${safeURL(c.sourceUrl)}" target="_blank" rel="noopener">${esc(c.title)} ↗</a><small>${esc(c.author||c.extent||'मूलस्रोते पठनम्')}</small></div>${study?`<a href="#${esc(study)}" class="badge local-route">अध्ययनसाहाय्यम् →</a>`:'<span class="badge">मूलस्रोतः</span>'}</div>`;}).join('')}</div></section>`).join('')||'<p class="muted">ग्रन्थः न लब्धः।</p>';
}
function renderCatalogue(){const q=$('#catalogue-search').value.trim().normalize('NFC').toLowerCase();$('#catalogue-count').textContent='मूलस्रोतः अद्वैतशारदा';$('#catalogue').innerHTML='<nav class="reference-links" aria-label="अध्ययनसूच्यः"><button data-corpus-index="grammar">व्याकरणसूची</button><button data-corpus-index="quotation">उद्धरणसूची</button></nav>'+catalogueHTML(q);}
async function showCorpusIndex(kind){
 if(!['grammar','quotation'].includes(kind))return;
 try{const index=await resource('runtime/'+kind+'-index.json'),entries=index.entries||[];
  $('#library-dialog').close();showInfo(kind==='grammar'?'व्याकरणसूची':'उद्धरणसूची','<p class="scope-note">सविवरणेषु पाठेषु निर्मिताः सन्दर्भाः एव अत्र सन्ति।</p><div data-study-transliterate>'+entries.map(r=>`<article class="study-flow"><a class="local-route" href="${esc(r.href)}">${esc(r.padam||r.text||'पाठः')}</a> · <span>${r.unit_id?.startsWith('BU.')?'बृहदारण्यकोपनिषत् '+esc(deva(r.unit_id.slice(3))):'पाठः'}</span>${kind==='quotation'?`<p>${esc(r.grantha||'')} ${esc(r.sthanam||'')} · <a href="${safeURL(r.source_url)}" target="_blank" rel="noopener">मूलस्रोतः ↗</a></p>`:''}</article>`).join('')+'</div>');
 }catch{notice('सूची न प्राप्ता। पुनः प्रयतताम्।');}
}
function renderHome(scroll=true){++navigationRequest;researchMode=false;readingPadaccheda=false;document.body.classList.remove('research-view');++sourceRequest;remotePage=null;closeStudy(false);$('#bookmark-count').textContent=deva(marks.length);document.body.classList.add('home-view');$('#home').hidden=false;$('.layout').hidden=true;$('#home-catalogue').innerHTML=catalogueHTML($('#home-search').value.trim().normalize('NFC').toLowerCase());document.title='वेदान्तपाठशाला · ग्रन्थसङ्ग्रहः';if(scroll){window.scrollTo({top:0,behavior:'instant'});$('#home').focus({preventScroll:true});}}
function localSourceNavigation(html){return html;}
function configureReader(l){
 const work=independentWorks.find(w=>w.id===l.workId);
 document.body.classList.toggle('independent-reader',!!work);
 if(runtimeManifest?.archive_mode){
  const unitLabel=l.id==='2.4.0'?'सम्बन्धभाष्यम्':('मन्त्रः '+deva((l.nativeId||l.id).split('.').at(-1)));
  $('.breadcrumb-book').textContent=runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्';
  $('.sidebar h2').textContent=runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्';
  $('.side-author').textContent='श्रीशङ्करभगवत्पादभाष्यम्';
  $('.sidebar .eyebrow').textContent='श्रुतिप्रस्थानम्';
  $('.reader-context h1').textContent=runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्';
  $('.reader-context > span').textContent=l.id==='2.4.0'?'सम्बन्धभाष्यम्':('द्वितीयोऽध्यायः · चतुर्थं ब्राह्मणम् · '+unitLabel);
  document.title=(runtimeManifest.page_title||'मैत्रेयीब्राह्मणम्')+' · '+unitLabel;
 } else {
  $('.breadcrumb-book').textContent=work?work.title:'बृहदारण्यकोपनिषत्';
  $('.sidebar h2').textContent=work?work.title:'बृहदारण्यकोपनिषत्';
  $('.side-author').textContent=work?work.author:'श्रीशङ्करभगवत्पादभाष्यम्';
  $('.sidebar .eyebrow').textContent=work?'स्वतन्त्रग्रन्थः':'श्रुतिप्रस्थानम्';
  $('.reader-context h1').textContent=work?work.title:'चतुर्थं ब्राह्मणम्';
  $('.reader-context > span').textContent=work?work.author:'द्वितीयोऽध्यायः · बृहदारण्यकोपनिषत्';
  document.title='वेदान्तपाठशाला · '+(work?work.title:'चतुर्थं ब्राह्मणम्');
 }
 $('.source-tree').innerHTML=localSourceNavigation(work?`<p class="section-label">स्वकीयः श्लोकक्रमः</p><div id="lesson-list" class="lesson-list"></div><p id="search-empty" hidden>अयं शब्दः न लब्धः।</p><p class="subtle-note">अभ्यासार्थम् एकः श्लोकः उपलब्धः।</p>${links([{label:'सम्पूर्णग्रन्थः मूलस्रोते',url:work.sourceUrl}])}`:runtimeManifest?.bu_source_navigation||sourceTreeHTML);
 $('#lesson-search').setAttribute('aria-label','सर्वपाठेषु अन्वेषणम्');
 document.body.classList.toggle('mula-only',!researchMode&&!showBhashya&&hasMula(l));
 $('#bhashya-toggle').hidden=!!work||!hasMula(l);syncReadingMode();
 $$('[data-panel]').forEach(b=>{b.hidden=!!work&&b.dataset.panel!=='study';});
 if(work&&panelKind&&panelKind!=='study')closeStudy(false);
}
function openLibrary(){renderCatalogue();$('#library-dialog')?.showModal();}
if($('#library-open'))$('#library-open').onclick=openLibrary;if($('#library-open-side'))$('#library-open-side').onclick=openLibrary;if($('#catalogue-search'))$('#catalogue-search').oninput=()=>renderCatalogue();

document.addEventListener('click',e=>{if(e.target.closest('a.brand')){if(runtimeManifest?.archive_mode)return;e.preventDefault();history.pushState(null,'','#home');renderHome();return;}const local=e.target.closest('a.local-route,.local-card');if(local){e.preventDefault();if($('#library-dialog').open)$('#library-dialog').close();if($('#info-dialog').open)$('#info-dialog').close();select(decodeURIComponent(local.getAttribute('href').slice(1)));return;}const entry=e.target.closest('[data-study-context]');if(entry){openStudy(entry.dataset.studyContext,entry);return;}const disclosure=e.target.closest('.study-control');if(disclosure){toggleStudy(disclosure);return;}const jump=e.target.closest('.page-nav a, a.skip');if(jump){e.preventDefault();if(jump.classList.contains('skip')&&document.body.classList.contains('home-view')){$('#home').focus();return;}if(jump.getAttribute('href')==='#bhashya'){showBhashya=true;document.body.classList.remove('mula-only');syncReadingMode();}if(jump.getAttribute('href')==='#personal-note')setMode('study');const target=document.querySelector(jump.getAttribute('href'));target?.scrollIntoView();if(jump.classList.contains('skip'))target?.focus({preventScroll:true});return;}const sourceLink=e.target.closest('[data-source-main]');if(sourceLink){select('corpus/'+sourceLink.dataset.sourceMain+'/'+sourceLink.dataset.path);return;}const companion=e.target.closest('[data-companion-path]');if(companion){loadCompanion(panelKind,companion.dataset.companionPath,{force:companion.hasAttribute('data-source-retry-companion')});return;}const remoteStudy=e.target.closest('[data-remote-study]');if(remoteStudy){sideBySide=true;openStudy(remoteStudy.dataset.remoteStudy,remoteStudy);return;}const l=e.target.closest('[data-lesson]');if(l){select(l.dataset.lesson);if($('#info-dialog').open)$('#info-dialog').close();}const s=e.target.closest('[data-step]');if(s&&!s.disabled)select(activeLessons()[activeLessons().indexOf(current)+Number(s.dataset.step)].id);if(e.target.closest('[data-local-study]')){$('#library-dialog').close();select('2.4.1');}});
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#menu').onclick=()=>{if(window.matchMedia('(max-width: 900px)').matches){const open=$('#sidebar').classList.toggle('open');$('#menu').setAttribute('aria-expanded',String(open));}else{const folded=document.body.classList.toggle('nav-folded');$('#menu').setAttribute('aria-expanded',String(!folded));}};
const themeNames={light:'श्वेतम्',sepia:'धूम्रपीतम्',dark:'श्यामम्',patra:'तालपत्रम्'};
let theme=readStore('theme',readStore('dark',false)?'dark':'patra');if(!themeNames[theme])theme='patra';
function applyTheme(){document.body.dataset.theme=theme;document.body.classList.toggle('dark',theme==='dark');$('#theme').title='वर्णरूपम् — '+themeNames[theme];$('#theme').setAttribute('aria-label','वर्णरूपम् — '+themeNames[theme]+'; परिवर्तनार्थं स्पृशतु');writeStore('theme',theme);}
$('#theme').onclick=()=>{const themes=Object.keys(themeNames);theme=themes[(themes.indexOf(theme)+1)%themes.length];applyTheme();notice(themeNames[theme]);};applyTheme();
function applySize(){size=Math.max(15.2,Math.min(28.8,Number(size)||20));document.documentElement.style.setProperty('--font-size',size+'px');writeStore('size',size);}$('#size-up').onclick=()=>{size+=1.6;applySize();};$('#size-down').onclick=()=>{size-=1.6;applySize();};applySize();
function syncReadingMode(){document.body.classList.toggle('mula-only',!researchMode&&!showBhashya&&hasMula(current||{})&&!current?.workId);$('#bhashya-toggle').setAttribute('aria-pressed',String(!showBhashya));}
function sourceModeAvailable(){const unit=unitFor(current);return !remotePage&&!researchMode&&current?._liveResult?.status==='matched'&&!!unit&&UnitReader.canPadaccheda(unit);}
function syncSourceMode(){
 const available=sourceModeAvailable();if(!available)readingPadaccheda=false;
 document.body.classList.toggle('padaccheda-reading',readingPadaccheda);
 $('.reading-form').hidden=researchMode;
 $('#padaccheda-toggle').disabled=!available;
 $('#padaccheda-toggle').title=available?'मूलस्य भाष्यस्य च सम्पूर्णः पदच्छेदः':'अस्य सम्पूर्णपाठस्य पदच्छेदः अद्यापि न सज्जः।';
 $('#padaccheda-toggle').setAttribute('aria-pressed',String(readingPadaccheda));$('#source-text-toggle').setAttribute('aria-pressed',String(!readingPadaccheda));
 $('#reading-form-note').textContent=readingPadaccheda?'मूलम् भाष्यं च · पदच्छेदः':'';
 $$('[data-study-action="padaccheda"]').forEach(b=>{b.disabled=!available;b.title=$('#padaccheda-toggle').title;b.setAttribute('aria-pressed',String(readingPadaccheda));b.querySelector('span').textContent=readingPadaccheda?'✓':'↗';});
}
function setPadaccheda(enabled,fromStudy=false){
 if(!sourceModeAvailable()){readingPadaccheda=false;syncSourceMode();if(enabled)notice('अस्य सम्पूर्णपाठस्य पदच्छेदः अद्यापि न सज्जः।');return;}
 readingPadaccheda=!!enabled;const unit=unitFor(current);
 if(unit&&!researchMode){
  const mula=$('#mula .mula');if(mula)mula.innerHTML=UnitReader.mulaSource(unit,readingPadaccheda);
  const bhashya=$('#bhashya .reading-bhashya');if(bhashya)bhashya.outerHTML=UnitReader.bhashyaSource(unit,readingPadaccheda);
  for(const quote of $$('[data-bhashya-sentences]'))quote.outerHTML=UnitReader.bhashyaQuotation(unit,quote.dataset.bhashyaSentences.split(' '),readingPadaccheda);
 }
 syncSourceMode();window.ScriptDisplay?.apply();
 if(fromStudy){closeStudy(false);$('#mula').scrollIntoView({block:'start'});$('#reading').focus({preventScroll:true});}
}
$('#source-text-toggle').onclick=()=>setPadaccheda(false);
$('#padaccheda-toggle').onclick=()=>setPadaccheda(!readingPadaccheda);
$('#legend-open').onclick=()=>{
 showInfo('वर्णसङ्केताः',`<div class="reading-legend">${legendHTML()}</div><p>मुख्यपाठे वर्णाः रेखाचिह्नानि च इच्छानुसारं दर्श्यन्ते। ऊर्ध्वचिह्नानि विमर्शे एव दृश्यन्ते।</p><button class="color-switch" data-colour-switch aria-pressed="${color}">${color?'वर्णाः दर्शिताः ✓':'वर्णाः न दर्शिताः'}</button>${hasResearch(current)?'<p>'+researchLink(current)+'</p>':''}`);
};
document.addEventListener('click',e=>{if(e.target.closest('[data-colour-switch]'))toggleColors();});
function setMode(v){mode=v;document.body.classList.toggle('original-only',v==='original');}

function studyEntry(id,label){return `<div class="study-entry"><button data-study-context="${esc(id)}" aria-controls="study-dialog">${esc(label)} <span aria-hidden="true">→</span></button></div>`;}
let studyReturnFocus=null;
function syncPanelLayout(){
 const open=!!panelKind;
 $('#study-dialog').hidden=!open;
 document.body.classList.toggle('study-open',open);
 document.body.classList.toggle('layout-side',open&&sideBySide);
 $('#layout-toggle').setAttribute('aria-pressed',String(sideBySide));
 $$('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(open&&b.dataset.panel===panelKind)));
 $('#study-tools').hidden=panelKind!=='study';$('#companion-content').hidden=panelKind==='study';
 $('#study-title').textContent=panelKind==='study'?'अध्ययनसाहाय्यम्':SourceReader.workInfo[panelKind]?.title||'';
 $('#study-close').setAttribute('aria-label','व्याख्यायाः पिधानम्');
 if(panelKind==='vartika')$('#study-location').textContent='स्वतन्त्रः ग्रन्थक्रमः';else if(panelKind==='anandagiri')$('#study-location').textContent='मूलस्रोतस्य सम्बन्धानुसारम्';
}
function updateStudyContext(selected){
 if(!current)return;
 let choices;
 if(remotePage){choices=remotePage.blocks.filter(b=>b.kind!=='heading').map((b,i)=>({id:b.id,label:(current.remoteWork==='vartika'?'वार्तिकम्':current.remoteWork==='anandagiri'?'टीका':'पाठः')+' · '+b.text.slice(0,44)+'…'}));}
 else {
 const after=(current.bhashya||[]).filter(b=>b.position!=='before-mulam');
 choices=[...(hasMula(current)?[{id:'mula',label:current.workId?'श्लोकः':'मूलम्'}]:[]),...(current.bhashya||[]).map(b=>({id:b.id,label:b.position==='before-mulam'?'अवतारिका':after.length===1?'शाङ्करभाष्यम्':'भाष्यांशः '+deva(after.indexOf(b)+1)}))];
 }
 $('#study-location').textContent=(current.workId?'स्वतन्त्रग्रन्थः':'चतुर्थं ब्राह्मणम्')+' · '+(remotePage?remotePage.sectionTitle:deva(current.nativeId||current.id));
 $('#study-context').innerHTML=choices.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
 $('#study-context').value=choices.some(c=>c.id===selected)?selected:choices[0]?.id||'';
 renderStudyContent();$('.drawer-legend').hidden=!!current.workId;
}
async function renderStudyContent(){
 bankSequence=0;const id=$('#study-context').value;
 if(researchMode){$('#drawer-content').innerHTML='';return;}
 if(remotePage){
  const page=remotePage,block=page.blocks.find(b=>b.id===id),sample=independentWorks.flatMap(w=>w.units).find(u=>u.sourceAnchor===id);
  const authored=data.find(l=>l.hasResearch&&(l.sourceAnchor===id||l.bhashya?.some(b=>b.id===id)));
  if(sample&&!sample._runtimeLoaded){await ensureLesson(sample);if(remotePage!==page||$('#study-context').value!==id)return;}
  $('#drawer-content').innerHTML=(block?`<p class="selected-source">${esc(block.text)}</p>`:'')+(authored?`<p><button data-lesson="${esc(authored.id)}">अस्य पाठस्य अध्ययनपृष्ठम् →</button></p>`:sample?layerSet(sample):p('अस्य पाठस्य अध्ययनसाहाय्यम् अद्यापि न रचितम्। उपरि निर्दिष्टः मूलपाठः पठनीयः।'))+referenceDirectory();
  return;
 }
 const b=current?.bhashya?.find(b=>b.id===id);
 if(b){showBhashya=true;syncReadingMode();}
 $('#drawer-content').innerHTML=(id==='mula'?layerSet(current):b?bhashyaLayers(b):'')+referenceDirectory();restoreStudyInputs();syncSourceMode();
}
async function openStudy(context,trigger=$('#study-open')){
 if(researchMode&&current)await select(current.id);
 if(!current)return;panelKind='study';studyReturnFocus=trigger;updateStudyContext(context||$('#study-context').value);syncPanelLayout();
 if(context)sideBySide=true;syncPanelLayout();
 if(!sideBySide||window.innerWidth<=900)$('#study-dialog').scrollIntoView({block:'start'});
 $('#study-context').focus({preventScroll:true});
}
function closeStudy(restore=true){panelKind=null;++companionRequest;syncPanelLayout();if(restore&&studyReturnFocus?.isConnected)studyReturnFocus.focus({preventScroll:true});}
$$('[data-panel]').forEach(button=>button.onclick=()=>{const kind=button.dataset.panel;if(panelKind===kind){closeStudy(false);return;}studyReturnFocus=button;if(kind==='study')openStudy();else{panelKind=kind;syncPanelLayout();loadCompanion(kind);if(!sideBySide||window.innerWidth<=900)$('#study-dialog').scrollIntoView({block:'start'});}});
$('#study-close').onclick=()=>closeStudy();
$('#layout-toggle').onclick=()=>{if(!current)return;sideBySide=!sideBySide;if(!panelKind){openStudy();return;}syncPanelLayout();if(!sideBySide||window.innerWidth<=900)$('#study-dialog').scrollIntoView({block:'start'});};
$('#study-context').onchange=()=>{renderStudyContent();if(sideBySide&&window.innerWidth>900)document.getElementById($('#study-context').value)?.scrollIntoView({block:'start'});};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panelKind&&!$('dialog[open]')){e.preventDefault();closeStudy();}});
function capturedReference(url){return url;}
async function openCapturedReference(url){try{url=decodeURIComponent(url);}catch{}showSourceDestination(url);}
function sourceBlocks(blocks,study=false){return blocks.map(b=>{const refs=(b.links||[]).map(l=>{const href=capturedReference(l.url);let lazy=false;try{const u=new URL(l.url);lazy=u.origin===sourceCaptureIndex?.sourceOrigin&&!!(sourceCaptureIndex?.works?.[u.pathname.split('/')[2]]||sourceCaptureIndex?.resource_routes?.[u.pathname]);}catch{}return `<a href="${lazy?safeURL(l.url):href.startsWith('#')?esc(href):safeURL(href)}" ${lazy?`data-captured-reference="${esc(l.url)}"`:href.startsWith('#')?'class="local-route"':''} target="_blank" rel="noopener">${esc(l.text||'सन्दर्भः')}</a>`;}).join(' · ');return b.kind==='heading'?`<h3 class="source-heading" id="${study?'':'companion-'}${esc(b.id)}">${esc(b.text)}</h3>`:`<article class="source-block" id="${study?'': 'companion-'}${esc(b.id)}"><p class="${b.kind==='verse'?'mula':'original'}">${esc(b.text)}</p>${refs?`<nav class="reference-links" aria-label="पाठसन्दर्भाः">${refs}</nav>`:''}${b.sourceUrl?`<a class="source-link" href="${safeURL(b.sourceUrl)}" target="_blank" rel="noopener">मूलस्रोतः ↗</a>`:''}${study?`<button class="source-study" data-remote-study="${esc(b.id)}">अध्ययनसाहाय्यम् →</button>`:''}</article>`;}).join('');}
function sourceCarrierNote(page){return page.carrier==='publisher-json-html'?'<p class="scope-note">अयं पाठः प्रकाशकस्य संयुक्तपठनपृष्ठे प्रदर्शितः।</p>':'';}
function sourceWorkPath(path,slug){return path?.startsWith('payload/')?path:path?.startsWith('read/')?'/'+path:path&&!path.startsWith('/')?'/read/'+slug+'/'+path.replace(/\/+$/,'')+'/':path;}
function sourceSectionGroups(page){return {native:page.native_sections||(page.carrier==='publisher-json-html'?[]:page.sections||[]),resource:page.resource_sections||(page.carrier==='publisher-json-html'?page.sections||[]:[])};}
function sourceNavigation(page,kind){const groups=sourceSectionGroups(page),buttons=rows=>rows.map(s=>`<button class="source-chapter-button ${s.path===page.path?'active':''}" data-source-main="${esc(kind)}" data-path="${esc(s.path)}">${esc(s.label)}</button>`).join('');return buttons(groups.native)+(groups.resource.length?`<details ${page.carrier==='publisher-json-html'?'open':''}><summary>संयुक्तपठनात् संगृहीताः पाठाः</summary>${buttons(groups.resource)}</details>`:'');}
function sourceSectionControls(page,kind,main=false){const groups=sourceSectionGroups(page),items=rows=>rows.map(s=>`<option value="${esc(s.path)}" ${s.path===page.path?'selected':''}>${esc(s.label)}</option>`).join(''),options=groups.resource.length?`<optgroup label="ग्रन्थविभागाः">${items(groups.native)}</optgroup><optgroup label="संयुक्तपठनात् संगृहीताः पाठाः">${items(groups.resource)}</optgroup>`:items(groups.native);const parts=page.chunk?.total>1?`<div class="source-pager"><span>अंशः ${deva(page.chunk.index+1)} / ${deva(page.chunk.total)}</span>${[page.chunk.previous,page.chunk.next].map((n,i)=>Number.isInteger(n)?`<button data-source-chunk="${n}" data-source-work="${esc(kind)}" data-source-path="${esc(page.path)}" data-source-destination="${main?'main':'side'}">${i?'अग्रिमः अंशः →':'← पूर्वः अंशः'}</button>`:'').join('')}</div>`:'';return `${parts}<label class="context-label">ग्रन्थविभागः<select class="source-section-select" data-work="${kind}" data-destination="${main?'main':'side'}">${options}</select></label><div class="source-pager">${[page.previous,page.next].map((s,i)=>s?`<button ${main?`data-source-main="${kind}" data-path="${esc(s.path)}"`:`data-companion-path="${esc(s.path)}"`}>${i?'अग्रिमः →':'← पूर्वः'}</button>`:'<span></span>').join('')}</div>`;}
async function loadCompanion(kind,path,options={}){
 const request=++companionRequest;$('#companion-content').innerHTML='<p role="status">पाठः आनीयते…</p>';
 try{
  let page;
  if(kind==='anandagiri'){
   const keys=(current.bhashya||[]).map(b=>b.id);const results=await Promise.all(keys.map(id=>SourceReader.loadTika(id,undefined,options)));const found=results.filter(Boolean);
   page=found.length?{...found[0],blocks:found.flatMap(p=>p.blocks)}:null;
  }else{page=await SourceReader.loadWork(kind,path||companionPaths[kind],undefined,options);if(page)companionPaths[kind]=page.path;}
  if(request!==companionRequest||panelKind!==kind)return;
  $('#study-dialog').scrollTop=0;const info=SourceReader.workInfo[kind]||{url:independentWorks.find(w=>w.id===(kind==='vartika'?'brihadaranyakabhashya-vartika':'anandagiri-brha'))?.sourceUrl};$('#study-location').textContent=kind==='vartika'?'स्वतन्त्रः ग्रन्थक्रमः':'मूलस्रोतस्य सम्बन्धानुसारम्';
  $('#companion-content').innerHTML=page?`<div class="source-origin"><a href="${safeURL(page.url)}" target="_blank" rel="noopener">स्रोतः · अद्वैतशारदा ↗</a><a href="${safeURL(page.url)}" target="_blank" rel="noopener">स्वतन्त्रपठनम् ↗</a></div>${kind==='vartika'?'<p class="scope-note">अस्य ग्रन्थस्य स्वकीयः क्रमः। मूलमन्त्रेण सह सम्बन्धः अत्र न निर्दिश्यते।</p>'+sourceSectionControls(page,kind):''}${sourceBlocks(page.blocks)}`:`<p>अस्य भाष्यांशस्य टीकासम्बन्धः मूलस्रोते न लब्धः।</p><a href="${safeURL(info.url)}" target="_blank" rel="noopener">सम्पूर्णग्रन्थः मूलस्रोते ↗</a>`;
 }catch{if(request===companionRequest)$('#companion-content').innerHTML=`<p>मूलस्रोतस्य पाठः अधुना न प्राप्तः।</p><button data-source-retry-companion data-companion-path="${esc(path||'')}">पुनः प्रयत्नः</button><p><a href="${safeURL(SourceReader.workInfo[kind]?.url||independentWorks.find(w=>w.id===(kind==='vartika'?'brihadaranyakabhashya-vartika':'anandagiri-brha'))?.sourceUrl)}" target="_blank" rel="noopener">मूलस्रोते पठतु ↗</a></p>`;}
}
document.addEventListener('change',e=>{if(e.target.matches('.source-section-select')){if(e.target.dataset.destination==='main')select('corpus/'+e.target.dataset.work+'/'+e.target.value);else loadCompanion(e.target.dataset.work,e.target.value);}});
async function renderSourceWork(kind,path,options={}){
 const aliases={vartika:'brihadaranyakabhashya-vartika',anandagiri:'anandagiri-brha'},slug=aliases[kind]||kind;
 const url=new URL(path?.startsWith('/read/')?path:'/read/'+slug+'/'+String(path||'').replace(/^\/+|\/+$/g,'')+'/', 'https://advaitasharada.sringeri.net');if(options.anchor)url.hash=options.anchor;
 showSourceDestination(url.href);
}
function showSourceDestination(url){renderHome(false);showInfo('मूलस्रोते पठनम्',`<p>अस्य ग्रन्थस्य अध्ययनसाहाय्यम् अद्यापि न रचितम्। मूलपाठः अद्वैतशारदायां पठनीयः।</p><p><a href="${safeURL(url)}" target="_blank" rel="noopener">अद्वैतशारदायां पठतु ↗</a></p>`);}
const legendDefinitions={
 'प्रतीकम्':'मूलपदस्य भाष्ये व्याख्यानार्थं ग्रहणम्।',
 'पदार्थविवरणम्':'पदस्य अर्थः अथवा वाक्यस्य अभिप्रायः अत्र विव्रियते।',
 'पूर्वपक्षः':'विचारार्थम् उपस्थापितः आक्षेपः अथवा प्रश्नः।',
 'सिद्धान्तः':'आक्षेपस्य साक्षात् समाधानम्।',
 'समाधानम्':'आक्षेपस्य साक्षात् समाधानम्।',
 'आशङ्कासमाधानम्':'टीकायाम् उल्लिखितायाः आशङ्कायाः समाधानरूपः भाष्यांशः।',
 'दृष्टान्तः':'विवक्षितस्य अर्थस्य बोधाय प्रसिद्धम् उदाहरणम्।',
 'उद्धरणम्':'अन्यस्मात् पाठात् अत्र गृहीतं वचनम्।',
 'उपसंहारः':'पूर्वविचारस्य निष्कर्षः अत्र उच्यते।',
 'अवतरणिका':'अनन्तरवचनस्य प्रयोजनम् अत्र दर्श्यते।'
};
function legendHTML(){
 const u=unitFor(current),examples=new Map();
 if(u?.bhashyam.text)for(const sentence of u.bhashyam.sentences){
  for(const r of [...(sentence.discourse||[]),...(sentence.pratikah||[]).map(r=>({...r,category:'प्रतीकम्'})),...(sentence.uddharanani||[]).map(r=>({...r,category:'उद्धरणम्'}))]){
   if(examples.has(r.category))continue;
   const first=sentence.tokens.find(t=>t.id===r.from),last=sentence.tokens.find(t=>t.id===r.to),start=r.source_start??r.start??first?.source_ranges?.[0]?.start,end=r.source_end??r.end??last?.source_ranges?.at(-1)?.end;
   const example=r.text||r.source_text||(Number.isInteger(start)&&Number.isInteger(end)?u.bhashyam.text.slice(start,end):sentence.text);
   const clean=example.replace(/\u00ad/g,'').trim();examples.set(r.category,clean.length>120?clean.slice(0,120)+'…':clean);
  }
 }
 const entries=Object.entries(UnitReader.roles).filter(([name])=>u?.bhashyam.text?examples.has(name):['प्रतीकम्','पूर्वपक्षः','सिद्धान्तः'].includes(name));
 return entries.map(([name,[cls]])=>`<div class="legend-definition"><b class="dk-${cls}">${esc(name)}</b><p>${esc(legendDefinitions[name])}</p>${examples.has(name)?`<p class="legend-example"><span>उदाहरणम् — </span>${esc(examples.get(name))}</p>`:''}</div>`).join('')+'<p class="legend-note">पदं स्पृष्ट्वा तस्य व्याकरणं पश्यतु। प्रतीकस्य सम्बद्धं मूलपदम् अपि चिह्न्यते।</p>';
}
function renderLegend(){$('#legend').innerHTML=legendHTML();}
renderLegend();
function applyColors(){document.body.classList.toggle('no-colors',!color);$('#color-toggle').textContent=color?'वर्णाः दर्शिताः ✓':'वर्णाः न दर्शिताः';$('#color-toggle').setAttribute('aria-pressed',String(color));$$('[data-colour-switch]').forEach(b=>{b.setAttribute('aria-pressed',String(color));b.textContent=color?'वर्णाः दर्शिताः ✓':'वर्णाः न दर्शिताः';});}
function toggleColors(){color=!color;writeStore('colors',color);applyColors();}
$('#color-toggle').onclick=toggleColors;applyColors();
$('#bhashya-toggle').onclick=()=>{showBhashya=!showBhashya;syncReadingMode();};
$('#home-search').oninput=()=>renderHome(false);
$('#notes-open').onclick=()=>{const d=$('#personal-note details');if(d){setMode('study');d.open=true;d.scrollIntoView();$('#note').focus({preventScroll:true});$('#sidebar').classList.remove('open');$('#menu').setAttribute('aria-expanded',String(!window.matchMedia('(max-width: 900px)').matches&&!document.body.classList.contains('nav-folded')));}};
$('#bookmarks-open').onclick=()=>showInfo('चिह्निताः पाठाः',marks.length?marks.map(id=>`<button class="lesson-link" data-lesson="${esc(id)}">${deva(allLessons().find(l=>l.id===id)?.nativeId||id)} · ${esc(allLessons().find(l=>l.id===id)?.title||'पाठः')}</button>`).join(''):'<p>पाठस्य पार्श्वे ध्वजचिह्नं स्पृशतु। चिह्नितः पाठः अत्र दृश्यते।</p>');
$('#method-open').onclick=()=>showInfo('अध्ययनपद्धतिः',`<p>अत्र मूलपाठः तथा शाङ्करभाष्यं प्रथमं पठनीयम्। यत्र अर्थः अस्पष्टः, तत्रैव आवश्यकं विवरणम् उद्घाटनीयम्।</p><p><b>मूलम् → पदच्छेदः → अन्वयः → पदार्थः → व्याकरणपरिचयः → सरलार्थः।</b> व्याख्यासु अध्ययनसाहाय्यम् इति विकल्पं चिनोतु। पार्श्वे इति विकल्पेन तदेव विवरणं पाठस्य दक्षिणभागे दृश्यते। तत्र मूलपाठं वा भाष्यांशं चिनोतु। ततः आवश्यकं विवरणम् उद्घाटयतु। पठनविकल्पेषु पदच्छेदः इति स्पृष्टे मूलस्य भाष्यस्य च सन्धयः विभज्यन्ते। मूलपाठः इति स्पृष्टे पूर्वपाठः पुनः दृश्यते। वर्णसङ्केताः इति विकल्पेन वर्णानां प्रयोजनं ज्ञायते। भाष्यस्य प्रतीकादिवर्णाः इच्छानुसारं दर्शनीयाः।</p><p><b>भाष्यम् → भाष्यपरिचयः → भाष्यसङ्गतिः → भाष्यान्वयः → भाष्यपदव्याकरणपरिचयः → सरलभाष्यव्याख्या → पुनः भाष्यपठनम्।</b> भाष्यव्याकरणपरिचये मूलपाठस्य विवरणे अनुक्तानि कानिचित् भाष्यपदानि विव्रियन्ते। धातुसूत्रसन्दर्भाः इच्छानुसारं पठनीयाः। भाष्यसङ्गतौ सम्बद्धानि कानिचित् वाक्यानि एकत्र पठित्वा तेषां सम्बन्धः ज्ञायते। विस्तृतानि टीकाप्रमाणानि विमर्शे सन्ति।</p><p>सरलविवरणे प्रथमं परिचितैः पदैः अर्थः उच्यते। ततः भाष्यकारस्य पदं परिचाय्यते। अनन्तरं तेन पदेन वाक्यार्थः स्पष्टीक्रियते। एवं पुनः भाष्यपठनं सुकरं भवति।</p><p>अन्वये पूरितानि पदानि [ ] इति चिह्नाभ्यां निर्दिश्यन्ते। मूलभाष्यपाठे तानि न योज्यन्ते। प्रतीकग्रहणम्, पूर्वपक्षः, उत्तरं च अर्थानुसारेण परीक्ष्य चिह्नितानि; केवलं समानशब्ददर्शनात् न चिह्नितानि।</p><p>वार्तिकं स्वकीयक्रमेण आरम्भात् पठनीयम्; मूलमन्त्रेण सह तस्य सम्बन्धः अत्र न कल्प्यते। आनन्दगिरिटीका मूलस्रोते निर्दिष्टसम्बन्धेन एव दृश्यते। अध्ययनसाहाय्यं मुख्यपठनीयग्रन्थस्य एव भवति।</p>`);
$('#method-open-side').onclick=()=>$('#method-open').click();
$('#scope-open').onclick=()=>{if(runtimeManifest?.archive_mode){showInfo('अस्य संस्करणस्य स्थितिः',`<p>अत्र मूलपाठः शाङ्करभाष्यं च अद्वैतशारदातः पठनकाले आनीयेते। सविवरणाः पाठाः — ${data.filter(l=>l.reviewStatus!=='source-only').map(l=>deva(l.id)).join(' · ')}। एतेषां विवरणानि प्रारम्भिकरूपेण रचितानि। <b>नूतनविवरणस्य विद्वत्समीक्षा अद्यापि अपेक्षिता।</b></p><p>मूलपाठस्य प्राप्तिस्थानं प्रत्येकं निर्दिष्टम्। अद्वैतशारदायाः पठनविन्यासमनुसृत्य अत्र पठनव्यवस्था निर्मिता। अयं स्वाध्यायप्रयत्नः।</p><p>अध्ययनसाहाय्ये बहुलिपिकं सन्धिसहिष्णुं च अन्वेषणम् उपलब्धम्। सम्पूर्णमूलग्रन्थेषु अन्वेषणार्थम् अद्वैतशारदा द्रष्टव्या।</p>${hasResearch(current)?'<p>'+researchLink(current)+'</p>':''}${(unitFor(current)?.parikshaniya_suchi?.length||unitFor(current)?.review_count)?'<p><a href="#unit-review-list" data-unit-review-list>समीक्षकाणां कृते परीक्षणीयसूची</a></p>':''}`);return;}current?.remoteWork?showInfo('अस्य ग्रन्थस्य स्थितिः',p('अस्य ग्रन्थस्य संगृहीताः पाठाः अत्र स्वकीयग्रन्थक्रमेण पठनीयाः। प्रत्येकस्य पाठस्य मूलस्रोतसि प्रवेशः अपि उपलब्धः।')+p('अध्ययनसाहाय्यं मुख्यपठनीयग्रन्थस्य एव भवति। नूतनविवरणानि क्रमशः रचनीयानि; विद्वत्समीक्षा अपेक्षिता। वार्तिकस्य २.४.८३ इति श्लोकस्य विवरणम् अधुना अभ्यासार्थम् उपलब्धम्।')):current?.workId?showInfo('अस्य ग्रन्थस्य स्थितिः',p('अत्र सुरेश्वराचार्यस्य बृहदारण्यकभाष्यवार्तिकात् अभ्यासार्थम् एकः श्लोकः (२.४.८३) संगृहीतः। पदच्छेदादिविवरणानि प्रारूपाणि; विद्वत्समीक्षा अपेक्षिता।')+p('अस्य ग्रन्थस्य स्वकीयः पाठक्रमः अस्ति। मूलमन्त्रेण सह सम्बन्धः अत्र न निर्दिश्यते। सम्पूर्णपाठः मूलस्रोते पठनीयः।')):showInfo('अस्य संस्करणस्य स्थितिः',`<p>अत्र मूलपाठः शाङ्करभाष्यं च अद्वैतशारदातः पठनकाले आनीयेते। सविवरणाः पाठाः — ${data.filter(l=>l.reviewStatus!=='source-only').map(l=>deva(l.id)).join(' · ')}। एतेषां विवरणानि प्रारम्भिकरूपेण रचितानि। <b>नूतनविवरणस्य विद्वत्समीक्षा अद्यापि अपेक्षिता।</b></p><p>ग्रन्थसङ्ग्रहे अद्वैतशारदायाः ग्रन्थप्रवेशाः सन्ति। अन्यग्रन्थानां मूलपाठाः अद्वैतशारदायां पठनीयाः। तेषां नूतनविवरणानि अद्यापि न रचितानि।</p><p>मूलपाठस्य प्राप्तिस्थानं प्रत्येकं निर्दिष्टम्। अद्वैतशारदायाः पठनविन्यासमनुसृत्य अत्र पठनव्यवस्था निर्मिता। अयं स्वतन्त्रः अध्ययनप्रयत्नः।</p><p>अध्ययनसाहाय्ये बहुलिपिकं सन्धिसहिष्णुं च अन्वेषणम् उपलब्धम्। सम्पूर्णमूलग्रन्थेषु अन्वेषणार्थम् अद्वैतशारदा द्रष्टव्या।</p>${hasResearch(current)?'<p>'+researchLink(current)+'</p>':''}${(unitFor(current)?.parikshaniya_suchi?.length||unitFor(current)?.review_count)?'<p><a href="#unit-review-list" data-unit-review-list>समीक्षकाणां कृते परीक्षणीयसूची</a></p>':''}`);};
async function route(scroll=true){
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{id='home';}
 if(runtimeManifest?.archive_mode&&(!id||id==='home'))id=runtimeManifest.default_route||'2.4.1';
 id=id||document.body.dataset.unitRoute||'home';
 // A copied catalogue link stays private; the exact publisher URL is resolved
 // only now, using the selected work's captured manifest and recorded aliases.
 if(id.startsWith('source/')){await openCapturedReference(id.slice(7),{push:false});return;}
 if(id==='home'){if(runtimeManifest?.archive_mode){await select(runtimeManifest.default_route||'2.4.1',{scroll,push:false});return;}renderHome(scroll);return;}
 let anchor='';if(document.body.dataset.unitRoute?.startsWith('corpus/')&&!id.startsWith('corpus/')&&document.getElementById(id)){anchor=id;id=document.body.dataset.unitRoute;}
 if(id.includes('/at/')){[id,anchor]=id.split('/at/');}
 else{const linked=/^(\d+\.\d+\.\d+)\/((?:BU|LEX|VP|CARD)\..+)$/.exec(id);if(linked){id=linked[1];anchor=linked[2];}}
 const stable=/^BU\.(\d+\.\d+\.\d+)(?:\.|$)/.exec(id);if(stable){anchor=id;id=stable[1];}
 if(id.startsWith('corpus/')){await select(id,{scroll,push:false,anchor});return;}
 if(runtimeManifest?.source_links?.[id]){const link=runtimeManifest.source_links[id];showSourceDestination(typeof link==='string'?link:(link.sourceUrl||link.source_url));return;}
 if(lessonRoute(id)){await select(id,{scroll,push:false});if(anchor)await jumpUnit(anchor);}
 else{document.body.classList.remove('home-view');$('#home').hidden=true;$('.layout').hidden=false;$('#lesson-content').innerHTML='<h2>पाठः न लब्धः</h2><p><a href="#home">ग्रन्थसङ्ग्रहः</a></p>';}
}
window.addEventListener('popstate',()=>route());
window.matchMedia('(max-width: 900px)').addEventListener('change',e=>$('#menu').setAttribute('aria-expanded',String(e.matches?$('#sidebar').classList.contains('open'):!document.body.classList.contains('nav-folded'))));
resource('runtime/manifest.json').then(async manifest=>{
 runtimeManifest=manifest;
 const [cat,references,labels]=await Promise.all([manifest.catalogue?resource(manifest.catalogue):Promise.resolve({items:[]}),resource(manifest.references),resource(manifest.reference_labels)]);
 referenceData=references;runtimeLabels=labels;
 data=manifest.lessons;catalogue=cat?.items||[];independentWorks=manifest.independentWorks||[];
 independentLessons=independentWorks.flatMap(w=>w.units);
 await SourceReader.initialize?.(manifest.companions).catch(()=>null);
 await route(false);
}).catch(()=>{$('#home').hidden=true;$('.layout').hidden=false;if(!document.body.dataset.unitRoute)$('#lesson-content').innerHTML='<p class="subtle-note">पाठः न प्राप्तः। कृपया पृष्ठं पुनः उद्घाटयतु।</p>';});

// Passage search and optional study tools share the existing reader, never an external destination.
async function ensureSearch(){
 if(searchIndex)return searchIndex;
 if(!runtimeManifest)throw Error('पाठसूची आनीयते');
 const source=await resource(runtimeManifest.search);
 if(!searchIndex){searchIndex=VedantaSearch.createIndex({}, {sanscript:Sanscript});searchIndex.addDocuments(source.documents);}
 return searchIndex;
}
function openSearch(query=''){
 const dialog=$('#search-dialog');$('#global-search').value=query;if(!dialog.open)dialog.showModal();runSearch();$('#global-search').focus();
}
let searchTimer,searchVisible=0;
function cancelSearch(){++searchRequest;$('#search-results').removeAttribute('aria-busy');}
function searchStatus(response={}){
 const count=searchResults.length;
 const found=count?(count===1?'१ पाठस्थानं लब्धम्।':deva(count)+' पाठस्थानानि लब्धानि।'):'पाठः न लब्धः। अन्यत् पदं वा संक्षिप्तं वाक्यं वा प्रयुङ्क्ताम्।';
 const scope='अत्र अध्ययनसाहाय्ये एव अन्वेषितम्।';
 $('#search-status').textContent=found+(scope?' '+scope:'');$('#search-results').removeAttribute('aria-busy');
}
function searchSourceLabel(result){
 if(result.origin==='help')return 'अध्ययनसाहाय्यम्';
 if(result.sourceType==='bhashya'){
  const study=result.workId==='brihadaranyaka-bhashya'&&!String(result.route||'').replace(/^#/,'').startsWith('corpus/')&&data.some(l=>l.id===result.lessonId&&!l.workId);
  return study?'शाङ्करभाष्यम्':'भाष्यम्';
 }
 return {tika:'टीका',vartika:'वार्तिकम्'}[result.sourceType]||'मूलपाठः';
}
function renderSearchResults(append=false){
 const names={exact:'अक्षरशः',normalized:'लिप्यन्तरेण समानः',sandhi:'सन्धिभेदेन लब्धः',approximate:'निकटपाठः'};
 if(!append){searchVisible=0;$('#search-results').innerHTML='';}else $('[data-search-more]')?.remove();
 const start=searchVisible,end=Math.min(searchResults.length,start+100);
 const html=searchResults.slice(start,end).map((r,j)=>{const i=start+j;return `<article class="search-result"><div class="result-heading"><button data-search-result="${i}">${esc(r.title||r.label||'पाठः')}${r.lessonId?' · '+esc(deva(r.lessonId)):''}</button><span class="match-kind">${names[r.matchType]||'सम्बद्धः पाठः'}</span></div><p class="scope-note">${searchSourceLabel(r)}</p><p class="result-excerpt">${esc(r.excerpt||r.text||'')}</p><div class="result-actions"><button data-search-result="${i}">अत्र पठतु →</button><a href="${safeURL(r.sourceUrl)}" target="_blank" rel="noopener">अद्वैतशारदायां पठतु ↗</a></div></article>`;}).join('');
 $('#search-results').insertAdjacentHTML('beforeend',html);searchVisible=end;
 if(end<searchResults.length)$('#search-results').insertAdjacentHTML('beforeend',`<button type="button" data-search-more>अपराणि दर्शयतु · ${deva(end)} / ${deva(searchResults.length)}</button>`);
}
async function runSearch(){
 const request=++searchRequest;
 const query=$('#global-search').value.trim();
 searchResults=[];renderSearchResults();
 if(!query){$('#search-status').textContent='अन्वेषणीयं पदं वाक्यं वा लिखतु।';$('#search-results').removeAttribute('aria-busy');return;}
 $('#search-status').textContent='पाठाः अन्विष्यन्ते…';$('#search-results').setAttribute('aria-busy','true');
 try{await ensureSearch();if(request!==searchRequest)return;searchResults=searchIndex.search(query,{scope:$('#search-scope').value,approximate:true}).results;renderSearchResults();searchStatus({localOnly:true});}
 catch{if(request===searchRequest){$('#search-status').textContent='पाठसूची न प्राप्ता। पुनः प्रयतताम्।';$('#search-results').removeAttribute('aria-busy');}}
}
$('#search-submit').onclick=()=>openSearch($('#lesson-search').value);
$('#search-open').onclick=()=>openSearch($('#lesson-search').value);
$('#home-text-search').onclick=()=>openSearch($('#home-search').value);
$('#lesson-search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();openSearch(e.target.value);}};
$('#global-search-form').onsubmit=e=>{e.preventDefault();runSearch();};
$('#global-search').oninput=()=>{cancelSearch();clearTimeout(searchTimer);searchTimer=setTimeout(runSearch,160);};
$('#search-scope').onchange=runSearch;
$('#search-dialog').addEventListener('close',()=>{clearTimeout(searchTimer);cancelSearch();});
async function showUnitLibrary(kind,entry){
 const u=unitFor(current),lesson=current;if(!u)return;
 const title={lexicon:'पारिभाषिकशब्दकोशः',expressions:'शाङ्करवाक्प्रयोगाः',cards:'पुनरावृत्तिः'}[kind];
 try{let view;if(kind==='lexicon'){const store=await resource(runtimeManifest.lexicon);const ids=u.lexicon_ids||u.lexicon_updates?.map(r=>r.id)||[];view={...u,lexicon_updates:store.entries.filter(r=>ids.includes(r.id))};}
 else{const library=await resource(lesson.runtime.library);view={...u,...library};}
 if(current!==lesson)return;showInfo(title,UnitReader[kind](view));$('#info-body').setAttribute('data-study-transliterate','');$('#info-body').removeAttribute('data-no-transliterate');if(entry)document.getElementById(entry)?.scrollIntoView({block:'nearest'});restoreStudyInputs();
 }catch{notice('विवरणम् न प्राप्तम्। पुनः प्रयतताम्।');}
}
function restoreStudyInputs(){
 const known=readStore('remembered-cards',[]);for(const button of $$('[data-card-known]')){const remembered=Array.isArray(known)&&known.includes(button.closest('[data-card]').dataset.card);button.setAttribute('aria-pressed',String(remembered));}
}
async function jumpUnit(id){
 const unit=unitFor(current);id=UnitReader.resolveAnchor(unit,id);
 if(!researchMode&&/\.(?:BV|V)\./.test(id))id=UnitReader.grammarEntry(unit,id)?.id||id;
 if(id.startsWith('CARD.')){showUnitLibrary('cards',id);return;}if(id.startsWith('LEX.')){showUnitLibrary('lexicon',id);return;}if(id.startsWith('VP.')){showUnitLibrary('expressions',id);return;}
 const match=/^BU\.(\d+\.\d+\.\d+)/.exec(id);if(match&&current?.id!==match[1])await select(match[1]);
 if(/^BU\.\d+\.\d+\.\d+$/.test(id)){$('#mula')?.scrollIntoView({block:'start'});return;}
 const resolve=()=>document.getElementById(id)||document.getElementById(id+'.parts');let target=resolve();
 if(!target){await openStudy(!id.includes('.B.')&&!id.includes('.BV.')&&!id.includes('.BP.')?'mula':current?.bhashya?.[0]?.id);target=resolve();}
 if(!target){const other=$('#study-context').value==='mula'?current?.bhashya?.[0]?.id:'mula';await openStudy(other);target=resolve();}
 if(!target&&unitFor(current)&&!researchMode){await select(current.id+'/vimarshah');target=resolve();}
 if(!target){const sentence=/^(BU\.\d+\.\d+\.\d+\.B\.s\d+)/.exec(id);if(sentence)target=document.getElementById(sentence[1]);}if(!target){notice('अस्य अंशस्य पृथक् स्थानं न लब्धम्।');return;}
 for(let p=target;p;p=p.parentElement){if(p.matches('details'))p.open=true;if(p.matches('.study-panel')){p.hidden=false;const b=document.getElementById(p.getAttribute('aria-labelledby'));if(b){b.setAttribute('aria-expanded','true');b.querySelector('span').textContent='−';}}}
 history.replaceState(null,'','#'+current.id+(researchMode?'/vimarshah':'')+'/at/'+encodeURIComponent(id));target.scrollIntoView({block:'center'});target.classList.add('study-target');target.focus?.({preventScroll:true});setTimeout(()=>target.classList.remove('study-target'),5000);
}
function openWordGrammar(ids){
 const u=unitFor(current);if(!u)return;
 const rows=[...u.mula.vyakaranam,...u.bhashyam.vyakaranam],tokens=[...u.mula.tokens,...u.bhashyam.sentences.flatMap(s=>s.tokens)];
 ids=[...new Set(ids.map(id=>UnitReader.resolveToken(u,id)))];
 const choices=ids.map(id=>({id,token:tokens.find(t=>t.id===id),row:UnitReader.grammarEntry(u,id)}));
 const pick=choices[0];if(!pick)return;const context=(pick.row?.id.includes('.V.')||!pick.row&&pick.id.includes('.M.'))?'mula':current.bhashya[0].id;
 openStudy(context);
 const panel=$$('.study-control').find(b=>b.dataset.studyName===(context==='mula'?'व्याकरणपरिचयः':'भाष्यपदव्याकरणपरिचयः'));
 if(panel&&panel.getAttribute('aria-expanded')!=='true')panel.click();
 if(pick.row)jumpUnit(pick.row.id);else{const block=document.createElement('p');block.className='study-flow';block.textContent='अस्य पदस्य टिप्पणी अद्यापि न लिखिता।';$('#drawer-content').prepend(block);block.scrollIntoView({block:'nearest'});}
 if(choices.length>1){const nav=document.createElement('nav');nav.className='word-choices';nav.setAttribute('aria-label','सन्धिस्थाने पदानि');nav.innerHTML='<span>पदम् — </span>'+choices.map(c=>`<button class="text-link" data-grammar-choice="${esc(c.id)}">${esc(c.token?.padam||'पदम्')}</button>`).join(' ');$('#drawer-content').prepend(nav);}
}
function referenceLinkTitles(root=document){const links=root.matches?.('a[href*="ashtadhyayi.com"]')?[root]:[...root.querySelectorAll?.('a[href*="ashtadhyayi.com"]')||[]];for(const a of links)if(!a.title)a.title=UnitReader.referenceTitle(a.href,a.textContent.trim());}
referenceLinkTitles();
new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)referenceLinkTitles(n);}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',async e=>{
 const retry=e.target.closest('[data-source-retry]');if(retry&&current){const lesson=current;if(lesson._retrying)return;lesson._retrying=true;$$('[data-source-retry]').forEach(b=>b.disabled=true);try{await refreshLiveLesson(lesson,true);}finally{lesson._retrying=false;}return;}
 const capturedLink=e.target.closest('[data-captured-reference]');if(capturedLink){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();await openCapturedReference(capturedLink.dataset.capturedReference);return;}
 const corpusIndex=e.target.closest('[data-corpus-index]');if(corpusIndex){await showCorpusIndex(corpusIndex.dataset.corpusIndex);return;}
 const sourceChunk=e.target.closest('[data-source-chunk]');if(sourceChunk){const d=sourceChunk.dataset,options={chunk:Number(d.sourceChunk)};if(d.sourceDestination==='main')await select('corpus/'+d.sourceWork+'/'+d.sourcePath,options);else await loadCompanion(d.sourceWork,d.sourcePath,options);return;}
 if(e.target.closest('[data-search-more]')){renderSearchResults(true);return;}
 const result=e.target.closest('[data-search-result]');if(result){const r=searchResults[Number(result.dataset.searchResult)];if(!r)return;$('#search-dialog').close();const route=decodeURIComponent(String(r.route||r.lessonId||'').replace(/^#/,''));await select(route,route.startsWith('corpus/')?{anchor:r.anchor}:{});if(r.origin==='help'){await openStudy(r.context||r.contextId||'mula');const control=$$('.study-control').find(x=>x.dataset.studyName===r.helpEntryId);if(control){control.click();control.scrollIntoView({block:'center'});}}const target=document.getElementById(r.anchor)||document.getElementById(r.contextId==='mula'?'mula':r.contextId);if(target){history.replaceState(null,'','#'+route+'/at/'+encodeURIComponent(target.id));target.scrollIntoView({block:'center'});target.classList.add('search-target');setTimeout(()=>target.classList.remove('search-target'),5000);}return;}
 const review=e.target.closest('[data-unit-review-list]');if(review){e.preventDefault();if(!researchMode)await select(current.id+'/vimarshah');const u=unitFor(current);if(!u)return;showInfo('परीक्षणीयसूची',`<div id="unit-review-list">${UnitReader.reviewList(u)}</div>`);$('#info-dialog').scrollTop=0;$('#info-dialog .close-dialog').focus();return;}
 const library=e.target.closest('[data-unit-library]');if(library){showUnitLibrary(library.dataset.unitLibrary);return;}
 const lex=e.target.closest('[data-unit-lexicon]');if(lex){showUnitLibrary('lexicon',lex.dataset.unitLexicon);return;}
 const compoundResearch=e.target.closest('[data-unit-research]');if(compoundResearch){e.preventDefault();const id=compoundResearch.dataset.unitResearch;await select(current.id+'/vimarshah');await jumpUnit(id);return;}
 const jump=e.target.closest('[data-unit-jump]');if(jump){if($('#info-dialog').open)$('#info-dialog').close();jumpUnit(jump.dataset.unitJump);return;}
 const word=e.target.closest('[data-grammar-tokens],[data-grammar-choice]');if(word){
  e.preventDefault();
  const targets=(word.dataset.mulaTargets||'').split(' ').filter(Boolean);if(targets.length){$$('[data-mula-ids]').forEach(x=>x.classList.toggle('pratika-target',x.dataset.mulaIds.split(' ').some(id=>targets.includes(id))));}
  openWordGrammar((word.dataset.grammarTokens||word.dataset.grammarChoice).split(' '));return;
 }
 const pratika=e.target.closest('[data-mula-targets]');if(pratika){$$('[data-mula-ids]').forEach(x=>x.classList.remove('pratika-target'));const ids=pratika.dataset.mulaTargets.split(' ');const matches=$$('[data-mula-ids]').filter(x=>x.dataset.mulaIds.split(' ').some(id=>ids.includes(id)));matches.forEach(x=>x.classList.add('pratika-target'));if(matches[0])matches[0].scrollIntoView({block:'center'});else{openStudy('mula');jumpUnit(ids[0]);}return;}
 if(e.target.closest('[data-unit-reread]')){if(researchMode)select(current.id);closeStudy(false);$('#bhashya').scrollIntoView({block:'start'});return;}
 const known=e.target.closest('[data-card-known]');if(known){const card=known.closest('[data-card]').dataset.card;let list=readStore('remembered-cards',[]);if(!Array.isArray(list))list=[];const selected=!list.includes(card);writeStore('remembered-cards',selected?[...list,card]:list.filter(x=>x!==card));known.setAttribute('aria-pressed',String(selected));return;}
 if(e.target.closest('.study-control,[data-study-context]'))restoreStudyInputs();
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-mula-targets],[data-grammar-tokens]')){e.preventDefault();e.target.click();}});
