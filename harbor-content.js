/* Additive content catalog. Stable IDs keep existing harbors intact when new packs arrive. */
(function(root){
 'use strict';
 const districts=[
  {id:'club',name:'Sejlklubben',icon:'⛵',chapter:2,station:'fishing',needs:{plank:4,fish:4},description:'En klubkaj med sejlerskole og plads til flere aktive fiskere.',perk:'Kortere produktion i fiskeriet',color:'#4d93b5'},
  {id:'garden',name:'Den grønne havn',icon:'🌿',chapter:3,station:'cafe',needs:{plank:4,coffee:4},description:'En havnehave og et grønt torv omkring Sofies café.',perk:'Kortere produktion i caféen',color:'#668a50'},
  {id:'rescue',name:'Redningskajen',icon:'⚓',chapter:5,station:'workshop',needs:{plank:6,wood:4},description:'En arbejdsbro med materialer og plads til havnens hjælpehold.',perk:'Kortere indsamling og savning',color:'#c27048'}
 ];
 // Real-money prices belong to the payment server. This client catalog never authorizes a payment or entitlement.
 const products=[
  {id:'ad_free',name:'Reklamefri havn',kind:'entitlement',entitlement:'ad_free',description:'Planlagt engangskøb: fjerner alle reklamepladser i spillet, også SejlStrøms bannere. Ingen abonnementer. Pris og vilkår offentliggøres før salgsstart.'},
  {id:'time_20',name:'20 hjælpebilletter',kind:'tickets',quantity:20,description:'Hver billet fjerner op til fem minutters resterende ventetid fra ét arbejde. Ubrugte minutter overføres ikke.'},
  {id:'district_pass',name:'Øhavets kvarterpakke',kind:'entitlement',entitlement:'district_pass',description:'Åbner adgang til alle tre særlige kvarterer straks. Selve byggeriet bruger stadig havnens materialer. Kvartererne kan også åbnes gratis på etape 2, 3 og 5.'},
  {id:'evening_style',name:'Lygtehavnen',kind:'entitlement',entitlement:'evening_style',description:'Et permanent aftenudtryk med lygter på kajen og lys over vandet. Kan slås til og fra.'}
 ];
 const errands=[{name:'Planker til fællesbroen',needs:{plank:2,wood:2}},{name:'Mad til de frivillige',needs:{fish:4,smoked:2}},{name:'Kaffe til havnedagen',needs:{coffee:2,beans:2}}];
 const whole=(n,fallback=0)=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000000):fallback;
 function fresh(){return {schema:2,tickets:10,starterGranted:10,earned:0,errands:0,levels:Object.fromEntries(districts.map(d=>[d.id,0])),project:null,style:'classic'};}
 function normalize(raw,now=Date.now()){
  const s=fresh();if(!raw||typeof raw!=='object')return s;
  // Version 9 gave three starter tickets. Add only the missing seven once;
  // preserve spent tickets and any tickets earned before this policy changed.
  s.tickets=whole(whole(raw.tickets)+(raw.schema===1?7:0));s.earned=whole(raw.earned);s.errands=whole(raw.errands);
  // Retain valid unknown district IDs for rolling releases/offline clients.
  for(const [id,level] of Object.entries(raw.levels||{}).slice(0,100))if(/^[a-z][a-z0-9_]{0,39}$/.test(id))s.levels[id]=whole(level);
  if(raw.style==='evening')s.style='evening';
  const j=raw.project;if(j&&districts.some(d=>d.id===j.id)&&j.level===s.levels[j.id]+1&&Number.isFinite(j.readyAt)&&j.readyAt>0&&j.readyAt<=now+86400000)s.project={id:j.id,level:j.level,readyAt:j.readyAt};
  return s;
 }
 function project(s,id){const d=districts.find(x=>x.id===id);if(!d)return null;const level=s.levels[id]+1,step=Math.floor(Math.log2(level+1));return{id,level,cash:700+step*300,needs:Object.fromEntries(Object.entries(d.needs).map(([g,n])=>[g,n+step*2])),seconds:Math.min(28800,120+level*90)};}
 function errand(s){const e=errands[s.errands%errands.length],n=1+Math.floor(Math.log2(1+s.errands)/3);return{...e,sequence:s.errands,needs:Object.fromEntries(Object.entries(e.needs).map(([g,v])=>[g,v*n])),cash:300*n,tickets:0};}
 function multiplier(s,station){const d=districts.find(d=>d.station===(station==='shore'?'workshop':station));return d?1-Math.min(.2,Math.log2((s.levels[d.id]||0)+1)*.025):1;}
 function skipQuote(job,now){if(!job||!Number.isFinite(job.readyAt)||job.readyAt<=now)return null;return{before:job.readyAt,after:Math.max(now,job.readyAt-300000),seconds:Math.min(300,Math.ceil((job.readyAt-now)/1000)),cost:1};}
 function skip(s,job,expectedReadyAt,now){const q=skipQuote(job,now);if(!q||q.before!==expectedReadyAt||s.tickets<q.cost)return false;s.tickets--;job.readyAt=q.after;return true;}
 const api=Object.freeze({version:1,districts,products,fresh,normalize,project,errand,multiplier,skipQuote,skip});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborContent=api;
})(typeof window==='undefined'?globalThis:window);
