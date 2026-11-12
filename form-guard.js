/* Form protection and accessible validation for #contact-form and #order-form.
   - Records when the form was opened (server rejects instant bot submissions).
   - Renders Cloudflare Turnstile when a site key is configured.
   - Adds length limits that match the server.
   - Shows each validation message next to its field, linked with aria-describedby.
   No personal data is read or sent by this file. */
(()=>{
  const forms=[...document.querySelectorAll('#contact-form,#order-form')];
  if(!forms.length)return;
  const cfg=window.AADS_CONFIG||{};
  const limits={email:254,'billing-email':254,phone:40,name:120,'first-name':80,'last-name':80,company:200};

  function hidden(form,name,value){let i=form.querySelector('input[type="hidden"][name="'+name+'"]');if(!i){i=document.createElement('input');i.type='hidden';i.name=name;form.prepend(i);}i.value=value;return i;}
  function errorFor(field){
    const id=(field.id||field.name)+'-error';let el=document.getElementById(id);
    if(!el){el=document.createElement('p');el.id=id;el.className='field-error';el.hidden=true;
      const anchor=field.type==='checkbox'||field.type==='radio'?(field.closest('.consent-field,fieldset,label')||field):field;
      anchor.insertAdjacentElement('afterend',el);}
    const ids=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);
    if(!ids.includes(id)){ids.push(id);field.setAttribute('aria-describedby',ids.join(' '));}
    return el;
  }
  function message(field){
    const v=field.validity;
    if(v.valueMissing){
      if(field.type==='checkbox')return field.name==='privacy-consent'?'Please confirm you have read the Privacy Notice.':'Please check this box to continue.';
      if(field.tagName==='SELECT')return 'Please choose an option.';
      return 'This field is required.';
    }
    if(v.typeMismatch&&field.type==='email')return 'Enter a valid email address, for example name@company.com.';
    if(v.tooLong)return 'Please shorten this entry.';
    if(v.rangeOverflow&&field.type==='date')return 'Enter a date that is not in the future.';
    if(v.patternMismatch&&field.type==='tel')return 'Enter a valid phone number.';
    return field.validationMessage;
  }
  function show(field,text){const el=errorFor(field);el.textContent=text;el.hidden=!text;if(text)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');}
  function check(field){if(!field.willValidate)return true;const ok=field.checkValidity();show(field,ok?'':message(field));return ok;}

  forms.forEach(form=>{
    const started=hidden(form,'form_started_at',String(Date.now()));
    form.addEventListener('reset',()=>{setTimeout(()=>{started.value=String(Date.now());form.querySelectorAll('[aria-invalid]').forEach(f=>show(f,''));window.turnstile?.reset?.();},0)});

    // Length limits matching the server; never shorten an existing limit.
    form.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=date]),textarea').forEach(f=>{
      if(f.maxLength>0)return;f.maxLength=f.tagName==='TEXTAREA'?5000:(limits[f.name]||(/^criminal-subject-\d+-name$/.test(f.name)?120:500));
    });
    form.querySelectorAll('input[type=tel]').forEach(f=>{if(!f.pattern)f.pattern='[0-9+()\\-. xXextEXT]{7,40}'});

    // Inline messages: shown when the browser flags a field, cleared as soon as it is fixed.
    form.addEventListener('invalid',e=>{show(e.target,message(e.target));},true);
    form.addEventListener('input',e=>{if(e.target.getAttribute('aria-invalid')==='true')check(e.target);});
    form.addEventListener('change',e=>{if(e.target.getAttribute('aria-invalid')==='true')check(e.target);});
    form.addEventListener('focusout',e=>{const f=e.target;if(f.matches?.('input,select,textarea')&&f.value&&f.type!=='file')check(f);});

    // Server-side rejection of one field: point the visitor to it.
    form.addEventListener('aads:server-field-error',e=>{
      const name=e.detail?.field;if(!name)return;
      const field=form.elements.namedItem(name);const el=field&&(field.length&&!field.tagName?field[0]:field);
      if(el&&el.focus){show(el,e.detail.message||'Please check this entry.');el.focus();}
    });
  });

  // Cloudflare Turnstile (only when a site key is configured).
  const siteKey=cfg.turnstile?.siteKey;
  if(typeof siteKey==='string'&&/^[0-9A-Za-z_-]{10,100}$/.test(siteKey)){
    forms.forEach(form=>{
      const box=document.createElement('div');box.className='turnstile-box';
      const widget=document.createElement('div');widget.className='cf-turnstile';widget.dataset.sitekey=siteKey;widget.dataset.theme='light';widget.dataset.size='flexible';
      box.append(widget);const submit=form.querySelector('button[type=submit],#submit-button');(submit?.parentElement===form?submit:form.lastElementChild).before(box);
    });
    const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js';s.async=true;s.defer=true;document.head.append(s);
  }
})();
