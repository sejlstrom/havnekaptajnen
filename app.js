/*
 * HAVNEKAPTAJNEN · standalone offline game
 * No servers, ads, analytics, accounts or payments.
 * Game day/economics are deliberately fictional, not navigational or accounting advice.
 */
(()=>{
 'use strict';
 const KEY='havnekaptajnen.v2.save';
 const LEGACY='horisont-spil.v1.havn';
 const SAVE_VERSION=2;
 const priceFormatter=new Intl.NumberFormat('da-DK',{maximumFractionDigits:0});
 const money=n=>priceFormatter.format(Math.round(Number(n)||0))+' kr.';
 const num=n=>priceFormatter.format(Math.round(Number(n)||0));
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=id=>document.getElementById(id);
 const initial=()=>({
   version:2,day:1,cash:9800,reputation:36,satisfaction:60,slips:12,occupied:5,
   price:175,staff:1,upgrades:{bro:0,bad:0,power:0,cafe:0,workshop:0,clean:0,sauna:0,rental:0,office:0,fuel:0},
   marketing:0,boost:0,checkedGoals:[],history:[],lastIncome:0,lastCost:0,lastProfit:0,totalProfit:0,
   port:{collected:[],served:0,visits:[],visitDay:1,chapters:[],voyage:null,trips:0,theme:0,building:null,haulReady:0},factory:freshFactory(),vessel:freshVessel(),campaign:freshCampaign(),pending:null,eventCount:0,log:['Dag 1: Du har fået nøglerne til en forsømt havn med 12 pladser. Gæsterne er skeptiske, men mulighederne er store.']
 });
 const upgrades=[
  {id:'bro',icon:'🛶',name:'Ny flydebro',cost:4100,max:6,unlock:1,desc:'Fire ekstra gæstepladser og plads til større indtægter.',income:'4 nye pladser'},
  {id:'bad',icon:'🚿',name:'Bade- og toilethus',cost:3000,max:1,unlock:1,desc:'Gør gæsterne gladere, og øg omsætningen pr. båd.',income:'+12 kr. pr. båd'},
  {id:'power',icon:'🔌',name:'Landstrøm',cost:3800,max:1,unlock:1,desc:'Strømudtag ved pladserne til nye gæstesejlere.',income:'+25 kr. pr. båd'},
  {id:'cafe',icon:'☕',name:'Havnecafé',cost:6400,max:1,unlock:15,desc:'Hyggeligt samlingspunkt, som tiltrækker gæster og skaber omsætning.',income:'Caféomsætning'},
  {id:'workshop',icon:'🔧',name:'Serviceværksted',cost:5700,max:1,unlock:20,desc:'Hjælp bådejere med reparationer og skab faste indtægter.',income:'+340 kr. pr. dag'},
  {id:'clean',icon:'🌱',name:'Miljøstation',cost:2500,max:1,unlock:10,desc:'En ren havn med højere tilfredshed og bedre omtale.',income:'Bedre ry'},
  {id:'sauna',icon:'🔥',name:'Havnesauna',cost:9200,max:1,unlock:38,desc:'Gør havnen attraktiv, også uden for sommermånederne.',income:'+200 kr. pr. dag'},
  {id:'rental',icon:'⛵',name:'Bådudlejning',cost:11000,max:1,unlock:48,desc:'Udlej små både og få indtægter, når vejret er godt.',income:'Op til +460 kr. pr. dag'},
  {id:'office',icon:'🏠',name:'Nyt havnekontor',cost:14500,max:1,unlock:75,desc:'Bedre overblik og mulighed for at tiltrække flere gæster.',income:'Større efterspørgsel'},
  {id:'fuel',icon:'⛽',name:'Brændstofkaj',cost:17000,max:1,unlock:110,desc:'Tankservice og en ny indtægtskilde for havnen.',income:'+360 kr. pr. dag'}
 ];
 const goals=[
  {name:'En ny begyndelse',desc:'Nå dag 4 og hav mindst 7.000 kr. på kontoen.',reward:1200,check:s=>s.day>=4&&s.cash>=7000},
  {name:'Plads til flere',desc:'Byg din første flydebro.',reward:1600,check:s=>s.upgrades.bro>=1},
  {name:'Havnen bliver kendt',desc:'Nå dag 12 og et omdømme på 55.',reward:2200,check:s=>s.day>=12&&s.reputation>=55},
  {name:'En rigtig gæstehavn',desc:'Nå dag 25 med badehus og landstrøm.',reward:3000,check:s=>s.day>=25&&s.upgrades.bad&&s.upgrades.power},
  {name:'Årets havn',desc:'Nå dag 40 med omdømme 80 og et serviceværksted.',reward:5000,check:s=>s.day>=40&&s.reputation>=80&&s.upgrades.workshop},
  {name:'Gæsternes favorit',desc:'Nå dag 65 med mindst 20 havnepladser og café.',reward:6000,check:s=>s.day>=65&&s.slips>=20&&s.upgrades.cafe},
  {name:'Sommerliv året rundt',desc:'Nå dag 100 og byg en havnesauna.',reward:7500,check:s=>s.day>=100&&s.upgrades.sauna},
  {name:'Øhavets stolthed',desc:'Nå dag 170 med omdømme 90 og bådudlejning.',reward:10000,check:s=>s.day>=170&&s.reputation>=90&&s.upgrades.rental},
  {name:'Den travle sæson',desc:'Nå dag 250 med 28 pladser og brændstofkaj.',reward:12000,check:s=>s.day>=250&&s.slips>=28&&s.upgrades.fuel},
  {name:'Havnekaptajn i et år',desc:'Driv havnen gennem 365 dage, og behold 80 i omdømme.',reward:18000,check:s=>s.day>=365&&s.reputation>=80},
  {name:'Den store havn',desc:'Nå dag 500 med 36 pladser og alle faciliteter.',reward:23000,check:s=>s.day>=500&&s.slips>=36&&Object.values(s.upgrades).slice(1).every(Boolean)}
 ];
 const events=[
  {title:'Den lokale kapsejlads',story:'Kapsejladsforeningen vil bruge din havn som samlingspunkt. Et sponsorat koster penge, men kan fylde broerne.',yes:'Støt sejladsen · 650 kr.',no:'Tak nej',cost:650,repYes:6,repNo:-1,bump:5},
  {title:'Storm ved den yderste bro',story:'En gammel fortøjning er ved at give efter. Havnefogeden anbefaler, at du får det repareret, før vinden tager til.',yes:'Reparér nu · 500 kr.',no:'Tag chancen',cost:500,repYes:4,repNo:-6,bump:0,penalty:450},
  {title:'Ren kyst, ren havn',story:'Frivillige vil arrangere en oprydningsdag på stranden. Havnen kan betale for udstyr og forplejning.',yes:'Hjælp til · 430 kr.',no:'Vent til næste gang',cost:430,repYes:5,repNo:0,bump:2},
  {title:'En større bådklub',story:'En bådklub er på langtur og efterspørger samlet plads og en velkomstpakke til en god pris.',yes:'Giv en velkomst · 600 kr.',no:'Hold din pris',cost:600,repYes:5,repNo:-2,bump:6},
  {title:'Havnefest i weekenden',story:'Købmændene vil holde en havnefest. De mangler en samarbejdspartner til musik, lys og skilte.',yes:'Bliv partner · 850 kr.',no:'Hold budgettet',cost:850,repYes:7,repNo:0,bump:9},
  {title:'En sejler har motorproblemer',story:'En gæstebåd har problemer med kølingen. Skal havnen betale for en hurtig bugsering?',yes:'Hjælp sejleren · 400 kr.',no:'Henvis til andre',cost:400,repYes:7,repNo:-3,bump:0},
  {title:'Nye sejlere i området',story:'En lokal sejlerskole spørger, om deres elever må få introduktionsrabat på gæstepladserne.',yes:'Lav en aftale · 700 kr.',no:'Ingen rabat',cost:700,repYes:5,repNo:-1,bump:8},
  {title:'Slidt materiel i havnen',story:'Sikkerhedsgennemgangen afslører, at et stykke af broen bør udskiftes inden næste sæson.',yes:'Udbedr broen · 1.200 kr.',no:'Udsæt arbejdet',cost:1200,repYes:5,repNo:-7,bump:0,penalty:800},
  {title:'Kunst på kajen',story:'Et lokalt galleri foreslår en udstilling på havnefronten. Det kan få flere folk ned til kajen.',yes:'Støt udstilling · 550 kr.',no:'Ikke lige nu',cost:550,repYes:5,repNo:0,bump:5},
  {title:'Besøg af havbiologerne',story:'Biologer vil måle vandkvaliteten og foreslår et informationsskilt ved havnebassinet.',yes:'Deltag · 300 kr.',no:'Sig nej tak',cost:300,repYes:4,repNo:-1,bump:3},
  {title:'Kajen ved solnedgang',story:'En fotograf tilbyder at lave en lille kampagne med billeder fra havnen.',yes:'Køb kampagnen · 450 kr.',no:'Spring over',cost:450,repYes:3,repNo:0,bump:7},
  {title:'Vinterpladser',story:'Lokale bådejere vil gerne leje flere pladser i vinterhalvåret. Forberedelse vil koste lidt nu.',yes:'Gør klar · 900 kr.',no:'Vent til næste år',cost:900,repYes:5,repNo:-1,bump:6}
 ];
 let state;
 let activeTab='havn';
 let canSave=true;
 let installEvent=null;
 let toastTimer;
 function toast(msg){const n=byId('toast'); n.textContent=msg;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),4200);}
 function normalize(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||![1,2].includes(data.version))return null;
  const v=initial();
  if(!Number.isInteger(data.day)||data.day<1||data.day>1000000||!Number.isFinite(data.cash)||Math.abs(data.cash)>1e12||!Number.isFinite(data.reputation)||!data.upgrades||typeof data.upgrades!=='object')return null;
  v.day=data.day;v.cash=clamp(data.cash,-1000000,1e12);v.reputation=clamp(data.reputation,0,100);
  for(const field of ['satisfaction','slips','occupied','price','staff','marketing','boost','lastIncome','lastCost','lastProfit','totalProfit','eventCount'])if(Number.isFinite(data[field]))v[field]=Number(data[field]);
  v.satisfaction=clamp(v.satisfaction,0,100);v.slips=clamp(Math.round(v.slips),12,36);v.occupied=clamp(Math.round(v.occupied),0,v.slips);
  v.price=clamp(Math.round(v.price/25)*25,100,400);v.staff=clamp(Math.round(v.staff),1,6);v.marketing=clamp(Math.round(v.marketing),0,1000000);v.boost=clamp(Math.round(v.boost),0,30);
  v.eventCount=clamp(Math.round(v.eventCount),0,1000000);
  for(const u of upgrades){let level=Number(data.upgrades[u.id]);v.upgrades[u.id]=Number.isFinite(level)?clamp(Math.round(level),0,u.max):0;}
  v.slips=12+v.upgrades.bro*4;
  v.occupied=clamp(v.occupied,0,v.slips);
  if(Array.isArray(data.checkedGoals))v.checkedGoals=[...new Set(data.checkedGoals.filter(n=>Number.isInteger(n)&&n>=0&&n<goals.length))];
  if(Array.isArray(data.log))v.log=data.log.filter(t=>typeof t==='string').slice(0,70).map(t=>t.slice(0,350));
  if(Array.isArray(data.history))v.history=data.history.slice(-120).filter(r=>r&&typeof r==='object'&&Number.isFinite(r.profit)&&Number.isFinite(r.cash)&&Number.isInteger(r.day)).map(r=>({day:clamp(r.day,1,v.day),profit:clamp(r.profit,-1000000,1000000),cash:clamp(r.cash,-1000000,1e12),guests:clamp(Math.round(r.guests)||0,0,36)}));
  if(data.pending&&typeof data.pending==='object'&&Number.isInteger(data.pending.event)&&data.pending.event>=0&&data.pending.event<events.length)v.pending={event:data.pending.event};
  // Version 1 event indices 0..4 correspond to the same events, so prior saves migrate unchanged.
  v.port.visitDay=v.day;
  if(data.port&&typeof data.port==='object'){
   const p=data.port;v.port.collected=Array.isArray(p.collected)?[...new Set(p.collected.filter(n=>Number.isInteger(n)&&n>=0&&n<8))]:[];
   v.port.served=Number.isInteger(p.served)?clamp(p.served,0,1000000):0;
   v.port.visitDay=v.day;
   v.port.visits=p.visitDay===v.day&&Array.isArray(p.visits)?[...new Set(p.visits.filter(n=>Number.isInteger(n)&&n>=0&&n<3))]:[];
   v.port.chapters=Array.isArray(p.chapters)?[...new Set(p.chapters.filter(n=>Number.isInteger(n)&&n>=0&&n<4))]:[];
   v.port.trips=Number.isInteger(p.trips)?clamp(p.trips,0,1000000):0;
   v.port.haulReady=Number.isFinite(p.haulReady)?clamp(p.haulReady,0,Date.now()+30000):0;
   v.port.theme=[0,1,2].includes(p.theme)?p.theme:0;
   if(p.voyage&&[0,1,2].includes(p.voyage.route)&&Number.isInteger(p.voyage.arrival)&&p.voyage.arrival>=1&&p.voyage.arrival<=v.day+5)v.port.voyage={route:p.voyage.route,arrival:p.voyage.arrival};
   if(p.voyage&&[0,1,2].includes(p.voyage.route)&&Number.isFinite(p.voyage.readyAt)&&p.voyage.readyAt>0&&p.voyage.readyAt<=Date.now()+86400000)v.port.voyage={route:p.voyage.route,readyAt:p.voyage.readyAt};
   if(p.building&&upgrades.some(u=>u.id===p.building.id)&&Number.isFinite(p.building.readyAt)&&p.building.readyAt>0&&p.building.readyAt<=Date.now()+86400000)v.port.building={id:p.building.id,readyAt:p.building.readyAt};
  }
  v.factory=normalizeFactory(data.factory);
  v.vessel=normalizeVessel(data.vessel);
  v.campaign=normalizeCampaign(data.campaign,v);
  return v;
 }
 function load(){
  let invalid=false;
  for(const key of [KEY,LEGACY]){
   let raw;
   try{raw=localStorage.getItem(key);}catch{canSave=false;return initial();}
   if(!raw)continue;
   try{
    const parsed=normalize(JSON.parse(raw));
    if(parsed){if(key===LEGACY)toast('Tidligere Havnekaptajnen-fremgang er overført.');return parsed;}
   }catch{}
   invalid=true;
  }
  if(invalid)toast('Gemningen var ugyldig. Spillet starter forfra.');
  return initial();
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));canSave=true;return true;}catch{canSave=false;toast('Gemning er blokeret. Brug eksport til at sikre din fremgang.');return false;}}
 function log(msg){state.log.unshift('Dag '+state.day+': '+msg);state.log=state.log.slice(0,70);}
 function date(){return new Date(Date.UTC(2026,3,1)+(state.day-1)*86400000);}
 function dateLabel(){return new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date());}
 function month(){return date().getUTCMonth();}
 function season(){const m=month();return m>=5&&m<=7?'Højsommer':m===4||m===8?'Sejlsæson':m===3||m===9?'Ydersæson': 'Vinter';}
 function weather(day=state.day){let seed=(day*1217+2431)%13;return ['Sol og blikstille','Let vind','Overskyet','Sommerbyger','Frisk vind','Sol og stille','Tåget morgen','Let brise','Solen bryder frem','Regnbyger','Klar himmel','Blæsende','Tørvejr'][seed];}
 function weatherPenalty(day=state.day){const w=weather(day);return w==='Blæsende'?-.09:w==='Regnbyger'?-.04:0;}
 function demand(day=state.day){
  const monthNum=new Date(Date.UTC(2026,3,1)+(day-1)*86400000).getUTCMonth();
  const seasonEffect=monthNum>=5&&monthNum<=7?.1:monthNum===4||monthNum===8?.04:monthNum>=10||monthNum<=1?-.24:-.06;
  const tooExpensive=Math.max(0,(state.price-175)/25)*.046;
  const amenities=state.upgrades.bad*.075+state.upgrades.power*.065+state.upgrades.cafe*.05+state.upgrades.office*.045+state.upgrades.clean*.015;
  const smallVariation=((((day*13+7)%11)-5)*.014);
  return clamp(.24+state.reputation*.0065+amenities+seasonEffect-tooExpensive+smallVariation+weatherPenalty(day)+(state.marketing>0?.04:0),.05,.97);
 }
 function occupancy(day=state.day){return clamp(Math.round(state.slips*demand(day)+state.boost),0,state.slips);}
 function upcomingMilestone(){return goals.findIndex((g,i)=>!state.checkedGoals.includes(i));}
 function completeGoals(){
  let earned=0;
  goals.forEach((g,i)=>{if(!state.checkedGoals.includes(i)&&g.check(state)){state.checkedGoals.push(i);state.cash+=g.reward;earned+=g.reward;log('Milepæl: '+g.name+'! Du får '+money(g.reward)+' i spilbonus.');}});
  if(earned)toast('Milepæl nået! Bonus: '+money(earned));
 }
 function commit(){completeGoals();completeChapters();save();render();}
 function priceFor(u){return Math.round(u.cost*(u.id==='bro'?Math.pow(1.19,state.upgrades.bro):1)/50)*50;}
 function nextDay(){
  if(state.pending){toast('Du skal tage stilling til havnens hændelse først.');return;}
  state.day++;state.port.visitDay=state.day;state.port.visits=[];
  const guests=occupancy();state.occupied=guests;
  const sunny=/Sol|Klar|blikstille/.test(weather());
  const extra=guests*(state.upgrades.power*25+state.upgrades.bad*12)
   +(state.upgrades.cafe?Math.round(guests*54+95):0)
   +(state.upgrades.workshop?340:0)
   +(state.upgrades.sauna?200:0)
   +(state.upgrades.rental?(sunny?460:180):0)
   +(state.upgrades.fuel?360:0);
  const revenue=guests*state.price+extra;
  const maintenance=390+state.staff*270+state.slips*14+state.upgrades.bro*55
   +(state.upgrades.cafe?240:0)+(state.upgrades.workshop?190:0)+(state.upgrades.clean?75:0)
   +(state.upgrades.sauna?90:0)+(state.upgrades.rental?145:0)+(state.upgrades.office?65:0)+(state.upgrades.fuel?155:0);
  const repair=state.day%13===0?240:0;
  const costs=maintenance+repair;
  const profit=revenue-costs;
  state.cash+=profit;state.totalProfit+=profit;state.lastIncome=revenue;state.lastCost=costs;state.lastProfit=profit;
  const crowding=guests>8*state.staff?-(guests-8*state.staff)*2:0;
  const satisfaction=clamp(Math.round(54+state.staff*5+state.upgrades.bad*11+state.upgrades.power*8+state.upgrades.clean*8+state.upgrades.cafe*5+state.upgrades.sauna*5-Math.max(0,state.price-200)*.18+crowding+(state.marketing?2:0)),5,99);
  state.satisfaction=satisfaction;
  state.reputation=clamp(state.reputation+clamp(Math.round((satisfaction-58)/12),-3,4),0,100);
  if(state.marketing)state.marketing--;
  if(state.boost)state.boost=Math.max(0,state.boost-2);
  state.history.push({day:state.day,profit,cash:Math.round(state.cash),guests});state.history=state.history.slice(-120);
  log('Der kom '+guests+' gæstebåde. Indtægt '+money(revenue)+', driftsudgifter '+money(costs)+', dagens resultat '+money(profit)+'.');
  if(state.day%6===0){state.pending={event:state.eventCount%events.length};state.eventCount++;}
  if(state.cash<-12000){state.cash=3500;state.reputation=clamp(state.reputation-12,0,100);log('Krisemøde: havnefonden stiller en nødkredit til rådighed i spillet. Omdømmet falder.');}
  commit();
 }
 function eventChoice(action){
  if(!state.pending)return;
  const e=events[state.pending.event];
  if(action==='yes'){
   if(state.cash<e.cost){toast('Du har ikke råd til den løsning.');return;}
   state.cash-=e.cost;state.reputation=clamp(state.reputation+e.repYes,0,100);state.boost+=e.bump;log('Beslutning: '+e.yes+'. Omdømmet ændrede sig.');
  } else {
   state.reputation=clamp(state.reputation+e.repNo,0,100);
   if(e.penalty){state.cash-=e.penalty;log('Udskydelsen gav senere ekstra reparationer for '+money(e.penalty)+'.');}
   log('Beslutning: '+e.no+'.');
  }
  state.pending=null;commit();
 }
 function upgrade(id){
  const u=upgrades.find(x=>x.id===id);if(!u)return;
  const cost=priceFor(u);
  if(state.port.building){toast('Byggeholdet arbejder allerede. Tag imod gæster eller send forsyningsbåden ud imens.');return;}
  if(state.day<u.unlock||state.upgrades[id]>=u.max||state.cash<cost){toast('Projektet er endnu ikke tilgængeligt eller du mangler penge.');return;}
  state.cash-=cost;state.port.building={id,readyAt:Date.now()+buildSeconds(id)*1000};
  log('Byggeholdet starter '+u.name.toLowerCase()+'. Betalt '+money(cost)+'.');commit();
 }
 function buildSeconds(id){return id==='bro'?30:id==='bad'||id==='power'?20:60;}
 function ready(v){return v.readyAt?Date.now()>=v.readyAt:state.day>=v.arrival;}
 function timeLeft(until){const sec=Math.max(0,Math.ceil((until-Date.now())/1000));return sec>=60?Math.floor(sec/60)+' min '+sec%60+' sek':sec+' sek';}
 function countdown(until){return `<span data-countdown="${until}">${timeLeft(until)}</span>`;}
 function constructionPanel(){
  const b=state.port.building;if(!b)return '';
  const u=upgrades.find(u=>u.id===b.id);
  return `<section class="panel construction"><span class="eyebrow">BYGGEHOLDET ER I GANG</span><h2>${esc(u.name)}</h2><div class="construction-art" aria-hidden="true">🏗️ <span>🔨</span> 🧱</div><p>Færdigt om ${countdown(b.readyAt)}. Arbejdet fortsætter, mens du er væk.</p><button class="btn primary" data-act="finish-build" data-ready="${b.readyAt}" ${ready(b)?'':'disabled'}>Åbn bygningen</button><p class="smallprint">Tag imod gæster, justér driften eller tag en sejltur imens.</p></section>`;
 }
 function arrivalAnimation(color){
  const n=byId('arrival-show');if(!n)return;
  n.innerHTML='<div class="arrival-boat">'+boatArt(color)+'</div><span>Velkommen i havn!</span>';n.classList.remove('sailing-in');void n.offsetWidth;n.classList.add('sailing-in');
  setTimeout(()=>{n.classList.remove('sailing-in');n.innerHTML='';},2600);
 }
 function updateClocks(){
  document.querySelectorAll('[data-countdown]').forEach(n=>{n.textContent=timeLeft(Number(n.dataset.countdown));});
  document.querySelectorAll('button[data-ready]').forEach(n=>{n.disabled=Date.now()<Number(n.dataset.ready)||((n.dataset.act?.startsWith('factory-')||n.dataset.act?.startsWith('gear-')||n.dataset.act?.startsWith('refit-')||n.dataset.act?.startsWith('expedition-'))?false:!!state.pending);});
  sailingTick();
 }
 function action(kind,value){
  if(kind==='tab'){worldPanel='';activeTab=value;render();window.scrollTo({top:0,behavior:'smooth'});return;}
  if(['story-','refit-','expedition-','sail-'].some(prefix=>kind.startsWith(prefix))){campaignAction(kind,value);return;}
  if(kind.startsWith('world-')||kind.startsWith('gear-')||kind==='boat-select'){worldAction(kind,value);return;}
  if(kind==='berth'){
   const n=Number(value);const hasBoat=n<=state.occupied;const types=['sejlbåd','motorbåd','kutter','katamaran'];
   toast('Plads '+n+': '+(hasBoat?'En '+types[(state.day+n*3)%types.length]+' ligger ved kajen.':'Ledig gæsteplads.'));
   return;
  }
  if(kind==='export'){exportSave();return;}
  if(kind==='import'){byId('import-file').click();return;}
  if(kind==='reset'){
   if(window.confirm('Vil du starte en helt ny havn? Din nuværende fremgang overskrives. Gem eventuelt en sikkerhedskopi først.')){
    state=initial();activeTab='havn';worldPanel='';commit();toast('Velkommen til din nye havn!');
   }
   return;
  }
  if(kind.startsWith('factory-')){factoryAction(kind,value);return;}
  if(state.pending&&kind!=='event'){toast('Vælg først, hvad der skal ske med dagens hændelse.');return;}
  if(kind==='event'){eventChoice(value);return;}
  if(portAction(kind,value))return;
  if(kind==='day'){nextDay();return;}
  if(kind==='upgrade'){upgrade(value);return;}
  if(kind==='price'){
   const old=state.price;state.price=clamp(state.price+(value==='more'?25:-25),100,400);
   if(state.price!==old){log('Gæsteprisen blev sat til '+money(state.price)+'.');commit();}return;
  }
  if(kind==='staff'){
   const old=state.staff;state.staff=clamp(state.staff+(value==='more'?1:-1),1,6);
   if(state.staff!==old){log('Bemanding ændret til '+state.staff+' person(er).');commit();}return;
  }
  if(kind==='market'){
   if(state.cash<550){toast('Der er ikke penge nok til markedsføring.');return;}
   state.cash-=550;state.marketing+=4;state.reputation=clamp(state.reputation+2,0,100);log('Du har betalt '+money(550)+' for fire dages markedsføring.');commit();return;
  }
 }
 const captains=[
  {name:'Alma',boat:'Svalen',type:'Folkebåd',color:'#fff5da',need:'bad',wish:'Et varmt bad efter en lang tur',tip:140},
  {name:'Otto',boat:'Morgenfangst',type:'Fiskekutter',color:'#e77a54',need:'workshop',wish:'Min motor trænger til et eftersyn',tip:220},
  {name:'Liv',boat:'Nordlys',type:'Katamaran',color:'#78cad0',need:'power',wish:'Strøm til kahytten, tak',tip:180},
  {name:'Sofie',boat:'Lille My',type:'Jolle',color:'#f4c95d',need:'cafe',wish:'Kaffe og en plads i solen',tip:160},
  {name:'Malik',boat:'Horisont',type:'Langtursbåd',color:'#7490c9',need:'bad',wish:'En frisk start efter nattens sejlads',tip:190},
  {name:'Freja',boat:'Tangloppen',type:'Kajak',color:'#b5ce85',need:'clean',wish:'En ren kyst er den bedste kyst',tip:120},
  {name:'Viggo',boat:'Ravnen',type:'Veteranbåd',color:'#bc846c',need:'sauna',wish:'Varme i kroppen efter havets kulde',tip:240},
  {name:'Nora',boat:'Solstrejf',type:'Motorbåd',color:'#eee6d9',need:'fuel',wish:'Brændstof til næste ø',tip:260}
 ];
 const routes=[{name:'Post til Mågeø',cost:300,reward:680,days:2,desc:'En sikker levering. 380 kr. i overskud.'},{name:'Varer til Fyrø',cost:650,reward:1350,days:3,desc:'Større last. 700 kr. i overskud.'},{name:'Øhavets ekspedition',cost:1200,reward:2500,days:5,desc:'Lang tur. 1.300 kr. i overskud.'}];
 const chapters=[
  {name:'Velkommen ombord',desc:'Tag imod 3 gæster ved anløbsbroen.',check:()=>state.port.served>=3,reward:750},
  {name:'Et sted at høre til',desc:'Saml 4 bådtyper og byg et badehus.',check:()=>state.port.collected.length>=4&&state.upgrades.bad,reward:1600},
  {name:'Ud i øhavet',desc:'Fuldfør 2 sejlture og byg en ny flydebro.',check:()=>state.port.trips>=2&&state.upgrades.bro,reward:2400},
  {name:'Havnens hjerte',desc:'Saml alle 8 bådtyper og åbn en café.',check:()=>state.port.collected.length===8&&state.upgrades.cafe,reward:4000}
 ];
 function completeChapters(){chapters.forEach((c,i)=>{if(!state.port.chapters.includes(i)&&c.check()){state.port.chapters.push(i);state.cash+=c.reward;log('Kapitel fuldført: '+c.name+'. Belønning '+money(c.reward));toast('✓ '+c.name+' · '+money(c.reward));}});}
 function visitorIndex(slot){return (state.day-1+slot*3)%captains.length;}
 function portAction(kind,value){
  if(kind==='welcome'){
   const slot=Number(value);if(!Number.isInteger(slot)||slot<0||slot>2||state.port.visits.includes(slot))return true;
   const id=visitorIndex(slot),c=captains[id],happy=!!state.upgrades[c.need],reward=80+(happy?c.tip:0);
   state.port.visits.push(slot);state.port.served++;state.cash+=reward;state.reputation=clamp(state.reputation+(happy?2:1),0,100);
   if(!state.port.collected.includes(id))state.port.collected.push(id);
   log(c.name+' anløb med '+c.boat+'. Velkomsthandel '+money(reward)+'.');commit();arrivalAnimation(c.color);toast(c.name+': '+(happy?'Præcis hvad jeg drømte om!':'Tak for en venlig velkomst!')+' +'+money(reward));return true;
  }
  if(kind==='voyage'){
   const n=Number(value),r=routes[n];if(!r||state.port.voyage||state.cash<r.cost)return true;
   state.cash-=r.cost;state.port.voyage={route:n,readyAt:Date.now()+[30,90,180][n]*1000};log('Forsyningsbåden sejlede: '+r.name+'.');commit();return true;
  }
  if(kind==='claim'){
   const v=state.port.voyage;if(!v||!ready(v))return true;
   const r=routes[v.route];state.cash+=r.reward;state.port.trips++;state.port.voyage=null;log(r.name+' fuldført. Lasten gav '+money(r.reward)+'.');commit();toast('Forsyningsbåden er hjemme · +'+money(r.reward));return true;
  }
  if(kind==='haul'){
   if(Date.now()<state.port.haulReady)return true;
   const phase=(Date.now()%1800)/900,pos=phase<=1?phase:2-phase,hit=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||(pos>=.35&&pos<=.65),reward=hit?140:60;
   state.cash+=reward;state.port.haulReady=Date.now()+30000;log('Last losset på kajen. '+(hit?'Perfekt placering! ':'')+money(reward)+'.');commit();toast((hit?'Perfekt landing!':'Lasten er i land.')+' +'+money(reward));return true;
  }
  if(kind==='finish-build'){
   const b=state.port.building;if(!b||!ready(b))return true;
   const u=upgrades.find(u=>u.id===b.id);state.upgrades[b.id]=Math.min(u.max,state.upgrades[b.id]+1);if(b.id==='bro')state.slips=12+state.upgrades.bro*4;
   state.reputation=clamp(state.reputation+(b.id==='clean'?3:1),0,100);state.port.building=null;log(u.name+' åbnet!');commit();toast('✓ '+u.name+' er klar til gæsterne!');return true;
  }
  if(kind==='theme'){const n=Number(value);if([0,1,2].includes(n)){state.port.theme=n;commit();}return true;}return false;
 }
 function boatArt(color='#fff5da'){
  const type=captains.find(c=>c.color===color)?.type;
  let top='<path d="M51 13 V71" stroke="#694b39" stroke-width="3"/><path d="M46 20 L46 65 H20Z" fill="#fff9ec"/><path d="M56 29 L78 65 H56Z" fill="'+color+'"/>';
  if(['Fiskekutter','Motorbåd','Veteranbåd'].includes(type))top='<rect x="34" y="40" width="34" height="31" rx="4" fill="'+color+'"/><rect x="39" y="47" width="23" height="10" fill="#486b7b"/><path d="M45 40V28H58V40" fill="#7b5c50"/>';
  if(type==='Kajak')top='<ellipse cx="50" cy="68" rx="9" ry="13" fill="#634c46"/><path d="M16 51L84 84" stroke="#eacaa0" stroke-width="5"/>';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="86" rx="36" ry="7" fill="#137c8c" opacity=".25"/><path d="M18 72 Q50 88 83 70 L75 86 H28Z" fill="${color}"/>${top}</svg>`;
 }
 const goods={fish:{name:'Fisk',icon:'🐟'},smoked:{name:'Røget fisk',icon:'🥫'},wood:{name:'Drivtømmer',icon:'🪵'},plank:{name:'Planker',icon:'📦'},beans:{name:'Kaffebønner',icon:'🫘'},coffee:{name:'Kaffe',icon:'☕'}};
 const recipes=[
  {id:'fish',station:'fishing',name:'Sæt garn',seconds:12,out:2,cost:30,inputs:{},unlock:0},
  {id:'smoked',station:'fishing',name:'Røg fangsten',seconds:25,out:2,cost:20,inputs:{fish:2},unlock:1},
  {id:'wood',station:'workshop',name:'Bjærg drivtømmer',seconds:16,out:2,cost:40,inputs:{},unlock:0},
  {id:'plank',station:'workshop',name:'Sav planker',seconds:24,out:2,cost:20,inputs:{wood:2},unlock:0},
  {id:'beans',station:'cafe',name:'Hent kaffebønner',seconds:20,out:2,cost:35,inputs:{},unlock:1},
  {id:'coffee',station:'cafe',name:'Bryg kaffe',seconds:22,out:2,cost:20,inputs:{beans:2},unlock:1}
 ];
 const requests=[
  {name:'Almas første fangst',person:'Alma',boat:'Svalen',text:'Mågeø mangler frisk fisk til aftensmaden.',needs:{fish:2},cash:420,tokens:2,tier:0},
  {name:'Ottos bådehus',person:'Otto',boat:'Morgenfangst',text:'Vinteren tog mit bådehus. Kan du skaffe nyt træ?',needs:{wood:2},cash:480,tokens:2,tier:0},
  {name:'En ny anløbsbro',person:'Liv',boat:'Nordlys',text:'Vi mangler planker til en sikker bro på Mågeø.',needs:{plank:2},cash:650,tokens:3,tier:0},
  {name:'Morgenkaffe på Fyrø',person:'Nora',boat:'Solstrejf',text:'Fyrpasseren har haft nattevagt. En varm kop gør underværker.',needs:{coffee:2},cash:720,tokens:3,tier:1},
  {name:'Øens lille marked',person:'Sofie',boat:'Lille My',text:'Folk glæder sig til røget fisk og kaffe på torvet.',needs:{smoked:2,coffee:2},cash:1150,tokens:5,tier:1},
  {name:'Frejas kystprojekt',person:'Freja',boat:'Tangloppen',text:'Vi bygger redekasser og får en snack efter arbejdet.',needs:{plank:2,fish:2},cash:880,tokens:4,tier:0},
  {name:'Veteranbådens dæk',person:'Viggo',boat:'Ravnen',text:'Ravnen skal kunne sejle igen. Jeg har brug for et nyt dæk.',needs:{plank:4},cash:1050,tokens:5,tier:1},
  {name:'Varmt lys i fyret',person:'Malik',boat:'Horisont',text:'Materialer og kaffe til holdet, der redder det gamle fyr.',needs:{plank:2,coffee:4},cash:1450,tokens:6,tier:2},
  {name:'Øhavets frokost',person:'Alma',boat:'Svalen',text:'Vi samler hele øen til frokost ved den nye kaj.',needs:{smoked:4,coffee:2},cash:1500,tokens:6,tier:2},
  {name:'Fyrfestens sidste last',person:'Liv',boat:'Nordlys',text:'Lys, varm kaffe og god mad. Hele øhavet kommer!',needs:{plank:4,smoked:4,coffee:4},cash:2300,tokens:9,tier:4}
 ];
 const restorations=[
  {name:'Åbn den gamle havnefront',story:'Alma: Min bedstefar fortøjede Svalen lige her. Lad os få liv på kajen igen.',needs:{plank:2},tokens:2,seconds:20},
  {name:'Restaurér værkstedet',story:'Otto: Med et ordentligt værksted kan vi arbejde hurtigere og hjælpe flere både.',needs:{plank:4,smoked:2},tokens:8,seconds:40},
  {name:'Åbn caféens terrasse',story:'Sofie: Jeg har gemt de gamle borde. Nu skal vi bare have et sted at stille dem.',needs:{plank:4,coffee:4},tokens:14,seconds:60},
  {name:'Tænd lyset på Fyrø',story:'Nora: Fyret har været mørkt i årevis. Nu kan vi få hele øhavet hjem i sikkerhed.',needs:{plank:6,smoked:4,coffee:4},tokens:20,seconds:90}
 ];
 function freshFactory(){return {stock:{fish:0,smoked:0,wood:0,plank:0,beans:0,coffee:0},jobs:{fishing:null,workshop:null,cafe:null},delivery:null,project:null,restored:0,tokens:0,completed:0,route:0,seen:[]};}
 function normalizeFactory(raw){
  const f=freshFactory();if(!raw||typeof raw!=='object')return f;
  for(const g of Object.keys(goods))if(Number.isInteger(raw.stock?.[g]))f.stock[g]=clamp(raw.stock[g],0,100000);
  for(const k of ['restored','tokens','completed'])if(Number.isInteger(raw[k]))f[k]=clamp(raw[k],0,k==='restored'?4:100000);
  f.route=raw.route===1?1:0;f.seen=Array.isArray(raw.seen)?[...new Set(raw.seen.filter(n=>Number.isInteger(n)&&n>=0&&n<requests.length))]:[];
  const validTime=t=>Number.isFinite(t)&&t>0&&t<=Date.now()+86400000;
  for(const station of Object.keys(f.jobs)){const j=raw.jobs?.[station];if(j&&recipes.some(r=>r.id===j.recipe&&r.station===station)&&validTime(j.readyAt))f.jobs[station]={recipe:j.recipe,readyAt:j.readyAt};}
  const d=raw.delivery;if(d&&Number.isInteger(d.order)&&requests[d.order]&&[0,1].includes(d.route)&&validTime(d.readyAt)){f.delivery={order:d.order,route:d.route,readyAt:d.readyAt};if(Number.isFinite(d.cash)&&d.cash>=0&&d.cash<=10000)f.delivery.cash=Math.round(d.cash);if(Number.isInteger(d.tokens)&&d.tokens>=0&&d.tokens<=20)f.delivery.tokens=d.tokens;}
  const p=raw.project;if(p&&p.level===f.restored&&p.level<4&&validTime(p.readyAt))f.project={level:p.level,readyAt:p.readyAt};return f;
 }
 function hasGoods(needs){return Object.entries(needs).every(([g,n])=>state.factory.stock[g]>=n);}
 function spendGoods(needs){Object.entries(needs).forEach(([g,n])=>state.factory.stock[g]-=n);}
 function goodsLine(needs){return Object.entries(needs).map(([g,n])=>`${goods[g].icon} ${n} ${goods[g].name}`).join(' · ');}
 function availableOrders(){const pool=requests.map((r,i)=>i).filter(i=>requests[i].tier<=state.factory.restored);const list=[0,1,2].map(n=>pool[(state.factory.completed+n)%pool.length]);if(state.factory.restored===4&&!state.factory.seen.includes(9)&&!list.includes(9))list[2]=9;return list;}
 function factoryAction(kind,value){
  const f=state.factory;
  if(kind==='factory-produce'){
   const r=recipes.find(r=>r.id===value);if(!r||f.jobs[r.station]||f.restored<r.unlock||!hasGoods(r.inputs)||state.cash<r.cost)return;
   spendGoods(r.inputs);state.cash-=r.cost;f.jobs[r.station]={recipe:r.id,readyAt:Date.now()+Math.round(r.seconds*(f.restored>=2?.8:1))*1000};commit();return;
  }
  if(kind==='factory-collect'){
   const j=f.jobs[value];if(!j||!ready(j))return;const r=recipes.find(r=>r.id===j.recipe);f.stock[r.id]=Math.min(100000,f.stock[r.id]+r.out);f.jobs[value]=null;if(r.id==='fish')state.campaign.gathered+=r.out;commit();playTone('reward');toast('+'+r.out+' '+goods[r.id].name+' på lager');return;
  }
  if(kind==='factory-route'){if([0,1].includes(Number(value))){f.route=Number(value);commit();}return;}
  if(kind==='factory-send'){
   const n=Number(value),r=requests[n];if(!Number.isInteger(n)||!r||!availableOrders().includes(n)||boatUnavailable()||!hasGoods(r.needs))return;
   const quote=tripQuote(n,f.route);state.campaign.sail=null;spendGoods(r.needs);f.delivery={order:n,route:f.route,readyAt:Date.now()+quote.seconds*1000,cash:quote.cash,tokens:quote.tokens};worldPanel='orders';log(r.boat+' afsejlede med '+goodsLine(r.needs)+'.');commit();arrivalAnimation('#78cad0');return;
  }
  if(kind==='factory-return'){
   const d=f.delivery;if(!d||!ready(d))return;const r=requests[d.order],quote=deliveryQuote(d),reward=quote.cash+sailingBonus(d),tokens=quote.tokens;
   state.cash+=reward;f.tokens=Math.min(100000,f.tokens+tokens);f.completed++;if(!f.seen.includes(d.order))f.seen.push(d.order);f.delivery=null;state.campaign.sail=null;if(activeTab==='sejl'){activeTab='havn';worldPanel='orders';}playTone('reward');log('Levering fuldført: '+r.name+'. '+money(reward)+' og '+tokens+' havnemærker.');commit();toast('Leveret! +'+money(reward)+' · +'+tokens+' havnemærker');return;
  }
  if(kind==='factory-restore'){
   const r=restorations[f.restored];if(!r||f.project||f.tokens<r.tokens||!hasGoods(r.needs))return;spendGoods(r.needs);f.tokens-=r.tokens;f.project={level:f.restored,readyAt:Date.now()+r.seconds*1000};commit();return;
  }
  if(kind==='factory-open'){
   if(!f.project||!ready(f.project))return;const r=restorations[f.restored];f.project=null;f.restored++;log('Restaureret: '+r.name+'.');commit();toast('Nyt område åbnet! '+['Café og røgeri er klar','Produktion går nu 20% hurtigere','Nye ordrer fra øhavet','Fyrø lyser igen'][f.restored-1]);return;
  }
 }
 function factoryStats(){const f=state.factory;return `<div class="factory-top"><div><span class="eyebrow">ØHAVETS HAVN · KAPITEL ${Math.min(4,f.restored+1)}</span><h1>${['Den glemte kaj','Liv på havnefronten','Et sted at samles','Lyset i øhavet','Hjem til din havn'][f.restored]}</h1></div><div class="factory-wallet"><strong>${money(state.cash)}</strong><span>⚓ ${f.tokens} havnemærker · ${f.completed} leveringer</span></div></div><div class="stock-strip" aria-label="Dit lager">${Object.entries(goods).map(([g,v])=>`<div><span>${v.icon}</span><b>${f.stock[g]}</b><small>${v.name}</small></div>`).join('')}</div>`;}
 function productionPanel(){const f=state.factory;return `<section class="panel"><span class="eyebrow">FREMSTIL · HENT · LEVÉR</span><h2>Der er liv på kajen</h2><p>Vælg, hvad hvert hold skal lave. Råvarer bliver til bedre varer. Arbejdet fortsætter, når du lukker spillet.</p><div class="production-grid">${[['fishing','Fiskeriet','🐟'],['workshop','Værkstedet','🪚'],['cafe','Havnecaféen','☕']].map(([station,name,icon])=>{const j=f.jobs[station],locked=station==='cafe'&&f.restored===0;return `<article class="station ${j?'working':''}"><span class="station-icon">${icon}</span><h3>${name}</h3>${locked?'<p>Åbn havnefronten for at invitere Sofie og hendes café.</p>':j?`<p>${goods[j.recipe].name} · ${countdown(j.readyAt)}</p><div class="work-animation" aria-hidden="true"><i></i><i></i><i></i></div><button class="btn primary" data-act="factory-collect" data-val="${station}" data-ready="${j.readyAt}" ${ready(j)?'':'disabled'}>Hent ${recipes.find(r=>r.id===j.recipe).out} ${goods[j.recipe].name}</button>`:recipes.filter(r=>r.station===station).map(r=>`<div class="recipe"><strong>${r.name} → ${r.out} ${goods[r.id].name}</strong><small>${Object.keys(r.inputs).length?goodsLine(r.inputs):'Ingen råvarer kræves'} · ${money(r.cost)} · ${Math.round(r.seconds*(f.restored>=2?.8:1))} sek.</small><button class="btn subtle" data-act="factory-produce" data-val="${r.id}" ${f.restored<r.unlock||!hasGoods(r.inputs)||state.cash<r.cost?'disabled':''}>${f.restored<r.unlock?'Åbner efter restaurering':'Start produktion'}</button></div>`).join('')}</article>`;}).join('')}</div></section>`;}
 function orderPanel(){const f=state.factory,d=f.delivery;return `<section class="panel order-panel"><span class="eyebrow">BÅDE MED ET ÆRINDE</span><h2>${d?'På vej gennem øhavet':'Vælg din næste levering'}</h2>${d?`<div class="sailing-card">${boatArt('#78cad0')}<div><h3>${requests[d.order].name}</h3><p>${d.route?'Øruten':'Kystruten'} · ${countdown(d.readyAt)}</p><button class="btn gold" data-act="sail-start">${state.campaign.sail?.finished?'Se din sejlads':'Styr båden selv · ekstra belønning'}</button><button class="btn primary" data-act="factory-return" data-ready="${d.readyAt}" ${ready(d)?'':'disabled'}>Hent ${deliveryQuote(d).cash+sailingBonus(d)} havnekroner og ${deliveryQuote(d).tokens} mærker</button></div></div>`:`<div class="route-choice"><button class="btn ${f.route===0?'primary':'subtle'}" data-act="factory-route" data-val="0">Kyst · ${tripQuote(0,0).seconds} sek.</button><button class="btn ${f.route===1?'primary':'subtle'}" data-act="factory-route" data-val="1">Øruten · ${tripQuote(0,1).seconds} sek. · større belønning</button></div><div class="orders-grid">${availableOrders().map(n=>{const r=requests[n],q=tripQuote(n,f.route);return `<article class="order-card"><span class="soft-label">${r.person} · ${r.boat}</span><h3>${r.name}</h3><p>“${r.text}”</p><div class="order-needs">${Object.entries(r.needs).map(([g,num])=>`<span class="${f.stock[g]>=num?'stock-enough':'stock-missing'}">${goods[g].icon} ${f.stock[g]}/${num} ${goods[g].name}</span>`).join('')}</div><small>${q.cash} havnekroner · ${q.tokens} mærker</small><button class="btn primary" data-act="factory-send" data-val="${n}" ${hasGoods(r.needs)&&!boatUnavailable()?'':'disabled'}>Last båden og sejl</button></article>`;}).join('')}</div>${boatUnavailable()?'<p>Båden skal være hjemme og færdig i værkstedet, før du sejler.</p>':''}`}</section>`;}
 function restorationPanel(){const f=state.factory,r=restorations[f.restored],p=f.project;return `<section class="panel restoration"><span class="eyebrow">${f.restored}/4 OMRÅDER RESTAURERET</span><h2>${r?r.name:'Fyret lyser. Havnen er hjemme.'}</h2>${r?`<p>${r.story}</p>${p?`<div class="construction-art" aria-hidden="true">🏗️ <span>🔨</span> 🧱</div><p>Holdet arbejder · ${countdown(p.readyAt)}</p><button class="btn primary" data-act="factory-open" data-ready="${p.readyAt}" ${ready(p)?'':'disabled'}>Åbn det restaurerede område</button>`:`<p class="restore-needs">${goodsLine(r.needs)} · ⚓ ${r.tokens} havnemærker · ${r.seconds} sek.</p><button class="btn gold" data-act="factory-restore" ${!hasGoods(r.needs)||f.tokens<r.tokens?'disabled':''}>Start restaureringen</button><p class="smallprint">${['Åbner café, kaffe og røget fisk.','Alle nye produktioner bliver 20% hurtigere.','Nye ordrer og større leveringer åbner.','Øhavets fyr og den sidste store fest åbner.'][f.restored]}</p>`}`:'<p>Fortsæt med at levere til øhavet, samle historier og forme din havn. Alle ti ordretyper er nu tilgængelige.</p>'}<div class="restoration-progress">${restorations.map((r,i)=>`<span class="${i<f.restored?'done':''}">${i<f.restored?'✓':i+1} ${r.name}</span>`).join('')}</div></section>`;}
 function productionTab(){return `<div class="production-layout"><div class="production-main"><div class="production-guide">Start med fisk og træ. Hent varerne, send en båd, og brug havnemærker og planker til at åbne havnefronten.</div>${harborMap()}${productionPanel()}${orderPanel()}</div><aside>${restorationPanel()}<section class="panel"><h3>Havnefogedens første råd</h3><p>${state.factory.restored===0?'Start med at sætte garn. Hent de 2 fisk, last Almas båd, og vælg en rute. Bjærg samtidig træ og sav planker til havnefronten.':'Fremstil forskellige varer samtidig. En lang rute giver mere, men optager din leveringsbåd længere.'}</p><p>Du har oplevet ${state.factory.seen.length} af 10 ordretyper.</p></section></aside></div>`;}
 function restorationTab(){return `${restorationPanel()}${stylePanel()}<details class="panel legacy-management"><summary>Tidligere havnedrift og investeringer</summary><p>Din tidligere havn er bevaret. Her findes de oprindelige investeringer.</p>${buildtab()}</details>`;}

 const fittings=[
 {id:'navigation',slot:'Navigation',name:'Garmin ECHOMAP UHD2 62sv Touch',short:'Garmin kortplotter',symbol:'⌖',cost:900,seconds:18,benefit:'20% kortere leveringstid.',url:'https://sejlstroem.dk/collections/garmin-kortplottere-navigation/products/garmin-echomap-uhd2-62sv-touch?variant=56914504221047'},
 {id:'battery',slot:'Batterirum',name:'SejlStrøm Lithium Complete 100',short:'Lithium-pakke',symbol:'ϟ',cost:1100,seconds:24,benefit:'+1 havnemærke pr. levering.',url:'https://sejlstroem.dk/products/sejlstroem-lithium-complete-100?variant=57415545127287'},
 {id:'solar',slot:'Kahyttag',name:'SUNBEAM Tough 111',short:'SUNBEAM solpanel',symbol:'☀',cost:800,seconds:20,benefit:'+10% havnekroner fra alle leveringer.',url:'https://sejlstroem.dk/products/sunbeam-tough-111-w-solpanel-flush-111-w-semi-fleksibeltt-1060-x-540-x-3-mm?variant=56981327151479'},
 {id:'heater',slot:'Kahyt',name:'AUTOTERM Air 2D – komplet varmersæt',short:'AUTOTERM varme',symbol:'♨',cost:700,seconds:22,benefit:'+15% havnekroner fra ordrer med kaffe.',url:'https://sejlstroem.dk/products/autoterm-air-2d-komplet?variant=57439834407287'}
 ];
 const hulls=[{id:'svalen',name:'Svalen',color:'teal'},{id:'nordlys',name:'Nordlys',color:'blue'},{id:'ravnen',name:'Ravnen',color:'copper'}];
 let worldPanel='',selectedFitting='navigation';
 function freshVessel(){return {hull:'svalen',owned:[],fitted:[],installation:null};}
 function normalizeVessel(raw){const v=freshVessel();if(!raw||typeof raw!=='object')return v;if(hulls.some(h=>h.id===raw.hull))v.hull=raw.hull;v.owned=Array.isArray(raw.owned)?[...new Set(raw.owned.filter(id=>fittings.some(e=>e.id===id)))]:[];v.fitted=Array.isArray(raw.fitted)?[...new Set(raw.fitted.filter(id=>v.owned.includes(id)))]:[];const j=raw.installation;if(j&&fittings.some(e=>e.id===j.id)&&!v.owned.includes(j.id)&&Number.isFinite(j.readyAt)&&j.readyAt>0&&j.readyAt<=Date.now()+86400000)v.installation={id:j.id,readyAt:j.readyAt};return v;}
 function fitted(id){return state.vessel.fitted.includes(id);}
 function tripQuote(n,route){const r=requests[n];return {cash:Math.round(r.cash*(route?1.25:1)*(1+(fitted('solar')?.1:0)+(fitted('heater')&&r.needs.coffee?.15:0)+state.campaign.upgrades.cargo*.08)),tokens:r.tokens+(route?1:0)+(fitted('battery')?1:0),seconds:Math.round((route?60:20)*(fitted('navigation')?.8:1)*(1-state.campaign.upgrades.engine*.05))};}
 function deliveryQuote(d){return {cash:d.cash??Math.round(requests[d.order].cash*(d.route?1.25:1)),tokens:d.tokens??requests[d.order].tokens+(d.route?1:0)};}
 function worldAction(kind,value){
  if(kind==='world-open'){worldPanel=value;if(value==='inventory'&&!['havn','vaerksted'].includes(activeTab))activeTab='havn';render();return;}
  if(kind==='world-close'){worldPanel='';render();return;}
  if(kind==='gear-select'){selectedFitting=value;worldPanel='equipment';render();return;}
  if(kind==='boat-select'){if(hulls.some(h=>h.id===value)&&!boatUnavailable()){state.vessel.hull=value;commit();}return;}
  if(kind==='gear-fit'){
   const g=fittings.find(g=>g.id===value),v=state.vessel;if(!g||boatUnavailable()||v.fitted.includes(g.id))return;
   if(v.owned.includes(g.id)){v.fitted.push(g.id);commit();toast(g.short+' monteret');return;}
   if(state.cash<g.cost)return;state.cash-=g.cost;v.installation={id:g.id,readyAt:Date.now()+g.seconds*1000};commit();return;
  }
  if(kind==='gear-finish'){const v=state.vessel,j=v.installation;if(!j||!ready(j))return;v.owned.push(j.id);v.fitted.push(j.id);v.installation=null;commit();toast('Udstyret er monteret. Klar til næste tur!');return;}
  if(kind==='gear-remove'){const v=state.vessel;if(boatUnavailable())return;v.fitted=v.fitted.filter(id=>id!==value);commit();return;}
 }
 function worldHud(){return `<div class="world-hud"><div class="world-title"><span>DIT LILLE STYKKE ØHAV</span><h1>${activeTab==='vaerksted'?'Havneværkstedet':'Havnekaptajnen'}</h1></div><div class="world-currency"><b>${num(state.cash)} <small>havnekroner</small></b><span>⚓ ${state.factory.tokens} mærker</span></div><button class="hud-inventory" data-act="world-open" data-val="inventory" aria-label="Åbn lager">▦ <span>Lager</span></button></div>`;}
 function marker(label,place,value,extra=''){return `<button class="world-marker ${place} ${extra}" data-act="${value==='vaerksted'?'tab':'world-open'}" data-val="${value}"><span class="marker-dot">${place==='m-workshop'?'⚒':'+'}</span><strong>${label}</strong></button>`;}
 function stationBubble(station,position){const j=state.factory.jobs[station];return j?`<div class="station-bubble ${position}"><span>${goods[j.recipe].icon}</span>${countdown(j.readyAt)}</div>`:'';}
 function sceneBoat(room=false){const h=hulls.find(h=>h.id===state.vessel.hull);return `<div class="player-vessel ${room?'in-workshop':'in-harbor'} paint-${h.color} ${(state.factory.delivery||state.campaign.expedition)&&!room?'on-voyage':''}"><img src="./player-boat.png" alt="Din båd ${h.name}" draggable="false">${fitted('solar')?'<div class="mounted-solar" aria-label="Solpanel monteret"></div>':''}${fitted('navigation')?'<div class="mounted-nav" aria-label="Kortplotter monteret">⌖</div>':''}${fitted('heater')?'<div class="mounted-heat" aria-label="Varme monteret">♨</div>':''}${fitted('battery')?'<div class="mounted-battery" aria-label="Lithium-pakke monteret">ϟ</div>':''}${state.campaign.upgrades.cargo?'<div class="cargo-crates" aria-label="Udbygget lastdæk">▣▣</div>':''}${state.campaign.upgrades.engine?'<div class="engine-badge" aria-label="Motor opgraderet">⚙</div>':''}${state.campaign.upgrades.hull?'<div class="hull-stripe" aria-label="Forstærket skrog"></div>':''}</div>`;}
 function harborWorld(){const f=state.factory;return `<section class="world-scene harbor-world" aria-label="Havnen. Tryk på en bygning for at gå ind."><img class="world-backdrop" src="./${f.restored===4?'harbor-world':'harbor-start'}.png" alt="Fiskeriet ved den venstre kaj, det blå havneværksted i midten og caféen til højre" draggable="false">${f.restored>0&&f.restored<4?Array.from({length:f.restored},(_,i)=>`<img class="restored-layer restored-${i+1}" src="./harbor-world.png" alt="" draggable="false">`).join(''):''}<div class="water-sparkles" aria-hidden="true"></div><div class="world-birds" aria-hidden="true">⌁　⌁</div>${f.restored<1?'<div class="repair-sign repair-fishing">KAJEN SKAL RESTAURERES</div>':''}${f.restored<3?'<div class="repair-sign repair-cafe">TERRASSEN ER LUKKET</div>':'<div class="festival-lights" aria-hidden="true">● · ● · ● · ● · ●</div>'}${f.restored>=4?'<div class="lighthouse-beam" aria-hidden="true"></div>':''}${marker('Fiskeriet','m-fishing','fishing')}${marker('Gå ind i værkstedet','m-workshop','vaerksted')}${marker('Havnecaféen','m-cafe','cafe')}${marker('Restaurér','m-lighthouse','restore')}${stationBubble('fishing','bubble-fishing')}${stationBubble('workshop','bubble-workshop')}${stationBubble('cafe','bubble-cafe')}${sceneBoat()}<button class="mooring-action" data-act="${state.campaign.expedition?'tab':'world-open'}" data-val="${state.campaign.expedition?'oehav':'orders'}"><b>${state.campaign.expedition?'På ekspedition':f.delivery?'Båden er på vej':'Last båden'}</b><small>${state.campaign.expedition?countdown(state.campaign.expedition.readyAt):f.delivery?countdown(f.delivery.readyAt):'Ordrer fra øhavet →'}</small></button><div class="scene-caption"><span>Kapitel ${Math.min(4,f.restored+1)} · ${f.restored}/4 områder</span><span>Tryk på husene</span></div></section>`;}
 function workshopWorld(){const v=state.vessel,j=v.installation;return `<section class="world-scene workshop-world" aria-label="Inde i havneværkstedet"><img class="world-backdrop" src="./workshop-world.png" alt="Varmt træværksted med arbejdsborde og udsigt over havnen" draggable="false"><button class="back-to-harbor" data-act="tab" data-val="havn">← Ud til havnen</button><div class="workshop-plaque"><span>OTTO & KAPTAJNEN</span><h2>Gør båden til din</h2></div>${sceneBoat(true)}${fittings.map(g=>`<button class="fitting-point fp-${g.id} ${fitted(g.id)?'is-fitted':''}" data-act="gear-select" data-val="${g.id}" aria-label="Vælg udstyr til ${g.slot}"><b>${fitted(g.id)?'✓':g.symbol}</b><span>${g.slot}</span></button>`).join('')}${j?`<div class="installation-banner"><span class="tool-swing">⚒</span><div><b>Otto monterer ${fittings.find(g=>g.id===j.id).short}</b><small>${countdown(j.readyAt)}</small></div><button class="btn gold" data-act="gear-finish" data-ready="${j.readyAt}" ${ready(j)?'':'disabled'}>Afslut montering</button></div>`:''}<div class="scene-caption"><span>${hulls.find(h=>h.id===v.hull).name} · ${v.fitted.length}/4 udstyr monteret</span><span>Tryk på en udstyrsplads</span></div></section>`;}
 function stationDetail(station){const f=state.factory,j=f.jobs[station],locked=station==='cafe'&&!f.restored;return `<span class="eyebrow">${{fishing:'ALMAS FISKERI',workshop:'OTTOS TRÆVÆRKSTED',cafe:'SOFIES HAVNECAFÉ'}[station]}</span><h2>${{fishing:'Dagens fangst',workshop:'Fra træ til planker',cafe:'Noget varmt til turen'}[station]}</h2>${locked?'<p>Sofie venter på, at havnefronten bliver restaureret.</p><button class="btn gold" data-act="world-open" data-val="restore">Se næste restaurering</button>':j?`<div class="busy-station"><div class="work-animation"><i></i><i></i><i></i></div><h3>${goods[j.recipe].name} er på vej</h3><p>${countdown(j.readyAt)} · arbejdet fortsætter, mens du er væk.</p><button class="btn primary" data-act="factory-collect" data-val="${station}" data-ready="${j.readyAt}" ${ready(j)?'':'disabled'}>Hent 2 ${goods[j.recipe].name}</button></div>`:recipes.filter(r=>r.station===station).map(r=>`<article class="world-recipe"><span>${goods[r.id].icon}</span><div><h3>${r.name}</h3><p>${goodsLine(r.inputs)||'Friske råvarer fra havnen'}</p><small>2 ${goods[r.id].name} · ${r.cost} havnekroner · ${Math.round(r.seconds*(f.restored>=2?.8:1))} sek.</small></div><button class="btn primary" data-act="factory-produce" data-val="${r.id}" ${f.restored<r.unlock||!hasGoods(r.inputs)||state.cash<r.cost?'disabled':''}>${f.restored<r.unlock?'Låst':'Start'}</button></article>`).join('')}`;}
 function equipmentDetail(){const g=fittings.find(g=>g.id===selectedFitting)||fittings[0],v=state.vessel,installed=fitted(g.id),owned=v.owned.includes(g.id),busy=boatUnavailable();return `<span class="eyebrow">UDSTYR FRA SEJLSTRØM</span><h2>${g.slot}</h2><div class="equipment-tabs">${fittings.map(e=>`<button class="${e.id===g.id?'selected':''}" data-act="gear-select" data-val="${e.id}" aria-label="Vis ${e.slot}">${e.symbol}</button>`).join('')}</div><div class="equipment-illustration gear-${g.id}" aria-hidden="true"><span>${g.symbol}</span></div><h3>${g.name}</h3><p class="game-benefit"><b>I spillet</b> ${g.benefit}</p>${installed?`<p class="equipped-label">✓ Monteret på din båd</p><button class="btn subtle" data-act="gear-remove" data-val="${g.id}" ${busy?'disabled':''}>Læg på udstyrshylden</button>`:`<button class="btn gold" data-act="gear-fit" data-val="${g.id}" ${busy||(!owned&&state.cash<g.cost)?'disabled':''}>${owned?'Montér fra din hylde':'Montér · '+g.cost+' havnekroner'}</button><p class="smallprint">${busy?'Båden skal være hjemme, og arbejdet i værkstedet skal være afsluttet.':owned?'Du ejer allerede dette spiludstyr.':g.seconds+' sekunders montering · betales med spilpenge'}</p>`}<div class="real-product"><strong>Det findes også i virkeligheden</strong><p>Se modellen, den aktuelle pris og krav til installation hos SejlStrøm.</p><a href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">Se varen hos SejlStrøm ↗</a><small>Bonusserne ovenfor er spilregler. De beskriver ikke produktets virkelige ydeevne eller kompatibilitet. Et køb i webshoppen giver ikke spiludstyr.</small></div>`;}
 function boatDetail(){return `<span class="eyebrow">DIN BÅD, DIT PRÆG</span><h2>Vælg din båds stil</h2><p>Samme kabinebåd, tre udtryk. Dit udstyr følger med.</p><div class="hull-options">${hulls.map(h=>`<button class="hull-option ${state.vessel.hull===h.id?'selected':''}" data-act="boat-select" data-val="${h.id}" ${boatUnavailable()?'disabled':''}><img class="paint-${h.color}" src="./player-boat.png" alt=""><b>${h.name}</b><small>${state.vessel.hull===h.id?'Valgt':'Vælg stil · gratis'}</small></button>`).join('')}</div>`;}
 function worldDrawer(){if(!worldPanel)return '';let inner;if(['fishing','workshop','cafe'].includes(worldPanel))inner=stationDetail(worldPanel);else if(worldPanel==='equipment')inner=equipmentDetail();else if(worldPanel==='boat')inner=boatDetail();else if(worldPanel==='orders')inner=orderPanel();else if(worldPanel==='restore')inner=restorationPanel();else if(worldPanel==='story')inner=campaignPanel();else if(worldPanel==='refit')inner=refitPanel();else inner=`<span class="eyebrow">PÅ LAGER I HAVNEN</span><h2>Dine råvarer</h2><div class="inventory-list">${Object.entries(goods).map(([id,g])=>`<div><span>${g.icon} ${g.name}</span><b>${state.factory.stock[id]}</b></div>`).join('')}</div><p>Hent færdig produktion i bygningerne. Varerne bruges til ordrer og restaurering.</p>`;return `<aside class="world-drawer" aria-label="${worldPanel==='equipment'?'Udstyr fra SejlStrøm':'Havnens aktiviteter'}"><button class="drawer-close" data-act="world-close" aria-label="Luk panelet">✕</button>${inner}</aside>`;}
 function worldMain(){const workshop=activeTab==='vaerksted';return `${worldHud()}${introPanel()}${questTracker()}<div class="world-layout ${worldPanel?'with-drawer':''}">${workshop?workshopWorld():harborWorld()}${worldDrawer()}</div><div class="world-taskbar ${workshop?'four-actions':''}">${workshop?`<button data-act="world-open" data-val="boat"><span>◈</span><b>Din båd</b><small>Vælg stil</small></button><button data-act="gear-select" data-val="${selectedFitting}"><span>ϟ</span><b>Montér udstyr</b><small>SejlStrøm ombord</small></button><button data-act="world-open" data-val="workshop"><span>⚒</span><b>Træværksted</b><small>Lav planker</small></button><button data-act="world-open" data-val="refit"><span>⚙</span><b>Byg båden</b><small>Motor, last og skrog</small></button>`:`<button data-act="world-open" data-val="fishing"><span>≈</span><b>${state.factory.jobs.fishing?'Hent fangsten':'Sæt garn'}</b><small>Almas fiskeri</small></button><button data-act="tab" data-val="vaerksted"><span>⚒</span><b>Din båd</b><small>Gå ind i værkstedet</small></button><button data-act="world-open" data-val="orders"><span>⚓</span><b>Leveringer</b><small>${state.factory.completed} sejlture fuldført</small></button>`}</div><div class="captain-hint"><span>⚓</span><p>${workshop?'Tryk på bådens pladser for at vælge udstyr. Du kan montere, afmontere og tage det med på næste levering.':state.factory.completed===0?'Velkommen, kaptajn. Tryk på fiskeriet og sæt garn. Hent to fisk, og last din første båd.':'Hver levering hjælper havnen videre. Montér udstyr på din båd, og saml materialer til næste restaurering.'}</p></div>`;}

 // Complete campaign, optional hands-on sailing and island expeditions.
 const storyQuests=[
  {title:'En havn at kalde hjem',person:'Alma',text:'Min bedstefar lærte mig at fiske fra den bro. Lad os begynde dér. Sæt garn og hent din første fangst.',goal:'Hent din første fangst',cash:150,tokens:0,target:'fishing'},
  {title:'Den første gæst',person:'Alma',text:'Mågeø mangler mad til aftensmaden. En lille levering kan være begyndelsen på noget stort.',goal:'Gennemfør én levering',cash:300,tokens:1,target:'orders'},
  {title:'Planker under fødderne',person:'Otto',text:'Den kaj har set bedre dage. Bjærg træ, sav planker, og brug dine havnemærker på havnefronten.',goal:'Restaurér den gamle havnefront',cash:450,tokens:1,target:'restore'},
  {title:'Din båd, dit værksted',person:'Otto',text:'Kom indenfor. Jeg har gjort plads til din båd. Vælg et stykke udstyr og lad mig montere det.',goal:'Montér mindst ét stykke udstyr',cash:600,tokens:1,target:'equipment'},
  {title:'Kaptajnen tager roret',person:'Liv',text:'Du kan lade båden følge ruten, men prøv selv at styre én tur. Saml bøjerne og hold afstand til klipperne.',goal:'Gennemfør én manuel sejlads',cash:650,tokens:1,target:'orders'},
  {title:'Et værksted med muligheder',person:'Otto',text:'Med det gamle værksted sat i stand kan alle hold arbejde hurtigere. Vi får brug for planker og lidt røget fisk.',goal:'Restaurér værkstedet',cash:700,tokens:2,target:'restore'},
  {title:'Uden for havnemolen',person:'Freja',text:'På Mågeø ligger der drivtømmer efter vinteren. Tag lidt mad med og hent forsyninger til havnen.',goal:'Gennemfør en ekspedition',cash:800,tokens:1,target:'map'},
  {title:'Plads til mere',person:'Otto',text:'Lad os bygge et bedre lastdæk. Så bliver hver levering lidt mere værd. Det er næste skridt for din egen båd.',goal:'Byg lastdæk niveau 1',cash:900,tokens:2,target:'refit'},
  {title:'Kaffe ved vandet',person:'Sofie',text:'Jeg kan næsten høre snakken ved bordene. Gør terrassen klar, så øboerne har et sted at mødes.',goal:'Åbn caféens terrasse',cash:1000,tokens:2,target:'restore'},
  {title:'Strøm til øhavet',person:'Nora',text:'Et batteri og et solpanel gør din spilbåd klar til mere. Sæt begge dele på i værkstedet.',goal:'Montér lithium-pakke og solpanel',cash:1100,tokens:2,target:'equipment'},
  {title:'Lyset vender tilbage',person:'Nora',text:'Alle har hjulpet. Nu mangler vi at få fyret i stand. Når lyset tændes, inviterer vi hele øhavet.',goal:'Restaurér Fyrø',cash:1300,tokens:3,target:'restore'},
  {title:'Hele øhavet kommer',person:'Alma',text:'Send Fyrfestens sidste last afsted. Vi mangler planker, røget fisk og kaffe. Så er det tid til at fejre din havn.',goal:'Levér Fyrfestens sidste last',cash:2500,tokens:5,target:'orders'}
 ];
 const shipRefits=[{id:'engine',name:'Motorservice',icon:'⚙',max:3,cost:900,wood:2,seconds:25,benefit:'5% kortere leveringstid pr. niveau.'},{id:'cargo',name:'Lastdæk',icon:'▦',max:3,cost:1100,wood:2,seconds:30,benefit:'8% flere havnekroner fra leveringer pr. niveau.'},{id:'hull',name:'Skrogforstærkning',icon:'◈',max:2,cost:1200,wood:4,seconds:35,benefit:'Åbner mere krævende ekspeditioner.'}];
 const destinations=[
  {id:'maage',name:'Mågeø',subtitle:'Drivtømmer langs stranden',x:24,y:30,seconds:35,needs:{fish:2},cash:220,reward:{wood:4},unlock:0,requires:[],hull:0,story:'Freja har samlet drivtømmer efter vinterens storme. Du hjælper med at få det hjem.'},
  {id:'skaer',name:'De blå skær',subtitle:'Den forsvundne værktøjskasse',x:72,y:25,seconds:55,needs:{fish:2},cash:400,reward:{plank:4},unlock:1,requires:['navigation'],hull:0,story:'En kasse med brugbart træ og gamle beslag ligger mellem skærene. Kortplotteren åbner denne spilrute.'},
  {id:'fyr',name:'Fyrø',subtitle:'Forsyninger til fyrpasseren',x:76,y:70,seconds:70,needs:{coffee:2},cash:650,reward:{beans:6,fish:4},unlock:2,requires:['battery'],hull:0,story:'Nora bytter bønner og fisk for en varm kop. Lithium-pakken åbner denne længere spilrute.'},
  {id:'vinter',name:'Vinterholm',subtitle:'En havn på den yderste ø',x:28,y:78,seconds:90,needs:{coffee:2,smoked:2},cash:1000,reward:{plank:6,wood:6},unlock:3,requires:['heater','battery'],hull:1,story:'En lille vinterhavn venter på forsyninger. Varme, batteri og forstærket skrog er spillets adgangskrav.'}
 ];
 let audioEngine=null;
 function freshCampaign(){return {intro:false,claimed:0,finished:false,gathered:0,manualTrips:0,salvaged:0,upgrades:{engine:0,cargo:0,hull:0},refit:null,expedition:null,discovered:[],sail:null,sound:false};}
 function normalizeCampaign(raw,game){const c=freshCampaign();if(!raw||typeof raw!=='object')return c;for(const key of ['intro','finished','sound'])c[key]=raw[key]===true;for(const key of ['claimed','gathered','manualTrips','salvaged'])if(Number.isInteger(raw[key]))c[key]=clamp(raw[key],0,key==='claimed'?12:1000000);for(const u of shipRefits)if(Number.isInteger(raw.upgrades?.[u.id]))c.upgrades[u.id]=clamp(raw.upgrades[u.id],0,u.max);c.discovered=Array.isArray(raw.discovered)?[...new Set(raw.discovered.filter(id=>destinations.some(d=>d.id===id)))]:[];
  const valid=t=>Number.isFinite(t)&&t>0&&t<=Date.now()+86400000,j=raw.refit;if(j&&shipRefits.some(u=>u.id===j.id&&j.level===c.upgrades[u.id]+1&&j.level<=u.max)&&valid(j.readyAt))c.refit={id:j.id,level:j.level,readyAt:j.readyAt};
  const e=raw.expedition;if(e&&destinations.some(d=>d.id===e.id)&&valid(e.readyAt))c.expedition={id:e.id,readyAt:e.readyAt};
  const s=raw.sail;if(s&&game.factory.delivery&&s.tripAt===game.factory.delivery.readyAt&&Number.isInteger(s.wave)&&s.wave>=0&&s.wave<=12&&Number.isInteger(s.score)&&s.score>=0&&s.score<=s.wave){c.sail={tripAt:s.tripAt,wave:s.wave,score:s.score,hits:clamp(Math.round(s.hits)||0,0,12),lane:[0,1,2].includes(s.lane)?s.lane:1,nextAt:Date.now()+1200,finished:s.wave===12};}
  return c;
 }
 function boatUnavailable(){return !!(state.factory.delivery||state.vessel.installation||state.campaign.refit||state.campaign.expedition);}
 function storyReady(n=state.campaign.claimed){const c=state.campaign,f=state.factory;return [c.gathered>=2||f.completed>0,f.completed>=1,f.restored>=1,state.vessel.owned.length>=1,c.manualTrips>=1,f.restored>=2,c.discovered.length>=1,c.upgrades.cargo>=1,f.restored>=3,fitted('battery')&&fitted('solar'),f.restored>=4,f.seen.includes(9)][n]||false;}
 function currentQuest(){return storyQuests[state.campaign.claimed];}
 function playTone(kind='tap'){if(!state.campaign.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioEngine=audioEngine||new Audio();audioEngine.resume();const t=audioEngine.currentTime;[0,.11,.22].slice(0,kind==='reward'?3:1).forEach((delay,i)=>{const o=audioEngine.createOscillator(),g=audioEngine.createGain();o.type='sine';o.frequency.value=(kind==='reward'?440:320)*[1,1.25,1.5][i];g.gain.setValueAtTime(.0001,t+delay);g.gain.exponentialRampToValueAtTime(.06,t+delay+.015);g.gain.exponentialRampToValueAtTime(.0001,t+delay+.18);o.connect(g);g.connect(audioEngine.destination);o.start(t+delay);o.stop(t+delay+.2);});}catch{}}
 function campaignAction(kind,value){const c=state.campaign;
  if(kind==='story-start'){c.intro=true;activeTab='havn';worldPanel='fishing';commit();playTone();return;}
  if(kind==='story-claim'){if(!storyReady())return;const q=currentQuest();state.cash+=q.cash;state.factory.tokens+=q.tokens;c.claimed++;if(c.claimed===12){activeTab='havn';worldPanel='story';log('Fyrfesten er begyndt. Kampagnen er fuldført!');}else log(q.person+': '+q.title+' – opgaven er fuldført.');commit();playTone('reward');return;}
  if(kind==='story-go'){const q=currentQuest();if(!q){activeTab='havn';worldPanel='story';render();return;}if(q.target==='map'){activeTab='oehav';worldPanel='';}else if(['equipment','refit'].includes(q.target)){activeTab='vaerksted';worldPanel=q.target;if(q.target==='equipment')selectedFitting=c.claimed===9?(!fitted('battery')?'battery':'solar'):'navigation';}else {activeTab='havn';worldPanel=q.target;}render();return;}
  if(kind==='story-finish'){c.finished=true;activeTab='havn';worldPanel='';commit();return;}
  if(kind==='story-sound'){c.sound=!c.sound;save();render();playTone();return;}
  if(kind==='story-help'){if(state.cash>=100)return;state.cash=200;state.factory.stock.fish+=2;log('Havnelauget hjalp med 200 havnekroner og to fisk, så arbejdet kan fortsætte.');commit();return;}
  if(kind==='refit-start'){const u=shipRefits.find(u=>u.id===value);if(!u||boatUnavailable()||c.upgrades[u.id]>=u.max)return;const level=c.upgrades[u.id]+1;if(state.cash<u.cost*level||!hasGoods({plank:u.wood*level}))return;state.cash-=u.cost*level;spendGoods({plank:u.wood*level});c.refit={id:u.id,level,readyAt:Date.now()+u.seconds*1000};commit();return;}
  if(kind==='refit-finish'){if(!c.refit||!ready(c.refit))return;c.upgrades[c.refit.id]=c.refit.level;c.refit=null;commit();playTone('reward');toast('Båden er opgraderet');return;}
  if(kind==='expedition-start'){const d=destinations.find(d=>d.id===value);if(!d||boatUnavailable()||state.factory.restored<d.unlock||d.requires.some(id=>!fitted(id))||c.upgrades.hull<d.hull||!hasGoods(d.needs))return;spendGoods(d.needs);c.expedition={id:d.id,readyAt:Date.now()+d.seconds*1000};commit();playTone();return;}
  if(kind==='expedition-return'){const e=c.expedition;if(!e||!ready(e))return;const d=destinations.find(d=>d.id===e.id);state.cash+=d.cash;for(const [g,n]of Object.entries(d.reward))state.factory.stock[g]=Math.min(100000,state.factory.stock[g]+n);if(!c.discovered.includes(d.id))c.discovered.push(d.id);c.expedition=null;log('Ekspedition til '+d.name+' fuldført. '+goodsLine(d.reward)+' hjembragt.');commit();playTone('reward');return;}
  if(kind==='sail-start'){const d=state.factory.delivery;if(!d)return;if(!c.sail||c.sail.tripAt!==d.readyAt)c.sail={tripAt:d.readyAt,wave:0,score:0,hits:0,lane:1,nextAt:Date.now()+1500,finished:false};else c.sail.nextAt=Date.now()+1500;activeTab='sejl';worldPanel='';save();render();return;}
  if(kind==='sail-lane'){const s=c.sail;if(!s||s.finished||activeTab!=='sejl')return;const n=Number(value);if(![0,1,2].includes(n))return;s.lane=n;save();document.querySelectorAll('[data-sail-boat]').forEach(b=>{if(b.style)b.style.left=(16.66+n*33.33)+'%';});document.querySelectorAll('[data-sail-lane]').forEach(b=>b.classList.toggle('chosen',Number(b.dataset.sailLane)===n));return;}
 }
 function sailingWave(wave){return {buoy:(wave*7+1)%3,rock:(wave*7+2)%3};}
 function sailingTick(){const s=state?.campaign?.sail;if(!s||s.finished||activeTab!=='sejl'||document.hidden||!state.factory.delivery||s.tripAt!==state.factory.delivery.readyAt||Date.now()<s.nextAt)return;const w=sailingWave(s.wave);if(s.lane===w.buoy){s.score++;playTone();}else if(s.lane===w.rock)s.hits++;s.wave++;s.nextAt=Date.now()+1500;if(s.wave===12){s.finished=true;state.campaign.manualTrips++;state.campaign.salvaged+=s.score;playTone('reward');}save();render();}
 function sailingBonus(d){const s=state.campaign.sail;return s?.finished&&s.tripAt===d.readyAt?s.score*25:0;}
 function introPanel(){return state.campaign.intro?'':`<section class="welcome-panel"><div class="npc-avatar">A</div><div><span class="eyebrow">ALMA HAR VENTET PÅ DIG</span><h2>Nøglerne er dine, kaptajn.</h2><p>Få liv i den gamle havn. Fang fisk, hjælp øboerne og byg din egen båd. Tolv opgaver fører dig frem til fyrfesten.</p><button class="btn gold" data-act="story-start">Tag nøglerne og begynd</button></div></section>`;}
 function questTracker(){const q=currentQuest();return `<div class="quest-tracker"><div class="npc-avatar">${q?q.person[0]:'★'}</div><div><small>${q?'OPGAVE '+(state.campaign.claimed+1)+' AF 12 · '+q.person.toUpperCase():'KAMPAGNEN ER FULDFØRT'}</small><strong>${q?q.goal:'Din havn er åben. Øhavet venter.'}</strong></div><button class="btn ${storyReady()?'gold':'subtle'}" data-act="${storyReady()?'story-claim':'story-go'}">${storyReady()?'Hent belønning':q?'Vis mig':'Frispil'}</button></div>`;}
 function campaignPanel(){const q=currentQuest();if(!q)return `<section class="finale"><div class="festival-stars" aria-hidden="true">✦　★　✧　★　✦</div><span class="eyebrow">ALLE 12 OPGAVER FULDFØRT</span><h2>Velkommen hjem, kaptajn.</h2><p>Fyret lyser igen. Alma har dækket bord på kajen, Otto åbner værkstedet, og Sofie skænker den første kop kaffe. Du gav havnen livet tilbage.</p><p>Tak, fordi du spillede HAVNEKAPTAJNEN.</p><div class="final-stats"><b>${state.factory.completed}<small>leveringer</small></b><b>${state.campaign.discovered.length}/4<small>øer besøgt</small></b><b>${state.vessel.owned.length}/4<small>udstyr fundet</small></b></div><button class="btn gold" data-act="story-finish">Fortsæt i frispil</button><p class="smallprint">Alle ordrer og øer er fortsat tilgængelige. Gør båden færdig, og saml resten af dine havnemærker.</p></section>`;return `<span class="eyebrow">${q.person} · OPGAVE ${state.campaign.claimed+1}/12</span><h2>${q.title}</h2><p>${q.text}</p><p class="game-benefit"><b>DIT NÆSTE MÅL</b>${q.goal}</p><p>Belønning: ${q.cash} havnekroner${q.tokens?' og '+q.tokens+' havnemærker':''}.</p><button class="btn ${storyReady()?'gold':'primary'}" data-act="${storyReady()?'story-claim':'story-go'}">${storyReady()?'Hent belønning':'Gå til opgaven'}</button>`;}
 function refitPanel(){const c=state.campaign,j=c.refit;return `<span class="eyebrow">BYG VIDERE PÅ DIN BÅD</span><h2>Fra lille båd til øhavskaptajn</h2>${j?`<div class="refit-progress"><span class="tool-swing">⚒</span><h3>${shipRefits.find(u=>u.id===j.id).name} · niveau ${j.level}</h3><p>${countdown(j.readyAt)}</p><button class="btn gold" data-act="refit-finish" data-ready="${j.readyAt}" ${ready(j)?'':'disabled'}>Afslut opgraderingen</button></div>`:shipRefits.map(u=>{const level=c.upgrades[u.id],next=level+1;return `<article class="world-recipe"><span>${u.icon}</span><div><h3>${u.name} ${level}/${u.max}</h3><p>${u.benefit}</p><small>${level===u.max?'Færdigbygget':u.cost*next+' havnekroner · '+(u.wood*next)+' planker · '+u.seconds+' sek.'}</small></div><button class="btn primary" data-act="refit-start" data-val="${u.id}" ${level===u.max||boatUnavailable()||state.cash<u.cost*next||!hasGoods({plank:u.wood*next})?'disabled':''}>${level===u.max?'Maks. niveau':'Byg niveau '+next}</button></article>`;}).join('')}<p class="smallprint">Alle opgraderinger og deres virkninger er spilregler. Udstyr fra SejlStrøm finder du på bådens fire udstyrspladser.</p>`;}
 function mapTab(){const c=state.campaign,e=c.expedition;return `${worldHud()}${questTracker()}<div class="island-layout"><section class="island-map" aria-label="Kort over øhavet"><div class="map-compass" aria-hidden="true">N<br>✥</div><svg viewBox="0 0 800 550" aria-hidden="true"><path class="map-route" d="M400 270 Q170 240 192 165 M400 270 Q660 180 576 137 M400 270 Q660 320 608 385 M400 270 Q250 290 224 429"/><path class="island-land" d="M132 112 Q180 70 230 120 L262 174 223 206 146 190 114 151Z M537 87 L578 64 621 112 644 162 573 194 525 157Z M566 345 Q620 300 671 361 L688 422 625 452 551 411Z M172 398 L235 369 278 420 266 476 202 490 157 455Z"/><circle cx="400" cy="270" r="47" fill="#eed59b"/><text x="400" y="280" text-anchor="middle" font-size="38">⚓</text></svg>${destinations.map(d=>`<button class="island-stop ${c.discovered.includes(d.id)?'visited':''}" style="left:${d.x}%;top:${d.y}%" data-act="world-open" data-val="island-${d.id}"><span>${c.discovered.includes(d.id)?'✓':state.factory.restored<d.unlock?'⚑':'⌖'}</span><b>${d.name}</b></button>`).join('')}<div class="map-legend">${c.discovered.length}/4 øer besøgt · Tryk på en ø</div></section><aside class="expedition-panel">${e?`<span class="eyebrow">BÅDEN ER PÅ EKSPEDITION</span><h2>${destinations.find(d=>d.id===e.id).name}</h2><div class="map-sailing">${boatArt('#72c0ca')}</div><p>${countdown(e.readyAt)}</p><button class="btn gold" data-act="expedition-return" data-ready="${e.readyAt}" ${ready(e)?'':'disabled'}>Hent forsyningerne</button>`:islandDetails()}</aside></div>`;}
 function islandDetails(){const id=worldPanel.startsWith('island-')?worldPanel.slice(7):'maage',d=destinations.find(d=>d.id===id)||destinations[0],c=state.campaign;const reasons=[];if(state.factory.restored<d.unlock)reasons.push(d.unlock+' områder restaureret');d.requires.forEach(id=>{if(!fitted(id))reasons.push(fittings.find(g=>g.id===id).short);});if(c.upgrades.hull<d.hull)reasons.push('Skrogforstærkning niveau '+d.hull);return `<span class="eyebrow">UDFORSK ØHAVET</span><h2>${d.name}</h2><p>${d.story}</p><div class="expedition-reward"><b>Hjem med</b><p>${goodsLine(d.reward)}<br>${d.cash} havnekroner</p></div><p>Pak ${goodsLine(d.needs)} · ${d.seconds} sek.</p>${reasons.length?'<p class="route-locked">Kræver: '+reasons.join(' · ')+'</p>':''}<button class="btn gold" data-act="expedition-start" data-val="${d.id}" ${reasons.length||boatUnavailable()||!hasGoods(d.needs)?'disabled':''}>Send båden til ${d.name}</button>${boatUnavailable()?'<p class="smallprint">Båden skal være hjemme og færdig i værkstedet.</p>':''}`;}
 function sailingTab(){const s=state.campaign.sail,d=state.factory.delivery;if(!d||!s)return `${worldHud()}<section class="panel"><h2>Båden ligger i havnen</h2><button class="btn primary" data-act="tab" data-val="havn">Til havnen</button></section>`;const w=sailingWave(s.wave);return `${worldHud()}<div class="sailing-header"><button class="btn subtle" data-act="tab" data-val="havn">← Til havnen</button><span>${s.finished?'Turen er gennemført':s.wave+'/12 sømærker'} · ${s.score} bøjer · ${s.hits} klipper</span></div><section class="sailing-sea" aria-label="Styr båden mellem tre spor"><div class="sail-coast coast-left"></div><div class="sail-coast coast-right"></div><div class="sail-lanes"><i></i><i></i><i></i></div>${s.finished?`<div class="sailing-result"><span>⚓</span><h2>Godt sejlet, kaptajn.</h2><p>${s.score} bøjer samlet. Din levering får ${s.score*25} ekstra havnekroner.</p><button class="btn gold" data-act="factory-return" data-ready="${d.readyAt}" ${ready(d)?'':'disabled'}>Hent leveringen · ${countdown(d.readyAt)}</button><p>Grundbelønningen er sikker, også når du rammer en klippe.</p></div>`:`<div class="sail-object buoy" style="left:${16.66+w.buoy*33.33}%" aria-label="Bøje i spor ${w.buoy+1}">◉</div><div class="sail-object rock" style="left:${16.66+w.rock*33.33}%" aria-label="Klippe i spor ${w.rock+1}">◆</div><div class="steered-boat" data-sail-boat style="left:${16.66+s.lane*33.33}%"><img class="paint-${hulls.find(h=>h.id===state.vessel.hull).color}" src="./boat-top.png" alt="Din kabinebåd set oppefra">${fitted('solar')?'<i class="sailing-solar" aria-hidden="true"></i>':''}</div><div class="sail-instruction">Saml gule bøjer. Undgå grå klipper.</div>`}</section><div class="steer-buttons" aria-label="Styring">${['Venstre','Midten','Højre'].map((label,i)=>`<button data-act="sail-lane" data-val="${i}" data-sail-lane="${i}" class="${s.lane===i?'chosen':''}" ${s.finished?'disabled':''}>${['←','↑','→'][i]} ${label}</button>`).join('')}</div><p class="sailing-help">Tryk på et spor, eller brug piletasterne. Sejladsen sættes på pause, hvis du går tilbage til havnen; den almindelige levering fortsætter.</p>`;}
 function journalTab(){const c=state.campaign;return `${worldHud()}<div class="journal-grid"><section class="panel story-journal">${campaignPanel()}</section><section class="panel"><span class="eyebrow">DIN KAPTAJNSBOG</span><h2>Det har du bygget</h2><div class="journal-achievements"><span>${c.claimed}/12 opgaver</span><span>${state.factory.restored}/4 områder</span><span>${c.discovered.length}/4 øer</span><span>${state.factory.seen.length}/10 ordretyper</span><span>${c.manualTrips} manuelle ture</span><span>${c.salvaged} bøjer samlet</span></div><h3>Historien indtil nu</h3><ol class="quest-history">${storyQuests.map((q,i)=>`<li class="${i<c.claimed?'completed':''}">${i<c.claimed?'✓ ':''}${q.title}</li>`).join('')}</ol></section><section class="panel"><h2>Din gemning og lyd</h2><p>${canSave?'Automatisk lokal gemning er aktiv.':'Gemning er blokeret. Eksportér din fremgang.'}</p><div class="settings-actions"><button class="btn subtle" data-act="story-sound">Lyd: ${c.sound?'til':'fra'}</button><button class="btn subtle" data-act="export">Gem sikkerhedskopi</button><button class="btn subtle" data-act="import">Indlæs gemning</button></div><p>På en ny telefon: eksportér her og indlæs filen på den nye enhed. Din fremgang følger ikke automatisk med mellem enheder.</p><details><summary>Sådan spiller du</summary><p>Tryk på bygningerne for at producere varer. Hent færdige varer og last båden. Brug havnemærker og planker til at restaurere havnen. Følg opgavebjælken, montér udstyr og udforsk øerne.</p><p>Ventetider fortsætter, mens spillet er lukket. Manuel sejlads er en valgfri bonus; kampagnens kaptajnsopgave beder dig prøve den én gang.</p></details><details><summary>Tidligere havnedrift</summary><p>Din tidligere økonomi og investeringer er bevaret.</p><button class="btn subtle" data-act="tab" data-val="regnskab">Åbn regnskabet</button><button class="btn subtle" data-act="tab" data-val="byg">Åbn investeringer</button></details><details><summary>Start forfra</summary><p>Gem en sikkerhedskopi først. En ny havn erstatter din lokale fremgang.</p><button class="btn subtle" data-act="reset">Start en ny havn</button></details>${state.cash<100?'<button class="btn gold" data-act="story-help">Få hjælp fra havnelauget</button>':''}</section><section class="panel"><h2>Seneste hændelser</h2><ol class="event-log">${state.log.slice(0,12).map(t=>'<li>'+esc(t.replace(/^Dag \d+: /,''))+'</li>').join('')}</ol><a class="shop-journal-link" href="https://sejlstroem.dk/" target="_blank" rel="noopener noreferrer">Besøg SejlStrøm ↗</a><p class="smallprint">Spiludstyrets bonusser er fiktive. Webshoppen viser virkelige varer, priser og installationskrav. Betalinger i spillet er ikke aktiveret.</p></section></div>`;}

 function harborMap(){
  const slips=Array.from({length:state.slips},(_,i)=>{const taken=i<state.occupied;return `<button type="button" class="berth ${taken?'taken':'free'}" data-act="berth" data-val="${i+1}" aria-label="Plads ${i+1}: ${taken?'optaget':'ledig'}">${taken?boatArt(captains[(i+state.day)%8].color):'<span class="empty-slip">+</span>'}<small>${i+1}</small></button>`;}).join('');
  const buildings=[['office','FISKERI','#dc7254'],['bad','VÆRKSTED','#f0d588'],['cafe','CAFÉ','#87b8a2'],['workshop','FYRØ','#91a4bf']].map(([id,name,color],i)=>`<g transform="translate(${75+i*160} 150)" opacity="${state.factory.restored>i?1:.22}"><path d="M-45 0 L0 -38 L45 0" fill="#76534c"/><rect x="-38" width="76" height="60" rx="3" fill="${color}"/><rect x="-8" y="22" width="16" height="38" fill="#574743"/><rect x="-28" y="15" width="14" height="17" fill="#fff4c9"/><rect x="15" y="15" width="14" height="17" fill="#fff4c9"/><text y="78" text-anchor="middle" fill="#435b58" font-size="12" font-weight="bold">${name}</text></g>`).join('');
  return `<div class="harbor-scene scene-${state.port.theme}"><div class="horizon"><span>DIT LILLE STYKKE ØHAV</span><span>${esc(weather())}</span></div><svg class="village" viewBox="0 0 640 260" role="img" aria-label="Havn med bygninger som får farve, når du bygger dem"><circle cx="550" cy="47" r="26" fill="#ffdc8b"/><path d="M0 124 Q90 50 190 121 Q280 47 385 120 Q485 68 640 120V260H0Z" fill="#83b5a0"/><path d="M0 155 Q150 122 320 153 Q480 116 640 155V260H0Z" fill="#c7d6a4"/>${buildings}<path d="M0 239H640V260H0Z" fill="#d6b992"/><path d="M30 239H600" stroke="#b19873" stroke-width="3"/></svg><div class="water"><div class="sea-life" aria-hidden="true"><div class="passing-boat">${boatArt('#f4c95d')}</div><span class="gull gull-one">⌁</span><span class="gull gull-two">⌁</span></div>${(state.port.voyage||state.factory.delivery)?'<div class="voyage-marker" aria-hidden="true">⛵ På søen</div>':''}<div class="waterline a"></div><div class="waterline b"></div><div class="piers">${slips}</div></div><div class="quay"><span>⚓ ${state.port.collected.length}/8 bådtyper opdaget</span><span>${state.slips} pladser</span></div></div>`;
 }
 function lifePanel(){
  const chapter=chapters.find((c,i)=>!state.port.chapters.includes(i));const v=state.port.voyage;
  return `${constructionPanel()}${cargoPanel()}<section class="panel life-panel"><span class="eyebrow">ANLØBSBROEN · DAG ${state.day}</span><h2>Hvem sejler ind i dag?</h2><p>Tag imod dagens 3 gæster. Velkomsthandel giver 80 kr.; deres ønskede facilitet giver ekstra drikkepenge. Døgnpriser afregnes separat ved dagens afslutning.</p><div class="guest-grid">${[0,1,2].map(slot=>{const c=captains[visitorIndex(slot)],done=state.port.visits.includes(slot),u=upgrades.find(u=>u.id===c.need);return `<article class="guest-card">${boatArt(c.color)}<h3>${c.name} · ${c.boat}</h3><span class="soft-label">${c.type}</span><p>“${c.wish}”</p><small>${state.upgrades[c.need]?'✓ Ønsket er opfyldt':'Ønsker: '+u.name}</small><button class="btn ${done?'subtle':'primary'}" data-act="welcome" data-val="${slot}" ${done||state.pending?'disabled':''}>${done?'✓ Budt velkommen':'Tag imod · '+money(80+(state.upgrades[c.need]?c.tip:0))}</button></article>`;}).join('')}</div></section><section class="panel chapter"><span class="eyebrow">${state.port.chapters.length}/4 KAPITLER FULDFØRT</span><h2>${chapter?chapter.name:'Øhavets yndlingshavn'}</h2><p>${chapter?chapter.desc:'Du har samlet øhavets både. Din havn kan stadig vokse med de langsigtede milepæle.'}</p>${chapter?'<span class="goldlabel">Belønning '+money(chapter.reward)+'</span>':''}</section><section class="panel"><span class="eyebrow">FORSYNINGSBÅDEN</span><h2>Små rejser, nye muligheder</h2>${v?`<p>${routes[v.route].name} · ${ready(v)?'Båden er hjemme!':v.readyAt?'Hjemme om '+countdown(v.readyAt):'Hjemme om '+(v.arrival-state.day)+' spildage.'}</p><button class="btn primary" data-act="claim" ${v.readyAt?'data-ready="'+v.readyAt+'"':''} ${!ready(v)||state.pending?'disabled':''}>Hent last · ${money(routes[v.route].reward)}</button>`:`<div class="route-grid">${routes.map((r,i)=>`<article><h3>${r.name}</h3><p>${r.desc} ${[30,90,180][i]} sekunders sejltid. Fortsætter, mens spillet er lukket.</p><button class="btn subtle" data-act="voyage" data-val="${i}" ${state.cash<r.cost||state.pending?'disabled':''}>Sejl · ${money(r.cost)}</button></article>`).join('')}</div>`}</section>`;
 }
 function cargoPanel(){
  const waiting=Date.now()<state.port.haulReady;
  return `<section class="panel cargo-game"><span class="eyebrow">SPIL MENS BÅDEN SEJLER</span><h2>En sikker landing</h2><p>Tryk, når kranen rammer det grønne felt. Perfekt landing giver 140 kr.; ellers får du 60 kr. for arbejdet.</p><div class="cargo-gauge" aria-hidden="true"><span class="cargo-target"></span><span class="cargo-needle" style="animation-delay:-${Date.now()%1800}ms">📦</span></div><button class="btn primary" data-act="haul" data-ready="${state.port.haulReady}" ${waiting||state.pending?'disabled':''}>Los lasten</button><p class="smallprint">Ny last om ${countdown(state.port.haulReady)} · 30 sekunder mellem leveringer.</p></section>`;
 }
 function collectionPanel(){return `<section class="panel"><span class="eyebrow">ØHAVETS ALBUM</span><h2>${state.port.collected.length} af 8 både opdaget</h2><div class="collection-grid">${captains.map((c,i)=>`<div class="collection-item ${state.port.collected.includes(i)?'found':'undiscovered'}">${boatArt(c.color)}<strong>${state.port.collected.includes(i)?c.boat:'???'}</strong><small>${state.port.collected.includes(i)?c.type:'Mød flere gæster'}</small></div>`).join('')}</div><p>${state.port.served} gæster budt velkommen · ${state.port.trips} sejlture fuldført.</p></section>`;}
 function stylePanel(){return `<section class="panel"><span class="eyebrow">GØR HAVNEN TIL DIN</span><h2>Vælg dit lys</h2><div class="split-buttons">${['Sommermorgen','Solnedgang','Blå time'].map((t,i)=>`<button class="btn ${state.port.theme===i?'primary':'subtle'}" data-act="theme" data-val="${i}">${t}</button>`).join('')}</div><p>Alle udtryk er frie. Dit valg gemmes sammen med havnen.</p></section>`;}
 function eventPanel(){
  if(!state.pending)return '';
  const e=events[state.pending.event];
  return `<section class="event-alert" role="group" aria-label="Beslutning kræves"><span class="eyebrow">BESLUTNING PÅ KAJEN</span><h2>${esc(e.title)}</h2><p>${esc(e.story)}</p><div class="split-buttons"><button data-act="event" data-val="yes" class="btn gold" ${state.cash<e.cost?'disabled':''}>${esc(e.yes)}</button><button data-act="event" data-val="no" class="btn subtle">${esc(e.no)}</button></div></section>`;
 }
 function heroStats(){
  return `<div class="datebar"><span>🗓️ ${esc(dateLabel())} <b>· dag ${num(state.day)}</b></span><span class="weatherpill">${esc(season())}</span></div><div class="stats"><div class="metric"><span>Kasse</span><strong>${money(state.cash)}</strong></div><div class="metric"><span>Gæstebåde</span><strong>${state.occupied}<small>/${state.slips}</small></strong></div><div class="metric"><span>Omdømme</span><strong>${Math.round(state.reputation)}<small>/100</small></strong></div></div>`;
 }
 function goalPanel(){
  const m=upcomingMilestone();const g=m===-1?null:goals[m];
  return `<div class="goal-box"><div class="goal-head"><span class="eyebrow">DIN NÆSTE MILEPÆL</span><span>${state.checkedGoals.length}/${goals.length} nået</span></div><h3>${esc(g?g.name:'Du er havnens legende!')}</h3><p>${esc(g?g.desc:'Du har nået alle milepæle. Fortsæt med at udvikle din havn og sæt en ny rekord.')}</p>${g?`<span class="goldlabel">Belønning: ${money(g.reward)}</span>`:''}<div class="goal-progress"><i style="width:${Math.round(state.checkedGoals.length/goals.length*100)}%"></i></div></div>`;
 }
 function meter(val,title){return `<div class="meter-wrap"><div class="meter-title"><span>${esc(title)}</span><b>${Math.round(val)} / 100</b></div><div class="meter"><i style="width:${clamp(val,0,100)}%"></i></div></div>`;}
 function harbortab(){
  const next=occupancy(state.day+1);const expectedIncome=next*state.price;
  return `<div class="cols"><div class="maincol">
    ${harborMap()}<div class="quick-day"><span>Tag imod gæster eller sejl videre.</span><button class="btn primary" data-act="day" ${state.pending?'disabled':''}>Næste dag →</button></div>${lifePanel()}
    <div class="panel"><div class="section-line"><div><span class="eyebrow">DAGLIG DRIFT</span><h2>Havnekontoret</h2></div><span class="tag">⚓ Åben</span></div>
      <p>Du bestemmer, hvordan havnen udvikler sig. Døgnprisen påvirker efterspørgslen, og flere faciliteter giver glade gæster.</p>
      <div class="control-block"><div><span class="muted-label">Pris pr. båd / døgn</span><strong>${money(state.price)}</strong></div><div class="inline-buttons"><button data-act="price" data-val="less" ${state.price<=100?'disabled':''} aria-label="Sænk prisen med 25 kroner">−</button><button data-act="price" data-val="more" ${state.price>=400?'disabled':''} aria-label="Hæv prisen med 25 kroner">+</button></div></div>
      <div class="control-block"><div><span class="muted-label">Havnepersonale</span><strong>${state.staff} person${state.staff>1?'er':''}</strong><small>270 kr. pr. person / dag</small></div><div class="inline-buttons"><button data-act="staff" data-val="less" ${state.staff<=1?'disabled':''} aria-label="Færre medarbejdere">−</button><button data-act="staff" data-val="more" ${state.staff>=6?'disabled':''} aria-label="Flere medarbejdere">+</button></div></div>
      ${meter(state.satisfaction,'Gæsternes tilfredshed')}
      <div class="forecast"><span>☀️ Prognose for næste dag</span><strong>Ca. ${next} både</strong><small>Gæsteindtægt ved nuværende pris: ca. ${money(expectedIncome)} plus eventuelle serviceydelser. Vejret og efterspørgslen varierer.</small></div>
      <div class="split-buttons action-line"><button class="btn subtle" data-act="market" ${state.cash<550?'disabled':''}>📣 Markedsfør · 550 kr.</button><button class="btn primary" data-act="day" ${state.pending?'disabled':''}>Afslut dagen <span>→</span></button></div>
      ${state.marketing?`<div class="inline-note">Markedsføringen kører i ${state.marketing} dag${state.marketing===1?'':'e'} endnu.</div>`:''}
    </div></div>
    <aside class="sidecol">${goalPanel()}<div class="panel compact"><span class="eyebrow">SENESTE DRIFTSDAG</span><h2>${state.day===1?'Gør klar til åbning':state.lastProfit>=0?'Grønne tal':'Røde tal'}</h2><div class="simple-row"><span>Omsætning</span><b>${money(state.lastIncome)}</b></div><div class="simple-row"><span>Driftsudgifter</span><b>${money(state.lastCost)}</b></div><div class="simple-row"><span>Resultat</span><b class="${state.lastProfit>=0?'gain':'loss'}">${money(state.lastProfit)}</b></div></div><div class="panel compact"><span class="eyebrow">HAVNEFOGEDENS RÅD</span><p>Start med at forbedre gæsternes forhold, før du bygger for stort. Hvis de daglige udgifter stiger hurtigere end indtægterne, kan du justere prisen og bemandingen.</p></div></aside></div>`;
 }
 function buildtab(){
  const items=upgrades.map(u=>{
    const level=state.upgrades[u.id],unlocked=state.day>=u.unlock,done=level>=u.max,cost=priceFor(u);
    return `<div class="upgrade-card ${!unlocked?'locked':''}"><div class="upgrade-icon" aria-hidden="true">${u.icon}</div><div class="upgrade-body"><div class="upgrade-heading"><h3>${esc(u.name)}</h3>${level?`<span class="tag">${level}/${u.max}</span>`:''}</div><p>${esc(u.desc)}</p><div class="upgrade-footer"><span class="goldlabel">${done?'Færdigbygget':!unlocked?'Åbner på dag '+u.unlock:money(cost)}</span><span class="soft-label">${esc(u.income)}</span></div></div><button data-act="upgrade" data-val="${u.id}" class="btn subtle" ${state.port.building||state.pending||!unlocked||done||state.cash<cost?'disabled':''}>${done?'Bygget':unlocked?'Byg · '+buildSeconds(u.id)+' sek':'Låst'}</button></div>`;
  }).join('');
  return `<div class="tabintro"><span class="eyebrow">BYG HAVNEN OP</span><h2>Hver ny bro åbner muligheder.</h2><p>Byg, når økonomien tillader det. Nye projekter bliver tilgængelige i takt med, at du driver havnen.</p></div>${constructionPanel()}${stylePanel()}<div class="build-grid">${items}</div>`;
 }
 function chart(){
  if(!state.history.length)return '<p class="muted">Når du har afsluttet din første driftsdag, vises overskuddet her.</p>';
  const data=state.history.slice(-32);const max=Math.max(200,...data.map(r=>Math.abs(r.profit)));
  return `<div class="chart" role="img" aria-label="Daglige resultater de sidste ${data.length} dage; grøn er plus, koral er minus. ${esc(data.map(r=>'Dag '+r.day+': '+money(r.profit)).join('. '))}">${data.map(r=>`<div class="bar-slot" title="Dag ${r.day}: ${money(r.profit)}"><span class="bar ${r.profit>=0?'up':'down'}" style="height:${Math.max(4,Math.round(Math.abs(r.profit)/max*95))}%"></span></div>`).join('')}</div>`;
 }
 function regnskabtab(){
  const days=state.history.length;const total=state.history.reduce((a,r)=>a+r.profit,0);
  const last7=state.history.slice(-7);const weekly=last7.reduce((a,r)=>a+r.profit,0);
  const best=state.history.length?Math.max(...state.history.map(r=>r.profit)):0;
  return `<div class="tabintro"><span class="eyebrow">PENGENE I HAVNEN</span><h2>Et sundt budget holder bølgerne ude.</h2><p>Følg overskud og udgifter. Bygninger betales af kassen og er ikke med i de daglige driftsresultater.</p></div><div class="ledger-stats"><div class="metric"><span>Samlet drift</span><strong class="${state.totalProfit>=0?'gain':'loss'}">${money(state.totalProfit)}</strong></div><div class="metric"><span>Seneste 7 dage</span><strong class="${weekly>=0?'gain':'loss'}">${money(weekly)}</strong></div><div class="metric"><span>Bedste dag i historikken</span><strong>${money(best)}</strong></div></div><section class="panel"><span class="eyebrow">RESULTAT PR. DAG</span><h2>Din økonomi</h2>${chart()}<p class="legend"><span><i class="legend-green"></i> Overskud</span><span><i class="legend-coral"></i> Underskud</span></p><p class="smallprint">${Math.min(days,32)} driftsdage vises i grafen. ${days} dage gemmes i historikken (op til 120).</p></section><section class="panel"><h2>Dine faste rammer</h2><div class="simple-row"><span>Antal gæstepladser</span><b>${state.slips}</b></div><div class="simple-row"><span>Pris pr. døgn</span><b>${money(state.price)}</b></div><div class="simple-row"><span>Personale</span><b>${state.staff} person(er)</b></div><div class="simple-row"><span>Omdømme</span><b>${Math.round(state.reputation)}/100</b></div><div class="simple-row"><span>Antal investeringer</span><b>${Object.values(state.upgrades).reduce((a,b)=>a+b,0)}</b></div></section>`;
 }
 function logbogtab(){
  return `<div class="tabintro"><span class="eyebrow">DIN HISTORIE</span><h2>Havnens logbog</h2><p>Hver dag efterlader spor. Her kan du se beslutninger, begivenheder og dine største milepæle.</p></div>${collectionPanel()}<section class="panel"><div class="section-line"><h2>Din udvikling</h2><span class="tag">${state.checkedGoals.length}/${goals.length}</span></div><div class="milestone-list">${goals.map((g,i)=>`<div class="milestone ${state.checkedGoals.includes(i)?'done':''}"><span>${state.checkedGoals.includes(i)?'✓':i+1}</span><div><strong>${esc(g.name)}</strong><small>${esc(g.desc)}</small></div></div>`).join('')}</div></section><section class="panel"><h2>Seneste hændelser</h2><ol class="journal">${state.log.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section><section class="panel"><span class="eyebrow">GEMMELSE OG SIKKERHED</span><h2>Din spilfremgang</h2><p>Fremgangen gemmes automatisk på enheden. Ved ny telefon eller browser kan du flytte din havn med en gemmefil.</p><div class="split-buttons"><button class="btn subtle" data-act="export">⬇ Eksportér gemning</button><button class="btn subtle" data-act="import">⬆ Indlæs gemning</button></div><p class="smallprint">${canSave?'Automatisk lokal gemning er aktiv.':'Automatisk gemning er ikke tilgængelig; eksportér ofte.'} Dette spil har endnu ikke synkronisering mellem enheder.</p><div class="dangerzone"><button class="btn danger" data-act="reset">Start helt forfra</button></div></section>`;
 }
 function render(){
  const root=byId('app');if(!root)return;
  const inWorld=['havn','vaerksted','oehav','sejl','logbog'].includes(activeTab);if(document.body.classList)document.body.classList.toggle('world-active',inWorld);
  const content={havn:worldMain,vaerksted:worldMain,oehav:mapTab,sejl:sailingTab,byg:restorationTab,regnskab:regnskabtab,logbog:journalTab}[activeTab]();
  root.innerHTML=`${inWorld?'':factoryStats()}${activeTab==='regnskab'?eventPanel():''}<section id="tab-content" aria-live="off">${content}</section>`;
  document.querySelectorAll('.dock-nav button').forEach(b=>{const selected=b.dataset.tab===activeTab;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 }
 function downloadFile(filename,content){const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Sikkerhedskopien er hentet. Opbevar den et sikkert sted.');}
 function exportSave(){downloadFile('havnekaptajnen-gemning.json',{format:'havnekaptajnen-save',version:2,exported_at:new Date().toISOString(),state});}
 async function importFile(file){
  if(!file)return;
  if(file.size>1500000){toast('Filen er for stor.');return;}
  try{
   const src=JSON.parse(await file.text());
   const original=src.format==='havnekaptajnen-save'?src.state:src.format==='horisont-spil-save'?src.games?.havn:src;
   const migrated=normalize(original);
   if(!migrated){toast('Dette er ikke en gyldig Havnekaptajnen-gemning.');return;}
   if(!window.confirm('Indlæs den valgte gemning? Det vil erstatte fremgangen på denne enhed.'))return;
   state=migrated;activeTab='havn';worldPanel='';commit();toast('Havnen er gendannet fra din gemmefil.');
  }catch{toast('Gemmefilen kunne ikke læses.');}
  byId('import-file').value='';
 }
 function init(){
  state=load();save();render();if(typeof setInterval==='function')setInterval(updateClocks,500);
  document.addEventListener('visibilitychange',()=>{if(state.campaign.sail)state.campaign.sail.nextAt=Date.now()+1500;updateClocks();});
  document.addEventListener('keydown',e=>{if(activeTab==='sejl'&&['ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){e.preventDefault();const lane=state.campaign.sail?.lane??1;campaignAction('sail-lane',String(e.key==='ArrowUp'?1:clamp(lane+(e.key==='ArrowLeft'?-1:1),0,2)));}else if(e.key==='Escape'&&worldPanel){worldPanel='';render();}});
  byId('app').addEventListener('click',event=>{const b=event.target.closest('button[data-act]');if(b&&!b.disabled)action(b.dataset.act,b.dataset.val);});
  document.querySelector('.dock-nav').addEventListener('click',event=>{const b=event.target.closest('button[data-tab]');if(b)action('tab',b.dataset.tab);});
  byId('import-file').addEventListener('change',e=>importFile(e.target.files?.[0]));
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;byId('install-button').hidden=false;});
  byId('install-button').addEventListener('click',async()=>{if(installEvent){installEvent.prompt();await installEvent.userChoice;installEvent=null;byId('install-button').hidden=true;}});
  if('serviceWorker' in navigator && (location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{byId('offline-status').textContent='Offlineversionen er klar. Du kan genåbne spillet uden internet i denne browser.';}).catch(()=>{byId('offline-status').textContent='Offlineversionen kunne ikke klargøres. Prøv at genindlæse siden med internet.';});}
 }
 document.addEventListener('DOMContentLoaded',init);
 // Exposed read-only test hooks for deterministic regression checks; no private data leaves the device.
 Object.defineProperty(window,'__havnekaptajnen_test__',{value:Object.freeze({getState:()=>JSON.parse(JSON.stringify(state)),saveKey:KEY,upgrades:upgrades.map(u=>u.id)})});
})();
