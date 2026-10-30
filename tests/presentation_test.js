const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const view=require('../harbor-presentation.js');
const {boot,storage,now}=require('./logic_test.js');
test('agenda sorts actual jobs, crosses ready boundary and never mutates a save',()=>{
 const jobs={shore:null,fishing:{recipe:'fish',out:4,readyAt:2000},workshop:{recipe:'plank',out:6,readyAt:1000},invalid:{readyAt:'0'}};const before=JSON.stringify(jobs);
 assert.deepEqual(view.jobList(jobs,999).map(j=>[j.id,j.ready]),[['workshop',false],['fishing',false]]);
 assert.deepEqual(view.jobList(jobs,1000).map(j=>[j.id,j.ready]),[['workshop',true],['fishing',false]]);
 assert.equal(JSON.stringify(jobs),before);
 const html=view.overview({jobs,now:1000,names:{fishing:'Fiskeri',workshop:'Værft'},goods:{fish:{name:'fisk'},plank:{name:'planker'}},boat:{file:'island-boat.png',name:'Svalen',capacity:12,seaworthiness:1},claimed:0,chapter:1});
 assert.match(html,/data-ready-count>1</);assert.match(html,/data-act="world-open" data-val="workshop"/);assert.match(html,/6 planker/);assert.match(html,/data-calm-water/);
 assert.ok(!html.includes('data-act="factory-collect"'),'overview routes to the station before any collection');
 assert.ok(!html.includes('data-act="factory-produce"'),'opening the agenda never starts or charges for work');
});
test('agenda preserves the pink boat, supplies, camera and in-progress work on open/close/reload',()=>{
 storage.clear();let a=boot();let state=a.state();state.factory.restored=4;state.cash=81234;state.campaign.claimed=12;state.campaign.intro=true;state.growth.chapter=16;state.fleet.owned=['svalen','havkat','fjordly'];state.factory.stock.wood=23;state.factory.stock.plank=9;storage.set('havnekaptajnen.v2.save',JSON.stringify(state));a=boot();a.click('fleet-select','havkat');a.click('boat-select','pink');a.click('factory-produce','plank');a.click('island-zoom','in');
 const before=JSON.stringify(a.state());a.click('world-open','agenda');const html=a.elements.app.innerHTML;
 assert.match(html,/Havnen lige nu/);assert.match(html,/data-hull-paint="pink"/);assert.match(html,/data-val="workshop"/);assert.match(html,/data-countdown=/);
 a.click('world-close');a.tab('vaerksted');a.click('world-open','agenda');assert.match(a.elements.app.innerHTML,/Havnen lige nu/);assert.equal(JSON.stringify(a.state()),before);
 const reloaded=boot();assert.deepEqual(JSON.parse(JSON.stringify(reloaded.state())),JSON.parse(before));assert.match(reloaded.elements.app.innerHTML,/island-terrain-v16.png/);
});
test('agenda renders input labels as text, never as injected markup or action attributes',()=>{
 const html=view.overview({jobs:{'bad" onclick="attack':{recipe:'fish',out:2,readyAt:1}},now:2,names:{},goods:{fish:{name:'<script>attack()</script>'}},boat:{file:'boat.png',name:'<img onerror=attack()>',capacity:12,seaworthiness:1},claimed:12,chapter:2});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror='));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&quot; onclick=&quot;'));
});
function lifecycleHarness({reduced=false,storageThrows=false}={}){
 let hidden=false,frameId=0,timerId=0,writes=0,clock=0;const frames=new Map(),timers=new Map(),listeners=new Map(),motionListeners=new Set(),classes=new Set();
 const input={checked:false,addEventListener(t,f){this.change=f;},removeEventListener(){this.change=null;}};
 const context={clearRect(){},beginPath(){},ellipse(){},fill(){}};
 const canvas={getContext(){return context;}};
 const plane={appendChild(){},querySelector(){return canvas;}};
 const scene={isConnected:true,classList:{toggle(n,on){on?classes.add(n):classes.delete(n);}}};
 const root={querySelector(s){return {'.island-game':scene,'.island-plane':plane,'[data-calm-water]':input}[s]||null;},querySelectorAll(){return [];}};
 const doc={get hidden(){return hidden;},querySelectorAll(){return [];},createElement(){return {setAttribute(){}};},addEventListener(k,f){listeners.set(k,f);},removeEventListener(k){listeners.delete(k);}};
 const motion={matches:reduced,addEventListener(_,f){motionListeners.add(f);},removeEventListener(_,f){motionListeners.delete(f);}};
 const win={document:doc,localStorage:{getItem(){if(storageThrows)throw Error('blocked');return null;},setItem(k){assert.equal(k,'havnekaptajnen.visuals.v1');writes++;if(storageThrows)throw Error('blocked');}},matchMedia(){return motion;},requestAnimationFrame(fn){frames.set(++frameId,fn);return frameId;},cancelAnimationFrame(id){frames.delete(id);},setInterval(fn){timers.set(++timerId,fn);return timerId;},clearInterval(id){timers.delete(id);}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../harbor-presentation.js'),'utf8'),{window:win,console,Date});
 return {api:win.HarborPresentation,root,frames,timers,listeners,motionListeners,classes,input,get writes(){return writes;},hide(v){hidden=v;listeners.get('visibilitychange')?.();},reduce(v){motion.matches=v;for(const f of motionListeners)f();},frame(){clock+=34;const f=frames.entries().next().value;if(f){frames.delete(f[0]);f[1](clock);}}};
}
test('visual renderer has one loop, stops while hidden or reduced, and cleans up after repeated navigation',()=>{
 const h=lifecycleHarness();for(let i=0;i<12;i++){h.api.mount(h.root);assert.equal(h.frames.size,1);assert.equal(h.timers.size,1);assert.equal(h.listeners.size,1);assert.equal(h.motionListeners.size,1);h.frame();assert.equal(h.frames.size,1);}
 h.hide(true);assert.equal(h.frames.size,0);assert.ok(h.classes.has('harbor-calm'));h.hide(false);assert.equal(h.frames.size,1);
 h.reduce(true);assert.equal(h.frames.size,0);h.reduce(false);assert.equal(h.frames.size,1);
 h.input.checked=true;h.input.change();assert.equal(h.frames.size,0);assert.equal(h.api.calm(),true);assert.equal(h.writes,1);
 h.api.stop();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(h.listeners.size,0);assert.equal(h.motionListeners.size,0);
});
test('reduced motion and blocked preference storage still let the harbor load without a render loop',()=>{
 const h=lifecycleHarness({reduced:true,storageThrows:true});h.api.mount(h.root);assert.equal(h.frames.size,0);assert.equal(h.writes,0);h.input.checked=true;assert.doesNotThrow(()=>h.input.change());h.api.stop();assert.equal(h.timers.size,0);
});
test('all water sparkles stay in the open sea south of the piers',()=>{for(let i=0;i<38;i++)for(let t=0;t<300;t+=.8){const p=view.sparkleAt(i,t);assert.ok(p.x>=84&&p.x<1367);assert.ok(p.y>=1098&&p.y<=1192);assert.ok(p.alpha>=0&&p.alpha<=.65);}});
test('all three real buildings and their production drawers use the new illustrations without moving ground anchors or changing inventory',()=>{
 storage.clear();const a=boot(),before=a.state();
 for(const [id,asset]of [['fishing','fishery'],['workshop','workshop'],['cafe','cafe']]){
  a.tab('havn');assert.ok(a.elements.app.innerHTML.includes('island-'+asset+'-v17.png'));a.click('world-open',id);
  assert.ok(a.elements.app.innerHTML.includes('station-scene-'+id));assert.ok(a.elements.app.innerHTML.includes('island-'+asset+'-v17.png'));
  assert.ok(a.elements.app.innerHTML.includes('data-act="world-close"'),'close control remains available');
  const bytes=fs.readFileSync(require('node:path').resolve(__dirname,'../island-'+asset+'-v17.png'));
  assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);assert.equal(bytes[25],6,'PNG retains RGBA transparency');
 }
 assert.deepEqual(a.state(),before);assert.deepEqual(a.state().island.positions,{fishing:{x:570,y:630},workshop:{x:960,y:665},cafe:{x:1290,y:425}});
});
test('illustrated production steam only runs for genuine unfinished jobs',()=>{
 const job={recipe:'plank',out:2,readyAt:1000},before=JSON.stringify(job);
 assert.match(view.stationScene('workshop',job,999),/station-at-work/);assert.doesNotMatch(view.stationScene('workshop',job,1000),/station-at-work/);
 assert.doesNotMatch(view.stationScene('cafe',null,999),/station-at-work|data-station-ready/);assert.doesNotMatch(view.stationScene('fishing',{readyAt:'bad'},999),/data-station-ready/);
 assert.equal(view.stationScene('unknown',job,999),'');assert.equal(JSON.stringify(job),before);
});
