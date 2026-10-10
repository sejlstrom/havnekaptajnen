/* Stable ship IDs, individual refits and a level-gated harbor bridge. */
(function(root){
 'use strict';
 const ships=[
  {id:'svalen',name:'Svalen',type:'Kahytbåd',chapter:1,length:6,capacity:12,bonus:0,time:1,cash:0,needs:{},seconds:0,image:'island-boat.png',scale:1,description:'Din første trofaste båd. Klar til små leveringer langs kysten.'},
  {id:'havkat',name:'Havkat',type:'Arbejdskutter',chapter:3,length:9,capacity:24,bonus:.08,time:.95,cash:8500,needs:{plank:18,wood:12},seconds:180,image:'fleet-cutter.png',scale:1.09,description:'Et dybere skrog og større arbejdsdæk til havnenes byggematerialer.'},
  {id:'fjordly',name:'Fjordly',type:'Motorkrydser',chapter:7,length:12,capacity:40,bonus:.15,time:.88,cash:24000,needs:{plank:36,wood:24},seconds:360,image:'fleet-cruiser.png',scale:1.16,description:'En hurtigere krydser med plads til markedets større forsyninger.'},
  {id:'tvilling',name:'Tvilling',type:'Motorkatamaran',chapter:12,length:16,capacity:64,bonus:.24,time:.83,cash:60000,needs:{plank:64,wood:48},seconds:600,image:'fleet-catamaran.png',scale:1.23,description:'To skrog og et bredt dæk til store leveringer mellem øerne.'},
  {id:'nordlys',name:'Nordlys',type:'Ekspeditionsskib',chapter:20,length:22,capacity:96,bonus:.35,time:.78,cash:150000,needs:{plank:110,wood:80},seconds:900,image:'fleet-expedition.png',scale:1.3,description:'Flådens langfartsbåd med plads til forskningsstationens forsyninger.'},
  {id:'havbro',name:'Havbro',type:'Kystcontainerskib',chapter:35,length:85,capacity:240,bonus:.5,time:.72,cash:480000,needs:{plank:220,wood:160},seconds:3600,image:'fleet-feeder.png',scale:1.45,port:1,description:'Et rigtigt fragtskib til store laster mellem havnene. Kræver Containerkaj niveau 1.'},
  {id:'horisont',name:'Horisont',type:'Oceangående containerskib',chapter:60,length:240,capacity:600,bonus:.75,time:.66,cash:1500000,needs:{plank:500,wood:320},seconds:10800,image:'fleet-ocean.png',scale:1.6,port:2,description:'Havnens store containerskib til de lange handelsruter. Kræver Containerkaj niveau 2.'}
 ];
 const routes=[
  {id:'cove',name:'Forsyninger til Bugten',chapter:1,needs:{wood:6,plank:4},cash:900,seconds:120},
  {id:'builders',name:'Brobyggernes store last',chapter:3,needs:{plank:12,wood:12},cash:2400,seconds:240},
  {id:'market',name:'Markedet i Fjordby',chapter:7,needs:{coffee:12,beans:12,smoked:16},cash:4600,seconds:360},
  {id:'islands',name:'Forsyninger til økæden',chapter:12,needs:{plank:24,wood:24,fish:16},cash:7200,seconds:480},
  {id:'research',name:'Nordstationens ekspedition',chapter:20,needs:{plank:32,coffee:32,smoked:32},cash:12500,seconds:720},
  {id:'regional',name:'Containerlast til Storhavnen',chapter:35,port:1,needs:{wood:80,plank:80,coffee:40,smoked:40},cash:40000,seconds:1800},
  {id:'ocean',name:'Handelsruten over oceanet',chapter:60,port:2,needs:{wood:100,plank:160,beans:100,coffee:120,smoked:120},cash:80000,seconds:5400}
 ];
 // A new model's factory performance equals or exceeds the fully fitted model below it.
 // Equipment adds the same improvements again on the new boat; its upgrade levels start at zero.
 ships.forEach((s,i)=>{s.time=Math.pow(.68,i);s.bonus=i*.49;s.bridge=[0,0,1,1,2,4,5][i];});
 const ship=id=>ships.find(s=>s.id===id)||ships[0];
 const gearIds=['navigation','battery','solar','heater'];
 const freshProfile=()=>({vessel:{hull:'svalen',owned:[],fitted:[],installation:null},upgrades:{engine:0,cargo:0,hull:0}});
 function profile(raw){
  const p=freshProfile();if(!raw||typeof raw!=='object')return p;
  for(const [k,max]of Object.entries({engine:3,cargo:3,hull:2}))if(Number.isInteger(raw.upgrades?.[k]))p.upgrades[k]=Math.max(0,Math.min(max,raw.upgrades[k]));
  const v=raw.vessel;if(v&&typeof v==='object'){
   if(['svalen','nordlys','ravnen'].includes(v.hull))p.vessel.hull=v.hull;
   p.vessel.owned=[...new Set((Array.isArray(v.owned)?v.owned:[]).filter(id=>gearIds.includes(id)))];
   p.vessel.fitted=[...new Set((Array.isArray(v.fitted)?v.fitted:[]).filter(id=>p.vessel.owned.includes(id)))];
  }return p;
 }
 function stats(id,raw){const b=ship(id),i=ships.indexOf(b),p=profile(raw),next=ships[i+1]?.capacity||960;return {...b,capacity:Math.floor(b.capacity+(next-b.capacity)*p.upgrades.cargo/3),baseCapacity:b.capacity,maxCapacity:next,seaworthiness:i*2+p.upgrades.hull,standardSystems:i>0,baseTokens:i,upgrades:p.upgrades};}
 const dockSteps=[
  {level:1,name:'Den lange træbro',chapter:3,cash:6000,needs:{plank:12,wood:8},seconds:120},
  {level:2,name:'To nye broarme',chapter:7,cash:15000,needs:{plank:32,wood:20},seconds:360},
  {level:3,name:'Servicebroen',chapter:12,cash:45000,needs:{plank:60,wood:40},seconds:900},
  {level:4,name:'Forstærket erhvervsbro',chapter:25,cash:120000,needs:{plank:100,rope:16},seconds:1800},
  {level:5,name:'Den dybe havnebro',chapter:45,cash:300000,needs:{plank:220,rope:40},seconds:5400},
  {level:6,name:'Havnens store promenade',chapter:65,cash:650000,needs:{plank:400,rope:80},seconds:10800}
 ];
 const berths=level=>2+2*Math.max(0,Math.min(6,Math.floor(level)||0));
 const dockQuote=level=>dockSteps[level]?{...dockSteps[level],berths:berths(level+1)}:null;
 function switchBoat(game,id){
  if(!game.fleet.owned.includes(id)||id===game.fleet.active)return false;
  if(game.vessel.installation||game.campaign.refit||game.campaign.expedition||game.factory.delivery||game.growth.job||game.fleet.job)return false;
  game.fleet.profiles[game.fleet.active]=profile({vessel:game.vessel,upgrades:game.campaign.upgrades});
  const p=profile(game.fleet.profiles[id]);game.vessel=p.vessel;game.campaign.upgrades=p.upgrades;game.fleet.active=id;return true;
 }
 const fresh=()=>({schema:3,active:'svalen',owned:['svalen'],profiles:{},dock:{level:0,project:null},visits:{},build:null,job:null,deliveries:0,terminal:{level:0,project:null}});
 function terminalQuote(level){return [{level:1,chapter:30,name:'Containerkaj med lastekran',cash:120000,needs:{plank:120,wood:80},seconds:1800},{level:2,chapter:55,name:'Dybhavskaj med portalkran',cash:360000,needs:{plank:260,wood:180},seconds:7200}][level]||null;}
 function normalize(raw,now=Date.now()){
  const f=fresh();if(!raw||typeof raw!=='object')return f;
  f.owned=[...new Set(['svalen',...(Array.isArray(raw.owned)?raw.owned.filter(id=>ships.some(s=>s.id===id)):[])])];
  if(f.owned.includes(raw.active))f.active=raw.active;
  for(const id of f.owned)if(raw.profiles?.[id])f.profiles[id]=profile(raw.profiles[id]);
  if(raw.visits&&typeof raw.visits==='object')for(const [id,n]of Object.entries(raw.visits))if(/^[a-z]{2,16}$/.test(id)&&Number.isSafeInteger(n)&&n>=0)f.visits[id]=Math.min(n,1000000000);
  if(Number.isSafeInteger(raw.deliveries)&&raw.deliveries>=0)f.deliveries=Math.min(raw.deliveries,1000000000);
  const valid=j=>j&&Number.isFinite(j.readyAt)&&j.readyAt>0&&j.readyAt<=now+86400000;
  const t=raw.terminal;if(t&&Number.isInteger(t.level)&&t.level>=0&&t.level<=2){f.terminal.level=t.level;const p=t.project;if(valid(p)&&p.level===t.level+1&&p.level<=2)f.terminal.project={level:p.level,readyAt:p.readyAt};}
  const dock=raw.dock;if(dock&&Number.isInteger(dock.level))f.dock.level=Math.max(0,Math.min(6,dock.level));
  // Existing owners never lose access to boats or a quay they have already built.
  if(raw.schema!==3)f.dock.level=Math.max(f.dock.level,...f.owned.map(id=>ship(id).bridge),f.terminal.level===2?5:f.terminal.level===1?4:0);
  const dp=dock?.project;if(valid(dp)&&dp.level===f.dock.level+1&&dp.level<=6)f.dock.project={level:dp.level,readyAt:dp.readyAt};
  const b=raw.build;if(valid(b)&&ships.some(s=>s.id===b.id)&&!f.owned.includes(b.id))f.build={id:b.id,readyAt:b.readyAt};
  const j=raw.job;if(valid(j)&&routes.some(r=>r.id===j.id)&&f.owned.includes(j.ship)&&Number.isInteger(j.cash)&&j.cash>0&&j.cash<=1000000&&Number.isInteger(j.tokens)&&j.tokens>0&&j.tokens<1000&&Number.isInteger(j.seconds)&&j.seconds>0&&j.seconds<=86400){f.job={id:j.id,ship:j.ship,cash:j.cash,tokens:j.tokens,seconds:j.seconds,readyAt:j.readyAt};f.active=j.ship;}
  return f;
 }
 const load=route=>Object.values(route.needs).reduce((n,v)=>n+v,0);
 function quote(routeId,active){const r=routes.find(r=>r.id===routeId);if(!r)return null;const boat=ship(active);return {...r,load:load(r),cash:Math.round(r.cash*(1+boat.bonus)),seconds:Math.round(r.seconds*boat.time),tokens:2+Math.floor(load(r)/12)};}
 function expeditionQuote(destination,active,chapter=1,engine=0,navigation=false,refits){
  const boat=stats(active,refits),factor=boat.capacity/ships[0].capacity;
  return {ship:boat.id,capacity:boat.capacity,needs:Object.fromEntries(Object.entries(destination.needs).map(([id,n])=>[id,Math.ceil(n*factor)])),reward:Object.fromEntries(Object.entries(destination.reward).map(([id,n])=>[id,Math.floor(n*factor)])),cash:Math.round(destination.cash*factor*(1+boat.bonus)),seconds:Math.min(28800,Math.max(3,Math.round(destination.seconds*(1+(Math.max(1,chapter)-1)*.08)*boat.time*(navigation?.8:1)*(1-Math.min(3,Math.max(0,engine))*.05))))};
 }
 const api=Object.freeze({ships,routes,ship,fresh,normalize,load,quote,terminalQuote,expeditionQuote,freshProfile,profile,stats,switchBoat,dockSteps,dockQuote,berths});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborFleet=api;
})(typeof window==='undefined'?globalThis:window);
