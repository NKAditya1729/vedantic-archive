/* अध्ययनसाहाय्यम् — दृष्टयः (R-033, preview).
 * One data pack per mantra (runtime-preview/adhyayanam/BU.x.y.z.json) adds four lenses to the drawer:
 * स्वामिविवरणम्, टीका, वार्तिकम्, वार्तिकसारः. Every block names the bhāṣya sentences (भा.N = the live s0N) it explains,
 * so the reader can (1) read one lens straight through in its own tab, or (2) stay in भाष्यम् and switch lenses on
 * under every sentence, or open one lens under one sentence only.  Learner text is Sanskrit; labels too. */
(function(root){
'use strict';
const BASE='runtime/adhyayanam/';
const LENS=[['swami','स्वामिविवरणम्','स्वामी'],['tika','टीका','टीका'],['vartika','वार्तिकम्','वार्तिकम्'],['vsara','वार्तिकसारः','सारः']];
const NAME=Object.fromEntries(LENS.map(([k,n])=>[k,n]));
const KEY='adhyayanam-lenses';
let index=null,opener=null;const packs=new Map();
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const md=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/⟨([^⟩]+)⟩/g,'<span class="nv-ref">⟨$1⟩</span>');
const list=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const store={get(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return [];}},set(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}}};

async function getIndex(){if(!index)index=fetch(BASE+'index.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{units:[]}).catch(()=>({units:[]}));return index;}
async function load(route){
 const unit='BU.'+route,idx=await getIndex();if(!list(idx.units).includes(unit))return null;
 if(!packs.has(unit))packs.set(unit,fetch(BASE+unit+'.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null));
 return packs.get(unit);
}
function has(p,k){return !!(p&&({swami:p.swami?.blocks,tika:p.tika?.paras,vartika:p.vartika?.verses,vsara:p.vsara?.verses}[k]||[]).length);}
function tabs(p){return LENS.filter(([k])=>has(p,k)).map(([k,n])=>['nava-'+k,n]);}

// which blocks of each lens speak about sentence n
function byBha(p){
 if(p._by)return p._by;const by={};const add=(k,n,i)=>{(by[n]??={swami:[],tika:[],vartika:[],vsara:[]})[k].includes(i)||by[n][k].push(i);};
 list(p.swami?.blocks).forEach((b,i)=>list(b.bha).forEach(n=>add('swami',n,i)));
 list(p.tika?.paras).forEach((b,i)=>list(b.bha).forEach(n=>add('tika',n,i)));
 const vnum={};list(p.vartika?.verses).forEach((b,i)=>{vnum[b.num]=b;list(b.bha).forEach(n=>add('vartika',n,i));});
 list(p.vsara?.verses).forEach((b,i)=>{const bha=b.bha?.length?b.bha:list(b.vartika).flatMap(v=>list(vnum[v]?.bha));bha.forEach(n=>add('vsara',n,i));});
 return p._by=by;
}
// sentence label: उN = the bhāṣya's उपोद्घातः sentence N; otherwise भा.N
const lab=n=>String(n).startsWith('उ')?'उपो.'+String(n).slice(1):'भा.'+n;
const bhaChips=b=>list(b).length?`<span class="nv-bha">${list(b).map(n=>`<button class="nv-chip nv-back" data-nv-back="${esc(n)}" title="भाष्यवाक्यं प्रति">${esc(lab(n))}</button>`).join('')}</span>`:'';
const label=(t,extra='')=>`<div class="nv-lbl">${t}${extra}</div>`;
const viv=l=>list(l).length?`<div class="nv-viv">${list(l).map(v=>typeof v==='string'?`<p>${md(v)}</p>`:`<p><b>${esc(v.label)} —</b> ${md(v.text)}</p>`).join('')}</div>`:'';
const gr=l=>list(l).length?label('ग्रन्थान्तरसन्दर्भाः')+list(l).map(g=>`<div class="nv-gr">${g.url?`<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.grantha)} ${esc(g.sthanam)} ↗</a>`:`<b>${esc(g.grantha)} ${esc(g.sthanam)}</b>`}<q>‘${esc(g.text)}’</q> ${md(g.sambandhah)}</div>`).join(''):'';
const sam=l=>list(l).length?label('समासाः')+`<div class="nv-table"><table><tr><th>पदम्</th><th>विग्रहः</th><th>प्रकारः</th><th>अर्थः</th></tr>${list(l).map(s=>`<tr><td>${esc(s.padam)}</td><td>${esc(s.vigrahah)}</td><td>${esc(s.prakarah)}</td><td>${esc(s.arthah)}</td></tr>`).join('')}</table></div>`:'';
const notes=l=>list(l).map(t=>`<p class="nv-note">टिप्पणी — ${md(t)}</p>`).join('');
// class teaching is unmarked; anything else carries its source as a label (DESIGN: ṭīkā and bhāṣya notes are marked)
const KIND={tika:'टीकायाः',bhashya:'भाष्यात्',vartika:'वार्तिकात्',vartikasara:'वार्तिकसारात्',editor:'सम्पादकस्य',sampadaka:'सम्पादकस्य',note:'टिप्पणी'};
const status=s=>s?`<p class="nv-status">${esc(s)}</p>`:'';

// ---- full lens views -------------------------------------------------------------------------------------------
function swamiBlock(b,i,{inline=false}={}){
 return `<article class="nv-block nv-swami" id="nv-swami-${i}"><h3>${esc(b.heading)}${inline?'':bhaChips(b.bha)}</h3>${b.pratika?`<p class="nv-pratika">‘${esc(b.pratika)}’</p>`:''}${list(b.paras).map(p=>typeof p==='string'?`<p>${md(p)}</p>`:`<p class="nv-k-${esc(KIND[p.kind]?p.kind:'class')}">${KIND[p.kind]?`<span class="nv-kind">${KIND[p.kind]}</span> `:''}${md(p.text)} ${list(p.refs).map(r=>`<span class="nv-ref">${md(r)}</span>`).join(' ')}</p>`).join('')}</article>`;
}
function tikaPara(p,i,{inline=false}={}){
 const head=`<span class="nv-num">${esc(p.n)}</span> ${md(p.saralarthah)}`;
 const body=`${label('टीकापाठः',p.url?` <a class="nv-src" href="${esc(p.url)}" target="_blank" rel="noopener">अद्वैतशारदा ↗</a>`:'')}<p class="nv-patha">${esc(p.patha)}</p>
 ${label('पदच्छेदः')}<p>${esc(p.padacchedah)}</p>${notes(p.tippani)}${sam(p.samasah)}
 ${list(p.padani).length?label('पदपरिचयः')+list(p.padani).map(x=>`<p><strong>${esc(x.padam)}</strong> — ${md(x.parichayah)}</p>`).join(''):''}
 ${label('विवरणम्')}${viv(p.vivaranam)}${gr(p.granthantaram)}`;
 if(inline)return `<div class="nv-inline-head">${head}</div><p class="nv-patha">${esc(p.patha)}</p><button class="nv-more" data-nv-open="tika" data-nv-at="nv-tika-${i}">पूर्णं विवरणम् →</button>`;
 return `<details class="nv-block nv-tika" id="nv-tika-${i}"><summary>${head}</summary><div class="nv-in">${bhaChips(p.bha)}${body}</div></details>`;
}
function vartikaVerse(v,i,{inline=false}={}){
 const head=`<span class="nv-num">${esc(v.num)}</span> ${md(v.saralarthah)}`;
 if(inline)return `<div class="nv-inline-head">${head}</div><p class="nv-verse">${esc(v.shlokah)}</p><button class="nv-more" data-nv-open="vartika" data-nv-at="nv-vartika-${i}">पूर्णं विवरणम् →</button>`;
 return `<details class="nv-block nv-vartika" id="nv-vartika-${i}"><summary>${head}</summary><div class="nv-in">${bhaChips(v.bha)}
 ${label('श्लोकः',v.role?` <span class="nv-tag">${esc(v.role)}</span>`:'')}<p class="nv-verse">${esc(v.shlokah)}</p>${notes(v.patha_tippani)}
 ${label('पदच्छेदः')}<p>${esc(v.padacchedah)}</p>${sam(v.samasah)}${label('अन्वयः')}<p>${md(v.anvayah)}</p>
 ${v.mula?label('सम्बद्धं मूलम्')+`<p>‘${esc(v.mula)}’</p>`:''}
 ${list(v.tikadharah).length?label('आनन्दगिरेः वार्तिकटीका (शास्त्रप्रकाशिका)')+list(v.tikadharah).map(t=>`<div class="nv-gr"><q>‘${esc(t.quote)}’</q> ${md(t.vivaranam)}</div>`).join(''):''}
 ${list(v.vs).length?`<p class="nv-cross">वार्तिकसारे — ${list(v.vs).map(n=>`<button class="nv-chip" data-nv-open="vsara" data-nv-at="nv-vsara-n-${esc(n)}">सा.${esc(n)}</button>`).join(' ')}</p>`:''}
 ${label('विवरणम्')}${viv(v.vivaranam)}${gr(v.granthantaram)}</div></details>`;
}
function vsaraVerse(v,i,{inline=false}={}){
 const head=`<span class="nv-num">${esc(v.num)}</span> ${md(v.saralarthah||'')}`;
 if(inline)return `<p class="nv-verse">${esc(v.shlokah)}</p><button class="nv-more" data-nv-open="vsara" data-nv-at="nv-vsara-${i}">पूर्णं विवरणम् →</button>`;
 return `<details class="nv-block nv-vsara" id="nv-vsara-${i}"><summary>${v.saralarthah?head:`<span class="nv-num">${esc(v.num)}</span> ${esc(String(v.shlokah).split('\n')[0])}`}</summary><div class="nv-in" id="nv-vsara-n-${esc(v.num)}">${bhaChips(v.bha)}
 ${label('श्लोकः')}<p class="nv-verse">${esc(v.shlokah)}</p>${notes(v.patha_tippani)}
 ${v.padacchedah?label('पदच्छेदः')+`<p>${esc(v.padacchedah)}</p>`:''}${v.anvayah?label('अन्वयः')+`<p>${md(v.anvayah)}</p>`:''}
 ${v.tika?label('लघुसङ्ग्रहा टीका')+`<p class="nv-patha">${esc(v.tika)}</p>`:''}
 ${list(v.vartika).length?`<p class="nv-cross">वार्तिके — ${list(v.vartika).map(n=>`<button class="nv-chip" data-nv-open="vartika" data-nv-num="${esc(n)}">वा.${esc(n)}</button>`).join(' ')}</p>`:''}
 ${label('विवरणम्')}${viv(v.vivaranam)}</div></details>`;
}
function part(p,key){
 key=key.replace(/^nava-/,'');
 if(key==='swami'){const s=p.swami;return `<div class="nv-root" data-lens="swami">${status(s.status)}${list(s.intro).map(x=>`<p>${md(x)}</p>`).join('')}${s.class_refs?.length?`<p class="nv-ref">आधारः — ${s.class_refs.map(esc).join(', ')}</p>`:''}${list(s.blocks).map((b,i)=>swamiBlock(b,i)).join('')}</div>`;}
 if(key==='tika'){const t=p.tika;return `<div class="nv-root" data-lens="tika">${status(t.status)}${list(t.intro).map(x=>`<p>${md(x)}</p>`).join('')}${list(t.paras).map((x,i)=>tikaPara(x,i)).join('')}</div>`;}
 if(key==='vartika'){const t=p.vartika;return `<div class="nv-root" data-lens="vartika">${status(t.status)}${list(t.intro).map(x=>`<p>${md(x)}</p>`).join('')}${list(t.verses).map((x,i)=>vartikaVerse(x,i)).join('')}</div>`;}
 if(key==='vsara'){const t=p.vsara;return `<div class="nv-root" data-lens="vsara">${status(t.status)}${list(t.intro).map(x=>`<p>${md(x)}</p>`).join('')}${list(t.verses).map((x,i)=>vsaraVerse(x,i)).join('')}</div>`;}
 return '';
}

// ---- inside भाष्यम्: सङ्गतिः and the sentence-wise view with lens toggles ------------------------------------------
function sangati(p){const g=p.sangatih;if(!g)return '';
 return `<div class="nv-root">${label('पूर्वसम्बन्धः')}<p>${md(g.purva)}</p>${label('भाष्यस्य क्रमः')}<ol class="nv-krama">${list(g.krama).map(k=>`<li><b>${esc(k.label)}</b> ${bhaChips(k.bha)} ${md(k.text)}${k.tika?` <span class="nv-ref">(${md(k.tika)})</span>`:''}</li>`).join('')}</ol>${label('उत्तरसम्बन्धः')}<p>${md(g.uttara)}</p></div>`;}
function lensBar(p){const on=store.get();return `<div class="nv-lensbar" role="group" aria-label="दृष्टयः"><span>प्रतिवाक्यं सह पश्यतु —</span>${LENS.filter(([k])=>has(p,k)).map(([k,n])=>`<button class="nv-lens" data-nv-lens="${k}" aria-pressed="${on.includes(k)}">${n}</button>`).join('')}</div>`;}
const shortHead={swami:(p,i)=>esc(p.swami.blocks[i].heading),tika:(p,i)=>esc(p.tika.paras[i].n),vartika:(p,i)=>'वार्तिकम् '+esc(p.vartika.verses[i].num),vsara:(p,i)=>'वार्तिकसारः '+esc(p.vsara.verses[i].num)};
function inlineFor(p,k,idxs,seen){
 const r={swami:i=>swamiBlock(p.swami.blocks[i],i,{inline:true}),tika:i=>tikaPara(p.tika.paras[i],i,{inline:true}),vartika:i=>vartikaVerse(p.vartika.verses[i],i,{inline:true}),vsara:i=>vsaraVerse(p.vsara.verses[i],i,{inline:true})}[k];
 // a block that explains several sentences is shown in full under the first; later ones show it folded
 return idxs.map(i=>{const again=seen[k].has(i);seen[k].add(i);return again?`<details class="nv-repeat"><summary>${shortHead[k](p,i)} — पूर्ववाक्ये अपि उक्तम्</summary>${r(i)}</details>`:r(i);}).join('<hr>');
}
function sentenceView(p){
 const by=byBha(p),an=Object.fromEntries(list(p.anvayah).map(a=>[a.n,a])),on=store.get(),seen={swami:new Set(),tika:new Set(),vartika:new Set(),vsara:new Set()};
 return `<div class="nv-root" data-nv-sentences>${lensBar(p)}${list(p.sentences).map(s=>{const b=by[s.n]||{},a=an[s.n];
  return `<section class="nv-sent" id="nv-s-${esc(s.n)}"><p class="nv-stext"><span class="nv-num">${esc(lab(s.n))}</span> ${esc(s.text)}</p>
  ${a?`<p class="nv-anvaya"><span class="nv-lbl-in">अन्वयः</span> ${md(a.text)}${a.revised?` <span class="nv-rev" title="${esc(a.pramanam||'')}">● टीकानुसारं शोधितः</span>`:''}</p>`:''}
  <p class="nv-chips">${LENS.filter(([k])=>(b[k]||[]).length).map(([k,,short])=>`<button class="nv-chip" data-nv-chip="${k}" aria-expanded="${on.includes(k)}">${short} · ${(b[k]||[]).length}</button>`).join('')}</p>
  ${LENS.filter(([k])=>(b[k]||[]).length).map(([k])=>`<div class="nv-under nv-under-${k}" data-nv-under="${k}"${on.includes(k)?'':' hidden'}><div class="nv-under-lbl">${NAME[k]}</div>${inlineFor(p,k,b[k],seen)}</div>`).join('')}</section>`;}).join('')}</div>`;
}

// ---- behaviour (one delegated listener) -------------------------------------------------------------------------
function setOpener(fn){opener=fn;}
function reveal(el){if(!el)return;for(let x=el;x;x=x.parentElement)if(x.tagName==='DETAILS')x.open=true;el.scrollIntoView({block:'start'});el.classList.add('nv-flash');setTimeout(()=>el.classList.remove('nv-flash'),1600);}
document.addEventListener('click',async e=>{
 const t=e.target.closest('[data-nv-lens],[data-nv-chip],[data-nv-open],[data-nv-back]');if(!t||!t.closest('.nv-root'))return;e.preventDefault();
 if(t.dataset.nvLens){const k=t.dataset.nvLens,on=new Set(store.get()),now=!on.has(k);now?on.add(k):on.delete(k);store.set([...on]);
  const root=t.closest('[data-nv-sentences]');root.querySelectorAll(`[data-nv-lens="${k}"]`).forEach(b=>b.setAttribute('aria-pressed',String(now)));
  root.querySelectorAll(`[data-nv-under="${k}"]`).forEach(u=>u.hidden=!now);root.querySelectorAll(`[data-nv-chip="${k}"]`).forEach(c=>c.setAttribute('aria-expanded',String(now)));return;}
 if(t.dataset.nvChip){const s=t.closest('.nv-sent'),u=s.querySelector(`[data-nv-under="${t.dataset.nvChip}"]`);u.hidden=!u.hidden;t.setAttribute('aria-expanded',String(!u.hidden));return;}
 if(t.dataset.nvOpen&&opener){let at=t.dataset.nvAt;
  if(!at&&t.dataset.nvNum){const p=[...packs.values()];for(const pr of p){const pk=await pr;const i=list(pk?.vartika?.verses).findIndex(v=>v.num===t.dataset.nvNum);if(i>=0){at='nv-vartika-'+i;break;}}}
  await opener('nava-'+t.dataset.nvOpen);reveal(document.getElementById(at));return;}
 if(t.dataset.nvBack&&opener){await opener('bhashya',{section:'भाष्यान्वयः'});reveal(document.getElementById('nv-s-'+t.dataset.nvBack));}
});
root.AdhyayanaLayers={load,tabs,has,part,sangati,sentenceView,setOpener,NAME};
})(window);
