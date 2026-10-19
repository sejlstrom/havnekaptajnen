(function(root){
 'use strict';
 const mutations=new Set(`event day upgrade price staff market welcome voyage claim haul finish-build theme factory-produce factory-collect factory-route factory-send factory-return factory-restore factory-open fleet-dock-build fleet-dock-finish fleet-terminal-build fleet-terminal-finish fleet-buy fleet-launch fleet-select fleet-send fleet-return boat-select gear-fit gear-finish gear-remove story-start story-claim story-finish story-help refit-start refit-finish expedition-start expedition-return sail-start sail-lane sail-tick growth-policy growth-send growth-return growth-build growth-built growth-next shop-confirm shop-style expansion-build expansion-finish expansion-errand land-begin land-finish island-collect island-place life-puzzle-start life-puzzle-flip life-puzzle-close life-puzzle-claim life-start life-collect life-celebrate life-palette life-produce`.split(' '));
 const guestKey='havnekaptajnen.v2.save',marker='havnekaptajnen.account.last',demoKey='havnekaptajnen.demo.actions',demoLimit=6;
 function createClient({api,fetcher,storage,game,ui,uuid=()=>crypto.randomUUID()}){
  let observedMarker=storage.getItem(marker),recoveryKey='havnekaptajnen.tab-recovery.'+uuid();
  const stale=()=>storage.getItem(marker)!==observedMarker;
  let account=null,csrf='',revision=0,config=null,orders=[],busy=false,checking=true,locked=!!storage.getItem(marker),challenge='',pending=null,loaded=false;
  let demoUsed=0;
  function demoCount(){let raw;try{raw=storage.getItem(demoKey);}catch{return demoUsed;}const n=raw===null?0:Number(raw);demoUsed=Math.max(demoUsed,Number.isSafeInteger(n)&&n>=0?Math.min(n,demoLimit):demoLimit);return demoUsed;}
  const state=()=>({account,revision,config,orders,busy,checking,locked,challenge,pending,authenticated:!!csrf,stale:stale(),demoUsed:demoCount(),demoLimit});
  const notify=()=>ui.changed(state());
  function demoEnded(){ui.demoEnded?.();ui.message('Du har prøvet demoens 6 spilhandlinger. Log ind gratis for at fortsætte. Din havn er bevaret.');}
  function progressStamp(){const saved=game().snapshot();if(saved?.island)delete saved.island.camera;return JSON.stringify(saved);}
  async function request(path,body){const res=await fetcher(api+path,{method:body===undefined?'GET':'POST',credentials:'include',cache:'no-store',signal:AbortSignal.timeout(20000),headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF':csrf},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(!res.ok){const e=new Error(data.error||'Forbindelsen kunne ikke oprettes.');e.status=res.status;throw e;}return data;}
  function backup(saved=game().snapshot()){const raw=JSON.stringify(saved),key='havnekaptajnen.backup.before-account.'+Date.now()+'.'+uuid();storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw new Error('Sikkerhedskopien kunne ikke gemmes. Eksportér havnen før login.');return key;}
  function loadCloud(saved){if(!saved)return;const same=locked&&storage.getItem(marker)===account.account;let camera=null;if(same){try{camera=(loaded?game().snapshot():JSON.parse(storage.getItem('havnekaptajnen.account.'+account.account)||'null'))?.island?.camera;}catch{}}revision=saved.revision;locked=true;storage.setItem(marker,account.account);observedMarker=account.account;const next=JSON.parse(JSON.stringify(saved.state));if(camera&&next.island)next.island.camera=camera;game().replace(next);loaded=true;}
  function reconcileCheckout(){if(!account)return;const key='havnekaptajnen.checkout.'+account.account;try{const req=JSON.parse(storage.getItem(key)||'null');if(req?.order&&orders.some(o=>o.id===req.order&&o.status!=='checkout'))storage.removeItem(key);}catch{}}
  async function refresh(openSave=false){const data=await request('/me');account={account:data.account,email:data.email};csrf=data.csrf;orders=data.orders||[];reconcileCheckout();if(openSave&&data.save)loadCloud(data.save);notify();return data;}
  async function init(){
   if(stale()){backup();observedMarker=storage.getItem(marker);locked=!!observedMarker;loaded=false;account=null;if(!locked)game().guest();}
   csrf='';checking=true;notify();
   try{config=await request('/config');const data=await request('/me');account={account:data.account,email:data.email};csrf=data.csrf;orders=data.orders||[];reconcileCheckout();
    if(data.save){if(!locked||storage.getItem(marker)!==account.account)backup();loadCloud(data.save);}else if(locked){locked=false;storage.removeItem(marker);observedMarker=null;} 
   }catch(e){if(e.status!==401)ui.message('Kontoen kunne ikke forbindes. Gæstehavnen og lokale sikkerhedskopier er bevaret.');if(locked){const id=storage.getItem(marker),raw=storage.getItem('havnekaptajnen.account.'+id);if(raw){account={account:id,email:''};game().replace(JSON.parse(raw));}ui.message('Kontohavnen vises som læsekopi. Log ind eller forbind igen for at spille.');}}
   checking=false;notify();
  }
  async function start(email){const data=await request('/auth/start',{email});challenge=data.challenge;notify();return data;}
  async function verify(code){if(busy)throw new Error('Vent til den aktuelle handling er afsluttet.');const data=await request('/auth/verify',{challenge,code});csrf=data.csrf;if(account&&account.account!==data.account&&locked){locked=false;storage.removeItem(marker);observedMarker=null;game().guest();}account={account:data.account,email:data.email};challenge='';notify();return data;}
  async function adopt(){if(stale())throw new Error('Kontoen er ændret i en anden fane. Hent havnen igen.');const raw=storage.getItem(guestKey),saved=!locked&&raw?JSON.parse(raw):game().snapshot();backup(saved);const data=await request('/save/import',{state:saved,confirm:true});if(stale())throw new Error('Kontohavnen er gemt. Hent den igen, fordi kontoen blev ændret i en anden fane.');loadCloud(data);notify();return data;}
  async function openExisting(){backup();return refresh(true);}
  async function logout(all=false){if(busy)throw new Error('Vent til din handling er gemt før logout.');await request('/auth/logout',{all});account=null;csrf='';revision=0;locked=false;pending=null;storage.removeItem(marker);observedMarker=null;game().guest();notify();}
  async function command(kind,value,extra){
   if(stale()){ui.message('Kontoen er ændret i en anden fane. Åbn Konto og hent havnen igen.');return;}if(busy)return;busy=true;notify();try{
    if(!csrf)throw new Error('Log ind igen for at spille på kontohavnen.');
    const quote=await request('/save/quote',{revision,command:{kind,value,ui:extra}});
    if(quote.ore>0&&!await ui.confirmPaid(quote)){return;}
    pending=quote.id;storage.setItem('havnekaptajnen.account.pending.'+account.account,quote.id);
    const result=await request('/save/apply',{quote:quote.id,confirmPaid:true});if(stale())throw new Error('Handlingen er gemt. Hent kontohavnen igen efter skiftet i den anden fane.');loadCloud(result);if(result.ui)game().remoteUI(result.ui);if(result.message)game().toast(result.message);storage.removeItem('havnekaptajnen.account.pending.'+account.account);pending=null;
   }catch(e){ui.message(e.message);if(e.status===409)ui.message('Ingen lokal gemning er overskrevet. Tryk Hent nyeste kontohavn for at fortsætte.');}
   finally{busy=false;notify();}
  }
  async function resume(){const key='havnekaptajnen.account.pending.'+account?.account,id=storage.getItem(key);if(id){try{const data=await request('/save/apply',{quote:id,confirmPaid:true});loadCloud(data);}catch(e){if(![404,409].includes(e.status))throw e;}storage.removeItem(key);pending=null;}return refresh(true);}
  return {state,init,start,verify,adopt,openExisting,refresh,resume,logout,request,
   beginLocalAction(kind){
    if(locked||checking||stale()||!mutations.has(kind))return;
    const before=progressStamp();let finished=false;
    return ()=>{if(finished)return;finished=true;if(locked||checking||stale()||progressStamp()===before)return;demoUsed=Math.min(demoLimit,demoCount()+1);try{storage.setItem(demoKey,String(demoUsed));}catch{ui.message('Demotælleren kunne ikke gemmes på enheden. Hent en sikkerhedskopi i Logbogen.');}notify();if(demoUsed>=demoLimit)demoEnded();};
   },
   saveKey:()=>stale()?recoveryKey:locked&&account?'havnekaptajnen.account.'+account.account:guestKey,
   guestExport:()=>({format:'havnekaptajnen-save',version:2,state:JSON.parse(storage.getItem(guestKey)||'null')}),
   tabChanged(){if(stale()){storage.setItem(recoveryKey,JSON.stringify(game().snapshot()));notify();ui.message('Kontoen er ændret i en anden fane. Åbn Konto og hent havnen igen.');}},
   connected:()=>locked,
   intercept(kind,value,extra){if(stale()&&(mutations.has(kind)||['reset','import'].includes(kind))){notify();ui.message('Kontoen er ændret i en anden fane. Åbn Konto og hent havnen igen.');return true;}if((locked||checking)&&['reset','import'].includes(kind)){ui.message('Din kontohavn er beskyttet. Log ud for at bruge et separat gæstespil.');return true;}if(!mutations.has(kind))return false;if(checking){ui.message('Kontrollerer din gemning. Vent et øjeblik.');return true;}if(!locked){if(demoCount()>=demoLimit){demoEnded();return true;}return false;}void command(kind,value,extra);return true;},
   sailingTick(tab,sail){if(stale()||checking)return true;if(!locked)return demoCount()>=demoLimit;if(tab==='sejl'&&sail&&!sail.finished&&Date.now()>=sail.nextAt&&!busy)void command('sail-tick',undefined,{tab:'sejl',panel:''});return true;},
   async checkout(product,quantity){await refresh(false);const key='havnekaptajnen.checkout.'+account.account;let req;try{req=JSON.parse(storage.getItem(key)||'null');}catch{}if(!req||req.product!==product||req.quantity!==quantity)req={product,quantity,request:uuid()};storage.setItem(key,JSON.stringify(req));const data=await request('/checkout',{...req,acceptTerms:true,adultAccount:true});storage.setItem(key,JSON.stringify({...req,order:data.order}));return data;},
   async withdraw(order){const data=await request('/withdraw',{order});if(data.save)loadCloud(data.save);orders=data.orders||orders;notify();return data;},
   async deliver(order){const data=await request('/orders/deliver',{order});if(data.save)loadCloud(data.save);orders=data.orders||orders;notify();},
   async export(){return request('/export');}
  };
 }
 if(typeof module==='object'&&module.exports){module.exports={createClient,mutations};return;}
 const api=document.querySelector('meta[name="harbor-account-api"]')?.content;
 if(!api)return;
 const client=createClient({api,fetcher:root.fetch.bind(root),storage:root.localStorage,game:()=>root.HarborGame,ui:{changed:s=>root.HarborAccountUI?.changed(s),message:m=>root.HarborAccountUI?.message(m),demoEnded:()=>root.HarborAccountUI?.demoEnded(),confirmPaid:q=>root.HarborAccountUI.confirmPaid(q)}});
 root.addEventListener('storage',event=>{if(event.key===marker)client.tabChanged();});
 root.HarborAccount={...client,open:()=>root.HarborAccountUI.open(),init:()=>{root.HarborAccountUI.init(client);return client.init();}};
})(typeof window==='undefined'?globalThis:window);
