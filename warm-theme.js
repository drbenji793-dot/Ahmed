(function(){
const themes=['coffee','parchment','sage'];let theme='parchment';try{const saved=localStorage.getItem('ahmed-theme');if(themes.includes(saved))theme=saved}catch(e){}
function applyTheme(){document.documentElement.dataset.theme=theme;document.querySelectorAll('.warm-themes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.theme===theme))}
function themePicker(){const el=document.createElement('div');el.className='warm-themes';el.setAttribute('aria-label','Page color');el.innerHTML=themes.map(t=>`<button data-theme="${t}" aria-pressed="${t===theme}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('');el.querySelectorAll('button').forEach(b=>b.onclick=()=>{theme=b.dataset.theme;try{localStorage.setItem('ahmed-theme',theme)}catch(e){}applyTheme()});return el}
window.addEventListener('ahmed-cloud-updated',()=>{try{const v=localStorage.getItem('ahmed-theme');if(themes.includes(v)){theme=v;applyTheme()}}catch(e){}});
applyTheme();const sidebar=document.querySelector('body>aside');if(sidebar)sidebar.insertBefore(themePicker(),sidebar.querySelector('nav'));else document.querySelector('main').prepend(themePicker());
function footer(){const f=document.createElement('footer');f.className='warm-footer';f.innerHTML='<span class="rules-footer-meta"><a href="/search101.html">Search101</a><span>v1.3 · Updated 21 Oct 2026</span></span><a class="rules-footer-link" href="/rules.html" aria-label="Open Rules and Standards">▤ Rules</a>';return f}
const subjects=[['english','English 2','17 Oct 2026 · 3:30 pm','HUB Yard · Zone C'],['ai','AI in Modern Life','20 Oct 2026 · 9:30 am','HUB Yard · Zone C'],['environment','Principles of Environmental Sciences','21 Oct 2026 · 12:30 pm','HUB Yard · Zone B'],['emirati','Emirati Studies','22 Oct 2026 · 9:30 am','HUB Yard · Zone A'],['psychology','Psychology II','23 Oct 2026 · 3:00 pm','HUB-101']];

let classSort='priority';
try{const saved=localStorage.getItem('ahmed-class-sort');if(['priority','exam','name'].includes(saved))classSort=saved}catch(e){}
function sortClasses(){
 const rank={Urgent:0,High:1,Medium:2,Normal:3,Low:4},now=Date.now();
 const info=card=>{const title=card.querySelector('h2,strong').textContent,x=semesterExams.find(x=>x.title===title);return {title,priority:rank[card.querySelector('.ah-priority')?.value]??3,date:new Date(x.date+'T'+x.time+':00+04:00').getTime()}};
 const byDate=(a,b)=>(a.date<now)-(b.date<now)||(a.date>=now?a.date-b.date:b.date-a.date);
 document.querySelectorAll('.semester-grid,.semester section[aria-label="Upcoming exams"],.semester details').forEach(parent=>{
  const cards=Array.from(parent.children).filter(c=>c.matches('.semester-subject,.semester-row'));
  cards.sort((ca,cb)=>{const a=info(ca),b=info(cb);return classSort==='name'?a.title.localeCompare(b.title):classSort==='priority'?a.priority-b.priority||byDate(a,b):byDate(a,b)});
  cards.forEach(c=>parent.appendChild(c));
 });
}
function classSortMenu(){
 const tabs=document.querySelector('.semester-tabs');if(!tabs)return;
 const label=document.createElement('label');label.className='class-sort';label.innerHTML='Sort by <select aria-label="Sort classes"><option value="priority">Priority</option><option value="exam">Next exam</option><option value="name">Class name</option></select>';
 tabs.appendChild(label);const select=label.querySelector('select');select.value=classSort;
 select.onchange=()=>{classSort=select.value;try{localStorage.setItem('ahmed-class-sort',classSort)}catch(e){}sortClasses()};
 sortClasses();
}

if(sidebar){modules.find(m=>m.id==='university').name='My Classes';const previous=render;render=function(){previous();const b=document.querySelector('.nav [data-page=university] .nav-label');if(b)b.innerHTML='My Classes<small class="nav-subtitle">Subjects · Exams · Study tools</small>';document.querySelectorAll('a[href="/psychology.html#research"]').forEach(a=>a.parentElement.remove());document.querySelectorAll('.semester-subject,.semester-row').forEach(card=>{const title=card.querySelector('h2,strong')?.textContent;const subject=subjects.find(s=>s[1]===title);if(subject&&!card.querySelector('.class-link')){card.querySelector('a[href="/psychology.html"]')?.remove();const a=document.createElement('a');a.className='class-link';a.href='/psychology.html?class='+subject[0];a.setAttribute('aria-label','Open '+title);a.textContent='';card.appendChild(a)}});classSortMenu()};render();document.querySelector('main').appendChild(footer());if(location.hash==='#classes'){page='university';render()}}
else if(document.getElementById('view')){
 const oldFooter=document.getElementById('research');if(oldFooter)oldFooter.replaceWith(footer());const priorStudyRender=render;render=function(){priorStudyRender();document.querySelectorAll('a[href="#research"]').forEach(a=>a.href='/search101.html#sources')};render();
 const toolbar=document.createElement('div');toolbar.className='class-toolbar';toolbar.innerHTML='<label for="class-select">My Classes</label><select id="class-select" aria-label="Switch class">'+subjects.map(s=>`<option value="${s[0]}">${s[1]}</option>`).join('')+'</select>';document.querySelector('main>header').before(toolbar);
 const selector=toolbar.querySelector('select');const requested=new URLSearchParams(location.search).get('class');selector.value=subjects.some(s=>s[0]===requested)?requested:'psychology';selector.onchange=()=>{location.href='/psychology.html?class='+selector.value};
 const current=subjects.find(s=>s[0]===selector.value);if(current[0]!=='psychology'){document.title=current[1]+' · My Classes';document.querySelector('main>header').innerHTML=`<p class="eyebrow">MY CLASSES · OCTOBER 2026</p><h1>${current[1]}</h1><p class="pill">Exam · ${current[2]} Dubai · ${current[3]}</p>`;document.querySelector('aside.notice')?.remove();document.querySelector('nav.tabs')?.remove();document.getElementById('view').innerHTML='<section class="class-empty"><h2>Your class space</h2><p>The exam details are saved from your schedule. Study maps and practice materials have not been added for this class yet.</p><p>Use your syllabus and lecture notes to confirm the book and covered chapters.</p><a href="/#classes">View all subjects and assignments →</a></section>'}
}
else document.querySelector('main')?.appendChild(footer());
})();

/* Shared browser history, reading positions and touch navigation. */
(function(){
 'use strict';
 const isApp=!!document.querySelector('body>aside'),isStudy=!!document.getElementById('view')&&(!new URLSearchParams(location.search).get('class')||new URLSearchParams(location.search).get('class')==='psychology');
 const key='ahmed-navigation-position:',positionCache=new Map();
 let restoring=false,queued=false,touch=null,bouncing=false,suppressClickUntil=0;
 const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
 function route(){
  if(isApp)return {page,writing:page==='writing'?window.ahWritingNavigation?.get():undefined,semester:page==='university'?window.ahSemesterNavigation?.get():undefined,calendar:page==='life'?window.ahCalendarNavigation?.get():undefined};
  return isStudy?{study:window.ahStudyNavigation.get()}:{};
 }
 function apply(r){
  if(isApp){page=['home',...modules.map(m=>m.id)].includes(r.page)?r.page:'home';if(r.writing)window.ahWritingNavigation?.set(r.writing);if(r.semester)window.ahSemesterNavigation?.set(r.semester);if(r.calendar)window.ahCalendarNavigation?.set(r.calendar);render()}
  else if(isStudy&&r.study)window.ahStudyNavigation.set(r.study);
 }
 function routeURL(r){
  const u=new URL(location.href);
  if(isApp){u.search='';u.hash='';u.searchParams.set('page',r.page);if(r.writing)Object.entries(r.writing).forEach(([k,v])=>{if(v)u.searchParams.set(k,v)});if(r.semester)u.searchParams.set('section',r.semester)}
  else if(isStudy){Object.entries(r.study).forEach(([k,v])=>u.searchParams.set(k,String(v)));u.hash=''}
  return u;
 }
 function fromURL(){
  const p=new URLSearchParams(location.search),r=route();
  if(isApp){r.page=p.get('page')||(location.hash==='#classes'?'university':'home');if(r.page==='writing')r.writing={book:p.get('book'),chapter:p.get('chapter'),section:p.get('section'),subtab:p.get('subtab')};if(r.page==='university')r.semester=p.get('section')||'subjects'}
  else if(isStudy)r.study={section:p.get('section')||'map',card:p.get('card'),question:p.get('question'),filter:p.get('filter')||'all'};
  return r;
 }
 let active=history.state?.ahmedNav||{id:uid(),index:0,route:fromURL()};
 function remember(){
  if(restoring)return;
  const scrollers={};document.querySelectorAll('textarea[id],.alw-chapters,.alw-list').forEach((el,i)=>{scrollers[el.id||'scroll-'+i]=[el.scrollLeft,el.scrollTop]});
  const p={x:scrollX,y:scrollY,scrollers,details:Array.from(document.querySelectorAll('details')).map(el=>el.open)};
  positionCache.set(active.id,p);try{sessionStorage.setItem(key+active.id,JSON.stringify(p))}catch(e){}
 }
 function restorePosition(id){
  let p=positionCache.get(id);try{p=p||JSON.parse(sessionStorage.getItem(key+id)||'null')}catch(e){}
  if(!p){window.scrollTo(0,0);return}
  document.querySelectorAll('details').forEach((el,i)=>{if(typeof p.details?.[i]==='boolean')el.open=p.details[i]});
  window.scrollTo(p.x,p.y);
  document.querySelectorAll('textarea[id],.alw-chapters,.alw-list').forEach((el,i)=>{const xy=p.scrollers[el.id||'scroll-'+i];if(xy){el.scrollLeft=xy[0];el.scrollTop=xy[1]}});
 }
 function pendingDialog(){return !!document.querySelector('.modal.show,.alw-dialog-bg.open,.alw-draw-modal.open,.ahc-overlay.show,.ahd-modal.show')}
 function safeToLeave(){
  if(pendingDialog()){alert('Save or close the open editor before leaving this page.');return false}
  return window.ahWritingNavigation?.leave()!==false;
 }
 function sync(){
  if(restoring||bouncing)return;
  const r=route();if(JSON.stringify(r)===JSON.stringify(active.route))return;
  active={id:uid(),index:active.index+1,route:r};
  history.pushState({...history.state,ahmedNav:active},'',routeURL(r));
  restoring=true;requestAnimationFrame(()=>{window.scrollTo(0,0);restoring=false;remember()});
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync()})}
 restoring=true;apply(active.route);active={...active,route:route()};
 history.replaceState({...history.state,ahmedNav:active},'');
 history.scrollRestoration='manual';
 requestAnimationFrame(()=>{restorePosition(active.id);restoring=false});
 if(typeof render==='function'){const prior=render;render=function(){const result=prior.apply(this,arguments);schedule();return result}}
 // Writing and calendar render inside closures; observe their route changes too.
 new MutationObserver(schedule).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
 document.addEventListener('scroll',remember,{capture:true,passive:true});
 document.addEventListener('toggle',remember,true);
 const navSelector='a[href],[data-page],[data-open],[data-route],[data-book],[data-section],[data-tab],[data-subtab],[data-sem-tab],[data-action="shelf"],#alwMobileChapter,#class-select';
 document.addEventListener('click',e=>{
  if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();return}
  remember();const target=e.target.closest(navSelector);if(!target)return;
  if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
  if(!safeToLeave()){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 document.addEventListener('change',e=>{
  remember();if(e.target.matches('#alwMobileChapter,#class-select')&&!safeToLeave()){e.preventDefault();e.stopImmediatePropagation();if(e.target.id==='alwMobileChapter')e.target.value=window.ahWritingNavigation.get().chapter;return}schedule();
 },true);
 addEventListener('popstate',e=>{
  if(bouncing){bouncing=false;return}
  const next=e.state?.ahmedNav;
  if(!safeToLeave()){
   const delta=next?active.index-next.index:1;bouncing=true;history.go(delta||1);return;
  }
  restoring=true;active=next||{id:uid(),index:active.index,route:fromURL()};
  apply(active.route);
  if(!next)history.replaceState({...history.state,ahmedNav:active},'');
  requestAnimationFrame(()=>{restorePosition(active.id);restoring=false});
 });
 addEventListener('pagehide',remember);
 addEventListener('pageshow',e=>{if(e.persisted){active=history.state?.ahmedNav||active;restoring=true;requestAnimationFrame(()=>{restorePosition(active.id);restoring=false})}});
 addEventListener('beforeunload',e=>{remember();if(pendingDialog()||window.ahWritingNavigation?.leave()===false){e.preventDefault();e.returnValue=''}});
 function excluded(el){return !!el.closest('input,textarea:not(:disabled):not([readonly]),select,button,[contenteditable="true"],canvas,.modal,.alw-dialog-bg,.alw-draw-modal')||!!window.getSelection()?.toString()}
 document.addEventListener('touchstart',e=>{
  touch=null;if(e.touches.length!==1||excluded(e.target)||pendingDialog())return;
  const t=e.touches[0];
  // Reserve the outer edges for Safari's native history gesture.
  if(t.clientX<28||t.clientX>innerWidth-28)return;
  for(let el=e.target;el&&el!==document.body;el=el.parentElement){if(el.scrollWidth>el.clientWidth+4&&/auto|scroll/.test(getComputedStyle(el).overflowX))return}
  touch={x:t.clientX,y:t.clientY,time:Date.now(),horizontal:false};
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!touch)return;if(e.touches.length!==1){touch=null;return}
  const dx=e.touches[0].clientX-touch.x,dy=e.touches[0].clientY-touch.y;
  if(Math.abs(dy)>16&&Math.abs(dy)>Math.abs(dx)){touch=null;return}
  if(Math.abs(dx)>25&&Math.abs(dx)>Math.abs(dy)*1.8){touch.horizontal=true;e.preventDefault()}
 },{passive:false});
 document.addEventListener('touchend',e=>{
  const start=touch;touch=null;if(!start||!start.horizontal||e.changedTouches.length!==1)return;
  const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
  if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.8||Date.now()-start.time>900)return;
  suppressClickUntil=Date.now()+500;
  if(!safeToLeave())return;remember();history.go(dx>0?-1:1);
 },{passive:true});
 document.addEventListener('touchcancel',()=>{touch=null},{passive:true});
})();

