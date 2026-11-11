(() => {
  const input=document.getElementById('state-search');
  const entries=[...document.querySelectorAll('.state-entry')];
  if(!input)return;
  const count=document.getElementById('state-count');
  const empty=document.getElementById('state-empty');
  const filter=()=>{
    const query=input.value.trim().toLowerCase();let visible=0;
    for(const entry of entries){
      const match=!query||entry.dataset.state.includes(query)||entry.dataset.code.toLowerCase()===query;
      entry.hidden=!match;if(match)visible++;
    }
    count.textContent=visible===50?'Showing all 50 states.':`Showing ${visible} of 50 states.`;
    empty.hidden=visible>0;
  };
  input.addEventListener('input',filter);
  document.getElementById('state-clear').addEventListener('click',()=>{input.value='';filter();input.focus();});
  const reveal=()=>{
    const id=decodeURIComponent(location.hash.slice(1));
    const target=entries.find(entry=>entry.id===id);
    if(!target)return;
    input.value='';filter();target.open=true;
    target.scrollIntoView({behavior:'instant',block:'start'});
  };
  window.addEventListener('hashchange',reveal);reveal();
})();
