/* Site motion layer (Motion for JavaScript, vendor/motion.min.js).
   Decorative only: every element is fully visible and usable without this file,
   and nothing animates for visitors who ask for reduced motion. */
(()=>{
  const header=document.querySelector('.site-header');
  if(header){
    const onScroll=()=>header.classList.toggle('is-scrolled',window.scrollY>8);
    onScroll();window.addEventListener('scroll',onScroll,{passive:true});
  }

  const M=window.Motion;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(!M||!M.animate||reduce.matches)return;
  const {animate,inView,stagger,scroll}=M;
  const ease=[0.22,1,0.36,1];
  // Only animate things that start below the fold and are actually rendered (not in closed or hidden containers).
  const below=el=>!el.closest('details:not([open]),[hidden]')&&el.getClientRects().length>0&&el.getBoundingClientRect().top>window.innerHeight*0.92;
  const target=a=>a instanceof Element?a:a&&a.target;

  // 1) Scroll reveals: groups of cards rise in with a short stagger.
  const groups=['.knowledge-grid','.package-grid','.connection-grid','.deliverable-grid','.blog-grid','.process-grid','.expectation-grid','.proof-grid','.audience-routes','.ucc-paths','.email-preview-grid','.service-shortcuts','.content-columns'];
  const done=new WeakSet();
  document.querySelectorAll(groups.join(',')).forEach(group=>{
    const items=[...group.children].filter(c=>c.nodeType===1&&!c.matches('script,template,[hidden]'));
    if(!items.length||!below(group))return;
    items.forEach(i=>{i.style.opacity='0';done.add(i)});
    inView(group,()=>{
      animate(items,{opacity:[0,1],y:[24,0]},{duration:.6,ease,delay:stagger(.07,{startDelay:.05})})
        .then?.(()=>items.forEach(i=>{i.style.transform='';i.style.opacity=''}));
    },{amount:0.12,margin:'0px 0px -8% 0px'});
  });

  // 2) Section headings, intros and stand-alone panels fade up once.
  const singles='main h2.center,.section-intro,.split>*,.blue-band,.connection-panel,.article-cta,.answer-box,.contact-form-panel,.contact-panel,.package-card,.order-page form .step,.experience-trust-intro,.state-hub-intro';
  document.querySelectorAll(singles).forEach(el=>{
    if(done.has(el)||!below(el))return;done.add(el);
    el.style.opacity='0';
    inView(el,()=>{animate(el,{opacity:[0,1],y:[20,0]},{duration:.65,ease}).then?.(()=>{el.style.transform='';el.style.opacity=''});},{amount:0.2});
  });

  // 3) Homepage hero artwork settles in on load.
  const art=document.querySelector('.home-light .hero-art');
  if(art)animate(art,{opacity:[0,1],scale:[.96,1],y:[12,0]},{duration:.9,ease,delay:.1});
  const heroCopy=document.querySelectorAll('.home-light .hero-copy>*');
  if(heroCopy.length)animate(heroCopy,{opacity:[0,1],y:[14,0]},{duration:.6,ease,delay:stagger(.06)});
  const insideHero=document.querySelectorAll('.inside-hero>*');
  if(insideHero.length)animate(insideHero,{opacity:[0,1],y:[12,0]},{duration:.55,ease,delay:stagger(.05)});

  // 4) Smooth open/close for accordions and FAQ answers (native <details> keeps working without JS).
  document.querySelectorAll('details:not(.services-menu)').forEach(d=>{
    const summary=d.querySelector(':scope>summary');if(!summary)return;
    let running=null;
    summary.addEventListener('click',e=>{
      if(e.defaultPrevented)return;
      e.preventDefault();
      running?.stop?.();
      const start=d.offsetHeight;
      d.style.overflow='hidden';
      if(!d.open){
        d.open=true;
        const end=d.scrollHeight;
        running=animate(d,{height:[start+'px',end+'px']},{duration:.35,ease});
      }else{
        const end=summary.offsetHeight+(parseFloat(getComputedStyle(d).borderBottomWidth)||0);
        running=animate(d,{height:[start+'px',end+'px']},{duration:.28,ease:[.4,0,.2,1]});
        running.then?.(()=>{if(running)d.open=false;});
      }
      running.then?.(()=>{d.style.height='';d.style.overflow='';running=null;});
    });
  });

  // 5) Reading progress bar on long reading pages.
  const reading=document.querySelector('main.reading-page');
  if(reading&&scroll&&document.documentElement.scrollHeight>window.innerHeight*2.2){
    const bar=document.createElement('div');bar.className='read-progress';bar.setAttribute('aria-hidden','true');document.body.append(bar);
    scroll(animate(bar,{scaleX:[0,1]},{ease:'linear'}));
  }

  // 6) Services dropdown panel eases in.
  const services=document.querySelector('#services-menu');
  if(services)services.addEventListener('toggle',()=>{
    if(services.open&&matchMedia('(min-width:1181px)').matches){
      const panel=services.querySelector('.services-panel');
      if(panel)animate(panel,{opacity:[0,1]},{duration:.2,ease});
    }
  });
})();
