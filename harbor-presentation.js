/* Havnekaptajnen: presentation only. No game, account or economy writes. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HarborPresentation = api;
})(typeof window === 'object' ? window : globalThis, function (win) {
  'use strict';
  const paths = {
    anchor:'<circle cx="16" cy="7" r="3"/><path d="M16 10v17M10 14h12M5 20c0 9 22 9 22 0M5 20l-2 4m2-4 4 2m18-2 2 4m-2-4-4 2"/>',
    tools:'<path d="m7 4 7 7-3 3-7-7v7l6 4 14 11 5-5-11-14-4-6zM23 4l5 5M25 6 7 25l-3 3"/>',
    compass:'<circle cx="16" cy="16" r="12"/><path d="m21 10-3 8-8 4 4-9zM16 4V2m12 14h2M16 28v2M4 16H2"/>',
    growth:'<path d="M5 27V17h6v10m4 0V11h6v16m4 0V5h4v22M4 11 14 5l6 1 9-5"/>',
    crate:'<path d="m4 9 12-6 12 6v17H4zM4 10l12 5 12-5M16 15v11M7 15v7m18-7v7M10 6l12 6"/>',
    book:'<path d="M16 7C12 3 5 4 3 5v22c5-2 9-2 13 0 4-2 8-2 13 0V5c-2-1-9-2-13 2v20M7 10h5m-5 5h5m8-5h5m-5 5h5"/>',
    land:'<path d="m3 20 7-4 5 3 8-6 6 6-12 9zM10 16V9m-3 2 3-6 3 6M23 13V6m-4 3 4-7 4 7"/>',
    home:'<path d="m3 15 13-11 13 11M7 12v16h18V12M13 28v-9h6v9"/>',
    log:'<path d="m6 18 15-12c6-2 11 5 7 9L13 27M8 14l15-5M11 18l15-5"/><ellipse cx="8" cy="23" rx="6" ry="5"/><ellipse cx="8" cy="23" rx="2" ry="2"/>',
    plank:'<path d="m3 12 17-8 9 6-17 8zM3 17l9 6 17-8M3 22l9 6 17-8M8 13l16-7"/>',
    fish:'<path d="M5 16C10 6 22 6 26 16c-4 10-16 10-21 0zM5 16l-3-6v12zM19 9c-4 4-4 10 0 14M13 8l2-4 4 4"/><circle cx="22" cy="15" r="1"/>',
    coffee:'<path d="M5 13h18v7a9 9 0 0 1-18 0zM23 14h3a4 4 0 0 1 0 8h-3M3 29h24M10 9c-5-4 5-4 0-8m7 8c-5-4 5-4 0-8"/>',
    flag:'<path d="M7 29V3m0 1c6-5 12 6 19 1v15c-7 5-13-6-19-1"/>',
    clock:'<circle cx="16" cy="17" r="12"/><path d="M16 9v8l6 3M12 2h8"/>',
    paint:'<path d="m9 21 12-15c3-3 8 1 5 4L13 24M9 21c-5-1-4 6-7 7 10 2 13-2 7-7z"/>',
    back:'<path d="M27 16H5m9-9-9 9 9 9"/>',
    coin:'<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="8"/><path d="M16 10v12m-4-9h8m-8 6h8"/>',
    check:'<path d="m6 16 7 7L27 8"/>',
    sun:'<circle cx="16" cy="16" r="6"/><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3"/>',
    close:'<path d="m8 8 16 16M24 8 8 24"/>'
  };
  function icon(name) {
    return '<svg class="harbor-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[name]||paths.crate)+'</svg>';
  }
  function escape(value) {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function jobList(jobs, now) {
    return Object.entries(jobs||{}).filter(([,j])=>j&&Number.isFinite(j.readyAt)).map(([id,j])=>({id,recipe:j.recipe,out:j.out??2,readyAt:j.readyAt,ready:j.readyAt<=now})).sort((a,b)=>a.readyAt-b.readyAt||a.id.localeCompare(b.id));
  }
  function overview({jobs, now, names, goods, boat, voyage, claimed, chapter}) {
    const list=jobList(jobs,now),ready=list.filter(j=>j.ready).length;
    const rows=list.map(j=>'<button class="harbor-agenda-row" data-act="world-open" data-val="'+escape(j.id)+'" data-agenda-job="'+j.readyAt+'"><span class="agenda-job-icon">'+icon(j.recipe==='wood'?'log':j.recipe==='plank'?'plank':j.recipe==='fish'?'fish':'crate')+'</span><span><b>'+escape(names[j.id]||j.id)+'</b><small>'+escape(j.out+' '+(goods[j.recipe]?.name||j.recipe))+'</small></span><span class="agenda-time"><span data-countdown="'+j.readyAt+'"></span><small data-job-label>'+ (j.ready?'Klar til afhentning':'Arbejder')+'</small></span></button>').join('');
    return '<aside class="world-drawer island-drawer harbor-agenda"><button class="drawer-close" data-act="world-close" aria-label="Luk havneoverblik">'+icon('close')+'</button><div class="agenda-heading">'+icon('sun')+'<span class="eyebrow">DIT LIV VED VANDET</span><h2>Havnen lige nu</h2><p>En fangst. Et nyt bræt. En større drøm.</p></div><div class="agenda-summary"><strong data-ready-count>'+ready+'</strong><span>produktioner klar til dig<small>Du bestemmer tempoet.</small></span></div><h3>Der arbejdes i havnen</h3><div class="agenda-jobs">'+(rows||'<p class="agenda-empty">Vælg et værksted herunder og sæt havnen i gang. Arbejdet fortsætter, mens spillet er lukket.</p>')+'</div><h3>Fra strand til nye horisonter</h3><div class="agenda-chain"><button data-act="world-open" data-val="shore">'+icon('log')+'<b>1. Saml</b><small>Drivtømmer</small></button><button data-act="world-open" data-val="workshop">'+icon('plank')+'<b>2. Forarbejd</b><small>Lav planker</small></button><button data-act="tab" data-val="oehav">'+icon('compass')+'<b>3. Udforsk</b><small>Find nye øer</small></button></div><div class="agenda-boat"><div class="agenda-boat-art">'+(boat.art||'<img src="./'+escape(boat.file)+'" alt="" width="110" height="85">')+'</div><div><small>DIN AKTIVE BÅD</small><b>'+escape(boat.name)+'</b><span>'+escape(boat.capacity)+' kasser · '+escape(boat.seaworthiness)+' i søstyrke</span></div></div><p class="agenda-voyage">'+(voyage?'<span data-countdown="'+voyage.readyAt+'"></span> · din tur gennem øhavet':'Båden ligger ved kajen og venter på næste eventyr.')+'</p><button class="btn primary agenda-next" data-act="'+(claimed<12?'story-go':'growth-open')+'">'+(claimed<12?'Fortsæt din havnehistorie':'Byg videre · etape '+escape(chapter))+' →</button><div class="agenda-settings"><label><input type="checkbox" data-calm-water> Rolige animationer</label><small>Til en rolig havn og mindre bevægelse på skærmen.</small></div></aside>';
  }
  // A 3:2 world-space mask. Water effects cannot cross the lawn or the three piers.
  const waterPath='M0 0H1800V1200H0Z M80 350L160 150 340 55 750 0 1220 20 1640 130 1740 300 1725 610 1590 780 1390 825 1350 1070 1180 1060 1190 805 985 785 950 1050 810 1050 850 770 640 760 570 945 450 945 550 710 270 735 115 600Z M160 780L250 710 340 775 285 875 165 855Z M1470 880L1550 770 1620 820 1640 960 1540 1000Z M1480 1020L1550 1010 1590 1065 1500 1110Z';
  function waterMarkup(){
    return '<svg class="harbor-water-layer" viewBox="0 0 1800 1200" aria-hidden="true"><defs><clipPath id="hk16-water"><path d="'+waterPath+'" clip-rule="evenodd"/></clipPath><pattern id="hk16-wave" width="150" height="95" patternUnits="userSpaceOnUse"><path d="M0 42Q38 28 75 42T150 42M30 75q20-8 42 0" fill="none" stroke="#d4ffff" stroke-width="1.4"/></pattern><radialGradient id="hk16-glow"><stop stop-color="#fff6c7" stop-opacity=".36"/><stop offset="1" stop-color="#fff6c7" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#hk16-water)"><g class="harbor-water-drift"><rect x="-180" y="-100" width="2160" height="1400" fill="url(#hk16-wave)"/></g><ellipse class="harbor-sun-water" cx="960" cy="1130" rx="400" ry="150" fill="url(#hk16-glow)"/></g></svg><canvas class="harbor-water-sparkles" width="900" height="600" aria-hidden="true"></canvas>';
  }
  const stationAssets={fishing:'island-fishery-v17.png',workshop:'island-workshop-v17.png',cafe:'island-cafe-v17.png'};
  function stationScene(id,job,now){
    if(!stationAssets[id])return '';
    const timed=job&&Number.isFinite(job.readyAt),active=timed&&job.readyAt>now;
    return '<div class="station-scene station-scene-'+id+(active?' station-at-work':'')+'" aria-hidden="true"'+(timed?' data-station-ready="'+job.readyAt+'"':'')+'><div class="station-scene-glow"></div><img src="./'+stationAssets[id]+'" alt="" width="1254" height="1254"><span class="station-scene-steam"><i></i><i></i><i></i></span></div>';
  }
  // Sparkle points deliberately lie in open sea below the docks, never over land.
  function sparkleAt(i,t){const x=90+((i*137.51)%1270),y=1100+((i*53.17)%90);return {x:x+Math.sin(t*.15+i)*6,y:y+Math.sin(t*.3+i)*2,alpha:Math.pow(Math.max(0,Math.sin(t*.9+i*2.3)),8)*.65,r:1+(i%3)*.45};}
  function birdMarkup(){return Array.from({length:3},(_,i)=>'<span class="harbor-gull gull-'+i+'"><svg viewBox="0 0 60 28"><path class="gull-left" d="M30 18Q13 0 2 14Q18 7 30 20"/><path class="gull-right" d="M30 18Q47 0 58 14Q42 7 30 20"/><path d="m27 17 3 8 3-8"/></svg></span>').join('');}
  let cleanup=()=>{},seconds=0,burstTimers=new Set();
  const preferenceKey='havnekaptajnen.visuals.v1';
  function preference(){try{return win.localStorage.getItem(preferenceKey)==='calm';}catch{return false;}}
  function stop(){cleanup();cleanup=()=>{};}
  function decorateIcons(doc){
    const nav={havn:'anchor',vaerksted:'tools',oehav:'compass',udvikling:'growth',butik:'crate',logbog:'book'};
    doc.querySelectorAll('.dock-nav [data-tab]').forEach(n=>{const span=n.querySelector('span');if(span)span.innerHTML=icon(nav[n.dataset.tab]);});
    const tools={'life-open':'flag','land-open':'land','fleet-open':'anchor','island-edit':'tools','island-home':'home'};
    doc.querySelectorAll('.map-tool').forEach(n=>{const span=n.querySelector('span');if(span)span.innerHTML=icon(n.dataset.val==='agenda'?'clock':tools[n.dataset.act]||'land');});
    doc.querySelectorAll('.timber-hud button').forEach(n=>{const span=n.querySelector('span');if(span)span.innerHTML=icon(n.dataset.val==='shore'?'log':'plank');});
    doc.querySelectorAll('.drydock-tools button').forEach(n=>{const label=n.querySelector('b');if(!label)return;const name=n.dataset.act==='fleet-open'?'anchor':n.dataset.val==='boat'?'paint':n.dataset.val==='refit'?'tools':'plank';n.innerHTML=icon(name)+'<b>'+escape(label.textContent)+'</b>';});
    doc.querySelectorAll('.tool-swing').forEach(n=>{n.innerHTML=icon('tools');});
  }
  function mount(root){
    stop();const doc=win.document;if(!doc||!root?.querySelector)return;
    decorateIcons(doc);
    const scene=root.querySelector('.island-game'),plane=root.querySelector('.island-plane'),room=root.querySelector('.drydock-scene');
    if(!scene)return;
    if(plane){const layer=doc.createElement('div');layer.className='harbor-atmosphere';layer.setAttribute('aria-hidden','true');layer.innerHTML=waterMarkup()+birdMarkup();plane.appendChild(layer);}
    if(room){const light=doc.createElement('div');light.className='workshop-daylight';light.setAttribute('aria-hidden','true');room.appendChild(light);}
    const motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');
    calmMode=preference();const input=root.querySelector('[data-calm-water]');if(input)input.checked=calmMode;
    let frame=null,last=null,lastDraw=0,alive=true;
    const canvas=plane?.querySelector('.harbor-water-sparkles'),ctx=canvas?.getContext?.('2d');
    const paused=()=>doc.hidden||motion?.matches||calmMode;
    const draw=(now)=>{
      frame=null;if(!alive||!scene.isConnected||paused()){last=null;return;}
      if(last!==null)seconds+=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
      if(ctx&&now-lastDraw>=33){lastDraw=now;ctx.clearRect(0,0,900,600);for(let i=0;i<38;i++){const p=sparkleAt(i,seconds);ctx.globalAlpha=p.alpha;ctx.fillStyle='#fffce0';ctx.beginPath();ctx.ellipse(p.x/2,p.y/2,p.r*2,p.r*.45,0,0,Math.PI*2);ctx.fill();}}
      frame=win.requestAnimationFrame(draw);
    };
    const updateMotion=()=>{const idle=paused();scene.classList.toggle('harbor-calm',!!idle);if(idle&&frame!==null){win.cancelAnimationFrame(frame);frame=null;last=null;}else if(!idle&&ctx&&frame===null){frame=win.requestAnimationFrame(draw);}};
    const change=()=>{calmMode=input.checked;try{win.localStorage.setItem(preferenceKey,calmMode?'calm':'full');}catch{}updateMotion();};
    const tick=()=>{const now=Date.now();let ready=0;root.querySelectorAll('[data-agenda-job]').forEach(n=>{const done=Number(n.dataset.agendaJob)<=now;ready+=Number(done);n.classList.toggle('agenda-ready',done);const label=n.querySelector('[data-job-label]');if(label)label.textContent=done?'Klar til afhentning':'Arbejder';});const count=root.querySelector('[data-ready-count]');if(count)count.textContent=String(ready);root.querySelectorAll('[data-station-ready]').forEach(n=>n.classList.toggle('station-at-work',Number(n.dataset.stationReady)>now));};
    const timer=win.setInterval(tick,1000);tick();
    doc.addEventListener('visibilitychange',updateMotion);motion?.addEventListener?.('change',updateMotion);input?.addEventListener('change',change);updateMotion();
    cleanup=()=>{alive=false;if(frame!==null)win.cancelAnimationFrame(frame);win.clearInterval(timer);doc.removeEventListener('visibilitychange',updateMotion);motion?.removeEventListener?.('change',updateMotion);input?.removeEventListener('change',change);};
  }
  function celebrate(){
    const doc=win.document;if(!doc||preference()||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const scene=doc.querySelector('.island-game');if(!scene)return;
    const burst=doc.createElement('div');burst.className='harbor-reward-burst';burst.setAttribute('aria-hidden','true');burst.innerHTML=Array.from({length:12},(_,i)=>'<i style="--a:'+i*30+'deg;--d:'+(65+i%3*24)+'px"></i>').join('');scene.appendChild(burst);
    const timer=win.setTimeout(()=>{burst.remove();burstTimers.delete(timer);},1100);burstTimers.add(timer);
  }
  let calmMode=preference();
  return {icon,overview,jobList,waterMarkup,stationScene,sparkleAt,mount,stop,celebrate,calm:()=>calmMode};
});
