/* Live original text is held in this browser session only. No publisher markup
 * reaches the page: detached parsing ends in textContent, then the caller uses
 * its own escaped renderer. Stored study offsets use U+00AD removal only.
 *
 * load(payload,{signal,force}) returns a cloned, selectively hydrated payload
 * and per-paragraph matched/mismatch/failed results. Only matched paragraphs
 * may use overlays. force is the explicit Retry action, not an automatic retry.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LiveSource=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const ORIGIN='https://advaitasharada.sringeri.net';
const NORMALIZATION='remove-U+00AD-only';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const list=v=>Array.isArray(v)?v:[];
const clone=v=>JSON.parse(JSON.stringify(v));
const normalizeText=text=>String(text).replace(/\u00ad/g,'');
function fault(code,message){return Object.assign(new Error(message),{code});}
function sourceURL(value,request=false,transport='html'){
 let u;try{u=new URL(value);}catch{throw fault('SOURCE_URL','Invalid source URL.');}
 if(u.origin!==ORIGIN||u.protocol!=='https:'||u.username||u.password)throw fault('SOURCE_ORIGIN','Only the verified publisher HTTPS origin is allowed.');
 if(request){if(u.hash||u.search||!(transport==='json-html'?/^\/vyakhya\/[^?#]+\.json$/.test(u.pathname):u.pathname.startsWith('/read/')))throw fault('SOURCE_REQUEST','Unsupported source request path.');}
 return u.href;
}
function validateDescriptor(d){
 if(!d||typeof d.id!=='string'||!d.id||typeof d.anchor!=='string'||!d.anchor||!['html','json-html'].includes(d.transport)||d.normalization!==NORMALIZATION||d.range_encoding!=='utf16'||!/^([a-f0-9]{64})$/.test(d.sha256)||!Number.isInteger(d.length_utf16)||d.length_utf16<1)throw fault('SOURCE_DESCRIPTOR','Incomplete source identity or offset policy.');
 sourceURL(d.source_url);sourceURL(d.request_url,true,d.transport);
 if(d.transport==='json-html'&&(typeof d.json_pointer!=='string'||!d.json_pointer.startsWith('/')))throw fault('SOURCE_POINTER','A publisher JSON row pointer is required.');
 return d;
}
// All normalized boundaries map to raw UTF-16 boundaries. A removed soft hyphen
// belongs to the interval on its right; a final soft hyphen belongs to the last.
// Thus adjacent sentence slices still reconstruct the complete original exactly.
function offsetMap(raw){
 if(typeof raw!=='string')throw fault('SOURCE_TEXT','Expected source text.');
 const boundaries=[0];let normalized='';
 for(let i=0;i<raw.length;i++){if(raw[i]==='\u00ad')continue;normalized+=raw[i];boundaries.push(i+1);}
 boundaries[boundaries.length-1]=raw.length;
 const boundary=n=>{if(!Number.isInteger(n)||n<0||n>=boundaries.length)throw fault('SOURCE_RANGE','An annotation extends beyond the verified paragraph.');if(n>0&&n<normalized.length&&/[\uD800-\uDBFF]/.test(normalized[n-1])&&/[\uDC00-\uDFFF]/.test(normalized[n]))throw fault('SOURCE_RANGE','An annotation splits a Unicode scalar.');return boundaries[n];};
 return {normalized,boundaries,boundary,range:r=>{if(!r||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.end<r.start)throw fault('SOURCE_RANGE','Invalid normalized source range.');return {...r,start:boundary(r.start),end:boundary(r.end)};}};
}
function jsonPointer(value,pointer){
 let current=value;
 for(const encoded of pointer.slice(1).split('/')){if(/~(?![01])/.test(encoded))throw fault('SOURCE_POINTER','Invalid JSON pointer escape.');const key=encoded.replace(/~1/g,'/').replace(/~0/g,'~');if(!current||typeof current!=='object'||!own(current,key))throw fault('SOURCE_POINTER','The publisher row is absent.');current=current[key];}
 return current;
}
function textOnly(node,excludeUI){
 const copy=node.cloneNode(true);
 for(const bad of copy.querySelectorAll('script,style,template,noscript'+(excludeUI?',.verse-no,.note-mark,.sam-tools':'')))bad.remove();
 for(const br of copy.querySelectorAll('br'))br.replaceWith(copy.ownerDocument.createTextNode('\n'));
 return copy.textContent;
}
function extractHTML(document,anchor){
 const matches=[...document.querySelectorAll('[id]')].filter(n=>n.getAttribute('id')===anchor);
 if(matches.length!==1)throw fault('SOURCE_ANCHOR',matches.length?'The publisher anchor is duplicated.':'The publisher anchor is absent.');
 const node=matches[0],main=node.closest('main.text');
 if(!main||!node.matches('.unit,.sectionheading,.section-heading,.chapter-head'))throw fault('SOURCE_STRUCTURE','The anchor is not a publisher source paragraph.');
 const parent=node.parentElement?.closest('.unit,.sectionheading,.section-heading,.chapter-head');
 if(parent&&main.contains(parent))throw fault('SOURCE_STRUCTURE','The anchor is nested inside another source paragraph.');
 const verses=[...node.querySelectorAll('.verse-text')];
 if(verses.length>1)throw fault('SOURCE_STRUCTURE','Multiple source verse containers.');
 const text=textOnly(verses[0]||node,true);
 if(!text)throw fault('SOURCE_STRUCTURE','The source paragraph is empty.');
 return text;
}
function extractJSON(documentParser,json,d){
 const row=jsonPointer(json,d.json_pointer);
 if(!row||typeof row!=='object'||Array.isArray(row)||row.id!==d.anchor||typeof row.html!=='string')throw fault('SOURCE_ROW','The publisher JSON row identity or HTML field changed.');
 const doc=documentParser.parseFromString(row.html,'text/html');
 const raw=textOnly(doc.body,false);
 if(!raw)throw fault('SOURCE_STRUCTURE','The source row is empty.');
 return raw;
}
function hydrateRanges(record,map){
 if(!record||typeof record!=='object')return;
 if(own(record,'start')||own(record,'end')){const r=map.range(record);record.start=r.start;record.end=r.end;}
 if(own(record,'source_start')||own(record,'source_end')){const r=map.range({start:record.source_start,end:record.source_end});record.source_start=r.start;record.source_end=r.end;}
 if(record.source_ranges)record.source_ranges=record.source_ranges.map(r=>map.range(r));
}
function hydrateTokens(tokens,map){
 for(const t of list(tokens)){
  if(!list(t.source_ranges).length)throw fault('SOURCE_RANGE','Token source ranges are absent.');
  const pieces=t.source_ranges.map(r=>{map.range(r);return map.normalized.slice(r.start,r.end);});
  t.padam=own(t,'resolved_form')?t.resolved_form:pieces.join('');
  if(typeof t.padam!=='string'||!t.padam)throw fault('SOURCE_FORM','A resolved token form is empty.');
  hydrateRanges(t,map);
 }
}
function hydrateAnnotations(rows,map,raw){for(const r of list(rows)){hydrateRanges(r,map);if(Number.isInteger(r.source_start)&&Number.isInteger(r.source_end))r.source_text=raw.slice(r.source_start,r.source_end);else if(Number.isInteger(r.start)&&Number.isInteger(r.end)&&own(r,'text'))r.text=raw.slice(r.start,r.end);}}
function splitReading(raw,splits,map){
 let position=0,out='';
 for(const s of list(splits)){
  const r=map.range(s);if(r.start<position||r.end<=r.start||!list(s.resolved_forms).length||s.resolved_forms.some(t=>typeof t!=='string'||!t||/[\s|।॥]/u.test(t)))throw fault('SOURCE_SPLITS','Invalid or overlapping pada split.');
  out+=raw.slice(position,r.start)+s.resolved_forms.join(' ');position=r.end;
 }
 return out+raw.slice(position);
}
function hydrateParagraph(payload,d,raw){
 const map=offsetMap(raw),lesson=payload.lesson,unit=payload.unit,target=d.target;
 if(!target||!['mula','bhashya'].includes(target.kind))throw fault('SOURCE_TARGET','Unknown source target.');
 if(target.kind==='mula'){
  if(lesson){lesson.mulam=raw;if(lesson.padaccheda_splits)lesson.padaccheda=splitReading(raw,lesson.padaccheda_splits,map);}
  if(unit?.mula){unit.mula.text=raw;hydrateTokens(unit.mula.tokens,map);}
 }else{
  const matches=list(lesson?.bhashya).filter(b=>b.id===target.bhashya_id);
  if(lesson&&matches.length!==1)throw fault('SOURCE_TARGET','The Bhāṣya target is absent or duplicated.');
  for(const b of matches){b.original=raw;hydrateAnnotations(b.pratikaSpans,map,raw);hydrateAnnotations(b.roleSpans,map,raw);}
  if(unit?.bhashyam){
   const b=unit.bhashyam;b.text=raw;
   let position=0;
   for(const sentence of list(b.sentences)){
    if(sentence.source_start!==position)throw fault('SOURCE_RANGE','Sentence source ranges must be contiguous.');
    position=sentence.source_end;hydrateRanges(sentence,map);sentence.text=raw.slice(sentence.source_start,sentence.source_end);
    hydrateTokens(sentence.tokens,map);
    for(const field of ['discourse','pratikah','uddharanani'])hydrateAnnotations(sentence[field],map,raw);
   }
   if(position!==map.normalized.length)throw fault('SOURCE_RANGE','Sentence ranges do not cover the verified paragraph.');
  }
 }
 return payload;
}
function createClient(deps={}){
 const cache=new Map(),fetcher=deps.fetch||root.fetch?.bind(root),crypto=deps.crypto||root.crypto,Parser=deps.DOMParser||root.DOMParser,timeoutMs=deps.timeoutMs??15000;
 async function sha256(text){if(!crypto?.subtle)throw fault('SOURCE_CRYPTO','SHA-256 verification is unavailable.');const bytes=new TextEncoder().encode(text);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
 async function responseFor(d,options,requests){
  if(options.signal?.aborted)throw fault('ABORTED','Source loading was cancelled.');
  const key=d.transport+'\0'+d.request_url;
  if(requests?.has(key))return requests.get(key);
  const request=(async()=>{
   if(!options.force&&cache.has(key))return cache.get(key);
   if(typeof fetcher!=='function'||!Parser)throw fault('SOURCE_BROWSER','Browser source reading is unavailable.');
   const controller=new AbortController();let timedOut=false;
   const cancel=()=>controller.abort();options.signal?.addEventListener('abort',cancel,{once:true});
   const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
   try{
    const response=await fetcher(d.request_url,{mode:'cors',credentials:'omit',redirect:'follow',signal:controller.signal});
    if(!response||response.status!==200||response.type==='opaque'||response.type==='opaqueredirect')throw fault('SOURCE_HTTP','The publisher response could not be read.');
    sourceURL(response.url); // A redirect must still end at the publisher origin.
    const body=await response.text(),parser=new Parser();
    if(controller.signal.aborted)throw fault(timedOut?'SOURCE_TIMEOUT':'ABORTED',timedOut?'Source loading timed out.':'Source loading was cancelled.');
    let parsed;if(d.transport==='html')parsed=parser.parseFromString(body,'text/html');else{try{parsed=JSON.parse(body);}catch{throw fault('SOURCE_JSON','The publisher JSON could not be parsed.');}}
    const value={parsed,parser,response_url:response.url};cache.set(key,value);return value;
   }catch(e){if(controller.signal.aborted)throw fault(timedOut?'SOURCE_TIMEOUT':'ABORTED',timedOut?'Source loading timed out.':'Source loading was cancelled.');throw e;}
   finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}
  })();
  if(requests)requests.set(key,request);
  return request;
 }
 async function loadParagraph(descriptor,options={},requests){
  const result={id:descriptor?.id,anchor:descriptor?.anchor,status:'failed',source_url:descriptor?.source_url,request_url:descriptor?.request_url,expectedHash:descriptor?.sha256,checkedAt:new Date().toISOString(),credentials:'omit',origin_verified:false};
  try{
   const d=validateDescriptor(descriptor),response=await responseFor(d,options,requests);result.origin_verified=true;result.response_url=response.response_url;result.response_status=200;
   if(options.signal?.aborted)throw fault('ABORTED','Source loading was cancelled.');
   const raw=d.transport==='html'?extractHTML(response.parsed,d.anchor):extractJSON(response.parser,response.parsed,d);
   result.rawText=raw;result.actualHash=await sha256(normalizeText(raw));result.actualLength=normalizeText(raw).length;
   result.status=result.actualHash===d.sha256&&result.actualLength===d.length_utf16?'matched':'mismatch';
   if(result.status==='mismatch')result.error={code:'SOURCE_CHANGED',message:'The live paragraph differs from the study alignment.'};
  }catch(e){result.error={code:e?.name==='AbortError'?'ABORTED':e?.code||'SOURCE_FETCH',message:String(e?.message||e)};}
  return result;
 }
 async function hydrate(input,previousResult){
  let payload=clone(input);const descriptors=list(input?.source_paragraphs);
  const paragraphs=[];
  for(const d of descriptors){
   const prior=list(previousResult?.paragraphs).find(p=>p.id===d.id&&p.request_url===d.request_url&&p.source_url===d.source_url&&p.expectedHash===d.sha256);
   const result=prior?clone(prior):{id:d.id,anchor:d.anchor,status:'failed',source_url:d.source_url,request_url:d.request_url,expectedHash:d.sha256,credentials:'omit',origin_verified:false,error:{code:'SOURCE_NOT_LOADED',message:'No verified live result exists for this paragraph.'}};
   if(result.status==='matched'){
    try{
     validateDescriptor(d);
     if(typeof result.rawText!=='string'||result.origin_verified!==true||result.credentials!=='omit'||result.actualHash!==d.sha256||await sha256(normalizeText(result.rawText))!==d.sha256||normalizeText(result.rawText).length!==d.length_utf16)throw fault('SOURCE_REUSE','The reused live identity does not match this paragraph.');
     sourceURL(result.response_url);
     const next=clone(payload);hydrateParagraph(next,d,result.rawText);payload=next;
    }catch(e){result.status='mismatch';result.error={code:e.code||'SOURCE_ALIGNMENT',message:String(e.message||e)};}
   }
   paragraphs.push(result);
  }
  const statuses=new Set(paragraphs.map(p=>p.status));
  const status=paragraphs.length&&statuses.size===1?paragraphs[0].status:paragraphs.length?'partial':'failed';
  const auditRequests=[...new Map(paragraphs.filter(p=>p.origin_verified).map(p=>[p.request_url,{request_url:p.request_url,response_url:p.response_url,status:p.response_status,credentials:'omit',origin_verified:true}])).values()];
  return {status,payload,paragraphs,requests:auditRequests,checkedAt:new Date().toISOString(),credentials:'omit'};
 }
 async function load(input,options={}){
  const requests=new Map(),paragraphs=await Promise.all(list(input?.source_paragraphs).map(d=>loadParagraph(d,options,requests)));
  return hydrate(input,{paragraphs});
 }
 // These two methods serve the explicitly chosen companion works as plain live
 // reading. They do not grant alignment approval or create study associations.
 async function readPage(requestURL,options={}){
  sourceURL(requestURL,true,'html');
  const response=await responseFor({transport:'html',request_url:requestURL},options),doc=response.parsed;
  const mains=[...doc.querySelectorAll('main.text')];
  if(mains.length!==1)throw fault('SOURCE_STRUCTURE','Expected one publisher reading body.');
  const main=mains[0],slug=main.getAttribute('data-work');
  if(!slug||new URL(response.response_url).pathname.split('/')[2]!==slug)throw fault('SOURCE_STRUCTURE','Publisher work identity changed.');
  const nodes=[...main.querySelectorAll('.unit,.sectionheading,.section-heading,.chapter-head')].filter(n=>{const p=n.parentElement?.closest('.unit,.sectionheading,.section-heading,.chapter-head');return !p||!main.contains(p);}),seen=new Set(),blocks=[];
  for(const n of nodes){const id=n.getAttribute('id');if(!id||seen.has(id))throw fault('SOURCE_ANCHOR','Missing or duplicated publisher source anchor.');seen.add(id);const heading=n.matches('.sectionheading,.section-heading,.chapter-head');blocks.push({id,kind:heading?'heading':n.matches('.verse,.kind-padya')?'verse':'prose',sourceKind:heading?'heading':options.sourceKind||'source',text:extractHTML(doc,id),sourceUrl:response.response_url+'#'+encodeURIComponent(id)});}
  if(!blocks.length)throw fault('SOURCE_STRUCTURE','No publisher paragraphs were found.');
  const sections=[];
  for(const item of doc.querySelectorAll('ol.run > li')){
   const a=item.querySelector('a[href]');if(!a)continue;
   let u;try{u=new URL(a.getAttribute('href'),response.response_url);sourceURL(u.href);}catch{continue;}
   if(u.search||u.hash||!u.pathname.startsWith('/read/'+slug+'/'))continue;
   if(!sections.some(s=>s.path===u.pathname))sections.push({label:a.textContent,path:u.pathname,current:a.getAttribute('aria-current')==='page'});
  }
  const current=sections.findIndex(s=>s.current||s.path===new URL(response.response_url).pathname);
  return {title:main.getAttribute('data-worktitle')||'',sectionTitle:sections[current]?.label||'',url:response.response_url,path:new URL(response.response_url).pathname,blocks,sections,previous:current>0?sections[current-1]:null,next:current>=0?sections[current+1]||null:null,live:true};
 }
 async function readRows(requestURL,base,displayURL,options={}){
  sourceURL(requestURL,true,'json-html');sourceURL(displayURL);
  const response=await responseFor({transport:'json-html',request_url:requestURL},options);
  if(!response.parsed||typeof response.parsed!=='object'||!own(response.parsed,base))return null;
  const rows=response.parsed[base];if(!Array.isArray(rows))throw fault('SOURCE_ROW','The publisher row group changed.');
  const seen=new Set(),blocks=[];
  for(let index=0;index<rows.length;index++){
   const row=rows[index];if(!row||typeof row.id!=='string'||!row.id||seen.has(row.id)||typeof row.html!=='string')throw fault('SOURCE_ROW','Invalid or duplicated publisher row.');seen.add(row.id);
   const pointer='/'+base.replace(/~/g,'~0').replace(/\//g,'~1')+'/'+index;
   const u=new URL(displayURL);u.searchParams.set('u',base);u.hash=row.id;
   blocks.push({id:row.id,kind:'prose',sourceKind:options.sourceKind||'tika',text:extractJSON(response.parser,response.parsed,{json_pointer:pointer,anchor:row.id}),sourceUrl:u.href,carrier:'publisher-json-html',anchor_evidence:'publisher-payload-dom',resourceUrl:requestURL,jsonPointer:pointer});
  }
  return {url:displayURL,blocks,live:true};
 }
 return {load,hydrate,loadParagraph,readPage,readRows,clearSessionCache:()=>cache.clear(),sha256};
}
return {...createClient(),createClient,normalizeText,offsetMap,ORIGIN,NORMALIZATION};
});
