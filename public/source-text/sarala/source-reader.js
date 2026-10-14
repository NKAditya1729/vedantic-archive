/* The two companion readers fetch public text in the browser, on demand.
 * No local corpus, proxy, offline original, or inferred Vārtika alignment. */
(function(root){
'use strict';
const origin='https://advaitasharada.sringeri.net';
const vartika={id:'brihadaranyakabhashya-vartika',title:'बृहदारण्यकभाष्यवार्तिकम्',startPath:'/read/brihadaranyakabhashya-vartika/1-0-1/',url:origin+'/read/brihadaranyakabhashya-vartika/1-0-1/'};
const anandagiri={id:'anandagiri-brha',title:'आनन्दगिरिटीका',startPath:'/read/anandagiri-brha/1-1/',url:origin+'/read/anandagiri-brha/1-1/'};
const workInfo={vartika,anandagiri,'brihadaranyakabhashya-vartika':vartika,'anandagiri-brha':anandagiri};
async function initialize(){return {schema:'vp-live-companions-v1',sourceOrigin:origin,works:{}};}
async function loadWork(workId,path,signal,options={}){
 const work=workInfo[workId];if(!work)throw Error('अस्य ग्रन्थस्य स्रोतपाठः अत्र न प्रदर्श्यते।');
 const u=new URL(path||work.startPath,origin);
 if(u.origin!==origin||u.username||u.password||u.search||u.hash||!u.pathname.startsWith('/read/'+work.id+'/'))throw Error('अमान्यः स्रोतविभागः।');
 return root.LiveSource.readPage(u.href,{signal,force:options.force===true,sourceKind:work===vartika?'vartika':'tika'});
}
async function loadTika(anchor,signal,options={}){
 // Only the already-established BU 2.4 publisher keys are admitted. The JSON
 // object's exact key determines its rows; no Mūla or Vārtika relation is made.
 if(typeof anchor!=='string'||!/^BR_C02_S04_(?:V\d+_B\d+|I\d+)$/.test(anchor))return null;
 return root.LiveSource.readRows(origin+'/vyakhya/brihadaranyaka-bhashya/2.AB.json',anchor,origin+'/split/brihadaranyaka-bhashya/2/AB/',{signal,force:options.force===true,sourceKind:'tika'});
}
// Catalogue and source-reference links remain direct publisher links.
async function resolveReference(){return null;}
root.SourceReader=Object.freeze({initialize,workInfo,loadWork,loadTika,resolveReference});
})(typeof globalThis!=='undefined'?globalThis:this);
