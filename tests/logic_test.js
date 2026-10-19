// Havnekaptajnen deterministic interaction smoke tests without a graphical browser.
// Run: node tests/logic_test.js
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
// Reuse compiled code across simulated reloads; each boot still gets a fresh realm.
const compiled=new vm.Script(source,{filename:'app.js'});
const storage=new Map();let clockNow=Date.now();class GameDate extends Date {static now(){return clockNow;}}
function boot(){
 const handlers={};let toast='', lastDownload=null,clockTick=()=>{};
 function makeElement(id){return {
  id, innerHTML:'', textContent:'', hidden:true, value:'', files:[],
  classList:{add(){},remove(){},toggle(){}},
  addEventListener(evt,cb){handlers[id+':'+evt]=cb},
  setAttribute(){},removeAttribute(){},
  click(){handlers[id+':click']?.()},appendChild(){},remove(){},
 };}
 const elements={};for(const id of ['app','toast','import-file','install-button'])elements[id]=makeElement(id);
 const buttons=['havn','byg','regnskab','logbog'].map(tab=>({...makeElement('nav-button'),dataset:{tab}}));
 const document={
  addEventListener(evt,cb){handlers['document:'+evt]=cb},
  getElementById(id){return elements[id]||(elements[id]=makeElement(id))},
  querySelector(sel){return sel==='.dock-nav'?{addEventListener(evt,cb){handlers['nav:'+evt]=cb}}:null},
  querySelectorAll(sel){if(sel==='.dock-nav button')return buttons;return []},
  createElement(){return makeElement('download-anchor')},
  body:{appendChild(){}}
 };
 const localStorage={getItem(k){return storage.has(k)?storage.get(k):null},setItem(k,v){storage.set(k,v)},removeItem(k){storage.delete(k)}};
 const URLMock={createObjectURL(blob){lastDownload=blob;return 'blob:fake'},revokeObjectURL() {}};
 const win={HarborVoyages:require('../voyages.js'),HarborLife:require('../harbor-life.js'),HarborSponsors:require('../sponsors.js'),HarborContent:require('../harbor-content.js'),HarborFleet:require('../fleet.js'),HarborLand:require('../land.js'),confirm(){return true},addEventListener(){},scrollTo(){}};
 const ctx={window:win,document,navigator:{},location:{protocol:'file:',hostname:''},localStorage,console,Blob,URL:URLMock,Date:GameDate,Intl,Math,Object,JSON,Array,Number,String,setTimeout(){return 1},clearTimeout(){},setInterval(fn){clockTick=fn;return 1}};
 compiled.runInNewContext(ctx);
 handlers['document:DOMContentLoaded']();
 const state=()=>win.__havnekaptajnen_test__.getState();
 const click=(act,val)=>handlers['app:click']({target:{closest(selector){return {dataset:{act,val},disabled:false}}}});
 const tab=t=>handlers['nav:click']({target:{closest(){return {dataset:{tab:t}}}}});
 return {state,click,tab,tick:()=>clockTick(),storage,doc:document,elements,handlers,getDownload:()=>lastDownload,overview:()=>win.__havnekaptajnen_test__.getGrowth(),scene:()=>win.__havnekaptajnen_test__.getIsland(),getToast:()=>toast};
}
async function main(){
 const app=boot();const state=app.state;
 for(let n=0;n<3;n++)app.click('welcome',String(n));
 assert.equal(state().port.served,3);assert.equal(state().port.collected.length,3);assert.ok(state().port.chapters.includes(0));
 const once=state().cash;app.click('welcome','0');assert.equal(state().cash,once);
 app.click('voyage','0');assert.equal(state().port.voyage.readyAt,clockNow+30000);app.click('claim');assert.equal(state().port.trips,0);
 app.click('day');app.click('day');assert.equal(state().port.trips,0);clockNow+=30000;const before=state().cash;app.click('claim');assert.equal(state().cash,before+680);app.click('claim');assert.equal(state().cash,before+680);
 app.click('theme','2');const reloaded=boot();assert.equal(reloaded.state().port.theme,2);assert.equal(reloaded.state().port.served,3);
 app.click('reset');
 clockNow=Math.ceil(clockNow/1800)*1800+450;const cargoCash=state().cash;app.click('haul');assert.equal(state().cash,cargoCash+140);app.click('haul');assert.equal(state().cash,cargoCash+140);const cargoReload=boot();cargoReload.click('haul');assert.equal(cargoReload.state().cash,cargoCash+140);app.click('reset');
 console.log('PASS guest collection, once-only rewards, chapters, voyage timing and claims, theme persistence');
 assert.equal(state().version,2);assert.equal(state().day,1);assert.equal(state().slips,12);
 assert.ok(app.elements.app.innerHTML.includes('Gå ind i værkstedet'));
 console.log('PASS new game, explorable harbor, workshop entrance');
 app.click('price','more');app.click('staff','more');
 assert.equal(state().price,200);assert.equal(state().staff,2);
 for(let i=0;i<4;i++)app.click('day');
 assert.equal(state().day,5);assert.equal(state().history.length,4);assert.notEqual(state().cash,9800);
 const persisted=boot();assert.equal(persisted.state().day,5);assert.equal(persisted.state().price,200);
 console.log('PASS prices, staffing, daily calculations, persistence after reload');
 persisted.click('day');assert.equal(persisted.state().day,6);assert.ok(persisted.state().pending);
 persisted.click('day');assert.equal(persisted.state().day,6);
 persisted.click('event','no');assert.equal(persisted.state().pending,null);
 console.log('PASS random events require a decision and progress resumes');
 persisted.tab('byg');assert.ok(persisted.elements.app.innerHTML.includes('Bade- og toilethus'));
 const cash=persisted.state().cash;persisted.click('upgrade','bro');
 assert.equal(persisted.state().slips,12);assert.ok(persisted.state().cash<cash);persisted.click('finish-build');assert.equal(persisted.state().slips,12);clockNow+=30000;const buildReload=boot();assert.equal(buildReload.state().port.building.id,'bro');persisted.click('finish-build');assert.equal(persisted.state().slips,16);persisted.click('finish-build');assert.equal(persisted.state().slips,16);
 persisted.tab('havn');assert.equal(persisted.state().slips,16);
 persisted.tab('regnskab');assert.ok(persisted.elements.app.innerHTML.includes('Din økonomi'));
 persisted.tab('logbog');assert.ok(persisted.elements.app.innerHTML.includes('Seneste hændelser'));
 console.log('PASS upgrade, berth expansion, accounting and journal');
 persisted.click('export');const blob=persisted.getDownload();assert.ok(blob instanceof Blob);
 const backup=JSON.parse(await blob.text());assert.equal(backup.format,'havnekaptajnen-save');assert.equal(backup.state.slips,16);
 persisted.click('reset');assert.equal(persisted.state().day,1);
 const file={size:Buffer.byteLength(JSON.stringify(backup)),async text(){return JSON.stringify(backup)}};
 await persisted.handlers['import-file:change']({target:{files:[file]}});
 assert.equal(persisted.state().day,6);assert.equal(persisted.state().slips,16);
 console.log('PASS export, restart and JSON save import');
 // Run an entire game year, resolving an event when one appears.
 let count=0;
 while(persisted.state().day<366 && count++<800){
  if(persisted.state().pending)persisted.click('event','no');
  else persisted.click('day');
 }
 assert.equal(persisted.state().day,366);
 assert.equal(persisted.state().history.length,120);
 assert.ok(Number.isFinite(persisted.state().cash));
 assert.ok(persisted.state().reputation>=0 && persisted.state().reputation<=100);
 assert.ok(persisted.state().occupied<=persisted.state().slips);
 console.log('PASS 365-day progression: finite economy, capped history and valid berth occupancy');
 // Regression: a corrupt primary save must not prevent a valid legacy save loading.
 storage.clear();storage.set('havnekaptajnen.v2.save','{broken');
 storage.set('horisont-spil.v1.havn',JSON.stringify(backup.state));
 const recovered=boot();assert.equal(recovered.state().port.visitDay,6);recovered.click('welcome','0');const migrated=boot();assert.ok(migrated.state().port.visits.includes(0));assert.equal(recovered.state().day,6);assert.equal(recovered.state().slips,16);
 recovered.tab('logbog');assert.ok(recovered.elements.app.innerHTML.includes('Demoen gemmes lokalt. Log ind gratis for at fortsætte efter 6 spilhandlinger.'));
 console.log('PASS corrupt primary save recovers legacy progress and local saving remains active');
 // Regression: bought marketing days survive a reload; negative best days stay negative.
 const custom={...backup.state,marketing:44,history:[{day:2,profit:-200,cash:9600,guests:4}]};
 storage.set('havnekaptajnen.v2.save',JSON.stringify(custom));
 const regression=boot();assert.equal(regression.state().marketing,44);
 regression.tab('regnskab');assert.ok(regression.elements.app.innerHTML.includes('<strong>-200 kr.</strong>'));
 console.log('PASS purchased marketing duration and negative best-day accounting');
 // Offline dependencies and PWA assets presence.
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.display,'standalone');
 for(const file of ['index.html','styles.css','app.js','sw.js','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'])assert.ok(fs.existsSync(path.join(root,file)));
 for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,icon.src)));
 console.log('PASS PWA manifest, app icons and offline asset bundle present');

 storage.clear();let factoryGame=boot();
 factoryGame.click('factory-produce','fish');factoryGame.click('factory-produce','wood');
 assert.ok(factoryGame.state().factory.jobs.fishing);assert.ok(factoryGame.state().factory.jobs.shore);
 factoryGame.click('factory-collect','fishing');assert.equal(factoryGame.state().factory.stock.fish,0);
 factoryGame=boot();assert.ok(factoryGame.state().factory.jobs.fishing);
 clockNow+=16000;factoryGame.click('factory-collect','fishing');factoryGame.click('factory-collect','shore');
 assert.equal(factoryGame.state().factory.stock.fish,2);assert.equal(factoryGame.state().factory.stock.wood,2);
 factoryGame.click('factory-route','1');factoryGame.click('factory-send','0');
 assert.equal(factoryGame.state().factory.stock.fish,0);factoryGame.click('factory-route','0');
 const rewardStart=factoryGame.state().cash;factoryGame.click('factory-return');assert.equal(factoryGame.state().cash,rewardStart);
 factoryGame=boot();clockNow+=60000;factoryGame.click('factory-return');
 assert.equal(factoryGame.state().cash,rewardStart+525);assert.equal(factoryGame.state().factory.tokens,3);
 factoryGame.click('factory-return');assert.equal(factoryGame.state().cash,rewardStart+525);
 const recipeInputs={fish:{},wood:{},plank:{wood:2},beans:{},coffee:{beans:2},smoked:{fish:2}};
 const stations={fish:'fishing',smoked:'fishing',wood:'shore',plank:'workshop',beans:'cafe',coffee:'cafe'};
 function make(g,n){
  let batches=0;
  while(factoryGame.state().factory.stock[g]<n){
   assert.ok(++batches<=10000,'bounded production helper for '+g);
   const station=stations[g],pending=factoryGame.state().factory.jobs[station];
   if(pending){clockNow=Math.max(clockNow,pending.readyAt);factoryGame.click('factory-collect',station);continue;}
   for(const [input,num] of Object.entries(recipeInputs[g]))make(input,num);
   const before=factoryGame.state().factory.stock[g];factoryGame.click('factory-produce',g);
   const job=factoryGame.state().factory.jobs[station];assert.ok(job,'recipe '+g+' starts');assert.equal(job.recipe,g);
   // Later upgrades take longer than 30 seconds. Advance to the saved deadline,
   // then reload before collecting to exercise offline completion without polling.
   clockNow=Math.max(clockNow,job.readyAt);factoryGame=boot();factoryGame.click('factory-collect',station);
   assert.ok(factoryGame.state().factory.stock[g]>before,'finished recipe '+g+' increases stock');
  }
 }
 const restorationNeeds=[{plank:2},{plank:4,smoked:2},{plank:4,coffee:4},{plank:6,smoked:4,coffee:4}];
 const tokenNeeds=[2,8,14,20];
 for(let level=0;level<4;level++){
  while(factoryGame.state().factory.tokens<tokenNeeds[level]){make('fish',2);make('wood',2);make('plank',2);factoryGame.click('world-open','orders');const visible=factoryGame.elements.app.innerHTML.match(/data-act="factory-send" data-val="(\d+)"/g);assert.ok(visible);const n=Number(visible[0].match(/data-val="(\d+)"/)[1]);const needs={0:{fish:2},1:{wood:2},2:{plank:2},3:{coffee:2},4:{smoked:2,coffee:2},5:{plank:2,fish:2},6:{plank:4},7:{plank:2,coffee:4},8:{smoked:4,coffee:2},9:{plank:4,smoked:4,coffee:4}}[n];for(const [g,num]of Object.entries(needs))make(g,num);factoryGame.click('factory-send',String(n));assert.ok(factoryGame.state().factory.delivery);clockNow+=60000;factoryGame.click('factory-return');}
  for(const[g,num]of Object.entries(restorationNeeds[level]))make(g,num);
  factoryGame.click('factory-restore');assert.ok(factoryGame.state().factory.project);
  factoryGame.click('factory-open');assert.equal(factoryGame.state().factory.restored,level);
  clockNow+=90000;factoryGame=boot();factoryGame.click('factory-open');assert.equal(factoryGame.state().factory.restored,level+1);
  factoryGame.click('factory-open');assert.equal(factoryGame.state().factory.restored,level+1);
 }
 console.log('PASS full four-stage campaign, parallel production, reload/offline elapsed time, route rewards, resource consumption and once-only claims');

 storage.clear();let fittingGame=boot();fittingGame.tab('vaerksted');
 const startingCoins=fittingGame.state().cash;fittingGame.click('gear-fit','navigation');
 assert.equal(fittingGame.state().cash,startingCoins-900);fittingGame.click('gear-fit','navigation');assert.equal(fittingGame.state().cash,startingCoins-900);
 fittingGame.click('gear-finish');assert.equal(fittingGame.state().vessel.fitted.length,0);
 fittingGame=boot();assert.equal(fittingGame.state().vessel.installation.id,'navigation');clockNow+=18000;fittingGame.click('gear-finish');
 assert.ok(fittingGame.state().vessel.fitted.includes('navigation'));fittingGame.click('gear-finish');assert.equal(fittingGame.state().vessel.owned.length,1);
 for(const gear of ['battery','solar','heater']){fittingGame.click('gear-fit',gear);clockNow+=30000;fittingGame.click('gear-finish');}
 assert.equal(fittingGame.state().vessel.fitted.length,4);
 fittingGame.click('boat-select','nordlys');fittingGame=boot();assert.equal(fittingGame.state().vessel.hull,'nordlys');
 fittingGame.click('factory-produce','fish');clockNow+=12000;fittingGame.click('factory-collect','fishing');
 const beforeDelivery=fittingGame.state().cash;fittingGame.click('factory-send','0');
 assert.equal(fittingGame.state().factory.delivery.readyAt,clockNow+16000);assert.equal(fittingGame.state().factory.delivery.cash,462);assert.equal(fittingGame.state().factory.delivery.tokens,3);
 fittingGame.click('gear-remove','solar');assert.ok(fittingGame.state().vessel.fitted.includes('solar'),'cannot change equipment underway');
 fittingGame=boot();clockNow+=16000;fittingGame.click('factory-return');assert.equal(fittingGame.state().cash,beforeDelivery+462);assert.equal(fittingGame.state().factory.tokens,3);
 const costBeforeRefit=fittingGame.state().cash;fittingGame.click('gear-remove','navigation');assert.ok(!fittingGame.state().vessel.fitted.includes('navigation'));
 fittingGame.click('gear-fit','navigation');assert.equal(fittingGame.state().cash,costBeforeRefit);assert.equal(fittingGame.state().vessel.fitted.length,3);fittingGame.click('gear-finish');assert.equal(fittingGame.state().vessel.fitted.length,3);fittingGame=boot();assert.equal(fittingGame.state().vessel.installation.id,'navigation');clockNow+=18000;fittingGame.click('gear-finish');assert.equal(fittingGame.state().vessel.fitted.length,4);
 fittingGame.click('export');const vesselExport=JSON.parse(await fittingGame.getDownload().text());assert.equal(vesselExport.state.vessel.fitted.length,4);
 console.log('PASS equipment purchase once, real-time installation and reload, four slots, ship style persistence, delivery bonuses, underway guard and free refitting');

 const coffeeFixture=fittingGame.state();coffeeFixture.factory.restored=1;coffeeFixture.factory.completed=3;coffeeFixture.factory.stock.coffee=2;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(coffeeFixture));fittingGame=boot();fittingGame.click('factory-send','3');
 assert.equal(fittingGame.state().factory.delivery.cash,900,'coffee receives solar and heating game bonuses');
 assert.equal(fittingGame.state().factory.delivery.tokens,4);clockNow+=16000;fittingGame.click('factory-return');
 console.log('PASS coffee-specific heating bonus stacks with solar and survives delivery');
