// Show only features verified in the connected secure portal.
(()=>{
 const c=window.AADS_CONFIG?.clientPortal;let u;
 try{u=new URL(c?.url);if(c?.enabled!==true||u.protocol!=='https:'||u.username||u.password)return;}catch{return;}
 const features={status:['Request status','Check the current status and next steps for your requests.'],documents:['Secure documents','Access documents shared with your authorized account.'],history:['Request history','Find previous requests available to your account.'],approvals:['Scope and approvals','Review requests for scope or fee approval.'],invoices:['Invoices','View invoices made available to your account.']};
 const list=document.querySelector('#client-features');
 for(const key of new Set(c.features||[])){if(!features[key])continue;const card=document.createElement('li'),h=document.createElement('h2'),p=document.createElement('p');h.textContent=features[key][0];p.textContent=features[key][1];card.className='connection-card';card.append(h,p);list.append(card);}
 const link=document.querySelector('#secure-client-login');link.href=u.href;link.hidden=false;
 document.querySelector('#client-access-status').textContent='Sign in to the secure client portal using the account details provided by AADS. Access is limited to the requests and documents your account is authorized to view.';
})();
