(()=>{
  async function submit(endpoint,payload){
    let url;try{url=new URL(endpoint)}catch{throw new Error('Receiving service is not configured.')}
    if(url.protocol!=='https:'||url.username||url.password)throw new Error('Receiving service is not configured.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(url.href,{method:'POST',body:payload,credentials:'omit',signal:controller.signal});
      if(!response.ok)throw new Error('Receipt could not be confirmed. Your request has not been cleared from this form.');
      const receipt=await response.json();
      if(receipt.success!==true||typeof receipt.reference!=='string'||!receipt.reference.trim()||receipt.reference.length>100)throw new Error('A valid request reference was not returned. Receipt could not be confirmed.');
      const kind=payload.get('request_kind');
      if(['inquiry','order'].includes(kind))window.dispatchEvent(new CustomEvent('aads:intake-receipt',{detail:{kind}}));
      return {reference:receipt.reference.trim()};
    }catch(error){
      if(error.name==='AbortError')throw new Error('The response timed out. Receipt is uncertain; retry with the same request details.');
      throw error;
    }finally{clearTimeout(timer)}
  }
  window.AADS_INTAKE={submit};
})();
