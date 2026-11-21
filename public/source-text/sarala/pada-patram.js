/* भाष्यपदव्याकरणपरिचयः v2 — graded grammar cards (R-029, layout R-030).
 * Data (runtime/grammar-v2/, manifest schema 2): a unit's occurrences.json + common.json render स्तरः १; the lemma file
 * is fetched the first time स्तरः २ / स्तरः ३ / उदाहरणानि opens; sentence and junction cards load on first use.
 * A click on any word of a covered unit opens its card in the study panel; the panel's grammar section becomes an index. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deva=s=>String(s??'').replace(/[0-9]/g,c=>'०१२३४५६७८९'[c]);
const LAKARA={'लट्':'वर्तमानकालः','लिट्':'परोक्षभूतकालः','लुट्':'अनद्यतनभविष्यत्कालः','लृट्':'भविष्यत्कालः','लोट्':'आज्ञा/प्रार्थना','लङ्':'अनद्यतनभूतकालः','विधिलिङ्':'विधिः/सम्भावना','लुङ्':'भूतकालः','लृङ्':'हेतुहेतुमद्भावः','आशीर्लिङ्':'आशीः'};
const ISSUE='https://github.com/NKAditya1729/vedantic-archive/issues/new';
// Levels shown (Aditya, 2026-11-13): स्तरः १ and स्तरः २ only for now; प्रक्रिया, उदाहरणानि, वाक्यरचना return later.
const SHOW={l3:false,ex:false,sent:false};
const LOADING='<p class="gv-wait">आनीयते…</p>',FAILED='<p class="gv-wait">अधुना न लभ्यते — <button class="gv-retry" data-gv-retry>पुनः प्रयतताम्</button></p>';
const script=document.currentScript,base=new URL('runtime/grammar-v2/',new URL('.',script?.src||location.href)),cache=new Map();
let manifest=null,common=null,hooks={},history=[],current=null,origin=null;
const get=k=>{try{return JSON.parse(sessionStorage.getItem('gv-'+k));}catch{return null;}};
const put=(k,v)=>{try{sessionStorage.setItem('gv-'+k,JSON.stringify(v));}catch{}};
function json(p){if(!cache.has(p))cache.set(p,fetch(new URL(p,base),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(p);return r.json();}).catch(e=>{cache.delete(p);throw e;}));return cache.get(p);}
const ready=json('manifest.json').then(m=>manifest=m).catch(()=>manifest={units:{}});
const uidOf=id=>{const m=/^((?:BU|MK)\.\d+\.\d+\.\d+)/.exec(id);return m?m[1]:/^(BU|MK)\./.test(id)?id:'BU.'+id;};
const unitOfOcc=oid=>(/^((?:BU|MK)\.\d+\.\d+\.[0-9A-Z]+)\./.exec(oid)||[])[1];
async function covers(id){await ready;return !!manifest.units[uidOf(id)];}

// ---------------------------------------------------------------- data
const units=new Map();
async function unit(id){await ready;const uid=uidOf(id);if(!manifest.units[uid])throw Error(uid);
 if(!units.has(uid))units.set(uid,(async()=>{const [u,c]=await Promise.all([json(manifest.units[uid]+'occurrences.json'),json(manifest.common)]);common=c;prepare(u);return u;})().catch(e=>{units.delete(uid);throw e;}));
 return {u:await units.get(uid),uid};}
function prepare(u){
 const P=s=>typeof s==='string'&&s[0]==='§'?u.pool[+s.slice(1)]:Array.isArray(s)?s.map(P):s;
 const msent={};for(const [sid,ids] of Object.entries(u.mula_sentences))for(const t of ids)msent[t]=sid;
 u.order={};
 for(const [oid,o] of Object.entries(u.occ)){for(const k of Object.keys(o))o[k]=P(o[k]);
  o.side=oid.includes('.M.')?'मूलम्':'भाष्यम्';o.sent=o.sent||msent[oid]||oid.replace(/\.t\d+$/,'');o.flag=o.flag||'निश्चितम्';o.form=o.form||o.pada;
  if(!oid.includes('.M.'))(u.order[o.sent]??=[]).push(oid);}
 for(const ids of Object.values(u.order))ids.sort((a,b)=>+a.match(/t(\d+)$/)[1]-+b.match(/t(\d+)$/)[1]);
 for(const [sid,ids] of Object.entries(u.mula_sentences))u.order[sid]=ids.filter(t=>u.occ[t]);
 for(const oid of Object.keys(u.occ))u.occ[oid].loc=locLine(u,oid);
}
function locLine(u,oid){const o=u.occ[oid],toks=u.order[o.sent],i=toks.indexOf(oid),lo=Math.max(0,i-3),hi=Math.min(toks.length,i+4);
 const q=(lo?'…':'')+toks.slice(lo,hi).map(t=>t===oid?`<b>${esc(u.occ[t].pada)}</b>`:esc(u.occ[t].pada)).join(' ')+(hi<toks.length?'…':'');
 return `${esc(u.label)} · ${o.side}, ${sentLabel(o.sent)} · ‘${q}’`;}
const lemma=(u,lid)=>json('lemmas/'+u.lemma1[lid].file);
const sentences=uid=>json(manifest.units[uid]+'sentences.json');
const junctions=uid=>json(manifest.units[uid]+'junctions.json');
function jIds(J,oid){return Object.keys(J).filter(k=>J[k].left===oid||J[k].right===oid).sort((a,b)=>(J[a].left===oid)-(J[b].left===oid));}

// ⟦sūtra⟧ ⟪dhātu⟫ ⟨occurrence|word|place⟩ → links (one link table in common.json for the whole site)
function rich(h){if(h==null)return '—';return String(h)
 .replace(/⟦([0-9.]+)⟧/g,(m,n)=>{const s=common?.sutras?.[n];return s?`<a class="gv-s" href="${esc(s[1])}" target="_blank" rel="noopener">[${esc(s[0])}]</a>`:`[${deva(n)}]`;})
 .replace(/⟪([0-9.]+)⟫/g,(m,k)=>{const d=common?.dhatus?.[k];return d?`<a class="gv-d" href="${esc(d[1])}" target="_blank" rel="noopener">[${esc(d[0])}]</a>`:'[—]';})
 .replace(/⟨([^|⟩]+)\|([^|⟩]+)\|([^⟩]*)⟩/g,(m,id,w,where)=>{const built=manifest?.units?.[unitOfOcc(id)];const place=where.replace(/ (मूलम्|भाष्यम्)$/,'');return built?`<a href="#" class="gv-o" data-gv-occ="${esc(id)}">${w} ↗</a> (${where})`:`${w} (${place} — अग्रे)`;});}

// ---------------------------------------------------------------- pieces
const row=(k,v)=>`<tr><th scope="row">${esc(k)}</th><td>${v??'—'}</td></tr>`;
const table=rows=>`<table class="gv-slots"><tbody>${rows.join('')}</tbody></table>`;
function level(key,title,body,open,fill=''){const s=get('lv-'+key);const o=s==null?open:s;return `<details class="gv-level" data-gv-level="${key}"${fill?` data-gv-fill="${fill}"`:''}${o?' open':''}><summary>${o?'▾':'▸'} ${esc(title)}</summary><div class="gv-body">${body}</div></details>`;}
const flagBadge=f=>`<span class="gv-flag gv-flag-${f==='निश्चितम्'?'n':f==='सम्भाव्यम्'?'s':'p'}">[${esc(f)}]</span>`;
const occLink=(oid,label)=>`<a href="#" class="gv-o" data-gv-occ="${esc(oid)}">${esc(label)}</a>`;
const sentNo=sid=>{const m=sid.match(/([si])(\d+)$/);return (m[1]==='i'?'अवतरणम् ':'')+deva(+m[2]);};
const sentLabel=sid=>{const m=sid.match(/([si])(\d+)$/);return (m[1]==='i'?'अवतरणवाक्यम् ':'वाक्यम् ')+deva(+m[2]);};
function quoteLine(u,sid,oid){return (u.order[sid]||[]).map(t=>t===oid?`<b>${esc(u.occ[t].pada)}</b>`:occLink(t,u.occ[t].pada)).join(' ');}
function junctionLine(J,jid){const j=J[jid];if(!j)return '';
 let printed='';if(j.status==='विसन्धिः')printed=` — विसन्धिः (मुद्रणे); सन्धौ ‘${esc(j.joined)}’`;else if(j.status==='विकल्पः')printed=' — मुद्रणे वैकल्पिकम् रूपम्';
 return `<a href="#" class="gv-j" data-gv-junction="${esc(jid)}">‘${esc(j.l)} ${esc(j.r)}’</a> — ${esc(j.group)}${j.clause?': '+esc(j.clause):''}${j.steps.length?' — '+rich(j.steps.map(s=>s[0]).join(' · ')):''}${printed}`;}

// one plain line before the levels, as ashtadhyayi.com gives a sūtra's सरलार्थः: the meaning, then the word's kind and form
function gist(o,L,t){const a=String(o.artha||'').replace(/<span class="gv-src">[^]*?<\/span>/g,'').replace(/<[^>]+>/g,'').trim();
 const kind=L.cls==='तिङन्तम्'?`क्रियापदम्, ${t.lakara||''} ${t.purusha||''} ${t.vacana||''}`:L.cls==='अव्ययम्'?'अव्ययम्':`${L.cls}, ${t.vibhakti||''} ${t.vacana||''}`;
 return `${esc(a)} — ${esc(kind.replace(/\s+/g,' ').trim())}।`;}

// ---------------------------------------------------------------- the card (SPEC-v2 §4) — स्तरः १ needs no lemma file
function cardHTML(u,oid){
 const o=u.occ[oid],L=u.lemma1[o.lemma],t=L.tags[o.form]||{},tin=L.cls==='तिङन्तम्',avy=L.cls==='अव्ययम्';
 const freq=L.n?` · अस्मिन् ग्रन्थे ${deva(L.n)} वारम्`:'';
 const head=`<header class="gv-head"><h3 class="gv-word" tabindex="-1">${esc(o.pada)}</h3><p class="gv-gist">${gist(o,L,t)}</p><p class="gv-loc">${o.loc}</p><p class="gv-flagline">${flagBadge(o.flag)}${freq}</p></header>`;
 const linga=avy||tin?'—':(String(L.linga||'').startsWith('त्रिलिङ्गम्')?`त्रिलिङ्गम् (अत्र ${esc(t.linga)})`:esc(t.linga||L.linga||'—'));
 const vk=o.vk?`${esc(o.vk[0])} — ${rich(o.vk[1])}${o.vk[2]?` (यथा ${rich(o.vk[2])})`:''}`:'—';
 const rel=o.rel?`${esc(o.rel[0])} — ${rich(o.rel[1])}${o.rel[2]&&u.occ[o.rel[2]]?' '+occLink(o.rel[2],'↗'):''}`:'—';
 const dh=L.dhatu?`${rich(L.dhatu)}${L.familiar?' — '+esc(L.familiar):''}`:'—';
 const members=L.members?`${L.members.map(esc).join(' · ')}${L.members_note?' — '+rich(L.members_note):''}`:'—';
 const kosha=L.kosha?rich(L.kosha):'—';
 const l1=tin?[row('अर्थः',rich(o.artha)),row('धातुः',dh),row('अवयवाः','—'),row('पदजातिः',esc(L.padajati)),row('लकारः · पुरुषः · वचनम्',`${esc(t.lakara)} (${esc(LAKARA[t.lakara]||'')}) · ${esc(t.purusha)} · ${esc(t.vacana)}`),row('प्रयोगः',rich(o.prayoga)),row('सम्बन्धः',rel),row('प्रयोगभूमिका','—'),row('कोशः',kosha)]
  :[row('अर्थः',rich(o.artha)),row('धातुः',['कृदन्तम्','समस्तपदम्'].includes(L.cls)?dh:'—'),row('अवयवाः',L.cls==='समस्तपदम्'?members:'—'),row('पदजातिः',esc(L.padajati)),row('लिङ्गम्',linga),row('विभक्तिः · वचनम्',avy?'—':`${esc(t.vibhakti)} · ${esc(t.vacana)}`),row('विभक्तिः किमर्थम्?',avy?'—':vk),row('सम्बन्धः',rel),row('प्रयोगभूमिका',avy?(o.bhumika?rich(o.bhumika):'—'):'—'),row('कोशः',kosha)];
 const sent=SHOW.sent&&u.sentence_ids.includes(o.sent)?level('sent','वाक्यरचना',LOADING,false,'sent'):'';
 return `<article class="gv-card" role="dialog" aria-label="${esc(o.pada)} — व्याकरणपत्रम्" data-gv-card="${esc(oid)}">${head}${level('l1','स्तरः १ · पदपरिचयः',table(l1),true)}${level('l2','स्तरः २ · निष्पत्तिः',LOADING,false,'l2')}${SHOW.l3?level('l3','स्तरः ३ · प्रक्रिया',LOADING,false,'l3'):''}${SHOW.ex?level('ex','उदाहरणानि',LOADING,false,'ex'):''}${sent}${footer(oid)}</article>`;
}
function l2HTML(u,oid,L,J){const o=u.occ[oid],F=L.forms[o.form]||{},tin=L.cls==='तिङन्तम्';
 const slotVal=s=>{const k=s.replace('*','');
  if(k==='निष्पत्तिः')return esc(F.nish||L.l2[k]||'—');
  if(k==='विभक्तिप्रत्ययः')return F.vp?rich(F.vp):'—';
  if(k==='विभक्त्यर्थः')return o.va?rich(o.va):'—';
  if(k==='रचनाप्रकारः')return (o.pat||[]).length?o.pat.map(p=>`<a href="#" data-gv-pattern="${esc(p)}">[${esc(common.patterns[p]?.name||p)}]</a>`).join(' · '):'—';
  if(k==='सन्धिः'){const ids=jIds(J,oid);return ids.length?ids.map(j=>junctionLine(J,j)).join('<br>'):'—';}
  return L.l2[k]?rich(L.l2[k]):'—';};
 return table((common.slots.l2[L.cls]||[]).map(s=>row(s.replace('*',''),slotVal(s))));}
function l3HTML(u,oid,L){const F=L.forms[u.occ[oid].form]||{};
 const t=F.l3?.length?`<table class="gv-l3"><thead><tr><th>रूपम्</th><th>सूत्रम्</th><th>कार्यम्</th></tr></thead><tbody>${F.l3.map(r=>`<tr><td>${esc(r[0])}</td><td>${rich(r[1])}</td><td>${rich(r[2])}</td></tr>`).join('')}</tbody></table>`:`<p>${L.l3note?rich(L.l3note):'प्रक्रिया नास्ति — निपातः अविकारी'}।</p>`;
 return t+(F.l3?.length&&L.l3note?`<p class="gv-note">${rich(L.l3note)}</p>`:'');}
function exHTML(u,oid,L){const ex=L.ex?.length?table(L.ex.map(([k,v])=>row(k.replace(/<[^>]+>/g,''),rich(v)))):'<p>—</p>';
 const others=(L.occ||[]).filter(x=>x!==oid&&unitOfOcc(x)===u.unit&&u.occ[x]);
 return ex+(others.length?`<p class="gv-more">अस्मिन् मन्त्रे अन्यत्र: ${others.map(x=>occLink(x,u.occ[x].pada+' ('+u.occ[x].side+')')).join(' · ')}</p>`:'');}
function footer(id){const body=encodeURIComponent('पत्रम्: '+id+'\n\nदोषः: ');return `<footer class="gv-foot"><a href="#" data-gv-pari>परिभाषासूची ↗</a> · <a href="${ISSUE}?title=${encodeURIComponent('व्याकरणपत्रम् · दोषः')}&body=${body}" target="_blank" rel="noopener">दोषं सूचयतु ↗</a> · <a href="#" data-gv-indices>व्याकरणसूच्यः ↗</a></footer>`;}

// fill a lazy level the first time it opens (TASKS D1)
async function fill(d){if(d.dataset.gvDone)return;const card=d.closest('[data-gv-card]'),oid=card?.dataset.gvCard,body=d.querySelector(':scope>.gv-body');if(!oid||!body)return;d.dataset.gvDone='pending';
 try{const {u,uid}=await unit(unitOfOcc(oid));const k=d.dataset.gvFill;let html='';
  if(k==='sent')html=sentenceBody(u,await sentences(uid),u.occ[oid].sent,oid);
  else{const L=await lemma(u,u.occ[oid].lemma);html=k==='l2'?l2HTML(u,oid,L,await junctions(uid)):k==='l3'?l3HTML(u,oid,L):exHTML(u,oid,L);}
  body.innerHTML=html;d.dataset.gvDone='1';window.ScriptDisplay?.apply();}
 catch{body.innerHTML=FAILED;delete d.dataset.gvDone;}}
function fillOpen(el){for(const d of el.querySelectorAll('details[data-gv-fill][open]'))fill(d);}

// ---------------------------------------------------------------- वाक्यरचनापत्रम् (§7)
function sentenceBody(u,Sall,sid,oid){const S=Sall[sid];if(!S)return '<p>—</p>';
 return `<p class="gv-sent-head">${esc(u.label)} · ${sid.includes('.M.')?'मूलम्':'भाष्यम्'}, ${sentLabel(sid)}</p><p class="gv-sent-text">${quoteLine(u,sid,oid)}</p>${table([row('क्रियापदम् किम्?',rich(S.kriya)),...S.rows.filter(([q])=>!q.startsWith('क्रियापदम्')).map(([q,a])=>row(q.replace(/<[^>]+>/g,''),rich(a))),row('पूर्ववाक्यसम्बन्धः',S.purva?rich(S.purva):'—'),row('दण्डान्वयः',rich(S.anvaya).replace(/\[([^\]]+)\]/g,'<span class="gv-adh">[$1]</span>')),row('वाक्यस्य भूमिका',`${esc(S.role)}${S.role_note?' — '+rich(S.role_note):''}`),row('रचनाप्रकाराः',(S.pat||[]).length?S.pat.map(p=>`<a href="#" data-gv-pattern="${esc(p)}">[${esc(common.patterns[p]?.name||p)}]</a>`).join(' · '):'—')])}<p class="gv-flagline">${flagBadge(S.flag)}</p>`;}

// ---------------------------------------------------------------- सन्धिपत्रम् (§4.7)
function junctionHTML(u,J,jid){const j=J[jid];if(!j)return '<p>—</p>';
 const same=Object.entries(J).filter(([k,x])=>k!==jid&&x.group===j.group&&x.l!==j.l).slice(0,3);
 const steps=j.steps.length?j.steps.map(s=>`${esc(s[1])} — ${rich(s[0])}`).join('<br>'):'नास्ति';
 const l3=j.steps.length?`<table class="gv-l3"><thead><tr><th>रूपम्</th><th>सूत्रम्</th><th>कार्यम्</th></tr></thead><tbody><tr><td>${esc(j.l)} + ${esc(j.r)}</td><td>—</td><td>पदद्वयम्</td></tr>${j.steps.map(s=>`<tr><td>${esc(s[2])} + ${esc(s[3])}</td><td>${rich(s[0])}</td><td>${esc(s[1])}</td></tr>`).join('')}<tr><td>${esc(j.joined)}</td><td>—</td><td>रूपसिद्धिः</td></tr></tbody></table>`:'<p>प्रक्रिया नास्ति।</p>';
 const printed=j.status==='विसन्धिः'?`विसन्धिः (मुद्रणे) — मूले ‘${esc(j.surface)}’; सन्धौ ‘${esc(j.joined)}’`:j.status==='अवसानम्'?'अवसानम् — विरामः':j.status==='विकल्पः'?`मुद्रणे वैकल्पिकम् रूपम् ‘${esc(j.surface)}’`:`मुद्रणे ‘${esc(j.surface)}’`;
 return `<article class="gv-card gv-junction" role="dialog" aria-label="${esc(j.l)} + ${esc(j.r)} — सन्धिपत्रम्"><header class="gv-head"><h3 class="gv-word" tabindex="-1">${esc(j.l)} + ${esc(j.r)} → ${esc(j.joined)}</h3><p class="gv-loc">${esc(u.label)} · ${esc(j.side)}, वाक्यम् ${sentNo(j.sent)} · ${printed}</p><p class="gv-flagline">${flagBadge('निश्चितम्')}</p></header>
 ${table([row('स्तरः १ · नाम',`${esc(j.group)}${j.clause?' — '+esc(j.clause):''}`),row('स्तरः २ · चरणाः',steps),row('वैकल्पिकम्',j.alts?.length?j.alts.map(esc).join(' · '):'नास्ति')])}
 ${SHOW.l3?level('j3','स्तरः ३ · प्रक्रिया',l3,true):''}${!SHOW.ex?'':level('jex','उदाहरणानि',same.length?`<p>अयम् एव सन्धिः — अत्रैव: ${same.map(([k,x])=>`<a href="#" data-gv-junction="${esc(k)}">${esc(x.l)} + ${esc(x.r)}</a>`).join(' · ')}</p>`:'<p>—</p>',false)}
 <p class="gv-more">पदे: ${occLink(j.left,j.l)} · ${occLink(j.right,j.r)}</p>${footer(jid)}</article>`;}

// ---------------------------------------------------------------- indices
function indexHTML(u,J,side){
 const occs=Object.entries(u.occ).filter(([,o])=>o.side===side);
 const groups={};for(const [k,j] of Object.entries(J))if(j.side===side)(groups[j.group]??=[]).push(k);
 const sandhi=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).map(([g,ks])=>`<details class="gv-ix"><summary>${esc(g)} (${deva(ks.length)})</summary><p>${ks.map(k=>`<a href="#" data-gv-junction="${esc(k)}">${esc(J[k].l)} + ${esc(J[k].r)}</a>`).join(' · ')}</p></details>`).join('');
 const sam=occs.filter(([,o])=>u.lemma1[o.lemma].cls==='समस्तपदम्').map(([k,o])=>occLink(k,o.pada)).join(' · ')||'—';
 const by={};for(const [k,o] of occs)(by[o.lemma]??=[]).push(k);
 const pada=Object.entries(by).map(([lid,ks])=>ks.length===1?occLink(ks[0],u.occ[ks[0]].pada):`<details class="gv-ix gv-inline"><summary>${[...new Set(ks.map(k=>u.occ[k].pada))].map(esc).join(' / ')} ×${deva(ks.length)}</summary>${ks.map(k=>occLink(k,u.occ[k].pada+' ('+sentNo(u.occ[k].sent)+')')).join(' · ')}</details>`).join(' · ');
 const sents=u.sentence_ids.filter(s=>s.includes(side==='मूलम्'?'.M.':'.B.')).map(s=>`<a href="#" data-gv-sent="${esc(s)}">¶ ${sentNo(s)}</a>`).join(' · ');
 const sub=(t,b,open)=>`<details class="study-subsection gv-sub"${open?' open':''}><summary>${t}</summary><div class="study-subsection-content">${b}</div></details>`;
 return `<div data-gv-unit="${esc(u.unit)}"><p class="gv-note">प्रतिपदम् व्याकरणपत्रम् — पाठे यत् किमपि पदम् स्पृशतु, अथवा अत्र चिनोतु।</p>${sub('पदविवरणम्',`<p class="gv-tokens">${pada}</p>`,true)}${sub('सन्धिविवरणम्',sandhi||'—')}${sub('समासः',`<p>${sam}</p>`)}${SHOW.sent?sub('वाक्यरचना',`<p>${sents}</p>`):''}<p class="gv-more"><a href="#" data-gv-indices>व्याकरणसूच्यः ↗</a> · <a href="#" data-gv-pari>परिभाषासूची ↗</a></p></div>`;}
async function indicesHTML(u){const dir=manifest.indices[u.unit.split('.').slice(1,3).join('.')];
 const [dh,af,su,pa,fq]=await Promise.all(['dhatu','pratyaya','sutra','pattern','frequency'].map(n=>json(dir+n+'.json')));
 const link=ids=>ids.filter(i=>u.occ[i]).map(i=>occLink(i,u.occ[i].pada)).join(' · ')||'—';
 const list=(obj,label)=>Object.entries(obj).map(([k,ids])=>`<details class="gv-ix"><summary>${label(k)} (${deva(ids.length)})</summary><p>${link(ids)}</p></details>`).join('');
 const core=fq.rows.filter(r=>r[2]>=5),rest=fq.rows.filter(r=>r[2]<5),w=rows=>rows.map(([,hw,n])=>`${esc(hw)} ×${deva(n)}`).join(' · ');
 return `<section class="gv-indices"><h3>व्याकरणसूच्यः</h3><p class="gv-note">अद्यावधि निर्मितेषु एककेषु (${fq.units.map(x=>deva(x.split('.').slice(1).join('.'))).join(', ')})।</p>
 <details class="gv-ix-group" open><summary>बहुवारं दृश्यमानाः शब्दाः (५+)</summary><p>${w(core)||'—'}</p><details class="gv-ix"><summary>सर्वे शब्दाः</summary><p>${w(rest)}</p></details></details>
 <details class="gv-ix-group"><summary>धात्वनुक्रमणी</summary>${list(dh,k=>rich(k))}</details>
 <details class="gv-ix-group"><summary>प्रत्ययानुक्रमणी</summary>${list(af,esc)}</details>
 <details class="gv-ix-group"><summary>सूत्रानुक्रमणी</summary>${list(su,n=>rich('⟦'+n+'⟧'))}</details>
 <details class="gv-ix-group"><summary>रचनाप्रकारानुक्रमणी</summary>${Object.entries(common.patterns).map(([pid,p])=>`<details class="gv-ix"><summary>${esc(p.name)}</summary><p>${esc(p.text)} ${p.sutras.map(rich).join(' · ')}</p><p>${link(pa[pid]||[])}</p></details>`).join('')}</details></section>`;}
function paribhashaHTML(group){const keys=Object.keys(common.paribhasha),open=keys[{A:0,B:1,C:2}[group]??0];
 return `<section class="gv-pari"><h3 tabindex="-1" class="gv-word">परिभाषासूची</h3>${keys.map(g=>`<details class="gv-ix-group" data-gv-group="${esc(g)}"${g===open?' open':''}><summary>${esc(g)}</summary><dl>${common.paribhasha[g].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`).join('')}</section>`;}
async function patternHTML(u,pid){const p=common.patterns[pid];if(!p)return '<p>—</p>';const pa=await json(manifest.indices[u.unit.split('.').slice(1,3).join('.')]+'pattern.json');
 return `<section class="gv-pari"><h3 tabindex="-1" class="gv-word">${esc(p.name)}</h3><p>${esc(p.text)}</p><p>${p.sutras.map(rich).join(' · ')}</p><p>${(pa[pid]||[]).filter(i=>u.occ[i]).map(i=>occLink(i,u.occ[i].pada)).join(' · ')||'—'}</p></section>`;}

// ---------------------------------------------------------------- panel
function show(html,title,uid,state){
 if(current)history.push(current);if(history.length>30)history.shift();current=state;
 const back=`<nav class="gv-nav">${history.length?'<button data-gv-back>← पूर्वपत्रम्</button>':''}<button data-gv-study="${esc(uid)}">← अध्ययनसाहाय्यम्</button></nav>`;
 hooks.openPanel?.(title,`<div class="gv-panel" data-gv-unit="${esc(uid)}"><div class="gv-grip" aria-hidden="true"></div>${back}${html}</div>`);
 document.body.classList.add('gv-sheet');
 const box=document.getElementById('drawer-content');if(box){fillOpen(box);box.querySelector('.gv-word')?.focus({preventScroll:true});}
}
async function openToken(id,tokenIds){
 const {u,uid}=await unit(id);const ids=tokenIds.filter(t=>u.occ[t]);if(!ids.length)return false;
 origin=document.querySelector(`[data-grammar-tokens~="${CSS.escape(ids[0])}"]`);
 const choose=ids.length>1?`<nav class="word-choices gv-choices" aria-label="सन्धिस्थाने पदानि">पदम् — ${ids.map(t=>`<button data-gv-occ="${esc(t)}">${esc(u.occ[t].pada)}</button>`).join(' ')}</nav>`:'';
 history=[];current=null;
 show(choose+cardHTML(u,ids[0]),u.occ[ids[0]].pada+' · व्याकरणपत्रम्',uid,{kind:'occ',uid,id:ids[0]});
 document.querySelectorAll('.gv-marked').forEach(e=>e.classList.remove('gv-marked'));
 document.querySelectorAll(ids.map(t=>`[data-grammar-tokens~="${CSS.escape(t)}"]`).join(',')).forEach(e=>e.classList.add('gv-marked'));
 return true;}
async function openState(s){const {u,uid}=await unit(s.uid);
 if(s.kind==='occ')show(cardHTML(u,s.id),u.occ[s.id].pada+' · व्याकरणपत्रम्',uid,s);
 else if(s.kind==='j')show(junctionHTML(u,await junctions(uid),s.id),'सन्धिपत्रम्',uid,s);
 else if(s.kind==='sent')show(`<article class="gv-card" role="dialog" aria-label="वाक्यरचनापत्रम्"><h3 class="gv-word" tabindex="-1">वाक्यरचना</h3>${sentenceBody(u,await sentences(uid),s.id,null)}${footer(s.id)}</article>`,'वाक्यरचनापत्रम्',uid,s);
 else if(s.kind==='ix')show(await indicesHTML(u),'व्याकरणसूच्यः',uid,s);
 else if(s.kind==='pari')show(paribhashaHTML(s.group),'परिभाषासूची',uid,s);
 else if(s.kind==='pat')show(await patternHTML(u,s.id),'रचनाप्रकारः',uid,s);}
async function index(id,side){const {u,uid}=await unit(id);return indexHTML(u,await junctions(uid),side);}
function openLevel(){const box=document.getElementById('drawer-content');const open=[...(box?.querySelectorAll('details.gv-level[open]')||[])].map(d=>d.dataset.gvLevel);return open.includes('l3')?'C':open.includes('l2')||open.includes('ex')?'B':'A';}
function closeCard(){document.body.classList.remove('gv-sheet');const o=origin;origin=null;history=[];current=null;document.getElementById('study-close')?.click();if(o?.isConnected)o.focus({preventScroll:true});}

document.addEventListener('click',async e=>{
 const a=e.target.closest('[data-gv-occ],[data-gv-junction],[data-gv-sent],[data-gv-pari],[data-gv-indices],[data-gv-pattern],[data-gv-back],[data-gv-study],[data-gv-mark],[data-gv-retry]');if(!a)return;
 e.preventDefault();e.stopPropagation();
 if(a.dataset.gvRetry!=null){const d=a.closest('details[data-gv-fill]');if(d)fill(d);return;}
 if(a.dataset.gvStudy){const u=a.dataset.gvStudy;history=[];current=null;document.body.classList.remove('gv-sheet');hooks.back?.(u.replace(/^BU\./,''));return;}
 if(a.dataset.gvBack!=null){const prev=history.pop();current=null;if(prev)await openState(prev);return;}
 const U=a.dataset.gvOcc?unitOfOcc(a.dataset.gvOcc):uidOf(current?.uid||a.closest('[data-gv-unit]')?.dataset.gvUnit||hooks.unit?.()||'');
 if(!U)return;
 if(a.dataset.gvMark){origin=a;history=[];current=null;await openState({kind:'sent',uid:U,id:a.dataset.gvMark});return;}
 if(a.dataset.gvOcc)await openState({kind:'occ',uid:U,id:a.dataset.gvOcc});
 else if(a.dataset.gvJunction)await openState({kind:'j',uid:U,id:a.dataset.gvJunction});
 else if(a.dataset.gvSent)await openState({kind:'sent',uid:U,id:a.dataset.gvSent});
 else if(a.dataset.gvPari!=null)await openState({kind:'pari',uid:U,group:openLevel()});
 else if(a.dataset.gvIndices!=null)await openState({kind:'ix',uid:U});
 else if(a.dataset.gvPattern)await openState({kind:'pat',uid:U,id:a.dataset.gvPattern});
},true);
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches?.('details.gv-level')){put('lv-'+d.dataset.gvLevel,d.open);const s=d.querySelector(':scope>summary');if(s)s.textContent=s.textContent.replace(/^[▸▾]/,d.open?'▾':'▸');if(d.open&&d.dataset.gvFill)fill(d);}},true);
// keyboard (TASKS D2): Esc closes and returns focus to the word; Tab stays inside the open card
document.addEventListener('keydown',e=>{const dlg=document.getElementById('study-dialog');if(!current||!dlg||dlg.hidden||!dlg.querySelector('.gv-panel'))return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeCard();return;}
 if(e.key==='Tab'){const f=[...dlg.querySelectorAll('button,a[href],summary,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(!f.length)return;const i=f.indexOf(document.activeElement);
  if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&(i===-1||i===f.length-1)){e.preventDefault();f[0].focus();}}},true);
document.addEventListener('click',e=>{if(e.target.closest('#study-close')){document.body.classList.remove('gv-sheet');current=null;history=[];}},true);
// mobile sheet (TASKS D3): drag the grip to resize
document.addEventListener('pointerdown',e=>{const g=e.target.closest('.gv-grip');if(!g)return;e.preventDefault();const dlg=document.getElementById('study-dialog');const y0=e.clientY,h0=dlg.getBoundingClientRect().height;
 const mv=ev=>{dlg.style.height=Math.max(innerHeight*.35,Math.min(innerHeight*.96,h0+(y0-ev.clientY)))+'px';};
 const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);});

// ¶ after every bhāṣya sentence of a covered unit (opens its वाक्यरचनापत्रम्)
async function markSentences(rootEl){if(!SHOW.sent)return;await ready;for(const s of rootEl.querySelectorAll('.bhashya-sentence[id]')){if(s.nextElementSibling?.classList.contains('gv-pilcrow'))continue;const uid=s.id.replace(/\.B\..*$/,'');if(!manifest.units[uid])continue;s.insertAdjacentHTML('afterend',`<button class="gv-pilcrow" data-gv-mark="${esc(s.id)}" data-gv-unit="${esc(uid)}" aria-label="वाक्यरचना" title="वाक्यरचना">¶</button>`);}}
function watch(){const el=document.getElementById('lesson-content');if(!el)return;let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>markSentences(el),60);}).observe(el,{childList:true,subtree:true});markSentences(el);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();

// test hook: one card with every level filled (to diff the split layout against the single-file build)
async function fullCard(oid){const {u,uid}=await unit(unitOfOcc(oid));const L=await lemma(u,u.occ[oid].lemma),J=await junctions(uid),S=await sentences(uid);
 const parts={l2:l2HTML(u,oid,L,J),l3:l3HTML(u,oid,L),ex:exHTML(u,oid,L),sent:sentenceBody(u,S,u.occ[oid].sent,oid)};
 const t=document.createElement('template');t.innerHTML=cardHTML(u,oid);for(const d of t.content.querySelectorAll('details[data-gv-fill]'))d.querySelector('.gv-body').innerHTML=parts[d.dataset.gvFill];return t.innerHTML;}

root.PadaPatram={init(h){hooks=h;},covers,openToken,index,ready,_fullCard:fullCard};
})(window);
