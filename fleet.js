/* Stable ship IDs. Existing equipment remains on the shared workshop shelf. */
(function(root){
 'use strict';
 const ships=[
  {id:'svalen',name:'Svalen',type:'Kahytbåd',chapter:1,length:6,capacity:12,bonus:0,time:1,cash:0,needs:{},seconds:0,image:'island-boat.png',scale:1,description:'Din første trofaste båd. Klar til små leveringer langs kysten.'},
  {id:'havkat',name:'Havkat',type:'Arbejdskutter',chapter:3,length:9,capacity:24,bonus:.08,time:.95,cash:8500,needs:{plank:18,wood:12},seconds:180,image:'fleet-cutter.png',scale:1.09,description:'Et dybere skrog og større arbejdsdæk til havnenes byggematerialer.'},
  {id:'fjordly',name:'Fjordly',type:'Motorkrydser',chapter:7,length:12,capacity:40,bonus:.15,time:.88,cash:24000,needs:{plank:36,wood:24},seconds:360,image:'fleet-cruiser.png',scale:1.16,description:'En hurtigere krydser med plads til markedets større forsyninger.'},
  {id:'tvilling',name:'Tvilling',type:'Motorkatamaran',chapter:12,length:16,capacity:64,bonus:.24,time:.83,cash:60000,needs:{plank:64,wood:48},seconds:600,image:'fleet-catamaran.png',scale:1.23,description:'To skrog og et bredt dæk til store leveringer mellem øerne.'},
  {id:'nordlys',name:'Nordlys',type:'Ekspeditionsskib',chapter:20,length:22,capacity:96,bonus:.35,time:.78,cash:150000,needs:{plank:110,wood:80},seconds:900,image:'fleet-expedition.png',scale:1.3,description:'Flådens store langfartsbåd med plads til forskningsstationens forsyninger.'}
 ];
 const routes=[
  {id:'cove',name:'Forsyninger til Bugten',chapter:1,needs:{wood:6,plank:4},cash:900,seconds:120},
  {id:'builders',name:'Brobyggernes store last',chapter:3,needs:{plank:12,wood:12},cash:2400,seconds:240},
  {id:'market',name:'Markedet i Fjordby',chapter:7,needs:{coffee:12,beans:12,smoked:16},cash:4600,seconds:360},
  {id:'islands',name:'Forsyninger til økæden',chapter:12,needs:{plank:24,wood:24,fish:16},cash:7200,seconds:480},
  {id:'research',name:'Nordstationens ekspedition',chapter:20,needs:{plank:32,coffee:32,smoked:32},cash:12500,seconds:720}
 ];
 const ship=id=>ships.find(s=>s.id===id)||ships[0];
 const fresh=()=>({schema:1,active:'svalen',owned:['svalen'],build:null,job:null,deliveries:0});
 function normalize(raw,now=Date.now()){
  const f=fresh();if(!raw||typeof raw!=='object')return f;
  f.owned=[...new Set(['svalen',...(Array.isArray(raw.owned)?raw.owned.filter(id=>ships.some(s=>s.id===id)):[])])];
  if(f.owned.includes(raw.active))f.active=raw.active;
  if(Number.isSafeInteger(raw.deliveries)&&raw.deliveries>=0)f.deliveries=Math.min(raw.deliveries,1000000000);
  const valid=j=>j&&Number.isFinite(j.readyAt)&&j.readyAt>0&&j.readyAt<=now+86400000;
  const b=raw.build;if(valid(b)&&ships.some(s=>s.id===b.id)&&!f.owned.includes(b.id))f.build={id:b.id,readyAt:b.readyAt};
  const j=raw.job;if(valid(j)&&routes.some(r=>r.id===j.id)&&f.owned.includes(j.ship)&&Number.isInteger(j.cash)&&j.cash>0&&j.cash<=100000&&Number.isInteger(j.tokens)&&j.tokens>0&&j.tokens<1000&&Number.isInteger(j.seconds)&&j.seconds>0&&j.seconds<=86400){f.job={id:j.id,ship:j.ship,cash:j.cash,tokens:j.tokens,seconds:j.seconds,readyAt:j.readyAt};f.active=j.ship;}
  return f;
 }
 const load=route=>Object.values(route.needs).reduce((n,v)=>n+v,0);
 function quote(routeId,active){const r=routes.find(r=>r.id===routeId);if(!r)return null;const boat=ship(active);return {...r,load:load(r),cash:Math.round(r.cash*(1+boat.bonus)),seconds:Math.round(r.seconds*boat.time),tokens:2+Math.floor(load(r)/12)};}
 const api=Object.freeze({ships,routes,ship,fresh,normalize,load,quote});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborFleet=api;
})(typeof window==='undefined'?globalThis:window);
