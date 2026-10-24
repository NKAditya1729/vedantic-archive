/* BU2.4 / BU2.5 stored sources: lazy, same-origin, exact pack and paragraph integrity. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.StoredSource=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const ORIGIN='https://advaitasharada.sringeri.net';
// One entry per brāhmaṇa page: paragraph counts, the publisher's pages, and the exact paragraph ids it may hold.
const SCOPES={
 '2.4':{counts:{bhashya:32,anandagiri:223,vartika:481},tika:'/read/anandagiri-brha/2-4/',vartika:n=>`/read/brihadaranyakabhashya-vartika/2-4-${n<=241?1:2}/`,
  vartikaPages:['/read/brihadaranyakabhashya-vartika/2-4-1/','/read/brihadaranyakabhashya-vartika/2-4-2/'],
  bhashya:id=>id==='BR_C02_S04'||/^BR_C02_S04_(?:I01|E010|V(?:0[1-9]|1[0-4])(?:_B01)?)$/.test(id)||id==='BR_C02_S04_V12_I01',
  tikaRange:[3068,3290],vartikaPrefix:'BRV_C02_S04_V'},
 '2.5':{counts:{bhashya:43,anandagiri:187,vartika:147},tika:'/read/anandagiri-brha/2-5/',vartika:()=>'/read/brihadaranyakabhashya-vartika/2-5/',
  vartikaPages:['/read/brihadaranyakabhashya-vartika/2-5/'],
  bhashya:id=>id==='BR_C02_S05'||/^BR_C02_S05_(?:I01|E011|V(?:0[1-9]|1[0-9])(?:_B0[12])?|V11_I01)$/.test(id),
  tikaRange:[3291,3477],vartikaPrefix:'BRV_C02_S05_V'}
};
function locate(id){
 for(const [scope,c] of Object.entries(SCOPES)){
  if(c.bhashya(id))return {scope,work:'bhashya'};
  if(/^AB_C02_P\d{4}$/.test(id)&&+id.slice(-4)>=c.tikaRange[0]&&+id.slice(-4)<=c.tikaRange[1])return {scope,work:'anandagiri'};
  if(id.startsWith(c.vartikaPrefix)&&/^\d{4}$/.test(id.slice(-4))&&id.length===c.vartikaPrefix.length+4&&+id.slice(-4)>=1&&+id.slice(-4)<=c.counts.vartika)return {scope,work:'vartika'};
 }
 return null;
}
function workFor(id){return locate(id)?.work||null;}
function createClient({entries,base,fetch:fetcher=root.fetch?.bind(root),crypto=root.crypto}={}){
 const origin=new URL(base),catalog=new Map(),pending=new Map();
 if(!['http:','https:'].includes(origin.protocol))throw Error('Stored source base must be HTTP(S)');
 const scope=String(entries?.[0]?.file||'').match(/^runtime\/source\/BU-(2\.[45])-/)?.[1],S=SCOPES[scope];
 if(!S)throw Error('Invalid stored source catalog');
 for(const e of entries||[]){
  if(!S.counts[e.work]||catalog.has(e.work)||e.file!==`runtime/source/BU-${scope}-${e.work}.json`||!/^[0-9a-f]{64}$/.test(e.sha256))throw Error('Invalid stored source catalog');
  catalog.set(e.work,Object.freeze({...e}));
 }
 const mine=id=>{const at=locate(id);return at&&at.scope===scope?at.work:null;};
 async function sha(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
 async function load(work){
  if(!catalog.has(work))throw Error('Unregistered stored source');
  if(pending.has(work))return pending.get(work);
  const task=(async()=>{
   const entry=catalog.get(work),url=new URL(entry.file,origin);
   if(url.origin!==origin.origin)throw Error('Stored source escaped origin');
   const response=await fetcher(url.href,{credentials:'same-origin',redirect:'error'});
   if(!response?.ok||response.status!==200||response.url!==url.href||response.type==='opaque')throw Error('Stored source transport failed');
   const body=await response.text();if(await sha(body)!==entry.sha256)throw Error('Stored source pack hash mismatch');
   const pack=JSON.parse(body);
   if(pack.schema!=='maitreyi-source-v1'||pack.work!==work||pack.scope!=='BU.'+scope||!pack.credit||!Array.isArray(pack.paragraphs)||pack.paragraphs.length!==S.counts[work])throw Error('Stored source schema mismatch');
   const ids=new Set(),records=[];
   for(const p of pack.paragraphs){
    if(mine(p.id)!==work||ids.has(p.id)||typeof p.text!=='string'||await sha(p.text)!==p.sha256)throw Error('Stored paragraph identity/hash mismatch');
    const source=new URL(p.source_url);
    const expected=work==='bhashya'?'/read/brihadaranyaka-bhashya/2/':work==='anandagiri'?S.tika:S.vartika(+p.id.slice(-4));
    if(source.origin!==ORIGIN||source.pathname!==expected||source.search||source.hash!=='#'+p.id)throw Error('Stored paragraph source URL mismatch');
    const kinds=work==='bhashya'?['mula','bhashya','heading']:work==='anandagiri'?['tika']:['vartika'];
    if(!kinds.includes(p.kind))throw Error('Stored paragraph kind mismatch');
    ids.add(p.id);records.push(Object.freeze({id:p.id,kind:p.kind,text:p.text,sha256:p.sha256,source_url:p.source_url}));
   }
   return Object.freeze({work,credit:pack.credit,asset_url:url.href,pack_sha256:entry.sha256,paragraphs:Object.freeze(records)});
  })();pending.set(work,task);task.catch(()=>{if(pending.get(work)===task)pending.delete(work);});return task;
 }
 async function read(id){const work=mine(id);if(!work||!catalog.has(work))return null;const pack=await load(work),p=pack.paragraphs.find(p=>p.id===id);if(!p)throw Error('Stored paragraph missing');return Object.freeze({...p,asset_url:pack.asset_url,pack_sha256:pack.pack_sha256});}
 async function prefetch(requestURL){
  const routes={[ORIGIN+'/read/brihadaranyaka-bhashya/2/']:'bhashya',[ORIGIN+S.tika]:'anandagiri'};
  for(const v of S.vartikaPages)routes[ORIGIN+v]='vartika';
  const work=routes[requestURL];if(!work||!catalog.has(work))return null;
  const pack=await load(work);return {asset_url:pack.asset_url,pack_sha256:pack.pack_sha256};
 }
 return {load,read,prefetch,has:id=>catalog.has(mine(id))};
}
return {createClient,workFor};
});
