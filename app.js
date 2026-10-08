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
   pending:null,eventCount:0,log:['Dag 1: Du har fået nøglerne til en forsømt havn med 12 pladser. Gæsterne er skeptiske, men mulighederne er store.']
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
 function commit(){completeGoals();save();render();}
 function priceFor(u){return Math.round(u.cost*(u.id==='bro'?Math.pow(1.19,state.upgrades.bro):1)/50)*50;}
 function nextDay(){
  if(state.pending){toast('Du skal tage stilling til havnens hændelse først.');return;}
  state.day++;
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
  if(state.day<u.unlock||state.upgrades[id]>=u.max||state.cash<cost){toast('Projektet er endnu ikke tilgængeligt eller du mangler penge.');return;}
  state.cash-=cost;state.upgrades[id]++;
  if(id==='bro')state.slips+=4;
  state.reputation=clamp(state.reputation+(id==='clean'?3:1),0,100);
  log('Havnen har nu fået: '+u.name.toLowerCase()+' til '+money(cost)+'.');
  commit();
 }
 function action(kind,value){
  if(kind==='tab'){activeTab=value;render();window.scrollTo({top:0,behavior:'smooth'});return;}
  if(kind==='berth'){
   const n=Number(value);const hasBoat=n<=state.occupied;const types=['sejlbåd','motorbåd','kutter','katamaran'];
   toast('Plads '+n+': '+(hasBoat?'En '+types[(state.day+n*3)%types.length]+' ligger ved kajen.':'Ledig gæsteplads.'));
   return;
  }
  if(kind==='export'){exportSave();return;}
  if(kind==='import'){byId('import-file').click();return;}
  if(kind==='reset'){
   if(window.confirm('Vil du starte en helt ny havn? Din nuværende fremgang overskrives. Gem eventuelt en sikkerhedskopi først.')){
    state=initial();activeTab='havn';commit();toast('Velkommen til din nye havn!');
   }
   return;
  }
  if(state.pending&&kind!=='event'){toast('Vælg først, hvad der skal ske med dagens hændelse.');return;}
  if(kind==='event'){eventChoice(value);return;}
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
 function harborMap(){
  let slips=Array.from({length:state.slips},(_,i)=>{
   const taken=i<state.occupied;const boat=['⛵','🛥️','⛵','🚤','⛵','🛥️'][(i*7+state.day)%6];
   return `<button type="button" class="berth ${taken?'taken':'free'}" data-act="berth" data-val="${i+1}" aria-label="Plads ${i+1}: ${taken?'optaget':'ledig'}"><span class="boat">${taken?boat:'+'}</span><small>${i+1}</small></button>`;
  }).join('');
  return `<div class="harbor-scene" aria-label="Tegnet oversigt over havnens ${state.slips} gæstepladser"><div class="horizon"><span>HAVNEBASSIN</span><span>${esc(weather())}</span></div><div class="water"><div class="waterline a"></div><div class="waterline b"></div><div class="piers">${slips}</div></div><div class="quay"><span>⚓ Havnekontoret</span><span>${state.occupied} af ${state.slips} pladser i brug</span></div></div>`;
 }
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
    ${harborMap()}
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
    return `<div class="upgrade-card ${!unlocked?'locked':''}"><div class="upgrade-icon" aria-hidden="true">${u.icon}</div><div class="upgrade-body"><div class="upgrade-heading"><h3>${esc(u.name)}</h3>${level?`<span class="tag">${level}/${u.max}</span>`:''}</div><p>${esc(u.desc)}</p><div class="upgrade-footer"><span class="goldlabel">${done?'Færdigbygget':!unlocked?'Åbner på dag '+u.unlock:money(cost)}</span><span class="soft-label">${esc(u.income)}</span></div></div><button data-act="upgrade" data-val="${u.id}" class="btn subtle" ${state.pending||!unlocked||done||state.cash<cost?'disabled':''}>${done?'Bygget':unlocked?'Byg':'Låst'}</button></div>`;
  }).join('');
  return `<div class="tabintro"><span class="eyebrow">BYG HAVNEN OP</span><h2>Hver ny bro åbner muligheder.</h2><p>Byg, når økonomien tillader det. Nye projekter bliver tilgængelige i takt med, at du driver havnen.</p></div><div class="build-grid">${items}</div>`;
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
  return `<div class="tabintro"><span class="eyebrow">DIN HISTORIE</span><h2>Havnens logbog</h2><p>Hver dag efterlader spor. Her kan du se beslutninger, begivenheder og dine største milepæle.</p></div><section class="panel"><div class="section-line"><h2>Din udvikling</h2><span class="tag">${state.checkedGoals.length}/${goals.length}</span></div><div class="milestone-list">${goals.map((g,i)=>`<div class="milestone ${state.checkedGoals.includes(i)?'done':''}"><span>${state.checkedGoals.includes(i)?'✓':i+1}</span><div><strong>${esc(g.name)}</strong><small>${esc(g.desc)}</small></div></div>`).join('')}</div></section><section class="panel"><h2>Seneste hændelser</h2><ol class="journal">${state.log.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section><section class="panel"><span class="eyebrow">GEMMELSE OG SIKKERHED</span><h2>Din spilfremgang</h2><p>Fremgangen gemmes automatisk på enheden. Ved ny telefon eller browser kan du flytte din havn med en gemmefil.</p><div class="split-buttons"><button class="btn subtle" data-act="export">⬇ Eksportér gemning</button><button class="btn subtle" data-act="import">⬆ Indlæs gemning</button></div><p class="smallprint">${canSave?'Automatisk lokal gemning er aktiv.':'Automatisk gemning er ikke tilgængelig; eksportér ofte.'} Dette spil har endnu ikke synkronisering mellem enheder.</p><div class="dangerzone"><button class="btn danger" data-act="reset">Start helt forfra</button></div></section>`;
 }
 function render(){
  const root=byId('app');if(!root)return;
  const content={havn:harbortab,byg:buildtab,regnskab:regnskabtab,logbog:logbogtab}[activeTab]();
  root.innerHTML=`${heroStats()}${eventPanel()}<section id="tab-content" aria-live="off">${content}</section>`;
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
   state=migrated;activeTab='havn';commit();toast('Havnen er gendannet fra din gemmefil.');
  }catch{toast('Gemmefilen kunne ikke læses.');}
  byId('import-file').value='';
 }
 function init(){
  state=load();save();render();
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
