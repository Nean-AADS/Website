/* Native disclosure navigation with keyboard, focus and outside-click handling. */
(()=>{
const menu=document.querySelector('#menu'),nav=document.querySelector('#navigation'),services=document.querySelector('#services-menu');if(!menu||!nav)return;
function closeServices(focus=false){if(!services)return;services.open=false;if(focus)services.querySelector('summary').focus()}
function closeMenu(focus=false){closeServices();nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');if(focus)menu.focus()}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');if(!open)closeServices()});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu()));
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(services?.open){event.preventDefault();closeServices(true)}else if(nav.classList.contains('open')){event.preventDefault();closeMenu(true)}});
document.addEventListener('pointerdown',event=>{if(services?.open&&!services.contains(event.target))closeServices();if(nav.classList.contains('open')&&!nav.contains(event.target)&&!menu.contains(event.target))closeMenu()});
document.addEventListener('focusin',event=>{if(services?.open&&!services.contains(event.target))closeServices();if(nav.classList.contains('open')&&!nav.contains(event.target)&&!menu.contains(event.target))closeMenu()});
matchMedia('(min-width:1181px)').addEventListener('change',event=>{if(event.matches)closeMenu()});
})();

const form=document.querySelector('#contact-form');
if(form){
const status=document.querySelector('#form-status');
const submit=form.querySelector('button[type="submit"]');
const note=form.querySelector('.form-note');
const contact=(window.AADS_CONFIG&&window.AADS_CONFIG.contact)||{mode:'disabled',endpoint:''};
const enabled=contact.mode==='netlify'||(contact.mode==='endpoint'&&/^https:\/\//i.test(contact.endpoint)&&!!window.AADS_INTAKE);
submit.disabled=!enabled;
if(enabled){submit.textContent='Send Your Request';note.textContent='By submitting, you ask AADS to contact you about this inquiry. Please do not include sensitive personal information.';}
let sendingInquiry=false;
let inquiryToken=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
form.addEventListener('submit',async e=>{
  e.preventDefault();if(sendingInquiry)return;status.hidden=false;
  if(!enabled){status.textContent='This form is not connected. No inquiry has been sent or saved.';return;}
  if(form.elements['bot-field'].value){status.textContent='Unable to send this inquiry.';return;}
  if(contact.mode==='netlify'&&location.protocol==='file:'){status.textContent='Netlify submissions must be tested on the deployed Netlify site.';return;}
  sendingInquiry=true;submit.disabled=true;submit.textContent='Sending…';status.textContent='';
  try{
    if(contact.mode==='endpoint'){
      const payload=new FormData(form);payload.set('request_kind','inquiry');payload.set('client_request_id',inquiryToken);
      const receipt=await window.AADS_INTAKE.submit(contact.endpoint,payload);
      status.textContent='Your inquiry has been received. Reference: '+receipt.reference+'.';
    }else{
      const body=new URLSearchParams(new FormData(form));
      const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),credentials:'omit'});
      if(!response.ok)throw new Error('not accepted');
      status.textContent='Thank you. Your inquiry has been received.';
    }
    form.reset();inquiryToken=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }catch(error){status.textContent='Your inquiry could not be confirmed. Your entered details remain in this form.';}
  finally{sendingInquiry=false;submit.disabled=false;submit.textContent='Send Your Request';}
});

const requestedService=new URLSearchParams(window.location.search).get("service");
if(requestedService&&form.elements.service&&[...form.elements.service.options].some(o=>o.value===requestedService)) form.elements.service.value=requestedService;
}
// Local event hook only. No analytics service is installed or data sent by this hook.
document.querySelectorAll("[data-event]").forEach(a=>a.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("aads:request-click",{detail:{page:window.location.pathname,destination:a.getAttribute("href")}}))));

// Archive search is handled by blog-search.js.

// Open a directly linked FAQ answer while keeping all answers readable without JavaScript.
if(location.hash.startsWith('#faq-')){const answer=document.getElementById(location.hash.slice(1));if(answer&&answer.tagName==='DETAILS')answer.open=true;}
