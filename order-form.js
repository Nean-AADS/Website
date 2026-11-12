(()=>{

const form=document.querySelector('#order-form'), service=document.querySelector('#service'), review=document.querySelector('#request-review'), list=document.querySelector('#summary-list');
const panels=['entity','filing','ucc','corporate','property','international','ofac','court','other'];
const groups={'ucc-filing-continuations':['entity','filing'],'due-diligence-package':['entity','ucc'],'real-estate-package':['property'],'ucc-lien-research':['entity','ucc'],'corporate-documents-filings':['entity','corporate'],'title-municipal-research':['property'],'apostille-legalization':['international'],'ofac-sanctions-searches':['ofac'],'registered-agent-services':['entity','corporate'],'court-litigation-bankruptcy':['court'],'other':['other']};
const dueDefaults=['State UCC search','State tax lien search','State judgment lien search','County UCC / fixture filing search','County tax lien search','County judgment lien search','Federal district court civil litigation','County civil litigation','Bankruptcy search','Certificate of good standing'];
const propertyDefaults=['Current owner title search (ownership & encumbrance)','Recording of documents','Municipal lien search'];
// Individual identifiers apply only when criminal research for people is included.
const criminalIntake=document.querySelector('#criminal-individual-intake');
const criminalInclude=document.querySelector('#court-criminal-individuals');
const criminalSubjects=document.querySelector('#criminal-subjects');
const criminalList=document.querySelector('#criminal-subject-list');
const criminalTemplate=document.querySelector('#criminal-subject-template');
function updateCriminalRows(){
 const rows=[...criminalList.querySelectorAll('.criminal-subject')];
 const today=new Date();
 const latestDob=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 rows.forEach((row,index)=>{
  const number=index+1;row.querySelector('legend').textContent='Individual '+number;
  for(const key of ['name','dob','aliases']){
   const input=row.querySelector('[data-criminal-'+key+']');
   input.id=input.name='criminal-subject-'+number+'-'+key;
   row.querySelector('[data-criminal-'+key+'-label]').htmlFor=input.id;
   if(key==='dob')input.max=latestDob;
  }
  const remove=row.querySelector('[data-remove-criminal]');
  remove.hidden=rows.length===1;remove.setAttribute('aria-label','Remove individual '+number);
 });
}
function syncCriminalSubjects(){
 const uccCriminal=(groups[service.value]||[]).includes('ucc')&&!!form.querySelector('#ucc-panel input[value="Federal district court criminal search"]:checked');
 const available=service.value==='court-litigation-bankruptcy'||uccCriminal;
 criminalIntake.hidden=!available;criminalInclude.disabled=!available;
 const active=available&&criminalInclude.checked;
 criminalSubjects.hidden=!active;criminalSubjects.disabled=!active;
}
criminalInclude.addEventListener('change',()=>{syncCriminalSubjects();review.hidden=true});
form.querySelector('#ucc-panel input[value="Federal district court criminal search"]').addEventListener('change',()=>{syncCriminalSubjects();review.hidden=true});
document.querySelector('#add-criminal-subject').addEventListener('click',()=>{
 criminalList.append(criminalTemplate.content.cloneNode(true));updateCriminalRows();review.hidden=true;
 criminalList.lastElementChild.querySelector('[data-criminal-name]').focus();
});
criminalList.addEventListener('click',event=>{
 const remove=event.target.closest('[data-remove-criminal]');
 if(!remove||criminalList.children.length===1)return;
 remove.closest('.criminal-subject').remove();updateCriminalRows();review.hidden=true;
 criminalList.lastElementChild.querySelector('[data-criminal-name]').focus();
});
criminalList.addEventListener('input',event=>{
 if(event.target.matches('[data-criminal-name]'))event.target.setCustomValidity(event.target.value.trim()?'':'Enter the full legal name.');
});
updateCriminalRows();
function syncService(){const active=groups[service.value]||[];panels.forEach(key=>{const panel=document.querySelector('#'+key+'-panel');panel.hidden=!active.includes(key);panel.disabled=panel.hidden});if(service.value==='due-diligence-package')document.querySelectorAll('[name="research-components"]').forEach(c=>{c.checked=dueDefaults.includes(c.value)});if(service.value==='registered-agent-services')document.querySelectorAll('[name="corporate-components"]').forEach(c=>{c.checked=c.value==='Registered agent appointment / change coordination'});if(service.value==='real-estate-package')document.querySelectorAll('[name="property-components"]').forEach(c=>{c.checked=propertyDefaults.includes(c.value)});document.querySelector('#ucc-hint').textContent=service.value==='due-diligence-package'?'The package components are selected below. Adjust them to match your matter; the final scope will be confirmed.':'Select the research, filings or supporting records needed.';syncCriminalSubjects();review.hidden=true;}
const params=new URLSearchParams(window.location.search);const requested=params.get('service');if(requested&&[...service.options].some(o=>o.value===requested))service.value=requested;if(params.get('request')==='quote')document.querySelector('#request-type').value='Request a quote';
service.addEventListener('change',syncService);syncService();
if(service.value==='corporate-documents-filings'&&params.get('corporate_request')==='publication')document.querySelector('#corporate-publication').checked=true;
const uploads=document.querySelector('#attachments'),error=document.querySelector('#file-error');
function checkFiles(){const files=[...uploads.files],bad=files.length>5||files.some(f=>f.size>10*1024*1024)||files.reduce((sum,f)=>sum+f.size,0)>25*1024*1024||files.some(f=>!/\.(pdf|docx?|xlsx?|csv|jpe?g|png|tiff?)$/i.test(f.name));error.hidden=!bad;error.textContent=bad?'Choose up to 5 supported files, no more than 10 MB each and 25 MB total.':'';uploads.setCustomValidity(bad?error.textContent:'');document.querySelector('#file-list').replaceChildren();files.forEach(f=>{const li=document.createElement('li');li.textContent=f.name+' ('+(f.size/1024/1024).toFixed(2)+' MB)';document.querySelector('#file-list').append(li)});return !bad;}
uploads.addEventListener('change',()=>{checkFiles();review.hidden=true});
form.addEventListener('input',()=>{review.hidden=true});
document.querySelector('#review-button').addEventListener('click',()=>{checkFiles();if(!form.reportValidity())return;list.replaceChildren();const data=new FormData(form);for(const name of new Set(data.keys())){if(['source_page','source_content_id','form_started_at','bot-field','privacy-consent','cf-turnstile-response'].includes(name))continue;let values=data.getAll(name);if(name==='attachments'){values=[...uploads.files].map(f=>f.name)}else{values=values.filter(v=>typeof v==='string'&&v.trim())}if(!values.length)continue;const el=form.elements.namedItem(name);let label=name;if(name==='service'){values=[service.options[service.selectedIndex].text];label='Service or package'}else if(name==='research-components')label='Research components';else if(name==='corporate-components')label='Corporate requests';else if(name==='property-components')label='Property components';else if(name==='attachments')label='Attachments';else if(name==='rush')label='Rush handling';else if(el&&el.id){const l=document.querySelector('label[for="'+el.id+'"]');if(l)label=l.textContent.replace('*','').trim();const individual=el.closest('.criminal-subject');if(individual)label=individual.querySelector('legend').textContent+' — '+label}const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=values.join('\n');list.append(dt,dd)}review.hidden=false;review.scrollIntoView({block:'start'});});
document.querySelector('#edit-button').addEventListener('click',()=>{review.hidden=true;service.focus();service.scrollIntoView({block:'center'})});
const orderConfig=window.AADS_CONFIG?.order||{mode:'disabled',endpoint:''};
const sendingEnabled=orderConfig.mode==='endpoint'&&/^https:\/\//i.test(orderConfig.endpoint)&&!!window.AADS_INTAKE;
const submitButton=document.querySelector('#submit-button'),orderStatus=document.querySelector('#order-status');
let sending=false;
let requestToken=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
if(sendingEnabled){submitButton.disabled=false;submitButton.textContent='Submit Your Order';document.querySelector('#order-setup').hidden=true;document.querySelector('#order-setup-note').hidden=true;document.querySelector('.review-note').textContent='Review the details before submitting.';document.querySelector('#attachments').nextElementSibling.textContent='Up to 5 files. Maximum 10 MB per file and 25 MB total.';}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(sending)return;orderStatus.hidden=false;
 if(!sendingEnabled){orderStatus.textContent='Order submissions are not connected. No order has been sent.';return;}
 if(!checkFiles()||!form.reportValidity())return;
 sending=true;submitButton.disabled=true;submitButton.textContent='Sending…';orderStatus.textContent='';
 try{const payload=new FormData(form);payload.set('request_kind','order');payload.set('client_request_id',requestToken);const receipt=await window.AADS_INTAKE.submit(orderConfig.endpoint,payload);orderStatus.textContent='Your request has been received. Reference: '+receipt.reference+'. AADS will confirm scope, fees and anticipated timing before work begins.';form.reset();syncService();requestToken=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);document.querySelector('#file-list').replaceChildren();review.hidden=true;orderStatus.scrollIntoView({block:'center'});}
 catch(problem){orderStatus.textContent=problem.message||'Receipt could not be confirmed. Your request details remain in this form.';if(problem&&problem.field)form.dispatchEvent(new CustomEvent('aads:server-field-error',{detail:{field:problem.field,message:problem.message}}));}
 finally{sending=false;submitButton.disabled=false;submitButton.textContent='Submit Your Order';}
});

})();
