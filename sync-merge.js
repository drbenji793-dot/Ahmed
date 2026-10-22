(function(root){
"use strict";
function stable(x){if(x===undefined)return "undefined";if(Array.isArray(x))return "["+x.map(stable).join(",")+"]";if(x&&typeof x==="object")return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+stable(x[k])).join(",")+"}";return JSON.stringify(x)}
const equal=(a,b)=>stable(a)===stable(b);
const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const identified=x=>Array.isArray(x)&&x.every(v=>object(v)&&typeof v.id==="string");
function merge(base,local,remote,conflicts=[],path=""){
 if(equal(local,remote))return local;
 if(equal(local,base))return remote;
 if(equal(remote,base))return local;
 if(identified(local)&&identified(remote)&&(base===undefined||identified(base))){
  const b=new Map((base||[]).map(x=>[x.id,x])),l=new Map(local.map(x=>[x.id,x])),r=new Map(remote.map(x=>[x.id,x]));
  return [...new Set([...r.keys(),...l.keys(),...b.keys()])].map(id=>merge(b.get(id),l.get(id),r.get(id),conflicts,path+"/"+id)).filter(x=>x!==undefined);
 }
 if(object(local)&&object(remote)&&(base===undefined||object(base))){
  const out={};for(const k of new Set([...Object.keys(base||{}),...Object.keys(remote),...Object.keys(local)])){
   if(["__proto__","constructor","prototype"].includes(k))continue;
   const v=merge(base?.[k],local[k],remote[k],conflicts,path+"/"+k);if(v!==undefined)out[k]=v;
  }return out;
 }
 if(Array.isArray(local)&&Array.isArray(remote)&&path.endsWith("/history"))return [...new Map([...remote,...local].map(x=>[stable(x),x])).values()];
 conflicts.push({path,local:local===undefined?null:local,remote:remote===undefined?null:remote});
 // Preserve an edited item when another device deletes it; keep both versions in recovery.
 if(local===undefined)return remote;
 if(remote===undefined)return local;
 return remote;
}
const api={merge,equal,stable};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.AhmedMerge=api;
})(typeof window!=="undefined"?window:this);
