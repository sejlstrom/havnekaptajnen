/* New land and production places. Stable IDs preserve saves across content updates. */
(function(root){
 'use strict';
 const plots=[
  {id:'meadow',name:'Solengen',chapter:3,cash:8000,needs:{plank:20,wood:10},seconds:120,x:2200,y:520,description:'Et grønt jordstykke til drivhus, frugt og friskbagt brød.'},
  {id:'craft',name:'Håndværkerøen',chapter:12,cash:36000,needs:{plank:50,wood:30},seconds:600,x:3100,y:520,description:'Mere plads til rebslageren og havnens maritime håndværk.'},
  {id:'sail',name:'Sejlmagerøen',chapter:22,cash:95000,needs:{plank:100,wood:60},seconds:1800,x:4000,y:520,description:'Et nyt værftsområde, hvor du fremstiller sejldug og færdige sejl.'}
 ];
 const sites=[
  {id:'greenhouse',name:'Idas drivhus',plot:'meadow',chapter:4,cash:6000,needs:{plank:14,wood:10},seconds:180,x:2010,y:555,width:255,file:'land-greenhouse.png?v=12.0.6',icon:'🌾',description:'Dyrk korn, æbler og plantefibre til resten af havnen.'},
  {id:'bakery',name:'Havnebageriet',plot:'meadow',chapter:8,cash:18000,needs:{plank:28,wood:16},seconds:480,x:2360,y:610,width:260,file:'land-bakery.png?v=12.0.6',icon:'🍞',description:'Bag brød og æbletærter af drivhusets høst.'},
  {id:'ropeworks',name:'Rebslageriet',plot:'craft',chapter:14,cash:42000,needs:{plank:44,wood:30},seconds:900,x:3080,y:575,width:285,file:'land-ropeworks.png?v=12.0.6',icon:'🪢',description:'Sno plantefibre til stærke fortøjningsreb.'},
  {id:'sailmaker',name:'Sejlmageriet',plot:'sail',chapter:24,cash:85000,needs:{plank:70,wood:45,rope:6},seconds:1800,x:3980,y:575,width:290,file:'land-sailmaker.png?v=12.0.6',icon:'⛵',description:'Væv sejldug og sy nye sejl med reb og dug.'}
 ];
 const goods={grain:{name:'Korn',icon:'🌾'},apple:{name:'Æbler',icon:'🍎'},fiber:{name:'Plantefibre',icon:'🌿'},bread:{name:'Brød',icon:'🍞'},pie:{name:'Æbletærte',icon:'🥧'},rope:{name:'Reb',icon:'🪢'},cloth:{name:'Sejldug',icon:'🧵'},sail:{name:'Sejl',icon:'⛵'}};
 const recipes=[
  {id:'grain',station:'greenhouse',name:'Dyrk korn',seconds:60,out:3,cost:15,inputs:{},unlock:1,chapter:4},
  {id:'apple',station:'greenhouse',name:'Pluk æbler',seconds:90,out:3,cost:20,inputs:{},unlock:1,chapter:4},
  {id:'fiber',station:'greenhouse',name:'Høst plantefibre',seconds:120,out:3,cost:25,inputs:{},unlock:1,chapter:12},
  {id:'bread',station:'bakery',name:'Bag brød',seconds:150,out:2,cost:35,inputs:{grain:3},unlock:1,chapter:8},
  {id:'pie',station:'bakery',name:'Bag æbletærter',seconds:240,out:2,cost:50,inputs:{grain:2,apple:3},unlock:1,chapter:8},
  {id:'rope',station:'ropeworks',name:'Sno fortøjningsreb',seconds:360,out:2,cost:65,inputs:{fiber:3},unlock:1,chapter:14},
  {id:'cloth',station:'sailmaker',name:'Væv sejldug',seconds:480,out:2,cost:90,inputs:{fiber:4},unlock:1,chapter:24},
  {id:'sail',station:'sailmaker',name:'Sy nye sejl',seconds:900,out:2,cost:150,inputs:{cloth:3,rope:2},unlock:1,chapter:24}
 ];
 const orders=[
  {name:'Høst til nabohavnen',person:'Ida',boat:'Sommerbris',text:'Nabohavnen skal bruge korn og frugt til markedet.',needs:{grain:3,apple:3},cash:1450,tokens:5,tier:1,sites:['greenhouse']},
  {name:'Morgenbrød til sejlerne',person:'Sofie',boat:'Morgenlys',text:'Brød fra bageriet og kaffe gør en tidlig afgang rar.',needs:{bread:2,coffee:2},cash:2600,tokens:7,tier:1,sites:['bakery']},
  {name:'Tærter til havnefesten',person:'Liv',boat:'Festbåden',text:'Der er dækket op. Vi mangler bare æbletærterne.',needs:{pie:3},cash:3200,tokens:8,tier:1,sites:['bakery']},
  {name:'Nye fortøjninger',person:'Otto',boat:'Kystvagten',text:'Nye reb og planker skal gøre broen klar til sæsonen.',needs:{rope:4,plank:4},cash:3900,tokens:9,tier:1,sites:['ropeworks']},
  {name:'Dug til bådklubben',person:'Nora',boat:'Sejlglæde',text:'Klubben reparerer sejl og mangler stærk sejldug.',needs:{cloth:4,rope:2},cash:5700,tokens:12,tier:1,sites:['sailmaker','ropeworks']},
  {name:'Nye sejl til kapsejladsen',person:'Viggo',boat:'Vindfang',text:'To færdige sejl og lidt proviant til kapsejladsen.',needs:{sail:2,bread:2},cash:8500,tokens:16,tier:1,sites:['sailmaker','bakery','ropeworks']}
 ];
 const fresh=()=>({schema:1,plots:[],levels:Object.fromEntries(sites.map(s=>[s.id,0])),project:null});
 function quote(raw,type,id){
  if(type==='plot'){const p=plots.find(p=>p.id===id);return p&&!raw.plots.includes(id)?{...p,type,level:1}:null;}
  const s=sites.find(s=>s.id===id);if(type!=='site'||!s)return null;const level=(raw.levels[s.id]||0)+1;
  if(level===1)return{...s,type,level};
  const size=1+Math.log2(level);
  return{...s,type,level,chapter:s.chapter+(level-1)*2,cash:Math.min(1e10,Math.round(s.cash*.55*Math.pow(level,1.35))),needs:{plank:Math.ceil(s.needs.plank*size),wood:Math.ceil(s.needs.wood*size)},seconds:Math.min(28800,s.seconds*level)};
 }
 function normalize(raw,now){
  const s=fresh();if(!raw||typeof raw!=='object')return s;
  // Parcels are purchased in order; imported progress cannot create detached islands.
  for(const p of plots){if(!Array.isArray(raw.plots)||!raw.plots.includes(p.id))break;s.plots.push(p.id);}
  for(const b of sites)if(s.plots.includes(b.plot)&&Number.isInteger(raw.levels?.[b.id]))s.levels[b.id]=Math.max(0,Math.min(10000,raw.levels[b.id]));
  const p=raw.project;
  if(p&&['plot','site'].includes(p.type)&&Number.isFinite(p.readyAt)&&p.readyAt>0&&p.readyAt<=now+86400000){const q=quote(s,p.type,p.id);const eligible=q&&(p.type==='plot'?plots[s.plots.length]?.id===p.id:s.plots.includes(q.plot));if(eligible&&p.level===q.level)s.project={type:p.type,id:p.id,level:p.level,readyAt:p.readyAt};}
  return s;
 }
 const site=id=>sites.find(s=>s.id===id);
 const api=Object.freeze({plots,sites,goods,recipes,orders,fresh,normalize,quote,site});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborLand=api;
})(typeof window==='undefined'?globalThis:window);
