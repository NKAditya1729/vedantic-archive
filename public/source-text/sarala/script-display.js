/* Display transliteration only. Canonical Sanskrit data, source IDs and user notes are never rewritten. */
(() => {
 const supported=['devanagari','iast','kannada','telugu','tamil','malayalam'];
 let selected='devanagari';try{selected=localStorage.getItem('vp-script')||selected;}catch{}
 if(!supported.includes(selected))selected='devanagari';
 const originals=new WeakMap();
 const observer=new MutationObserver(()=>apply());
 function apply(){
  observer.disconnect();
  if(selected==='devanagari'&&(!document.body.dataset.script||document.body.dataset.script==='devanagari')){document.body.dataset.script=selected;observer.observe(document.body,{subtree:true,childList:true,characterData:true});return;}
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walk.nextNode()){
   const node=walk.currentNode,element=node.parentElement;
   if(!element||element.closest('script,style,textarea,input'))continue;
   const boundary=element.closest('.study-context-note,[data-study-transliterate],[data-no-transliterate]');
   if(boundary?.hasAttribute('data-no-transliterate'))continue;
   // Display conversion includes the complete study banks; canonical data, IDs and notes remain untouched.
   if(!element.closest('.mula,.original,.selected-source,.study-context-note,[data-study-transliterate]'))continue;
   let record=originals.get(node);
   if(!record||node.nodeValue!==record.rendered)record={source:node.nodeValue,rendered:node.nodeValue};
   if(/[\u0900-\u097f]/.test(record.source)){
    const display=selected==='devanagari'?record.source:Sanscript.t(record.source,'devanagari',selected);
    if(node.nodeValue!==display)node.nodeValue=display;
    record.rendered=display;originals.set(node,record);
   }
  }
  document.body.dataset.script=selected;
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 }
 window.ScriptDisplay={apply,get script(){return selected;},set(value){if(!supported.includes(value))return;selected=value;try{localStorage.setItem('vp-script',value);}catch{}apply();},text(text){return selected==='devanagari'?text:Sanscript.t(text,'devanagari',selected);}};
 document.addEventListener('DOMContentLoaded',()=>{const control=document.querySelector('#script');control.value=selected;control.addEventListener('change',()=>window.ScriptDisplay.set(control.value));apply();});
})();
