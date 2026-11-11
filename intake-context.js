// Public integration hooks. Never reads names, email, DOB, messages or files.
(()=>{
  const services=new Set(['ucc-lien-research','ucc-filing-continuations','ucc-lien-monitoring','due-diligence-package','real-estate-package','title-municipal-research','corporate-documents-filings','registered-agent-services','court-litigation-bankruptcy','ofac-sanctions-searches','apostille-legalization','other']);
  const page=/^\/[a-z0-9-]+\.html$/.test(location.pathname)?location.pathname:'/';
  const ids=new Set(window.AADS_CONNECTION_IDS||[]);
  const params=new URLSearchParams(location.search),content=ids.has(params.get('source_content_id'))?params.get('source_content_id'):'';
  let sourcePage=page;try{const ref=new URL(document.referrer);if(ref.origin===location.origin&&/^\/[a-z0-9-]+\.html$/.test(ref.pathname))sourcePage=ref.pathname;}catch{}
  function track(event,extra={}){
    const data={event,page,...extra};
    window.dispatchEvent(new CustomEvent('aads:analytics',{detail:data}));
    if(typeof window.AADS_TRACKER==='function'){try{window.AADS_TRACKER(data);}catch{}}
  }
  window.addEventListener('aads:media',event=>{
    if(window.AADS_CONFIG?.media?.enabled!==true)return;
    const d=event.detail;
    if(!d||!ids.has(d.episode)||!/^episode-[a-z0-9-]+$/.test(d.episode)||!['video','audio'].includes(d.kind)||!['native','youtube'].includes(d.provider)||!['started','progress','completed'].includes(d.action))return;
    if(d.action==='progress'&&![25,50,75].includes(d.percent))return;
    track(d.kind+'_'+d.action,{episode:d.episode,provider:d.provider,...(d.action==='progress'?{percent:d.percent}:{})});
  });
  for(const form of document.querySelectorAll('#contact-form,#order-form')){
    const kind=form.id==='contact-form'?'inquiry':'order';let started=false;
    form.addEventListener('input',()=>{if(!started){started=true;track('intake_started',{kind});}},{passive:true});
    form.addEventListener('formdata',event=>{event.formData.set('source_page',sourcePage);if(content)event.formData.set('source_content_id',content);});
  }
  window.addEventListener('aads:intake-receipt',event=>{const kind=event.detail?.kind;if(['inquiry','order'].includes(kind))track('intake_received',{kind});});
  document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;let u;try{u=new URL(link.href);}catch{return;}
    if(u.origin!==location.origin)return;
    const service=u.searchParams.get('service');
    if(services.has(service))track('service_selected',{service});
    if(u.pathname.endsWith('/place-an-order.html'))track('order_opened');
    if(u.pathname.includes('/episode-'))track('episode_opened');
    if(link.dataset.event==='request')track('inquiry_opened');
  });
})();
