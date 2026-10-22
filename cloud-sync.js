(function(){
"use strict";
const API="https://jrpchxdaylhdkkxbtump.supabase.co/rest/v1",KEY="sb_publishable_Vrsk6OMwltLHU-EE0Te6rQ_7IDES5zL";
const PROD=["ahmed-life-lab.vercel.app","ahmed-life-lab-benji14.vercel.app","ahmed-life-lab-git-main-benji14.vercel.app"];
const workspace=PROD.includes(location.hostname)?"main":"preview-sync-v1";
const keys=["ahmed-life-lab-v1","ahmed-daily-notes-v1","ahmed-writing-books-v2","ahmed-writing-preferences-v2","ahmed-theme","ahmed-class-sort","ahmed-psychology-study-v1","ahmed-psychology-class-notes-20261022-v1"];
const {merge,equal}=window.AhmedMerge;
const rawSet=Storage.prototype.setItem,rawGet=Storage.prototype.getItem;
let running=false,rerun=false,changed=false,refreshPending=false,artReady=false,lastError="",savedAt="",timer,badge;
let dbPromise,artDBPromise;
const bases=new Map(),remoteCache=new Map();
function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open("ahmed-cloud-sync-v1",1);r.onupgradeneeded=()=>{r.result.createObjectStore("base");r.result.createObjectStore("backup")};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}))}
async function idb(store,key,value,write=false){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,write?"readwrite":"readonly"),s=tx.objectStore(store),r=write?s.put(value,key):s.get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
function artDB(){return artDBPromise||(artDBPromise=new Promise((resolve,reject)=>{const r=indexedDB.open("ahmed-writing-artwork-v1",1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore("art",{keyPath:"id"});s.createIndex("bookId","bookId",{unique:false})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}))}
async function artAll(){const d=await artDB();return new Promise((resolve,reject)=>{const tx=d.transaction("art","readonly"),r=tx.objectStore("art").getAll();tx.oncomplete=()=>resolve(r.result||[]);tx.onerror=()=>reject(tx.error)})}
async function artWrite(id,value){const d=await artDB();return new Promise((resolve,reject)=>{const tx=d.transaction("art","readwrite");if(value==null)tx.objectStore("art").delete(id);else tx.objectStore("art").put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function parse(s){if(s===null)return undefined;try{return JSON.parse(s)}catch{return s}}
async function read(key){if(key.startsWith("art:"))return (await artAll()).find(x=>x.id===key.slice(4))??null;return parse(rawGet.call(localStorage,key))}
async function write(key,value){if(key.startsWith("art:"))await artWrite(key.slice(4),value);else if(value!==undefined)rawSet.call(localStorage,key,typeof value==="string"?value:JSON.stringify(value))}
async function request(path,body){const controller=new AbortController(),t=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(API+path,{method:body?"POST":"GET",headers:{apikey:KEY,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});if(!r.ok)throw Error("Cloud request failed ("+r.status+")");return await r.json()}finally{clearTimeout(t)}}
const filter=()=>"?workspace=eq."+workspace;
async function list(){let out=[],offset=0;for(;;){const rows=await request("/ahmed_sync_documents"+filter()+"&select=key,revision&order=key&limit=500&offset="+offset);out.push(...rows);if(rows.length<500)return out;offset+=500}}
async function remote(key,revision){const cached=remoteCache.get(key);if(cached&&cached.revision===revision)return cached;const rows=await request("/ahmed_sync_documents"+filter()+"&key=eq."+encodeURIComponent(key)+"&select=key,value,revision");const v=rows[0]||{key,value:undefined,revision:0};remoteCache.set(key,v);return v}
function busy(){return !!document.querySelector('.modal.show,.alw-dialog-bg.open,.alw-draw-modal.open,.ahc-overlay.show,.ahd-modal.show,.alw-chapter-body:not(:disabled)')||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)}
function paint(text){if(badge)badge.textContent=text}
function refresh(){if(!refreshPending||busy())return;refreshPending=false;window.dispatchEvent(new CustomEvent("ahmed-cloud-updated"))}
function schedule(){changed=true;paint(navigator.onLine?"Syncing…":"Offline · saved on this device");clearTimeout(timer);timer=setTimeout(sync,700)}
Storage.prototype.setItem=function(key,value){rawSet.call(this,key,value);if(this===localStorage&&keys.includes(String(key)))schedule()};
async function archive(key,local,remoteValue,conflicts){
 const payload={source:key,at:new Date().toISOString(),local:local??null,remote:remoteValue??null,conflicts};
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([key,local,remoteValue])));
 const recoveryKey="recovery:"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 await idb("backup",recoveryKey,payload,true);
 const r=await request("/rpc/ahmed_sync_put",{p_workspace:workspace,p_key:recoveryKey,p_expected:0,p_value:payload});
 if(!r.ok&&!r.document)throw Error("Could not preserve conflicting changes");
}
async function syncOne(key,revision){
 let base=await idb("base",workspace+":"+key);
 for(let attempt=0;attempt<4;attempt++){
  const local=await read(key),r=await remote(key,revision);
  if(local===undefined&&r.revision===0)return;
  if(!base&&local!==undefined){const backupKey=workspace+":original:"+key;if(!(await idb("backup",backupKey)))await idb("backup",backupKey,{key,value:local,at:new Date().toISOString()},true)}
  if(key.startsWith("art:")&&r.revision===0)r.value=null;
  const conflicts=[],merged=merge(base?base.value:(key.startsWith("art:")?null:undefined),local,r.value,conflicts);
  if(conflicts.length)await archive(key,local,r.value,conflicts);
  let result=r;
  if(!equal(merged,r.value)){
   const response=await request("/rpc/ahmed_sync_put",{p_workspace:workspace,p_key:key,p_expected:r.revision,p_value:merged??null});
   if(!response.ok){remoteCache.delete(key);revision=response.document?.revision||0;continue}
   result=response.document;remoteCache.set(key,result);
  }
  // Never replace input typed while the request was in flight.
  if(!equal(await read(key),local)){rerun=true;return}
  if(!equal(local,result.value)&&busy()){refreshPending=true;return}
  if(!equal(local,result.value)){await write(key,result.value);refreshPending=true}
  const next={value:result.value,revision:result.revision};
  await idb("base",workspace+":"+key,next,true);bases.set(key,next);
  return;
 }
 throw Error("Another device is saving. Retrying shortly.");
}
async function sync(){
 if(running){rerun=true;return}running=true;changed=false;rerun=false;
 if(!navigator.onLine){running=false;paint("Offline · saved on this device");return}
 try{
  paint("Syncing…");
  const run=async()=>{const rows=await list(),revisions=new Map(rows.map(x=>[x.key,x.revision])),art=await artAll();artReady=true;
   const allKeys=new Set([...keys,...art.map(x=>"art:"+x.id),...rows.filter(x=>x.key.startsWith("art:")).map(x=>x.key)]);
   for(const key of allKeys)await syncOne(key,revisions.get(key)||0);
  };
  if(navigator.locks)await navigator.locks.request("ahmed-cloud-sync",run);else await run();
  lastError="";savedAt=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  paint(refreshPending&&busy()?"Saved online · finish editing to load updates":changed||rerun?"Syncing…":"Saved online · "+savedAt);
  refresh();
 }catch(e){lastError=e.message||"Connection unavailable";paint("Needs attention · tap to retry")}
 finally{running=false;if(rerun||changed){clearTimeout(timer);timer=setTimeout(sync,1500)}}
}
async function recovery(){
 const panel=document.createElement("dialog");panel.style.cssText="max-width:700px;width:92%;max-height:85vh;overflow:auto;border:1px solid #b49759;border-radius:14px;padding:20px;background:#fbf5e7;color:#263e32";
 const h=document.createElement("h2");h.textContent="Sync & recovery";panel.append(h);
 const p=document.createElement("p");p.textContent=lastError?lastError:"Shared workspace without sign up. Open this site on each older device to merge its existing entries. Anyone with access to this site can read and edit the shared workspace.";panel.append(p);
 const close=document.createElement("button");close.textContent="Close";close.onclick=()=>panel.remove();panel.append(close);
 const retry=document.createElement("button");retry.textContent="Sync now";retry.onclick=()=>{panel.remove();sync()};panel.append(retry);
 const label=document.createElement("p");label.textContent="Preserved conflicts and recent saved versions. Download a version to inspect or recover its content.";panel.append(label);
 document.body.append(panel);panel.showModal();
 try{
 const docs=await request("/ahmed_sync_documents"+filter()+"&key=like.recovery:*&select=key,value,updated_at&order=updated_at.desc&limit=50");
 const versions=await request("/ahmed_sync_versions"+filter()+"&select=key,value,revision,created_at&key=not.like.recovery:*&order=created_at.desc&limit=30");
 for(const row of [...docs,...versions]){
 const line=document.createElement("div"),b=document.createElement("button");
 b.textContent=(row.value?.source||row.key)+" · "+new Date(row.updated_at||row.created_at).toLocaleString()+(row.revision?" · v"+row.revision:" · conflict");
 b.style.cssText="display:block;max-width:100%;margin:6px 0;overflow-wrap:anywhere;text-align:left";
 b.onclick=()=>{const a=document.createElement("a"),u=URL.createObjectURL(new Blob([JSON.stringify(row,null,2)],{type:"application/json"}));a.href=u;a.download="Ahmed-recovered-version.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};line.append(b);panel.append(line);
 }
 if(!docs.length&&!versions.length){const empty=document.createElement("p");empty.textContent="No cloud versions yet.";panel.append(empty)}
 }catch{label.textContent="Recovery needs an online connection. Your local entries are still on this device."}
}
window.AhmedSync={sync,notify:schedule,recovery,artReady:()=>artReady};
document.addEventListener("DOMContentLoaded",()=>{
 const bar=document.createElement("div");bar.style.cssText="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font:11px system-ui;margin:8px 0 12px";
 badge=document.createElement("button");badge.type="button";badge.textContent="Connecting…";badge.style.cssText="font:600 11px system-ui;padding:7px 10px;min-height:32px;border:1px solid #b49759;border-radius:8px;background:#e2e8d5;color:#263e32";badge.onclick=sync;bar.append(badge);
 const recoveryButton=document.createElement("button");recoveryButton.type="button";recoveryButton.textContent="Sync & recovery";recoveryButton.style.cssText=badge.style.cssText;recoveryButton.onclick=recovery;bar.append(recoveryButton);
 document.querySelector("main")?.prepend(bar);sync();
 setInterval(()=>{refresh();if(!document.hidden)sync()},8000);
});
window.addEventListener("online",sync);window.addEventListener("offline",()=>paint("Offline · saved on this device"));
window.addEventListener("focus",sync);
window.addEventListener("storage",e=>{if(keys.includes(e.key)){refreshPending=true;schedule();refresh()}});
window.addEventListener("beforeunload",e=>{if(changed||running){e.preventDefault();e.returnValue=""}});
})();
