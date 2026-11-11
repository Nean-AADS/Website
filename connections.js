(()=>{
  const filter=document.querySelector('#episode-topic');
  if(filter)filter.addEventListener('change',()=>{let count=0;document.querySelectorAll('[data-topic]').forEach(card=>{card.hidden=!!filter.value&&card.dataset.topic!==filter.value;if(!card.hidden)count++;});document.querySelector('#episode-count').textContent=count+' episode'+(count===1?'':'s');});
})();