// Full version 6 campaign using the same clicks as a player, with only time advanced.
 storage.clear();factoryGame=boot();const campaignStart=clockNow;
 const campaignNeeds={0:{fish:2},1:{wood:2},2:{plank:2},3:{coffee:2},4:{smoked:2,coffee:2},5:{plank:2,fish:2},6:{plank:4},7:{plank:2,coffee:4},8:{smoked:4,coffee:2},9:{plank:4,smoked:4,coffee:4}};
 function deliver(order,manual=false){
  if(order===undefined){factoryGame.tab('havn');factoryGame.click('world-open','orders');order=Number(factoryGame.elements.app.innerHTML.match(/data-act="factory-send" data-val="(\d+)"/)[1]);}
  for(const[g,n]of Object.entries(campaignNeeds[order]))make(g,n);
  factoryGame.click('factory-send',String(order));assert.equal(factoryGame.state().factory.delivery.order,order);
  const quote=factoryGame.state().factory.delivery;
  if(manual){
   factoryGame.click('sail-start');factoryGame.tick();assert.equal(factoryGame.state().campaign.sail.wave,0);
   for(let wave=0;wave<12;wave++){
    // Choose 10 correct lanes and two rocks to check scoring and collisions.
    factoryGame.click('sail-lane',String((wave*7+(wave<10?1:2))%3));
    clockNow+=1500;factoryGame.tick();assert.equal(factoryGame.state().campaign.sail.wave,wave+1);
    if(wave===3){factoryGame.tab('havn');clockNow+=60000;factoryGame.tick();assert.equal(factoryGame.state().campaign.sail.wave,4);factoryGame=boot();factoryGame.click('sail-start');}
   }
   assert.equal(factoryGame.state().campaign.sail.score,10);assert.equal(factoryGame.state().campaign.sail.hits,2);assert.equal(factoryGame.state().campaign.manualTrips,1);
   factoryGame.click('sail-start');clockNow+=60000;factoryGame.tick();assert.equal(factoryGame.state().campaign.manualTrips,1,'cannot repeat same trip reward');
  }
  clockNow=Math.max(clockNow,quote.readyAt);const before=factoryGame.state().cash;factoryGame.click('factory-return');assert.equal(factoryGame.state().cash,before+quote.cash+(manual?250:0));const paid=factoryGame.state().cash;factoryGame.click('factory-return');assert.equal(factoryGame.state().cash,paid);assert.equal(factoryGame.state().campaign.sail,null);
 }
 function restoreLevel(level){while(factoryGame.state().factory.tokens<tokenNeeds[level])deliver();for(const[g,n]of Object.entries(restorationNeeds[level]))make(g,n);factoryGame.click('factory-restore');clockNow+=90000;factoryGame=boot();factoryGame.click('factory-open');assert.equal(factoryGame.state().factory.restored,level+1);}
 function installGear(id){factoryGame.click('gear-fit',id);assert.equal(factoryGame.state().vessel.installation.id,id);clockNow+=30000;factoryGame=boot();factoryGame.click('gear-finish');assert.ok(factoryGame.state().vessel.fitted.includes(id));}
 function upgradeShip(id,level,wood){make('plank',wood);factoryGame.click('refit-start',id);assert.equal(factoryGame.state().campaign.refit.level,level);factoryGame.click('refit-finish');assert.equal(factoryGame.state().campaign.upgrades[id],level-1);factoryGame.click('gear-remove','navigation');assert.ok(factoryGame.state().vessel.fitted.includes('navigation'));factoryGame.click('expedition-start','maage');assert.equal(factoryGame.state().campaign.expedition,null);clockNow+=40000;factoryGame=boot();factoryGame.click('refit-finish');assert.equal(factoryGame.state().campaign.upgrades[id],level);factoryGame.click('refit-finish');assert.equal(factoryGame.state().campaign.upgrades[id],level);}
 function claimQuest(n){const cash=factoryGame.state().cash;factoryGame.click('story-claim');assert.equal(factoryGame.state().campaign.claimed,n+1,'claim quest '+n);assert.ok(factoryGame.state().cash>cash);factoryGame=boot();assert.equal(factoryGame.state().campaign.claimed,n+1);}
 factoryGame.click('story-claim');assert.equal(factoryGame.state().campaign.claimed,0);factoryGame.tab('vaerksted');factoryGame.click('story-start');assert.ok(factoryGame.state().campaign.intro);assert.ok(factoryGame.elements.app.innerHTML.includes('harbor-world'));
 make('fish',2);claimQuest(0);deliver(0);claimQuest(1);restoreLevel(0);claimQuest(2);installGear('navigation');claimQuest(3);deliver(undefined,true);claimQuest(4);restoreLevel(1);claimQuest(5);
 make('fish',2);factoryGame.click('expedition-start','vinter');assert.equal(factoryGame.state().campaign.expedition,null,'unqualified route locked');factoryGame.click('expedition-start','maage');assert.equal(factoryGame.state().campaign.expedition.id,'maage');factoryGame.click('factory-send','0');assert.equal(factoryGame.state().factory.delivery,null);factoryGame.click('gear-fit','battery');assert.equal(factoryGame.state().vessel.installation,null);factoryGame.click('expedition-return');assert.equal(factoryGame.state().campaign.discovered.length,0);clockNow+=35000;factoryGame=boot();factoryGame.click('expedition-return');const expeditionPaid=factoryGame.state().cash;factoryGame.click('expedition-return');assert.equal(factoryGame.state().cash,expeditionPaid);assert.equal(factoryGame.state().campaign.discovered.length,1);claimQuest(6);
 upgradeShip('cargo',1,2);claimQuest(7);restoreLevel(2);claimQuest(8);installGear('battery');installGear('solar');claimQuest(9);restoreLevel(3);claimQuest(10);deliver(9);claimQuest(11);
 factoryGame.tab('logbog');assert.ok(factoryGame.elements.app.innerHTML.includes('Velkommen hjem, kaptajn.'));factoryGame.click('story-finish');assert.ok(factoryGame.state().campaign.finished);assert.ok(factoryGame.elements.app.innerHTML.includes('development-hero'),'milestone opens continuing development');const finishedCash=factoryGame.state().cash;factoryGame.click('story-claim');assert.equal(factoryGame.state().cash,finishedCash,'final reward once');factoryGame=boot();assert.equal(factoryGame.state().campaign.claimed,12);
 console.log('PASS all 12 story quests from a fresh save through final delivery and free play; save/reload at every quest');
 console.log('PASS manual sailing: 12 waves, collisions, bonuses, pause/resume/reload and duplicate prevention');
 console.log('PASS exclusive boat use, expedition requirements, materials, deadlines and once-only claims');
 upgradeShip('engine',1,2);make('fish',2);factoryGame.tab('havn');factoryGame.click('world-open','orders');const freeOrder=Number(factoryGame.elements.app.innerHTML.match(/data-act="factory-send" data-val="(\d+)"/)[1]);for(const[g,n]of Object.entries(campaignNeeds[freeOrder]))make(g,n);factoryGame.click('factory-send',String(freeOrder));assert.equal(factoryGame.state().factory.delivery.readyAt-clockNow,15000,'engine and navigation shorten trip');clockNow+=16000;factoryGame.click('factory-return');
 upgradeShip('hull',1,4);installGear('heater');
 for(const id of ['skaer','fyr','vinter']){const d=require('../voyages.js').destinations.find(d=>d.id===id),s=factoryGame.state(),q=require('../fleet.js').expeditionQuote(d,s.fleet.active,s.growth.chapter,s.campaign.upgrades.engine,true,{upgrades:s.campaign.upgrades});for(const[g,n]of Object.entries(q.needs))make(g,n);factoryGame.click('expedition-start',id);assert.equal(factoryGame.state().campaign.expedition.id,id);clockNow=factoryGame.state().campaign.expedition.readyAt;factoryGame=boot();factoryGame.click('expedition-return');}
 assert.equal(factoryGame.state().campaign.discovered.length,4);factoryGame.click('export');const fullBackup=JSON.parse(await factoryGame.getDownload().text());assert.equal(fullBackup.state.campaign.claimed,12);assert.equal(fullBackup.state.campaign.discovered.length,4);
 factoryGame.click('reset');await factoryGame.handlers['import-file:change']({target:{files:[{size:10000,text:async()=>JSON.stringify(fullBackup)}]}});assert.equal(factoryGame.state().campaign.claimed,12);assert.equal(factoryGame.state().campaign.upgrades.hull,1);assert.equal(factoryGame.state().vessel.fitted.length,4);
 for(const tab of ['havn','vaerksted','oehav','sejl','logbog','byg','regnskab','udvikling']){factoryGame.tab(tab);assert.ok(factoryGame.elements.app.innerHTML.length>200);}
 console.log('PASS four explorable islands, ship upgrades, engine timing, completed-game backup/import and all screens');
 console.log('Simulated active timers including repeated reloads: '+Math.round((clockNow-campaignStart)/60000)+' minutes');

 if(process.env.HAVNEKAPTAJNEN_TEST_SAVE)fs.writeFileSync(process.env.HAVNEKAPTAJNEN_TEST_SAVE,JSON.stringify(fullBackup,null,2));

 // Version 7: a finished introduction becomes the start of continuing development.
 const oldSave=JSON.parse(JSON.stringify(fullBackup.state));delete oldSave.growth;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(oldSave));factoryGame=boot();
 assert.equal(factoryGame.state().growth.chapter,1);assert.equal(factoryGame.state().campaign.claimed,12);
 assert.equal(factoryGame.state().cash,oldSave.cash);assert.equal(factoryGame.state().vessel.fitted.length,4);
 factoryGame.click('growth-next');assert.equal(factoryGame.state().growth.chapter,1);
 function supply(needs){for(const [g,n] of Object.entries(needs).sort(([a],[b])=>Object.keys(recipeInputs[b]).length-Object.keys(recipeInputs[a]).length))make(g,n);}
 const growthStart=clockNow, startingCash=factoryGame.state().cash;
 let manualBonus=0;
 for(let chapter=1;chapter<=100;chapter++){
  assert.equal(factoryGame.state().growth.chapter,chapter);
  factoryGame.click('growth-policy',['trade','craft','sailing'][(chapter-1)%3]);
  // Choose different pairs, so the optional third contract is genuinely optional.
  const slots=chapter%2?[0,1]:[1,2];
  for(const slot of slots){
   const quote=factoryGame.overview().contracts[slot];
   supply(quote.needs);
   const cash=factoryGame.state().cash;factoryGame.click('growth-send',String(slot));
   const job=factoryGame.state().growth.job;assert.ok(job,JSON.stringify({chapter,slot,quote,state:factoryGame.state()}));assert.equal(job.slot,slot);assert.equal(job.cash,quote.cash);
   const goodsAfter=JSON.stringify(factoryGame.state().factory.stock);
   factoryGame.click('growth-send',String(slot));assert.equal(JSON.stringify(factoryGame.state().factory.stock),goodsAfter);
   factoryGame.click('factory-send','0');assert.equal(factoryGame.state().factory.delivery,null);
   factoryGame.click('expedition-start','maage');assert.equal(factoryGame.state().campaign.expedition,null);
   factoryGame.click('gear-remove','solar');assert.ok(factoryGame.state().vessel.fitted.includes('solar'));
   const policy=factoryGame.state().growth.policy;factoryGame.click('growth-policy',policy==='trade'?'craft':'trade');assert.equal(factoryGame.state().growth.policy,policy);
   factoryGame.click('growth-return');assert.equal(factoryGame.state().cash,cash);
   let bonus=0;
   if(chapter===3&&slot===0){
    factoryGame.click('sail-start');
    for(let wave=0;wave<12;wave++){
     const lanes=factoryGame.overview().wave;assert.notEqual(lanes.buoy,lanes.rock);
     factoryGame.click('sail-lane',String(lanes.buoy));clockNow+=1500;factoryGame.tick();
     if(wave===4){factoryGame=boot();assert.equal(factoryGame.state().campaign.sail.wave,5);factoryGame.click('sail-start');}
    }
    assert.equal(factoryGame.state().campaign.sail.score,12);bonus=12*50;manualBonus=bonus;
   }
   factoryGame=boot();assert.equal(factoryGame.state().growth.job.cash,job.cash);
   clockNow=Math.max(clockNow,job.readyAt);factoryGame.click('growth-return');
   assert.equal(factoryGame.state().cash,cash+quote.cash+bonus);
   factoryGame.click('growth-return');assert.equal(factoryGame.state().cash,cash+quote.cash+bonus);
   factoryGame.click('growth-send',String(slot));assert.equal(factoryGame.state().growth.job,null);
  }
  assert.equal(factoryGame.state().growth.completed.length,2);
  factoryGame.click('growth-next');assert.equal(factoryGame.state().growth.chapter,chapter,'a building is required');
  const site=['fishing','workshop','cafe'][(chapter-1)%3];
  const project=factoryGame.overview().projects.find(p=>p.site===site);
  supply(project.needs);
  assert.ok(factoryGame.state().cash>=project.cash,'economy funds chapter '+chapter);
  assert.ok(factoryGame.state().factory.tokens>=project.tokens,'earned tokens fund chapter '+chapter);
  factoryGame.click('growth-build',site);assert.equal(factoryGame.state().growth.project.level,project.level);
  const cash=factoryGame.state().cash;factoryGame.click('growth-build',site);assert.equal(factoryGame.state().cash,cash);
  factoryGame.click('growth-built');assert.equal(factoryGame.state().growth.levels[site],project.level-1);
  // Production runs alongside construction; the batch is frozen across policy changes and reloads.
  factoryGame.click('factory-produce','fish');const batch=factoryGame.state().factory.jobs.fishing;
  const policy=factoryGame.state().growth.policy;factoryGame.click('growth-policy',policy==='trade'?'craft':'trade');assert.equal(factoryGame.state().growth.policy,policy);
  factoryGame=boot();assert.equal(factoryGame.state().factory.jobs.fishing.out,batch.out);
  clockNow+=project.seconds*1000;factoryGame.click('factory-collect','fishing');factoryGame.click('growth-built');
  factoryGame.click('growth-built');assert.equal(factoryGame.state().growth.levels[site],project.level);
  factoryGame.click('growth-build',site);assert.equal(factoryGame.state().growth.project,null,'only one build per chapter');
  const kept=JSON.stringify({cash:factoryGame.state().cash,stock:factoryGame.state().factory.stock,levels:factoryGame.state().growth.levels});
  factoryGame.click('growth-next');assert.equal(factoryGame.state().growth.chapter,chapter+1);
  assert.equal(JSON.stringify({cash:factoryGame.state().cash,stock:factoryGame.state().factory.stock,levels:factoryGame.state().growth.levels}),kept);
  factoryGame.click('growth-next');assert.equal(factoryGame.state().growth.chapter,chapter+1);
  factoryGame=boot();assert.equal(factoryGame.state().growth.stars,chapter);
  assert.equal(factoryGame.overview().contracts.length,3);assert.equal(factoryGame.state().growth.completed.length,0);
 }
 assert.equal(factoryGame.state().growth.contracts,200);assert.equal(manualBonus,600);
 assert.equal(Object.values(factoryGame.state().growth.levels).reduce((a,b)=>a+b,0),100);
 assert.ok(factoryGame.state().cash>startingCash,'long-run economy remains funded without resets or injected money');
 factoryGame.click('export');const growthBackup=JSON.parse(await factoryGame.getDownload().text());
 if(process.env.HAVNEKAPTAJNEN_GROWTH_SAVE)fs.writeFileSync(process.env.HAVNEKAPTAJNEN_GROWTH_SAVE,JSON.stringify(growthBackup,null,2));
 factoryGame.click('reset');factoryGame.click('growth-send','0');factoryGame.click('growth-build','fishing');assert.equal(factoryGame.state().growth.job,null);assert.equal(factoryGame.state().growth.project,null);
 await factoryGame.handlers['import-file:change']({target:{files:[{size:10000,text:async()=>JSON.stringify(growthBackup)}]}});
 assert.equal(factoryGame.state().growth.chapter,101);assert.equal(factoryGame.state().growth.stars,100);
 console.log('PASS 100 continuing chapters: 200 chosen contracts, 100 permanent builds, improving batches, 100 reloads, no reset or final chapter');
 console.log('PASS growth timers and once-only rewards, shared boat, frozen jobs, optional equipment routes, manual sailing bonus, import/export and viable long-run economy');
 console.log('Growth simulation advanced '+Math.round((clockNow-growthStart)/3600000*10)/10+' hours of serial timers (not a prediction of playtime).');
 // Large late-game values remain finite. Missing gear cannot block the two basic routes.
 const late=factoryGame.state();late.growth.chapter=1000000;late.growth.completed=[];late.growth.levels={fishing:200000,workshop:400000,cafe:399999};late.vessel.fitted=[];
 storage.set('havnekaptajnen.v2.save',JSON.stringify(late));factoryGame=boot();
 for(const quote of factoryGame.overview().contracts){assert.ok(Number.isFinite(quote.cash)&&quote.cash>0);assert.ok(quote.seconds>0&&quote.seconds<86400);for(const n of Object.values(quote.needs))assert.ok(n>0&&n<100000);}
 assert.equal(factoryGame.overview().contracts[0].required.length,0);assert.equal(factoryGame.overview().contracts[1].required.length,0);
 const restricted=factoryGame.overview().contracts[2];supply(restricted.needs);factoryGame.click('growth-send','2');assert.equal(factoryGame.state().growth.job,null);
 const bad=factoryGame.state();bad.growth={chapter:-1,levels:{fishing:-2},completed:[0,0,99],policy:'invalid',job:{slot:9,readyAt:Infinity},project:{site:'invalid'}};
 storage.set('havnekaptajnen.v2.save',JSON.stringify(bad));factoryGame=boot();assert.equal(factoryGame.state().growth.chapter,1);assert.equal(factoryGame.state().growth.levels.fishing,0);assert.equal(factoryGame.state().growth.job,null);assert.equal(factoryGame.state().growth.project,null);assert.equal(factoryGame.state().growth.completed.length,1);
 console.log('PASS millionth-chapter calculations, equipment guards, fresh-game lock and invalid growth-save recovery');

 // V8: spatial purchases are transactional, movable objects persist, and invalid drops are rejected.
 storage.clear();let island=boot();const initialIsland=island.state();
 island.click('island-buy','tree');assert.equal(island.scene().draft,null,'catalog requires editing mode');
 island.click('island-edit');island.click('island-buy','tree');assert.equal(island.state().cash,initialIsland.cash);
 assert.equal(island.scene().draft.type,'tree');island.click('island-cancel');assert.equal(island.state().island.decor.length,6);
 assert.equal(island.state().cash,initialIsland.cash,'cancel is free');
 island.click('island-buy','tree');island.click('island-flip');island.click('island-place');
 assert.equal(island.state().cash,initialIsland.cash-450);assert.equal(island.state().island.decor.length,7);
 assert.equal(island.state().island.decor.at(-1).flip,true);const afterBuy=island.state().cash;
 island.click('island-place');assert.equal(island.state().cash,afterBuy,'duplicate confirmation cannot charge twice');
 island.click('island-station','fishing');island.click('island-nudge','left');island.click('island-place');
 assert.equal(island.state().island.positions.fishing.x,550);assert.equal(island.state().cash,afterBuy,'moving is free');
 island=boot();assert.equal(island.state().island.positions.fishing.x,550);assert.equal(island.state().island.decor.length,7);
 assert.equal(island.state().island.decor.at(-1).flip,true);
 island.click('island-edit');island.click('island-station','fishing');
 for(let i=0;i<20;i++)island.click('island-nudge','left');
 island.click('island-place');assert.equal(island.state().island.positions.fishing.x,550,'water/out-of-bounds drop rejected');
 island.click('island-cancel');island.click('island-station','fishing');
 for(let i=0;i<20;i++)island.click('island-nudge','right');
 island.click('island-place');assert.equal(island.state().island.positions.fishing.x,550,'overlapping buildings rejected');
 island.click('island-cancel');island.click('island-edit');
 island.click('factory-produce','fish');island.click('island-collect','fishing');assert.equal(island.state().factory.stock.fish,0);
 clockNow+=12000;island.click('island-collect','fishing');assert.equal(island.state().factory.stock.fish,2);
 island.click('island-collect','fishing');assert.equal(island.state().factory.stock.fish,2,'map collection is once-only');
 island.click('export');const sceneBackup=JSON.parse(await island.getDownload().text());
 island.click('reset');assert.equal(island.state().island.decor.length,6);
 await island.handlers['import-file:change']({target:{files:[{size:12000,text:async()=>JSON.stringify(sceneBackup)}]}});
 assert.equal(island.state().island.positions.fishing.x,550);assert.equal(island.state().island.decor.length,7);
 for(let i=0;i<30;i++)island.click('island-zoom','in');assert.equal(island.state().island.camera.zoom,2.4);
 for(let i=0;i<30;i++)island.click('island-zoom','out');assert.equal(island.state().island.camera.zoom,.6);
 island.click('island-home');assert.equal(island.state().island.camera.zoom,1);
 const malformed=island.state();malformed.island={camera:{x:99999,y:-99999,zoom:30},positions:{fishing:{x:-20,y:400}},decor:[{id:1,type:'tree',x:400,y:300},{id:1,type:'tree',x:900,y:300},{id:2,type:'unknown',x:900,y:300},{id:3,type:'tree',x:10,y:10}]};
 storage.set('havnekaptajnen.v2.save',JSON.stringify(malformed));island=boot();
 assert.equal(island.state().island.camera.x,2675);assert.equal(island.state().island.camera.y,-900);assert.equal(island.state().island.camera.zoom,2.4);
 assert.equal(island.state().island.positions.fishing.x,570);assert.equal(island.state().island.decor.length,1);
 const legacyIsland=island.state();delete legacyIsland.island;legacyIsland.cash=3328519;legacyIsland.day=559;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(legacyIsland));island=boot();
 assert.equal(island.state().cash,3328519);assert.equal(island.state().day,559);assert.equal(island.state().island.decor.length,6);
 console.log('PASS V8 decoration preview/cancel, once-only purchase, free building moves, collision/water guards, persistence, map harvest, export/import, camera limits and legacy save migration');
 // A valid rearrangement must be checked as a whole, not against old default positions.
 const swapped=island.state();const originalPositions=JSON.parse(JSON.stringify(swapped.island.positions));
 swapped.island.positions.fishing=originalPositions.cafe;swapped.island.positions.cafe=originalPositions.fishing;swapped.island.decor=[];
 storage.set('havnekaptajnen.v2.save',JSON.stringify(swapped));island=boot();
 assert.deepEqual(island.state().island.positions.fishing,originalPositions.cafe);
 assert.deepEqual(island.state().island.positions.cafe,originalPositions.fishing);
 island.click('export');const swappedExport=JSON.parse(await island.getDownload().text());island.click('reset');
 await island.handlers['import-file:change']({target:{files:[{size:12000,text:async()=>JSON.stringify(swappedExport)}]}});
 assert.deepEqual(island.state().island.positions.fishing,originalPositions.cafe);
 const overlapping=island.state();overlapping.island.positions.workshop=overlapping.island.positions.fishing;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(overlapping));island=boot();
 assert.deepEqual(island.state().island.positions,originalPositions,'corrupt overlapping layout recovers to safe defaults');
 storage.clear();island=boot();island.click('factory-produce','fish');clockNow+=12000;island.click('factory-collect','fishing');island.click('factory-send','0');
 assert.ok(island.state().factory.delivery);island.tab('vaerksted');
 assert.ok(island.elements.app.innerHTML.includes('Båden er ude at sejle'));
 assert.ok(!island.elements.app.innerHTML.includes('class="island-vessel drydock-vessel'));
 assert.ok(!island.elements.app.innerHTML.includes('class="fitting-point'));
 clockNow=island.state().factory.delivery.readyAt;island.tab('vaerksted');
 assert.ok(island.elements.app.innerHTML.includes('Båden venter ved kajen'));
 island.click('factory-return');island.tab('vaerksted');
 assert.ok(island.elements.app.innerHTML.includes('class="island-vessel drydock-vessel'));
 for(const [id,name] of [['navigation','Kortplotter'],['battery','Lithium-batteripakke'],['solar','Solpanel til kahyttaget'],['heater','Kahytvarmer']]){
  island.click('gear-select',id);const html=island.elements.app.innerHTML;
  assert.ok(html.includes('<h3>'+name+'</h3>'));assert.ok(html.includes('https://sejlstroem.dk/'));
  assert.ok(!/Garmin|SUNBEAM|AUTOTERM/.test(html));
 }
 console.log('PASS V8.4 swapped buildings survive reload/import; corrupt overlap recovery; sailing boat absent from workshop until unloaded; generic equipment names retain webshop links');
 storage.clear();let timber=boot();const timberCash=timber.state().cash;
 timber.click('world-open','workshop');assert.ok(timber.elements.app.innerHTML.includes('Du mangler <b>2 drivtømmer</b>'));
 timber.click('factory-produce','plank');assert.equal(timber.state().factory.jobs.workshop,null);assert.equal(timber.state().cash,timberCash);
 timber.click('factory-produce','wood');const gathering=timber.state().factory.jobs.shore;assert.ok(gathering);assert.equal(timber.state().cash,timberCash,'gathering is free');
 timber.click('factory-produce','wood');assert.deepEqual(timber.state().factory.jobs.shore,gathering,'double click cannot restart gathering');
 timber.click('factory-collect','shore');assert.equal(timber.state().factory.stock.wood,0,'cannot collect before ready');
 timber=boot();assert.deepEqual(timber.state().factory.jobs.shore,gathering);clockNow=gathering.readyAt;timber.click('factory-collect','shore');timber.click('factory-collect','shore');assert.equal(timber.state().factory.stock.wood,2,'collect exactly once');
 timber.click('factory-produce','plank');assert.equal(timber.state().factory.stock.wood,0,'consume wood when sawing starts');assert.equal(timber.state().cash,timberCash-20);
 const sawing=timber.state().factory.jobs.workshop;timber.click('factory-produce','plank');assert.equal(timber.state().cash,timberCash-20,'busy saw cannot spend twice');
 timber.click('factory-produce','wood');assert.ok(timber.state().factory.jobs.shore,'can gather while the saw works');assert.deepEqual(timber.state().factory.jobs.workshop,sawing);
 timber=boot();assert.equal(timber.state().factory.stock.wood,0);assert.deepEqual(timber.state().factory.jobs.workshop,sawing);
 clockNow=sawing.readyAt;timber.click('factory-collect','workshop');assert.equal(timber.state().factory.stock.plank,2);assert.equal(timber.state().factory.stock.wood,0);timber.click('factory-collect','workshop');assert.equal(timber.state().factory.stock.plank,2);
 const oldTimber=timber.state();delete oldTimber.factory.jobs.shore;oldTimber.factory.jobs.workshop={recipe:'wood',out:5,readyAt:clockNow+5000};storage.set('havnekaptajnen.v2.save',JSON.stringify(oldTimber));timber=boot();assert.equal(timber.state().factory.jobs.workshop,null);assert.deepEqual(Object.fromEntries(Object.entries(timber.state().factory.jobs.shore).filter(([k])=>k!=='workId')),oldTimber.factory.jobs.workshop,'old collection job migrates intact');assert.ok(timber.state().factory.jobs.shore.workId);
 timber=boot();clockNow+=5000;timber.click('factory-collect','shore');assert.equal(timber.state().factory.stock.wood,5);assert.equal(timber.state().factory.stock.plank,2);
 timber.click('export');const timberBackup=JSON.parse(await timber.getDownload().text());timber.click('reset');await timber.handlers['import-file:change']({target:{files:[{size:12000,text:async()=>JSON.stringify(timberBackup)}]}});assert.equal(timber.state().factory.stock.wood,5);assert.equal(timber.state().factory.stock.plank,2);
 console.log('PASS V8.7 free shore gathering, insufficient timber, immediate once-only wood consumption, parallel collection/sawing, reload timers, legacy job migration and export/import');
 // V9 migration, tickets, expanding districts, offline jobs and future catalog IDs.
 storage.clear();let expansion=boot();const catalog=require('../harbor-content.js');
 assert.equal(expansion.state().extensions.tickets,10);
 expansion.click('factory-produce','wood');const unshortened=expansion.state().factory.jobs.shore;
 assert.ok(unshortened.workId);expansion.click('shop-skip','station:shore');expansion.click('shop-cancel');
 assert.equal(expansion.state().extensions.tickets,10);assert.equal(expansion.state().factory.jobs.shore.readyAt,unshortened.readyAt);
 expansion.click('shop-skip','station:shore');expansion.click('shop-confirm');expansion.click('shop-confirm');
 assert.equal(expansion.state().extensions.tickets,9);assert.equal(expansion.state().factory.stock.wood,0,'shortening does not auto-grant goods');
 assert.equal(expansion.state().factory.jobs.shore.readyAt,clockNow);
 expansion=boot();assert.equal(expansion.state().extensions.tickets,9);assert.equal(expansion.state().factory.jobs.shore.workId,unshortened.workId);
 expansion.click('factory-collect','shore');expansion.click('factory-collect','shore');assert.equal(expansion.state().factory.stock.wood,2);
 expansion.click('factory-produce','wood');expansion.click('shop-skip','station:shore');clockNow+=30000;expansion.click('shop-confirm');assert.equal(expansion.state().extensions.tickets,9,'naturally completed work costs no ticket');
 const longJob={readyAt:clockNow+900000},ticketState={tickets:2};assert.ok(catalog.skip(ticketState,longJob,longJob.readyAt,clockNow));assert.equal(longJob.readyAt,clockNow+600000);assert.equal(ticketState.tickets,1);
 assert.equal(catalog.skip(ticketState,longJob,clockNow+900000,clockNow),false,'stale quote cannot shorten a replaced deadline');assert.equal(ticketState.tickets,1);
 assert.equal(catalog.skip({tickets:0},longJob,longJob.readyAt,clockNow),false);
 let unlocked=expansion.state();unlocked.factory.restored=1;unlocked.growth.chapter=1;unlocked.cash=100000;for(const id of Object.keys(unlocked.factory.stock))unlocked.factory.stock[id]=1000;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(unlocked));expansion=boot();expansion.click('expansion-build','club');assert.equal(expansion.state().extensions.project,null,'chapter 1 cannot build a locked district');
 unlocked.growth.chapter=2;storage.set('havnekaptajnen.v2.save',JSON.stringify(unlocked));expansion=boot();
 expansion.click('expansion-build','garden');assert.equal(expansion.state().extensions.project,null);
 const beforeDistrict=expansion.state(),quote=catalog.project(beforeDistrict.extensions,'club');expansion.click('expansion-build','club');
 const project=expansion.state().extensions.project;assert.ok(project.workId);assert.equal(expansion.state().cash,beforeDistrict.cash-quote.cash);assert.equal(expansion.state().factory.stock.plank,beforeDistrict.factory.stock.plank-quote.needs.plank);
 expansion.click('expansion-build','club');assert.equal(expansion.state().cash,beforeDistrict.cash-quote.cash);
 expansion.click('expansion-finish');assert.equal(expansion.state().extensions.levels.club,0);
 expansion=boot();assert.deepEqual(expansion.state().extensions.project,project);clockNow=project.readyAt;
 expansion.click('expansion-finish');expansion.click('expansion-finish');assert.equal(expansion.state().extensions.levels.club,1);assert.equal(expansion.state().extensions.tickets,beforeDistrict.extensions.tickets);
 let milestone=expansion.state();milestone.extensions.levels.club=4;storage.set('havnekaptajnen.v2.save',JSON.stringify(milestone));expansion=boot();expansion.click('expansion-build','club');clockNow=expansion.state().extensions.project.readyAt;expansion.click('expansion-finish');expansion.click('expansion-finish');assert.equal(expansion.state().extensions.tickets,milestone.extensions.tickets,'district milestones no longer grant tickets');
 const beforeErrand=expansion.state(),errand=catalog.errand(beforeErrand.extensions);expansion.click('expansion-errand',String(errand.sequence));expansion.click('expansion-errand',String(errand.sequence));
 assert.equal(expansion.state().extensions.errands,1);assert.equal(expansion.state().extensions.tickets,beforeErrand.extensions.tickets);assert.equal(expansion.state().cash,beforeErrand.cash+errand.cash);
 assert.equal(expansion.state().factory.stock.plank,beforeErrand.factory.stock.plank-errand.needs.plank);
 let longRun=expansion.state();longRun.extensions.levels.club=1000;longRun.extensions.levels.future_island=123;longRun.growth.chapter=5;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(longRun));expansion=boot();assert.equal(expansion.state().extensions.levels.future_island,123);assert.equal(catalog.project(expansion.state().extensions,'club').level,1001);
 expansion.tab('udvikling');assert.ok(expansion.elements.app.innerHTML.includes('5 → 6 varer pr. hold'),'base upgrade preview retains district production bonus');assert.ok(catalog.multiplier(expansion.state().extensions,'fishing')>=.8);expansion.click('factory-produce','fish');assert.equal(expansion.state().factory.jobs.fishing.out,5,'district levels increase batches');
 expansion.click('expansion-build','rescue');assert.ok(expansion.state().extensions.project);
 expansion.click('shop-preview');assert.ok(expansion.elements.app.innerHTML.includes('Prøvevisning af Lygtehavnen'));assert.equal(expansion.state().extensions.style,'classic');
 expansion=boot();assert.ok(!expansion.elements.app.innerHTML.includes('Prøvevisning af Lygtehavnen'));expansion.click('shop-style','evening');assert.equal(expansion.state().extensions.style,'classic','unowned paid style cannot be enabled');
 expansion.tab('butik');assert.equal((expansion.elements.app.innerHTML.match(/disabled>Ikke til salg/g)||[]).length,4);assert.ok(!expansion.elements.app.innerHTML.includes('checkout.stripe.com'));assert.ok(!expansion.elements.app.innerHTML.includes('purchase-delivery'));
 expansion.click('export');const extensionBackup=JSON.parse(await expansion.getDownload().text());assert.ok(!JSON.stringify(extensionBackup).includes('recovery_hash'));expansion.click('reset');
 await expansion.handlers['import-file:change']({target:{files:[{size:20000,text:async()=>JSON.stringify(extensionBackup)}]}});assert.equal(expansion.state().extensions.levels.club,1000);assert.equal(expansion.state().extensions.levels.future_island,123);
 const legacySave=expansion.state();delete legacySave.extensions;storage.set('havnekaptajnen.v2.save',JSON.stringify(legacySave));expansion=boot();assert.equal(expansion.state().extensions.tickets,10);assert.equal(expansion.state().cash,legacySave.cash);assert.equal(expansion.state().day,legacySave.day);assert.deepEqual(expansion.state().factory.stock,legacySave.factory.stock);
 console.log('PASS V10 starter-ticket shortening, cancellation, stale/ready guards, once-only spending and collection, work IDs after reload, free chapter gates, district materials and levels, repeat errands, level 1001, future IDs, production bonuses, preview, closed purchases and import/migration');

 // V10: starter grant is once per save, including migration from the old three-ticket policy.
 for(const oldBalance of [0,1,3,14]){const old={...catalog.fresh(),schema:1,tickets:oldBalance,earned:18};const once=catalog.normalize(old);assert.equal(once.tickets,oldBalance+7);assert.equal(once.earned,18);assert.deepEqual(catalog.normalize(once),once);}
 assert.equal(catalog.normalize(catalog.fresh()).tickets,10);
 const fleetCatalog=require('../fleet.js');storage.clear();let fleetGame=boot();
 assert.deepEqual(fleetGame.state().fleet.owned,['svalen']);assert.equal(fleetGame.state().fleet.active,'svalen');
 let fleetSeed=fleetGame.state();fleetSeed.cash=1000000;fleetSeed.factory.restored=4;fleetSeed.factory.tokens=1000;
 for(const id of Object.keys(fleetSeed.factory.stock))fleetSeed.factory.stock[id]=1000;
 storage.set('havnekaptajnen.v2.save',JSON.stringify(fleetSeed));fleetGame=boot();
 fleetGame.click('fleet-buy','havkat');assert.equal(fleetGame.state().fleet.build,null,'boat requires its chapter');
 fleetGame.click('fleet-select','nordlys');assert.equal(fleetGame.state().fleet.active,'svalen','unowned selection rejected');
 for(const ship of fleetCatalog.ships.slice(1,5)){
  const before=fleetGame.state();before.growth.chapter=ship.chapter;before.fleet.dock.level=Math.max(ship.bridge,Math.ceil((before.fleet.owned.length-1)/2));storage.set('havnekaptajnen.v2.save',JSON.stringify(before));fleetGame=boot();
  fleetGame.click('fleet-buy',ship.id);const building=fleetGame.state();assert.ok(building.fleet.build.workId);assert.equal(building.fleet.build.readyAt,clockNow+ship.seconds*1000);
  assert.equal(building.cash,before.cash-ship.cash);for(const [id,n] of Object.entries(ship.needs))assert.equal(building.factory.stock[id],before.factory.stock[id]-n);
  fleetGame.click('fleet-buy',ship.id);assert.equal(fleetGame.state().cash,building.cash);
  fleetGame.click('fleet-launch');assert.ok(!fleetGame.state().fleet.owned.includes(ship.id),'no benefit before building completes');
  fleetGame=boot();assert.deepEqual(fleetGame.state().fleet.build,building.fleet.build);clockNow=building.fleet.build.readyAt;
  fleetGame.click('fleet-launch');fleetGame.click('fleet-launch');assert.equal(fleetGame.state().fleet.owned.filter(id=>id===ship.id).length,1);assert.equal(fleetGame.state().fleet.active,ship.id);
 }
 assert.equal(fleetGame.state().fleet.owned.length,5);assert.equal(fleetGame.state().extensions.tickets,10,'building boats grants no tickets');
 fleetGame.click('fleet-select','svalen');fleetGame.click('fleet-send','research');assert.equal(fleetGame.state().fleet.job,null,'capacity rejects oversized load');
 fleetGame.click('fleet-select','nordlys');const beforeCargo=fleetGame.state();fleetGame.click('fleet-send','research');const freight=fleetGame.state().fleet.job;
 assert.equal(freight.ship,'nordlys');assert.ok(freight.workId);assert.ok(freight.cash>12500);assert.ok(freight.seconds>fleetCatalog.quote('research','nordlys').seconds);
 fleetGame.click('fleet-select','svalen');assert.equal(fleetGame.state().fleet.active,'nordlys');
 fleetGame.click('gear-fit','solar');assert.equal(fleetGame.state().vessel.installation,null);
 fleetGame.click('refit-start','engine');assert.equal(fleetGame.state().campaign.refit,null);
 fleetGame.click('fleet-send','research');assert.equal(fleetGame.state().factory.stock.plank,beforeCargo.factory.stock.plank-32);
 fleetGame.click('fleet-return');assert.equal(fleetGame.state().fleet.deliveries,0);
 fleetGame.click('sail-start');assert.equal(fleetGame.state().campaign.sail.tripAt,freight.readyAt);
 fleetGame.click('shop-skip','fleet-job');fleetGame.click('shop-confirm');const shortened=fleetGame.state().fleet.job;
 assert.equal(shortened.readyAt,Math.max(clockNow,freight.readyAt-300000));assert.equal(fleetGame.state().campaign.sail.tripAt,shortened.readyAt);
 fleetGame=boot();assert.equal(fleetGame.state().fleet.job.cash,freight.cash);assert.equal(fleetGame.state().fleet.job.workId,freight.workId);assert.equal(fleetGame.state().campaign.sail.tripAt,shortened.readyAt);
 clockNow=shortened.readyAt;fleetGame.click('fleet-return');const paid=fleetGame.state();fleetGame.click('fleet-return');assert.equal(fleetGame.state().cash,paid.cash);assert.equal(paid.cash,beforeCargo.cash+freight.cash);assert.equal(paid.fleet.deliveries,1);
 fleetGame.click('fleet-select','havkat');assert.equal(fleetGame.state().fleet.active,'havkat');
 for(const level of [1,2,3]){fleetGame.click('refit-start','engine');const pending=fleetGame.state().campaign.refit;assert.equal(pending.readyAt,clockNow+Math.round(25*level*(1+.7+19*.08))*1000);assert.equal(fleetGame.state().campaign.upgrades.engine,level-1);fleetGame.click('refit-finish');assert.equal(fleetGame.state().campaign.upgrades.engine,level-1);clockNow=pending.readyAt;fleetGame=boot();fleetGame.click('refit-finish');assert.equal(fleetGame.state().campaign.upgrades.engine,level);}
 fleetGame.click('export');const fleetBackup=JSON.parse(await fleetGame.getDownload().text());fleetGame.click('reset');
 await fleetGame.handlers['import-file:change']({target:{files:[{size:20000,text:async()=>JSON.stringify(fleetBackup)}]}});assert.deepEqual(fleetGame.state().fleet,fleetBackup.state.fleet);assert.deepEqual(fleetGame.state().campaign.upgrades,fleetBackup.state.campaign.upgrades);
 const timers=fleetGame.state();timers.growth.chapter=1;timers.growth.levels.workshop=0;timers.extensions.levels.rescue=0;storage.set('havnekaptajnen.v2.save',JSON.stringify(timers));fleetGame=boot();fleetGame.click('factory-produce','wood');const shortTime=fleetGame.state().factory.jobs.shore.readyAt-clockNow;
 const upgraded=fleetGame.state();upgraded.factory.jobs.shore=null;upgraded.growth.chapter=20;upgraded.growth.levels.workshop=15;storage.set('havnekaptajnen.v2.save',JSON.stringify(upgraded));fleetGame=boot();fleetGame.click('factory-produce','wood');assert.ok(fleetGame.state().factory.jobs.shore.readyAt-clockNow>shortTime);
 assert.ok(catalog.project({...catalog.fresh(),levels:{club:10}},'club').seconds>catalog.project(catalog.fresh(),'club').seconds);
 fleetGame.click('fleet-open');assert.ok(fleetGame.elements.app.innerHTML.includes('Brug dit større lastrum'));assert.ok(fleetGame.elements.app.innerHTML.includes('Ekspeditionsskib'));
 console.log('PASS V10 five ships, chapter and capacity gates, timed building, once-only costs/launch/rewards, retained boats, freight and workshop exclusivity, frozen trip rewards, manual sailing with ticket/reload, progressive refit/production/district time, export/import and once-only 10-ticket migration');

 // V11: two terminal levels and two container ships are substantial timed projects.
 let portSeed=fleetGame.state();portSeed.cash=5000000;portSeed.factory.jobs.shore=null;portSeed.growth.chapter=35;
 for(const id of Object.keys(portSeed.factory.stock))portSeed.factory.stock[id]=5000;
 portSeed.fleet.dock.level=4;portSeed.fleet.terminal={level:0,project:null};storage.set('havnekaptajnen.v2.save',JSON.stringify(portSeed));let portGame=boot();
 portGame.click('fleet-buy','havbro');assert.equal(portGame.state().fleet.build,null,'container ship requires a completed terminal');
 portSeed.growth.chapter=29;storage.set('havnekaptajnen.v2.save',JSON.stringify(portSeed));portGame=boot();portGame.click('fleet-terminal-build');assert.equal(portGame.state().fleet.terminal.project,null,'terminal has its own chapter gate');
 portSeed.growth.chapter=35;storage.set('havnekaptajnen.v2.save',JSON.stringify(portSeed));portGame=boot();
 for(const level of [1,2]){
  if(level===2){const late=portGame.state();late.growth.chapter=60;late.fleet.dock.level=5;storage.set('havnekaptajnen.v2.save',JSON.stringify(late));portGame=boot();}
  const before=portGame.state(),q=fleetCatalog.terminalQuote(level-1);portGame.click('fleet-terminal-build');let pending=portGame.state().fleet.terminal.project;
  assert.equal(pending.level,level);assert.ok(pending.workId);assert.equal(pending.readyAt,clockNow+q.seconds*1000);assert.equal(portGame.state().cash,before.cash-q.cash);
  assert.equal(portGame.state().factory.stock.plank,before.factory.stock.plank-q.needs.plank);
  portGame.click('fleet-terminal-build');assert.equal(portGame.state().cash,before.cash-q.cash);portGame.click('fleet-terminal-finish');assert.equal(portGame.state().fleet.terminal.level,level-1);
  portGame=boot();assert.deepEqual(portGame.state().fleet.terminal.project,pending);portGame.click('shop-skip','fleet-terminal');portGame.click('shop-confirm');pending=portGame.state().fleet.terminal.project;
  assert.equal(pending.readyAt,clockNow+(q.seconds-300)*1000);clockNow=pending.readyAt;portGame=boot();portGame.click('fleet-terminal-finish');portGame.click('fleet-terminal-finish');assert.equal(portGame.state().fleet.terminal.level,level);
  const ship=fleetCatalog.ships.find(x=>x.port===level);portGame.click('fleet-buy',ship.id);const b=portGame.state().fleet.build;assert.equal(b.readyAt,clockNow+ship.seconds*1000);
  portGame.click('fleet-launch');assert.ok(!portGame.state().fleet.owned.includes(ship.id));clockNow=b.readyAt;portGame=boot();portGame.click('fleet-launch');assert.equal(portGame.state().fleet.active,ship.id);
  portGame.tab('vaerksted');assert.ok(portGame.elements.app.innerHTML.includes('aria-label="Containerkajen"'));assert.ok(!portGame.elements.app.innerHTML.includes('island-interior.png'));
  portGame.click('fleet-send',level===1?'regional':'ocean');const voyage=portGame.state().fleet.job;assert.equal(voyage.ship,ship.id);assert.ok(voyage.cash>=40000);if(level===2)assert.ok(voyage.cash>100000,'large freight exceeds old normalizer limit');
  portGame.click('fleet-select','svalen');assert.equal(portGame.state().fleet.active,ship.id);portGame.click('fleet-return');assert.equal(portGame.state().fleet.job.id,voyage.id);
  portGame=boot();assert.deepEqual(portGame.state().fleet.job,voyage);portGame.click('sail-start');assert.ok(portGame.elements.app.innerHTML.includes('container-topdown'));
  clockNow=voyage.readyAt;portGame.click('fleet-return');const cashOnce=portGame.state().cash;portGame.click('fleet-return');assert.equal(portGame.state().cash,cashOnce);
 }
 assert.equal(portGame.state().fleet.owned.length,7);assert.equal(fleetCatalog.terminalQuote(2),null);portGame.click('fleet-terminal-build');assert.equal(portGame.state().fleet.terminal.project,null);
 portGame.click('export');const portBackup=JSON.parse(await portGame.getDownload().text());portGame.click('reset');
 await portGame.handlers['import-file:change']({target:{files:[{size:20000,text:async()=>JSON.stringify(portBackup)}]}});assert.deepEqual(portGame.state().fleet,portBackup.state.fleet);
 const v10Fleet={schema:1,active:'fjordly',owned:['svalen','havkat','fjordly'],build:null,job:null,deliveries:42};const v11Fleet=fleetCatalog.normalize(v10Fleet,clockNow);assert.equal(v11Fleet.active,'fjordly');assert.equal(v11Fleet.deliveries,42);assert.deepEqual(v11Fleet.terminal,{level:0,project:null});assert.deepEqual(v11Fleet.owned,v10Fleet.owned);
 console.log('PASS V11 container terminal chapter gates, two timed stages, once-only resources, ticket/reload deadlines, both large ships, 240/600 cargo capacity, large-reward persistence, sea exclusivity, dedicated quay and manual ship graphics, export/import and V10 migration');

 console.log('ALL LOGIC TESTS PASSED');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={boot,storage,now:()=>clockNow,advance:ms=>{clockNow+=ms;}};

