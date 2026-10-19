(function AhmedWritingStudioV2(){
"use strict";
const BOOK_KEY="ahmed-writing-books-v2";
const DISPLAY_KEY="ahmed-writing-preferences-v2";
const DB_NAME="ahmed-writing-artwork-v1";
const TABS=[["chapters","Chapters"],["characters","Characters"],["artwork","Artwork"],["notes","Notes"]];
let bookId=null,sectionId=null,tab="chapters",subtab="notes",editing=false,editAnchor=null,autosaveHandle=null;
let fontSize=Number(localStorage.getItem(DISPLAY_KEY)||19);
if(!Number.isFinite(fontSize)||fontSize<14||fontSize>28)fontSize=19;
let badStorage=false,dialogType="",dialogId=null,dialogTarget=null,artVersion=0;
let canvas=null,ctx=null,drawMode="pencil",drawColor="#263A31",drawSize=5,drawing=false,undoStack=[],redoStack=[],drawingId=null;
let activeTarget={type:"book",id:null};
const priorRender=render;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const words=s=>(String(s||"").trim().match(/\S+/gu)||[]).length;
const id=()=>crypto.randomUUID();
const stamp=()=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date())+" Dubai";
function books(){
 try{const raw=localStorage.getItem(BOOK_KEY);const a=raw?JSON.parse(raw):[];if(!Array.isArray(a))throw Error("not an array");return a}
 catch(e){badStorage=true;alert("Your existing writing data could not be read. Nothing will be overwritten. Back up your browser data before continuing.");return []}
}
function write(items){
 if(badStorage)return false;
 try{localStorage.setItem(BOOK_KEY,JSON.stringify(items));return true}
 catch(e){toast("Storage is full. Export a backup before writing more.");return false}
}
function current(){return books().find(b=>b.id===bookId)}
function section(){return current()?.sections?.find(x=>x.id===sectionId)}
function sections(kind){return (current()?.sections||[]).filter(x=>x.kind===kind)}
function toast(message){
 let node=document.getElementById("alwToast");
 if(!node){node=document.createElement("div");node.id="alwToast";node.className="alw-toast";node.setAttribute("role","status");document.body.appendChild(node)}
 node.textContent=message;node.hidden=false;
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>{if(node)node.hidden=true},2800);
}
function localTime(value){
 try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}
 catch{return "Earlier version"}
}
function countBook(b){return (b.sections||[]).filter(x=>x.kind==="chapters").reduce((acc,x)=>acc+words(x.body),0)}
function stage(){
 const node=document.getElementById("content");
 if(!node)return;
 node.innerHTML="";
 const wrapper=document.createElement("section");wrapper.className="alw";wrapper.id="alWritingV2";node.appendChild(wrapper);
 const warning=document.querySelector("main>.notice");if(warning)warning.hidden=true;
 return wrapper;
}
function renderWriting(){
 if(page!=="writing")return;
 const root=stage();if(!root)return;
 if(!bookId){shelf(root);return}
 if(!current()){bookId=null;shelf(root);return}
 if(tab==="chapters")chapterPage(root);
 else if(tab==="characters")charactersPage(root);
 else if(tab==="artwork")artworkPage(root);
 else notesPage(root);
}
function heading(title,desc,extra=""){
 return `<div class="alw-heading"><div><div class="alw-eyebrow">AHMED LIFE LAB · WRITING STUDIO</div><h1 dir="auto">${esc(title)}</h1><p>${esc(desc)}</p></div><div class="alw-actions">${extra}</div></div>`;
}
const button=(label,action,cls="",extra="")=>`<button type="button" class="alw-btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
function shelf(root){
 const list=books();
 root.innerHTML=heading("Writing Studio","Write books, create characters, draw scenes and keep every idea.",button("+ New Story","new-book","primary")+button("Import Backup","import"));
 root.innerHTML+=`<div class="alw-shelf">${list.map((b,i)=>`<button type="button" class="alw-book" data-book="${esc(b.id)}"><div class="alw-cover" data-cover="${esc(b.id)}"><small>AHMED · BOOK ${String(i+1).padStart(2,"0")}</small><strong dir="auto">${esc(b.title)}</strong><small>✦ YOUR STORY</small></div><div class="alw-book-info"><h2 dir="auto">${esc(b.title)}</h2><p>${esc(b.description||"A story waiting to be told")}</p><small>${(b.sections||[]).filter(x=>x.kind==="chapters").length} chapters · ${countBook(b).toLocaleString()} words</small></div></button>`).join("")}</div>`;
 if(!list.length)root.innerHTML+='<div class="alw-empty" style="margin-top:15px">Your bookshelf is empty. Start with a title, then add a chapter or character.</div>';
 root.innerHTML+='<div class="alw-tip"><strong>Private writing space.</strong> Books save in this browser. Use Export Backup regularly, especially before switching phones or clearing browser data.</div>';
 root.querySelectorAll("[data-book]").forEach(x=>x.onclick=()=>{bookId=x.dataset.book;tab="chapters";sectionId=sections("chapters")[0]?.id||null;editing=false;renderWriting()});
 bindActions(root);
 addCoverImages(root,list);
}
async function addCoverImages(root,list){
 const version=++artVersion;
 try{
  const images=await allArt();
  if(version!==artVersion||page!=="writing"||bookId)return;
  for(const b of list){
   const art=images.find(x=>x.bookId===b.id&&x.targetType==="book"&&x.isCover&&imageOK(x.data));
   if(!art)continue;
   const holder=[...root.querySelectorAll("[data-cover]")].find(el=>el.dataset.cover===b.id);
   if(holder){holder.classList.add("has-cover");const el=document.createElement("img");el.src=art.data;el.alt="Cover art";holder.insertBefore(el,holder.firstChild)}
  }
 }catch{}
}
function tabbar(){
 return '<div class="alw-tabs">'+TABS.map(([k,v])=>`<button type="button" class="alw-tab ${k===tab?"active":""}" data-tab="${k}" aria-pressed="${k===tab}">${v}</button>`).join("")+"</div>";
}
function bookHeader(b){
 return `<button type="button" class="alw-back" data-action="shelf">← Bookshelf</button>`+heading(b.title,b.description||"Create your own world, one page at a time.",button("Rename Book","rename-book")+button("Export Backup","export")+button("Print Book","print-book"))+tabbar();
}
function chapterPage(root){
 const b=current(),items=sections("chapters");if(!items.some(x=>x.id===sectionId))sectionId=items[0]?.id||null;
 const s=section();
 root.innerHTML=bookHeader(b)+`<div class="alw-editor-layout"><aside class="alw-chapters"><div class="alw-list-head"><h3>Chapters</h3>${button("+ New","new-section","primary")}</div><div class="alw-list">${items.map((x,i)=>`<button class="alw-item ${x.id===sectionId?"active":""}" data-section="${esc(x.id)}" type="button"><strong dir="auto">${esc(x.title||"Chapter "+(i+1))}</strong><small>Revision ${Number(x.rev)||1} · ${words(x.body)} words</small></button>`).join("")}</div></aside><div><div class="alw-mobile-choice"><label for="alwMobileChapter" class="alw-visually-hidden">Select chapter</label><select id="alwMobileChapter">${items.map((x,i)=>`<option value="${esc(x.id)}" ${x.id===sectionId?"selected":""}>${esc(x.title||"Chapter "+(i+1))}</option>`).join("")}</select>${button("+ New","new-section","primary")}</div><div class="alw-editor">${s?editor(s):'<div class="alw-empty">Ready for your first chapter. Tap New Chapter to begin.</div>'}</div></div></div>`;
 bindBookActions(root);bindActions(root);
 root.querySelectorAll("[data-section]").forEach(btn=>btn.onclick=()=>{leaveEdit();sectionId=btn.dataset.section;renderWriting()});
 const sel=root.querySelector("#alwMobileChapter");
 if(sel)sel.onchange=e=>{leaveEdit();sectionId=e.target.value;renderWriting()};
 if(s)bindEditor(root,s);
}
function editor(s){
 const disabled=editing?"":"disabled",revision=Number(s.rev)||1;
 return `<div class="alw-editor-top"><div class="alw-eyebrow">WRITING DESK · CHAPTER</div><span class="alw-status" id="alwSaving">${editing?"Editing · Autosave active":"Protected from accidental edits"}</span></div>
 <div class="alw-controls">
 ${button("Edit","edit","",editing?"disabled":"")}
 ${button("Save","save","primary",editing?"":"disabled")}
 <span class="alw-status" aria-live="polite">${editing?"✎ Editing":"🔒 Protected"}</span>
 ${button("Copy","copy")}
 ${button("History","history")}
 ${button("Print","print-chapter")}
 ${button("A−","smaller")}
 ${button("A+","larger")}
 ${button("Draw","draw-chapter")}
 </div>
 <input class="alw-chapter-title" id="alwChapterTitle" aria-label="Chapter title" dir="auto" maxlength="180" value="${esc(s.title)}" ${disabled}>
 <div class="alw-editor-meta"><span id="alwWords">${words(s.body).toLocaleString()} words</span><span>Revision ${revision}</span><span>${esc(localTime(s.updated||s.created))}</span></div>
 <textarea class="alw-chapter-body" id="alwChapterBody" dir="auto" spellcheck="true" aria-label="Chapter content" style="font-size:${fontSize}px!important" ${disabled} placeholder="Begin your story here...">${esc(s.body||"")}</textarea>
 <div id="alwHistory"></div>`;
}
function bindEditor(root,s){
 const title=root.querySelector("#alwChapterTitle"),body=root.querySelector("#alwChapterBody");
 if(!title||!body)return;
 const changed=()=>{root.querySelector("#alwWords").textContent=words(body.value).toLocaleString()+" words";const status=root.querySelector("#alwSaving");status.textContent="Unsaved changes";status.classList.add("alw-draft");clearTimeout(autosaveHandle);autosaveHandle=setTimeout(()=>commit(false),1300)};
 title.oninput=body.oninput=changed;
 const act=(key,fn)=>{const n=root.querySelector(`[data-action="${key}"]`);if(n)n.onclick=fn};
 act("edit",()=>{editAnchor={title:s.title,body:s.body,rev:Number(s.rev)||1};editing=true;renderWriting();document.getElementById("alwChapterBody")?.focus()});
 act("save",()=>{commit(true);editing=false;editAnchor=null;renderWriting();toast("Saved and protected")});
 act("copy",()=>copyText(title.value+"\n\n"+body.value));
 act("history",()=>renderHistory(root,s));
 act("print-chapter",()=>printChapters([s],current()?.title||"Ahmed"));
 act("smaller",()=>adjustFont(-1));
 act("larger",()=>adjustFont(1));
 act("draw-chapter",()=>openDraw({type:"chapter",id:s.id}));
}
function commit(final){
 if(!editing||!bookId||!sectionId)return false;
 clearTimeout(autosaveHandle);
 const title=document.getElementById("alwChapterTitle"),body=document.getElementById("alwChapterBody");
 if(!title||!body)return false;
 const list=books(),b=list.find(x=>x.id===bookId),s=b?.sections?.find(x=>x.id===sectionId);if(!s)return false;
 const name=title.value.trim()||s.title||"Chapter",text=body.value;
 const changed=name!==s.title||text!==s.body;
 const before=editAnchor||{title:s.title,body:s.body,rev:Number(s.rev)||1};
 const edited=name!==before.title||text!==before.body;
 if(!changed&&!final)return true;
 if(final&&edited){
  s.history=Array.isArray(s.history)?s.history:[];
  s.history.push({rev:before.rev||1,title:before.title,body:before.body,at:stamp()});
  if(s.history.length>40)s.history.splice(0,s.history.length-40);
  s.rev=(Number(s.rev)||1)+1;
 }
 if(changed){s.title=name;s.body=text;s.updated=new Date().toISOString()}
 if(!write(list))return false;
 const status=document.getElementById("alwSaving");
 if(status)status.textContent=final?"Saved":"Autosaved";
 return true;
}
function leaveEdit(){if(editing){commit(true);editing=false;editAnchor=null}}
function renderHistory(root,s){
 const panel=root.querySelector("#alwHistory");if(!panel)return;
 if(!panel.hidden&&panel.dataset.open==="1"){panel.hidden=true;panel.dataset.open="0";return}
 const hist=Array.isArray(s.history)?[...s.history].reverse():[];
 panel.hidden=false;panel.dataset.open="1";
 panel.innerHTML='<div class="alw-revisions"><strong>Previous versions</strong><p class="alw-tip" style="margin:8px 0">Restoring creates a new revision. Your latest writing remains in history.</p>'+ (hist.length?hist.map((x,i)=>`<div class="alw-revision-row"><small>Revision ${Number(x.rev)||1} · ${esc(x.at||"Previously saved")} · ${words(x.body)} words</small>${button("Restore","restore","",`data-old="${i}"`)}</div>`).join(""):"<p>No older revisions yet. Save an edit to create one.</p>")+"</div>";
 panel.querySelectorAll('[data-action="restore"]').forEach(el=>el.onclick=()=>{
  const old=hist[Number(el.dataset.old)],list=books(),b=list.find(x=>x.id===bookId),target=b?.sections.find(x=>x.id===sectionId);
  if(!old||!target||!confirm("Restore this earlier version? The current text will remain in history."))return;
  leaveEdit();
  const before={rev:Number(target.rev)||1,title:target.title,body:target.body,at:stamp()};
  target.history=Array.isArray(target.history)?target.history:[];target.history.push(before);
  if(target.history.length>40)target.history.shift();
  target.title=old.title;target.body=old.body;target.rev=before.rev+1;target.updated=new Date().toISOString();
  if(write(list)){editing=false;renderWriting();toast("Earlier version restored")}
 });
}
function adjustFont(by){
 fontSize=Math.min(28,Math.max(14,fontSize+by));
 try{localStorage.setItem(DISPLAY_KEY,String(fontSize))}catch{}
 const t=document.getElementById("alwChapterBody");if(t)t.style.setProperty("font-size",fontSize+"px","important");
}
async function copyText(s){
 try{await navigator.clipboard.writeText(s);toast("Copied to clipboard")}
 catch{const el=document.createElement("textarea");el.value=s;el.style.position="fixed";el.style.opacity="0";document.body.appendChild(el);el.select();const ok=document.execCommand&&document.execCommand("copy");el.remove();toast(ok?"Copied":"Copy is unavailable in this browser")}
}
function printChapters(items,title){
 const win=window.open("","_blank");if(!win){toast("Allow popups to print");return}
 const chunks=items.map(s=>`<section style="break-before:page"><h2 dir="auto">${esc(s.title)}</h2><article style="white-space:pre-wrap;line-height:1.9;font-size:17px" dir="auto">${esc(s.body||"")}</article></section>`).join("");
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:35px auto;padding:30px;color:#182f22}h1,h2{line-height:1.3}@media print{body{padding:0}}</style></head><body><h1 dir="auto">${esc(title)}</h1>${chunks}</body></html>`);
 win.document.close();setTimeout(()=>{win.focus();win.print()},250);
}
function bindBookActions(root){
 const tabs=root.querySelectorAll("[data-tab]");tabs.forEach(el=>el.onclick=()=>{leaveEdit();tab=el.dataset.tab;sectionId=null;editing=false;renderWriting()});
}
function bindActions(root){
 root.querySelectorAll("[data-action]").forEach(btn=>{
  if(["edit","save","copy","history","restore","print-chapter","smaller","larger","draw-chapter"].includes(btn.dataset.action))return;
  btn.onclick=()=>handleAction(btn.dataset.action,btn.dataset);
 });
}
async function handleAction(action,dataset){
 if(action==="shelf"){leaveEdit();bookId=null;sectionId=null;tab="chapters";renderWriting()}
 if(action==="new-book")openDialog("new-book");
 if(action==="rename-book")openDialog("rename-book");
 if(action==="new-section"){leaveEdit();openDialog("new-chapter")}
 if(action==="new-character")openDialog("new-character");
 if(action==="edit-character")openDialog("edit-character",dataset.id);
 if(action==="draw-character")openDraw({type:"character",id:dataset.id});
 if(action==="draw-book")openDraw({type:"book",id:bookId});
 if(action==="upload")startUpload();
 if(action==="draw")openDraw({type:"book",id:bookId});
 if(action==="export")await exportBook();
 if(action==="import")startImport();
 if(action==="text")exportText();
 if(action==="print-book")printChapters(sections("chapters"),current()?.title||"Ahmed");
 if(action==="delete-art")await removeArtwork(dataset.id);
 if(action==="cover-art")await setCover(dataset.id);
 if(action==="note-new")openDialog("new-note");
 if(action==="outline-new")openDialog("new-outline");
 if(action==="note-edit")openDialog("edit-note",dataset.id);
 if(action==="delete-character")deleteSection(dataset.id);
 if(action==="delete-note")deleteSection(dataset.id);
}
function charactersPage(root){
 const b=current(),items=sections("characters");
 root.innerHTML=bookHeader(b)+heading("Character Studio","Give your characters a personality, a history and their own drawings.",button("+ Character","new-character","primary")+button("Draw Character","draw-book"));
 root.innerHTML+=`<div class="alw-grid">${items.map(x=>`<article class="alw-character"><div class="alw-character-image" data-character-img="${esc(x.id)}">✍</div><div class="alw-character-content"><h3 dir="auto">${esc(x.title)}</h3><p>${esc([x.profile?.role,x.profile?.age?("Age "+x.profile.age):""].filter(Boolean).join(" · ")||"Character profile")}</p><p>${esc(x.profile?.personality||x.body||"Add appearance, motives and personality.")}</p><div class="alw-character-actions">${button("Edit","edit-character","",`data-id="${esc(x.id)}"`)}${button("Draw","draw-character","",`data-id="${esc(x.id)}"`)}${button("Delete","delete-character","danger",`data-id="${esc(x.id)}"`)}</div></div></article>`).join("")}</div>`;
 if(!items.length)root.innerHTML+='<div class="alw-empty">Create a character, then draw them or add a photo.</div>';
 bindBookActions(root);bindActions(root);
 showCharacterArt(root,items);
}
async function showCharacterArt(root,items){
 try{
  const all=await allArt();
  for(const s of items){
   if(page!=="writing"||tab!=="characters"||bookId!==current()?.id)return;
   const asset=all.filter(x=>x.bookId===bookId&&x.targetType==="character"&&x.targetId===s.id&&imageOK(x.data)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
   if(!asset)continue;
   const frame=[...root.querySelectorAll("[data-character-img]")].find(x=>x.dataset.characterImg===s.id);
   if(frame){frame.textContent="";const img=document.createElement("img");img.src=asset.data;img.alt="Drawing of "+s.title;frame.appendChild(img)}
  }
 }catch{}
}
function notesPage(root){
 const b=current();const items=sections(subtab==="outline"?"outline":"notes");
 root.innerHTML=bookHeader(b)+heading("Notes and Story Outline","Keep plot ideas, places, research and little discoveries together.",button("+ New Note",subtab==="outline"?"outline-new":"note-new","primary"));
 root.innerHTML+=`<div class="alw-tabs"><button class="alw-tab ${subtab==="notes"?"active":""}" data-subtab="notes">Notes</button><button class="alw-tab ${subtab==="outline"?"active":""}" data-subtab="outline">Story Outline</button></div><div class="alw-grid">${items.map(x=>`<article class="alw-character"><div class="alw-character-content"><h3 dir="auto">${esc(x.title)}</h3><p dir="auto" style="white-space:pre-wrap">${esc(x.body||"An idea waiting to grow")}</p><small>Revision ${Number(x.rev)||1} · ${esc(localTime(x.updated))}</small><div class="alw-character-actions" style="margin-top:12px">${button("Edit","note-edit","",`data-id="${esc(x.id)}"`)}${button("Delete","delete-note","danger",`data-id="${esc(x.id)}"`)}</div></div></article>`).join("")}</div>`;
 if(!items.length)root.innerHTML+='<div class="alw-empty">Start collecting story ideas and notes here.</div>';
 bindBookActions(root);bindActions(root);
 root.querySelectorAll("[data-subtab]").forEach(el=>el.onclick=()=>{subtab=el.dataset.subtab;renderWriting()});
}
async function artworkPage(root){
 const b=current();
 root.innerHTML=bookHeader(b)+heading("Artwork Gallery","Draw a character, design a book cover or upload your own art.",button("✎ Draw","draw","primary")+button("Upload Art","upload"));
 root.innerHTML+='<div class="alw-gallery" id="alwGallery"><div class="alw-empty">Loading artwork…</div></div>';
 root.innerHTML+='<div class="alw-tip">Art is kept on this device in browser artwork storage. The Export Backup includes both writing and artwork.</div>';
 bindBookActions(root);bindActions(root);
 const token=++artVersion;
 try{
  const artwork=(await allArt()).filter(x=>x.bookId===bookId).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if(page!=="writing"||tab!=="artwork"||token!==artVersion)return;
  const gal=root.querySelector("#alwGallery");
  gal.innerHTML=artwork.length?artwork.map(x=>`<article class="alw-art"><img alt="${esc(x.title||"Artwork")}" src="${imageOK(x.data)?x.data:""}"><div class="alw-art-info"><strong>${esc(x.title||"Untitled drawing")}</strong><small>${esc(x.targetType==="book"?"Book":x.targetType==="character"?"Character":"Chapter")} · ${esc(localTime(x.updatedAt))}</small><div class="alw-art-actions">${button(x.isCover?"Book Cover ✓":"Use as Cover","cover-art","",`data-id="${esc(x.id)}"`)}${button("Delete","delete-art","danger",`data-id="${esc(x.id)}"`)}</div></div></article>`).join(""):'<div class="alw-empty">No artwork yet. Draw something yourself or upload your sketches.</div>';
  bindActions(gal);
 }catch{root.querySelector("#alwGallery").innerHTML='<div class="alw-empty">Artwork storage is unavailable in this browser.</div>'}
}
function removeArtwork(id){
 if(!confirm("Delete this artwork from this device? Export a backup if you want to keep it."))return;
 return deleteArt(id).then(()=>{toast("Artwork removed");renderWriting()}).catch(()=>toast("Unable to delete artwork"));
}
async function setCover(id){
 try{
  const list=await allArt();const item=list.find(x=>x.id===id&&x.bookId===bookId);if(!item)return;
  for(const x of list.filter(x=>x.bookId===bookId&&x.isCover)){x.isCover=false;await putArt(x)}
  item.isCover=true;item.updatedAt=new Date().toISOString();await putArt(item);
  toast("Book cover updated");renderWriting()
 }catch{toast("Could not set book cover")}
}
function deleteSection(id){
 const b=current(),s=(b?.sections||[]).find(x=>x.id===id);
 if(!s||!confirm("Delete "+s.title+"? Export a backup first if you want to keep it."))return;
 const all=books(),target=all.find(x=>x.id===bookId);target.sections=target.sections.filter(x=>x.id!==id);
 if(write(all)){toast("Entry removed");renderWriting()}
}
function openDialog(type,existingId){
 dialogType=type;dialogId=existingId||null;
 let overlay=document.getElementById("alwDialog");
 if(!overlay){overlay=document.createElement("div");overlay.id="alwDialog";overlay.className="alw-dialog-bg";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","alwDialogTitle");document.body.appendChild(overlay)}
 let title="",fields="";
 const s=existingId?(current()?.sections||[]).find(x=>x.id===existingId):null;
 if(type==="new-book"||type==="rename-book"){
  const b=type==="rename-book"?current():null;title=type==="new-book"?"Create a new story":"Rename story";
  fields=`<label for="alwName">Book title</label><input id="alwName" maxlength="180" required value="${esc(b?.title||"")}" placeholder="The Last Astronaut"><label for="alwDesc">Description</label><textarea id="alwDesc" maxlength="600">${esc(b?.description||"")}</textarea>`;
 }else if(type==="new-chapter"){
  title="New chapter";fields=`<label for="alwName">Chapter name</label><input id="alwName" maxlength="180" required value="Chapter ${sections("chapters").length+1}">`;
 }else if(type==="new-character"||type==="edit-character"){
  title=type==="new-character"?"Create character":"Edit character";
  fields=`<label for="alwName">Name</label><input id="alwName" maxlength="180" required value="${esc(s?.title||"")}" placeholder="What is the character called?">
   <div class="alw-fields"><div><label for="alwRole">Role</label><input id="alwRole" value="${esc(s?.profile?.role||"")}" placeholder="Hero, friend..."></div><div><label for="alwAge">Age</label><input id="alwAge" value="${esc(s?.profile?.age||"")}" placeholder="24"></div></div>
   <label for="alwLook">Appearance</label><textarea id="alwLook" placeholder="What do they look like?">${esc(s?.profile?.appearance||"")}</textarea>
   <label for="alwPersonality">Personality and motives</label><textarea id="alwPersonality" placeholder="What makes this person interesting?">${esc(s?.profile?.personality||"")}</textarea>
   <label for="alwBio">Background and story notes</label><textarea id="alwBio" placeholder="Where did this character come from?">${esc(s?.body||"")}</textarea>`;
 }else{
  title=type.startsWith("edit")?"Edit note":type==="new-outline"?"New story outline":"New note";
  fields=`<label for="alwName">Title</label><input id="alwName" maxlength="180" required value="${esc(s?.title||"")}" placeholder="An idea worth keeping"><label for="alwBio">Notes</label><textarea id="alwBio" rows="8">${esc(s?.body||"")}</textarea>`;
 }
 overlay.innerHTML=`<div class="alw-dialog"><h2 id="alwDialogTitle">${esc(title)}</h2><form id="alwDialogForm">${fields}<div class="alw-dialog-footer">${button("Cancel","cancel-dialog") }<button type="submit" class="alw-btn primary">Save</button></div></form></div>`;
 overlay.classList.add("open");
 overlay.onclick=e=>{if(e.target===overlay)closeDialog()};
 const cancel=overlay.querySelector('[data-action="cancel-dialog"]');if(cancel)cancel.onclick=closeDialog;
 overlay.querySelector("form").onsubmit=e=>{e.preventDefault();dialogSave(overlay)};
 overlay.querySelector("#alwName")?.focus();
}
function closeDialog(){document.getElementById("alwDialog")?.classList.remove("open");dialogType="";dialogId=null}
function dialogSave(root){
 const name=root.querySelector("#alwName")?.value.trim();
 if(!name)return;
 const all=books(),book=all.find(b=>b.id===bookId);
 if(dialogType==="new-book"){
  const newBook={id:id(),title:name.slice(0,180),description:root.querySelector("#alwDesc")?.value||"",sections:[{id:id(),title:"Chapter 1",kind:"chapters",body:"",rev:1,history:[],updated:new Date().toISOString()}],created:new Date().toISOString()};
  all.push(newBook);
  if(write(all)){bookId=newBook.id;sectionId=newBook.sections[0].id;tab="chapters";editing=false;closeDialog();renderWriting();toast("New story ready")}
  return;
 }
 if(!book)return;
 if(dialogType==="rename-book"){
  book.title=name.slice(0,180);book.description=root.querySelector("#alwDesc")?.value||"";
  if(write(all)){closeDialog();renderWriting()}return;
 }
 if(dialogType==="new-chapter"){
  const obj={id:id(),title:name.slice(0,180),kind:"chapters",body:"",rev:1,history:[],updated:new Date().toISOString()};
  book.sections.push(obj);sectionId=obj.id;tab="chapters";editing=false;closeDialog();
  if(write(all)){renderWriting();toast("Chapter added")}
  return;
 }
 const isCharacter=dialogType.includes("character");
 const isOutline=dialogType==="new-outline"||(dialogType==="edit-note"&&subtab==="outline");
 const kind=isCharacter?"characters":isOutline?"outline":"notes";
 const isEdit=dialogType.startsWith("edit");
 const obj=isEdit?book.sections.find(x=>x.id===dialogId):null;
 const body=root.querySelector("#alwBio")?.value||"";
 const profile=isCharacter?{role:root.querySelector("#alwRole").value,age:root.querySelector("#alwAge").value,appearance:root.querySelector("#alwLook").value,personality:root.querySelector("#alwPersonality").value}:undefined;
 const newItem={id:obj?.id||id(),title:name.slice(0,180),kind,body,rev:(Number(obj?.rev)||0)+1,history:Array.isArray(obj?.history)?obj.history:[],updated:new Date().toISOString(),...(profile?{profile}:{})};
 if(obj){
  const old=book.sections.findIndex(x=>x.id===obj.id);
  newItem.history.push({rev:Number(obj.rev)||1,title:obj.title,body:obj.body,at:stamp()});
  if(newItem.history.length>40)newItem.history.shift();
  book.sections[old]=newItem;
 }else book.sections.push(newItem);
 if(write(all)){closeDialog();renderWriting();toast(isCharacter?"Character saved":"Notes saved")}
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!("indexedDB" in window))return reject(Error("Artwork storage unavailable"));
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("art")){const store=db.createObjectStore("art",{keyPath:"id"});store.createIndex("bookId","bookId",{unique:false})}};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function allArt(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("art","readonly"),req=tx.objectStore("art").getAll();
  req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
  tx.oncomplete=()=>db.close();tx.onerror=()=>db.close();
 });
}
async function putArt(obj){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("art","readwrite"),req=tx.objectStore("art").put(obj);
  tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}
 });
}
async function deleteArt(artId){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("art","readwrite");tx.objectStore("art").delete(artId);
  tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}
 });
}
const imageOK=x=>typeof x==="string"&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
function targets(){
 const b=current();if(!b)return[];
 return [{type:"book",id:b.id,name:"Book cover or general art"},...(b.sections||[]).filter(s=>s.kind==="characters").map(s=>({type:"character",id:s.id,name:"Character: "+s.title})),...(b.sections||[]).filter(s=>s.kind==="chapters").map(s=>({type:"chapter",id:s.id,name:"Chapter: "+s.title}))];
}
function targetSelect(selected){
 return `<label for="alwTarget" class="alw-visually-hidden">Attach artwork to</label><select id="alwTarget" aria-label="Attach art to">${targets().map(x=>`<option value="${esc(x.type)}:${esc(x.id)}" ${selected?.type===x.type&&selected?.id===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select>`;
}
function chosenTarget(){
 const select=document.getElementById("alwTarget"),value=select?.value||("book:"+bookId),cut=value.indexOf(":");
 return {type:value.slice(0,cut),id:value.slice(cut+1)};
}
async function saveArtData(data,title,target){
 if(!bookId||!imageOK(data)){toast("This artwork format is not supported");return false}
 const item={id:id(),bookId,targetType:target?.type||"book",targetId:target?.id||bookId,title:(title||"Ahmed's drawing").trim().slice(0,150),kind:"art",data,isCover:false,updatedAt:new Date().toISOString()};
 try{await putArt(item);toast("Art saved in this browser");return true}catch(e){toast("Could not store artwork. Check available device storage.");return false}
}
function startUpload(){
 if(!bookId){toast("Create a story first");return}
 const file=document.createElement("input");file.type="file";file.accept="image/png,image/jpeg,image/webp";
 file.onchange=async()=>{
  const f=file.files?.[0];if(!f)return;
  if(!["image/png","image/jpeg","image/webp"].includes(f.type)||f.size>12*1024*1024){toast("Use PNG, JPEG or WebP under 12 MB");return}
  try{
   const image=await decodeFile(f);
   const cv=document.createElement("canvas"),max=1800,scale=Math.min(1,max/Math.max(image.width,image.height));
   cv.width=Math.max(1,Math.round(image.width*scale));cv.height=Math.max(1,Math.round(image.height*scale));
   const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(image,0,0,cv.width,cv.height);
   const data=cv.toDataURL("image/jpeg",0.85);
   const name=(f.name||"Artwork").replace(/\.[^.]+$/,"");
   if(await saveArtData(data,name,{type:"book",id:bookId})){tab="artwork";renderWriting()}
  }catch(e){toast("Could not read this image")}
 };
 file.click();
}
function decodeFile(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("Invalid image"))};
  img.src=url;
 });
}
function drawLayout(target){
 let panel=document.getElementById("alwDraw");
 if(!panel){panel=document.createElement("div");panel.id="alwDraw";panel.className="alw-draw-modal";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","alwDrawTitle");document.body.appendChild(panel)}
 panel.innerHTML=`<div class="alw-draw-shell"><div class="alw-draw-heading"><h2 id="alwDrawTitle">✎ Ahmed's Drawing Pad</h2>${button("Close","close-draw")}</div>
 <div class="alw-draw-toolbar">${button("Pencil","pencil","primary")}${button("Eraser","eraser")}${["#263A31","#BC8C42","#A84040","#315B89","#4D855C","#FFFFFF"].map((c,i)=>`<button class="alw-swatch ${i===0?"selected":""}" data-color="${c}" aria-label="Color ${c}" title="${c}" style="background:${c}"></button>`).join("")}<label for="alwSize">Size</label><input id="alwSize" type="range" min="2" max="34" value="5">${button("Undo","undo")}${button("Redo","redo")}${button("Clear","clear")}</div>
 <div class="alw-canvas-wrap"><canvas id="alwCanvas" width="960" height="640" aria-label="Draw with your finger, mouse or stylus"></canvas></div>
 <div class="alw-draw-footer"><input id="alwArtTitle" maxlength="150" value="My drawing" placeholder="Artwork title">${targetSelect(target)}${button("Save Drawing","save-drawing","primary")}</div></div>`;
 panel.classList.add("open");panel.onclick=e=>{if(e.target===panel)closeDraw()};
 canvas=panel.querySelector("#alwCanvas");ctx=canvas.getContext("2d",{willReadFrequently:false});
 ctx.fillStyle="#FFFFFF";ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.lineCap="round";ctx.lineJoin="round";undoStack=[];redoStack=[];drawColor="#263A31";drawMode="pencil";drawSize=5;
 panel.querySelector('[data-action="close-draw"]').onclick=closeDraw;
 panel.querySelector('[data-action="pencil"]').onclick=()=>{drawMode="pencil";syncDrawMode()};
 panel.querySelector('[data-action="eraser"]').onclick=()=>{drawMode="eraser";syncDrawMode()};
 panel.querySelector("#alwSize").oninput=e=>{drawSize=Number(e.target.value)};
 panel.querySelectorAll("[data-color]").forEach(b=>b.onclick=()=>{drawColor=b.dataset.color;drawMode="pencil";syncDrawMode();panel.querySelectorAll("[data-color]").forEach(x=>x.classList.toggle("selected",x===b))});
 panel.querySelector('[data-action="undo"]').onclick=()=>{if(!undoStack.length)return;redoStack.push(canvas.toDataURL("image/png"));loadCanvas(undoStack.pop())};
 panel.querySelector('[data-action="redo"]').onclick=()=>{if(!redoStack.length)return;undoStack.push(canvas.toDataURL("image/png"));loadCanvas(redoStack.pop())};
 panel.querySelector('[data-action="clear"]').onclick=()=>{if(!confirm("Clear this drawing? You can Undo before saving."))return;pushUndo();ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height)};
 panel.querySelector('[data-action="save-drawing"]').onclick=async()=>{
  const title=panel.querySelector("#alwArtTitle").value;
  if(await saveArtData(canvas.toDataURL("image/png"),title,chosenTarget())){closeDraw();tab="artwork";renderWriting()}
 };
 let last=null;
 function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
 canvas.onpointerdown=e=>{
  e.preventDefault();if(drawing)return;
  drawing=true;pushUndo();canvas.setPointerCapture?.(e.pointerId);
  last=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);
  ctx.strokeStyle=drawMode==="eraser"?"#FFFFFF":drawColor;ctx.lineWidth=drawMode==="eraser"?Math.max(14,drawSize*2):drawSize;
  ctx.lineTo(last.x+0.01,last.y+0.01);ctx.stroke();
 };
 canvas.onpointermove=e=>{if(!drawing)return;e.preventDefault();const next=point(e);ctx.lineTo(next.x,next.y);ctx.stroke();last=next};
 const up=e=>{if(!drawing)return;e.preventDefault();drawing=false;ctx.closePath();last=null};
 canvas.onpointerup=canvas.onpointercancel=up;
 panel.querySelector("#alwArtTitle").focus();
}
function pushUndo(){if(!canvas)return;undoStack.push(canvas.toDataURL("image/png"));if(undoStack.length>24)undoStack.shift();redoStack=[]}
function loadCanvas(data){const img=new Image();img.onload=()=>{if(!ctx||!canvas)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height)};img.src=data}
function syncDrawMode(){
 const panel=document.getElementById("alwDraw");if(!panel)return;
 const pen=panel.querySelector('[data-action="pencil"]'),eraser=panel.querySelector('[data-action="eraser"]');
 pen.classList.toggle("primary",drawMode==="pencil");eraser.classList.toggle("primary",drawMode==="eraser");
}
function closeDraw(){document.getElementById("alwDraw")?.classList.remove("open");drawing=false;canvas=null;ctx=null}
function openDraw(target){
 if(!bookId){toast("Create a book first");return}
 drawLayout(target||{type:"book",id:bookId});
}
async function exportBook(){
 const b=current();if(!b)return;
 leaveEdit();
 try{
  const art=(await allArt()).filter(x=>x.bookId===b.id);
  const data=JSON.stringify({format:"ahmed-writing-full-v2",exportedAt:new Date().toISOString(),book:b,artwork:art},null,2);
  download(new Blob([data],{type:"application/json"}),(b.title||"Ahmed Story").replace(/[^a-z0-9_-]/gi,"_").slice(0,45)+"_backup.json");toast("Complete story and artwork backup downloaded");
 }catch{toast("Artwork storage unavailable; export your writing text as a separate backup")}
}
function exportText(){
 const b=current();if(!b)return;leaveEdit();
 const text=b.title+"\n\n"+sections("chapters").map(s=>s.title+"\n\n"+(s.body||"")).join("\n\n\n");
 download(new Blob([text],{type:"text/plain;charset=utf-8"}),"Ahmed_Manuscript.txt");
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000)}
function startImport(){
 const input=document.createElement("input");input.type="file";input.accept=".json,application/json";
 input.onchange=async()=>{
  const f=input.files?.[0];if(!f)return;
  if(f.size>50*1024*1024){toast("Backup exceeds 50 MB");return}
  try{
   const json=JSON.parse(await f.text()),source=json.book||json;
   if(typeof source.title!=="string"||!Array.isArray(source.sections)||source.sections.length>600)throw Error("Invalid story");
   const mappings=new Map(),newBookId=id();
   const safeSections=source.sections.map(s=>{
    if(typeof s.title!=="string"||typeof s.body!=="string"||s.body.length>3000000)throw Error("Invalid chapter");
    const newId=id();mappings.set(s.id,newId);
    return {id:newId,title:s.title.slice(0,180),body:s.body,kind:["chapters","characters","outline","notes"].includes(s.kind)?s.kind:"chapters",rev:Number(s.rev)||1,history:Array.isArray(s.history)?s.history.slice(-40):[],updated:s.updated||new Date().toISOString(),...(s.profile?{profile:s.profile}:{})};
   });
   const imported={id:newBookId,title:source.title.slice(0,180),description:String(source.description||"").slice(0,600),sections:safeSections,created:new Date().toISOString()};
   const artwork=Array.isArray(json.artwork)?json.artwork:[];
   if(artwork.length>250)throw Error("Too many images");
   for(const image of artwork){
    if(!imageOK(image.data)||image.data.length>16*1024*1024)throw Error("Unsupported artwork");
   }
   const list=books();list.push(imported);
   if(!write(list))return;
   for(const image of artwork){
    try{await putArt({id:id(),bookId:newBookId,title:String(image.title||"Imported art").slice(0,150),data:image.data,targetType:["character","chapter","book"].includes(image.targetType)?image.targetType:"book",targetId:mappings.get(image.targetId)||newBookId,isCover:!!image.isCover,kind:"art",updatedAt:new Date().toISOString()})}
    catch{toast("A drawing could not be imported; check storage")}
   }
   bookId=newBookId;tab="chapters";sectionId=safeSections.find(x=>x.kind==="chapters")?.id||null;editing=false;
   renderWriting();toast("Story imported successfully");
  }catch{toast("That is not a supported Ahmed story backup")}
 };
 input.click();
}
function onBrand(e){
 if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 e.preventDefault();leaveEdit();closeDialog();closeDraw();bookId=null;page="home";render();window.scrollTo({top:0,behavior:"auto"});
}
function install(){
 const logo=document.getElementById("ahmedHome");if(logo)logo.addEventListener("click",onBrand);
 document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(document.getElementById("alwDraw")?.classList.contains("open"))closeDraw();else if(document.getElementById("alwDialog")?.classList.contains("open"))closeDialog()});
 window.addEventListener("beforeunload",()=>commit(true));
 window.addEventListener("pagehide",()=>commit(true));
 render=function(){
  if(page!=="writing"&&editing)leaveEdit();
  priorRender();
  const warning=document.querySelector("main>.notice");if(warning)warning.hidden=page==="writing"||page==="home"||page==="life";
  if(page==="writing")renderWriting();
 };
 render();
}
install();
})();