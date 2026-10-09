/* Persistent, player-paced festivals. No daily streaks, paid rewards or network access. */
(function(root){
 'use strict';
 const people=[
  {id:'anna',name:'Anna',role:'Fiskeriet',icon:'🐟',goods:['fish','smoked','rope'],lines:['Vi dækker op til folk fra hele øhavet.','Fangsten skal gøres klar til gæsterne.','Lad os samle havnen om et godt måltid.','Den sidste kurv skal ned til kajen.']},
  {id:'otto',name:'Otto',role:'Værftet',icon:'⚒',goods:['wood','plank','cloth','sail'],lines:['Vi bygger boder, som kan holde til havvinden.','Scenen skal være klar, før musikken begynder.','Det gamle træ kan få et nyt liv.','Nu gør vi plads til næste besøg.']},
  {id:'sofie',name:'Sofie',role:'Havnecaféen',icon:'☕',goods:['fish','beans','coffee','apple','bread','pie'],lines:['Der skal være noget godt på bordene.','Jeg glæder mig til at fylde terrassen igen.','Vi pakker kurve til gæsterne på broen.','En rolig stund ved vandet er også en fest.']}
 ];
 const festivals=[
  {id:'welcome',name:'Åbne broer',icon:'⚓',text:'Gør havnen klar til gæster fra naboøerne.',color:'#e8b950'},
  {id:'market',name:'Smag på øhavet',icon:'🍎',text:'Et marked med fangst, hjemmebag og liv på kajen.',color:'#d78364'},
  {id:'regatta',name:'Sejlernes træf',icon:'⛵',text:'Både mødes, historier bliver delt, og kajen pyntes.',color:'#63afc5'},
  {id:'craft',name:'Håndværk på kajen',icon:'⚒',text:'Havnens værksteder viser, hvad hænder kan skabe.',color:'#b09a76'},
  {id:'green',name:'Den grønne kyst',icon:'🌿',text:'Genbrug, haver og fælles måltider ved havet.',color:'#80ac7b'},
  {id:'lights',name:'Lys over havnen',icon:'✦',text:'Varm kaffe og lys på broerne afslutter denne runde.',color:'#9c8ace'}
 ];
 const palettes=[
  {id:'classic',name:'Klassisk havn',need:0,colors:['#e9b74f','#d36b50','#6aaba8']},
  {id:'coast',name:'Kystens farver',need:1,colors:['#f1df9d','#69bacb','#f9faf1']},
  {id:'garden',name:'Sommerhaven',need:3,colors:['#82ab68','#f3c4a1','#e5e4a8']},
  {id:'regatta',name:'Regattastriber',need:6,colors:['#e8f1ec','#d36558','#386c9b']},
  {id:'lights',name:'Aftenens vimpler',need:12,colors:['#b7a4e0','#f0c86c','#789fc1']}
 ];
 const goodIds=['fish','smoked','wood','plank','beans','coffee','grain','apple','fiber','bread','pie','rope','cloth','sail'];
 const values={fish:70,smoked:140,wood:65,plank:140,beans:75,coffee:150,grain:120,apple:150,fiber:170,bread:300,pie:450,rope:450,cloth:650,sail:1400};
 const whole=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000000):0;
 const fresh=()=>({schema:1,festivals:0,step:0,friends:{anna:0,otto:0,sofie:0},medals:{},harvest:{},palette:'classic',job:null,puzzles:0,puzzle:null});
 function normalize(raw,now=Date.now()){
  const s=fresh();if(!raw||typeof raw!=='object')return s;
  s.festivals=whole(raw.festivals);s.step=Math.min(4,whole(raw.step));
  for(const p of people)s.friends[p.id]=whole(raw.friends?.[p.id]);
  for(const f of festivals)s.medals[f.id]=whole(raw.medals?.[f.id]);
  for(const g of goodIds)s.harvest[g]=whole(raw.harvest?.[g]);
  if(palettes.some(p=>p.id===raw.palette&&s.festivals>=p.need))s.palette=raw.palette;
  s.puzzles=whole(raw.puzzles);const p=raw.puzzle;
  if(p&&Number.isSafeInteger(p.round)&&p.round>=0&&p.round<=1000000000&&(p.claimed===true?p.round===s.puzzles-1:p.round===s.puzzles)){
   const matched=[...new Set(Array.isArray(p.matched)?p.matched.filter(n=>Number.isInteger(n)&&n>=0&&n<6):[])];
   const deck=puzzleDeck(p.round),open=[...new Set(Array.isArray(p.open)?p.open.filter(n=>Number.isInteger(n)&&n>=0&&n<12&&!matched.includes(deck[n])):[])].slice(0,2);
   s.puzzle={round:p.round,matched,open,turns:whole(p.turns),claimed:p.claimed===true&&matched.length===6};
  }
  const j=raw.job;
  if(j&&s.step<4&&j.sequence===s.festivals+':'+s.step&&people.some(p=>p.id===j.person)&&Number.isFinite(j.readyAt)&&j.readyAt>0&&j.readyAt<=now+86400000&&Number.isSafeInteger(j.cash)&&j.cash>=0&&j.cash<=1000000&&Number.isSafeInteger(j.tokens)&&j.tokens>=0&&j.tokens<=50)s.job={sequence:j.sequence,person:j.person,readyAt:j.readyAt,cash:j.cash,tokens:j.tokens};
  return s;
 }
 const theme=s=>festivals[s.festivals%festivals.length];
 function offers(s,available){
  if(s.step>=4)return [];
  const allowed=new Set(available),scale=1+Math.min(31,Math.floor(Math.sqrt(s.festivals))),sequence=s.festivals+':'+s.step;
  return people.map((p,i)=>{
   const choices=p.goods.filter(g=>allowed.has(g));if(!choices.length)return null;
   const g=choices[(s.festivals+s.step+i)%choices.length],needs={[g]:(g==='sail'?1:2)*scale};
   if(s.festivals>=2&&choices.length>1){const other=choices[(s.festivals+s.step+i+1)%choices.length];needs[other]=scale;}
   const value=Object.entries(needs).reduce((n,[g,v])=>n+values[g]*v,0);
   return {id:sequence+':'+p.id,sequence,person:p.id,needs,cash:Math.min(1000000,250+value),tokens:Math.min(50,2+Math.floor(scale/2)),seconds:Math.min(7200,60+s.festivals*45+s.step*30+Math.round(value/20)),line:p.lines[(s.festivals+s.step)%p.lines.length]};
  }).filter(Boolean);
 }
 function begin(s,stock,id,available,now){
  if(s.job)return false;const q=offers(s,available).find(q=>q.id===id);
  if(!q||!Number.isFinite(now)||!Object.entries(q.needs).every(([g,n])=>Number.isFinite(stock[g])&&stock[g]>=n))return false;
  for(const [g,n] of Object.entries(q.needs))stock[g]-=n;
  s.job={sequence:q.sequence,person:q.person,readyAt:now+q.seconds*1000,cash:q.cash,tokens:q.tokens};return true;
 }
 function collect(s,now){
  const j=s.job;if(!j||!Number.isFinite(now)||j.readyAt>now||j.sequence!==s.festivals+':'+s.step)return null;
  s.job=null;s.step++;s.friends[j.person]=whole(s.friends[j.person]+1);return {cash:j.cash,tokens:j.tokens,person:j.person};
 }
 function celebrate(s){
  if(s.step!==4||s.job)return null;const f=theme(s),cash=Math.min(1000000,1000+s.festivals*250);
  s.medals[f.id]=whole((s.medals[f.id]||0)+1);s.festivals=whole(s.festivals+1);s.step=0;return {cash,tokens:10,festival:f.name};
 }
 function setPalette(s,id){if(!palettes.some(p=>p.id===id&&s.festivals>=p.need))return false;s.palette=id;return true;}
 function recordHarvest(s,id,amount){if(goodIds.includes(id)&&Number.isSafeInteger(amount)&&amount>0)s.harvest[id]=whole((s.harvest[id]||0)+amount);}
 function mastery(s,id){const total=s.harvest[id]||0,level=Math.floor(Math.sqrt(total/25));return {total,level,next:25*(level+1)**2,start:25*level**2};}
 function puzzleDeck(round){const cards=[0,0,1,1,2,2,3,3,4,4,5,5];let seed=(round+1)>>>0;for(let i=11;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
 function puzzleStart(s){if(s.puzzle&&!s.puzzle.claimed)return false;s.puzzle={round:s.puzzles,matched:[],open:[],turns:0,claimed:false};return true;}
 function puzzleFlip(s,index){const p=s.puzzle;if(!p||p.claimed||p.open.length>=2||!Number.isInteger(index)||index<0||index>=12||p.open.includes(index))return false;const deck=puzzleDeck(p.round);if(p.matched.includes(deck[index]))return false;p.open.push(index);if(p.open.length===2){p.turns++;if(deck[p.open[0]]===deck[p.open[1]]){p.matched.push(deck[index]);p.open=[];}}return true;}
 function puzzleClose(s){if(!s.puzzle||s.puzzle.open.length!==2)return false;s.puzzle.open=[];return true;}
 function puzzleClaim(s){const p=s.puzzle;if(!p||p.claimed||p.matched.length!==6||p.round!==s.puzzles)return null;p.claimed=true;s.puzzles=whole(s.puzzles+1);return {cash:Math.max(120,300-p.turns*5)};}
 const api=Object.freeze({people,festivals,palettes,goodIds,fresh,normalize,theme,offers,begin,collect,celebrate,setPalette,recordHarvest,mastery,puzzleDeck,puzzleStart,puzzleFlip,puzzleClose,puzzleClaim});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborLife=api;
})(typeof window==='undefined'?globalThis:window);
