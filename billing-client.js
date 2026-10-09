/* Set only after merchant setup and a complete Stripe test-mode rehearsal.
   Never add Stripe secrets here. Paid balances are obtained from the private service. */
(function(root){
 'use strict';
 function createBilling({endpoint=null,storage,fetcher,uuid}){
  if(endpoint&&!/^https:\/\/[^/?#]+$/.test(endpoint))throw new Error('HTTPS billing origin required');
  const key='havnekaptajnen.purchase-account.v1',journalKey='havnekaptajnen.purchase-use.v1';
  const read=k=>{try{return JSON.parse(storage.getItem(k)||'null');}catch{return null;}};
  const write=(k,v)=>{storage.setItem(k,JSON.stringify(v));};
  let account=read(key),busy=false;
  let state={enabled:false,products:[],tickets:0,entitlements:[],message:'Køb åbner senere. Spil videre og optjen hjælpebilletter gratis.'};
  async function api(path,body){
   if(!endpoint)throw new Error('Betalinger er ikke åbnet.');
   const headers={'Content-Type':'application/json'};if(account?.token)headers.Authorization='Bearer '+account.token;
   const response=await fetcher(endpoint+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});
   const data=await response.json();if(!response.ok)throw new Error(response.status===401?'Købskontoen skal gendannes med din kode.':response.status===409?'Købet eller billetten kunne ikke bruges. Opdatér købskontoen.':'Forbindelsen til købskontoen virker ikke lige nu. Prøv igen.');return data;
  }
  const status=()=>({...state,products:state.products.map(p=>({...p})),entitlements:[...state.entitlements],account:!!account?.token,recovery:account?.recovery||'',acknowledged:!!account?.acknowledged,pending:!!read(journalKey),busy});
  async function refresh(){
   if(!endpoint)return status();
   try{const c=await api('/api/catalog');if(!c.enabled){state={...state,enabled:false,tickets:0,entitlements:[],message:'Køb er midlertidigt lukket. Du kan fortsat spille gratis.'};return status();}
    state={...state,...c,products:c.products.filter(p=>['time_20','district_pass','evening_style'].includes(p.id)&&Number.isSafeInteger(p.amount)&&p.amount>0&&p.currency==='dkk'),message:c.mode==='test'?'TESTBUTIK — kun simulerede betalinger.':'Valgfrie engangskøb. Alle priser er i danske kroner inklusive moms.'};
    if(account?.token){const w=await api('/api/wallet');state.tickets=Math.max(0,Number(w.tickets)||0);state.entitlements=w.entitlements.filter(e=>['district_pass','evening_style'].includes(e));}
   }catch(error){state={...state,enabled:false,tickets:0,entitlements:[],message:error.message};}
   return status();
  }
  async function createAccount(){if(!state.enabled)throw new Error('Butikken er lukket.');const a=await api('/api/account',{});const next={...a,acknowledged:false};write(key,next);account=next;await refresh();return status();}
  async function restore(recovery){if(read(journalKey))throw new Error('Afslut den ventende billet først.');const a=await api('/api/restore',{recovery:recovery.trim()});const next={...a,recovery:recovery.trim(),acknowledged:true};write(key,next);account=next;await refresh();return status();}
  function acknowledge(){if(!account?.recovery)throw new Error('Opret en købskonto først.');const next={...account,acknowledged:true};write(key,next);account=next;}
  async function checkout(sku,consent){
   if(!state.enabled||!account?.acknowledged||!state.products.some(p=>p.id===sku)||!consent?.acceptTerms||!consent?.immediateDelivery)throw new Error('Gem gendannelseskoden, og tag stilling til købsvilkårene først.');
   if(busy)throw new Error('Et køb bliver allerede klargjort.');busy=true;
   try{const result=await api('/api/checkout',{sku,request:uuid(),acceptTerms:true,immediateDelivery:true});if(!/^https:\/\/checkout\.stripe\.com\//.test(result.url||''))throw new Error('Betalingssiden kunne ikke godkendes.');return result.url;}finally{busy=false;}
  }
  // Replays after a lost response use the same saved request ID.
  async function redeem(work,deadline,apply){
   if(busy)throw new Error('En billet behandles allerede.');
   let pending=read(journalKey);if(pending&&(pending.work!==work||pending.deadline!==deadline))throw new Error('Afslut den ventende billet først.');
   if(!pending){if(!state.enabled||!account?.token||state.tickets<1)throw new Error('Ingen købte billetter er tilgængelige.');pending={request:uuid(),work,deadline};write(journalKey,pending);}
   busy=true;try{const result=await api('/api/redeem',pending);if(!apply(pending,result))throw new Error('Billetten afventer gemning i den oprindelige havn. Gendan den gemning, og prøv igen.');storage.removeItem(journalKey);await refresh();return result;}finally{busy=false;}
  }
  async function resume(apply){const p=read(journalKey);if(p)return redeem(p.work,p.deadline,apply);}
  return Object.freeze({configured:!!endpoint,status,refresh,createAccount,restore,acknowledge,checkout,redeem,resume,owns:id=>state.enabled&&state.entitlements.includes(id)});
 }
 if(typeof module==='object'&&module.exports)module.exports={createBilling};
 else root.HarborBilling=createBilling({endpoint:null,storage:localStorage,fetcher:fetch.bind(root),uuid:()=>root.crypto.randomUUID()});
})(typeof window==='undefined'?globalThis:window);
