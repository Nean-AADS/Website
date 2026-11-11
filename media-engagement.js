// Playback position milestones, not a claim of full watch time. No titles, URLs or form data.
(()=>{
  const enabled=()=>window.AADS_CONFIG?.media?.enabled===true;
  const ids=new Set(window.AADS_CONNECTION_IDS||[]);
  function observer(el,kind,provider){
    const episode=el.dataset.aadsEpisode;
    if(!ids.has(episode)||!/^episode-[a-z0-9-]+$/.test(episode))return null;
    let started=false,ended=false,last=0;const seen=new Set();
    function emit(action,percent){if(enabled())window.dispatchEvent(new CustomEvent('aads:media',{detail:{episode,kind,provider,action,...(percent?{percent}:{})}}));}
    return {
      start(t){last=Number(t)||0;if(enabled()&&!started){started=true;emit('started');}},
      reset(t){last=Number(t)||0;},
      progress(t,d){if(!enabled()||!started||!Number.isFinite(d)||d<=0)return;const now=Number(t);if(!Number.isFinite(now))return;
        if(now>=last&&now-last<=5)for(const p of [25,50,75])if(last<d*p/100&&now>=d*p/100&&!seen.has(p)){seen.add(p);emit('progress',p);}
        last=now;
      },
      end(){if(enabled()&&started&&!ended){ended=true;emit('completed');}}
    };
  }
  for(const el of document.querySelectorAll('video[data-aads-episode],audio[data-aads-episode]')){
    const o=observer(el,el.tagName.toLowerCase(),'native');if(!o)continue;
    el.addEventListener('play',()=>o.start(el.currentTime));
    el.addEventListener('seeked',()=>o.reset(el.currentTime));
    el.addEventListener('timeupdate',()=>{if(!el.paused&&!el.seeking)o.progress(el.currentTime,el.duration);});
    el.addEventListener('ended',()=>o.end());
  }
  const frames=[...document.querySelectorAll('iframe[data-aads-provider="youtube"]')];
  if(!enabled()||window.AADS_CONFIG?.media?.youtubeTrackingEnabled!==true||!frames.length)return;
  function attach(){for(const frame of frames){
    const o=observer(frame,'video','youtube');if(!o)continue;
    try{const u=new URL(frame.src);if(!['www.youtube-nocookie.com','www.youtube.com'].includes(u.hostname)||!/^\/embed\/[a-zA-Z0-9_-]{11}$/.test(u.pathname))continue;
      u.searchParams.set('enablejsapi','1');u.searchParams.set('origin',location.origin);frame.src=u.href;
      let timer;new window.YT.Player(frame,{events:{onStateChange(e){clearInterval(timer);
        if(e.data===1){o.start(e.target.getCurrentTime());timer=setInterval(()=>o.progress(e.target.getCurrentTime(),e.target.getDuration()),1000);}
        if(e.data===0)o.end();
      }}});
      window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
    }catch{}
  }}
  if(window.YT?.Player)attach();else{
    const previous=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{try{if(typeof previous==='function')previous();}finally{attach();}};
    if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.append(script);}
  }
})();
