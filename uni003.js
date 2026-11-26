(() => {
  function mount() {
    if (document.getElementById('uni003-top')) return;
    const arrow = document.createElement('button');
    arrow.id = 'uni003-top';
    arrow.type = 'button';
    arrow.hidden = true;
    arrow.setAttribute('aria-label', 'Back to top');
    arrow.innerHTML = '<svg aria-hidden="true" viewBox="0 0 32 42" width="22" height="29" fill="currentColor"><path d="M2 16 16 0 30 16H21V28H11V16Z"/><rect x="11" y="31" width="10" height="3" rx="1.5"/><rect x="11" y="37" width="10" height="3" rx="1.5"/></svg>';
    const style = document.createElement('style');
    style.textContent = `
      #uni003-top { position:fixed!important; inset:auto auto calc(16px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))!important; z-index:100; box-sizing:border-box; width:44px; height:44px; display:grid; place-items:center; padding:0; margin:0; border:0; background:transparent; box-shadow:none; color:#527057; cursor:pointer }
      #uni003-top[hidden],button.uni-top,#benji-green-up,#go-top.up,#benji-up,#z-back-top,button.back-to-top,button#back-to-top,button[aria-label="Back to top"]:not(#uni003-top) { display:none!important }
    `;
    document.head.append(style);
    document.body.append(arrow);
    let scroller = window;
    function update() {
      if (scroller !== window && (!scroller.isConnected || !scroller.getClientRects().length)) scroller = window;
      if (scroller !== window && scroller.scrollTop <= 1 && window.scrollY > 1) scroller = window;
      arrow.hidden = (scroller === window ? window.scrollY : scroller.scrollTop) <= 1;
    }
    document.addEventListener('scroll', event => {
      const target = event.target;
      if (target === document) scroller = window;
      else if (target instanceof HTMLElement && target.clientHeight >= Math.min(240,innerHeight/2)
          && target.scrollHeight > target.clientHeight && !target.matches('textarea,input,select')) scroller = target;
      update();
    }, {capture:true, passive:true});
    arrow.addEventListener('click', () => scroller.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
    for (const name of ['pageshow','resize','hashchange','popstate']) window.addEventListener(name, update);
    new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
