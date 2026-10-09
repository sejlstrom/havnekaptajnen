/* Show a clear boundary before leaving the game for its owner's shop.
   No cookies, identifiers, impressions, click measurement or network requests. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.getElementById('shop-exit');
  const destination=document.getElementById('shop-destination');
  if(!dialog||!destination)return;
  let opener=null;
  document.addEventListener('click',event=>{
   const link=event.target.closest('a[href]');
   if(!link||link===destination)return;
   let url;try{url=new URL(link.href);}catch{return;}
   if(url.protocol!=='https:'||url.hostname!=='sejlstroem.dk')return;
   event.preventDefault();opener=link;
   destination.href=url.href;
   if(!dialog.open)dialog.showModal();
  });
  document.getElementById('shop-stay').addEventListener('click',()=>dialog.close());
  destination.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
 });
})();
