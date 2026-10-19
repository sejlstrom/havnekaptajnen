const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createClient}=require('../account-client.js');
const demoKey='havnekaptajnen.demo.actions',guestKey='havnekaptajnen.v2.save';
const source=new vm.Script(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'));
const response=(data,status=200)=>({ok:status<400,status,json:async()=>structuredClone(data)});
async function boot(storage=new Map(),offline=false){
 const handlers={},elements={},messages=[];let prompts=0,initPromise;
 const el=id=>({id,innerHTML:'',textContent:'',hidden:true,value:'',files:[],classList:{add(){},remove(){},toggle(){}},addEventListener(event,fn){handlers[id+':'+event]=fn;},setAttribute(){},removeAttribute(){},appendChild(){},remove(){},click(){}});
 const doc={addEventListener(event,fn){handlers['document:'+event]=fn;},getElementById(id){return elements[id]||(elements[id]=el(id));},querySelector(s){return s==='.dock-nav'?{addEventListener(event,fn){handlers['nav:'+event]=fn;}}:null;},querySelectorAll(){return [];},createElement(){return el('generated');},body:{appendChild(){}}};
 const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const win={HarborVoyages:require('../voyages.js'),HarborLife:require('../harbor-life.js'),HarborSponsors:require('../sponsors.js'),HarborContent:require('../harbor-content.js'),HarborFleet:require('../fleet.js'),HarborLand:require('../land.js'),confirm:()=>true,addEventListener(){},scrollTo(){}};
 const client=createClient({api:'/api',storage:localStorage,uuid:()=>Math.random().toString(36),game:()=>win.HarborGame,fetcher:async url=>{if(offline)throw new Error('offline');return url.endsWith('/config')?response({accountEnabled:true,payments:false,mode:'closed'}):response({error:'Log ind'},401);},ui:{changed(){},message:m=>messages.push(m),demoEnded:()=>prompts++,confirmPaid:async()=>false}});
 win.HarborAccount={...client,init:()=>initPromise=client.init()};
 source.runInNewContext({window:win,document:doc,navigator:{},location:{protocol:'file:',hostname:''},localStorage,console,Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Date,Intl,Math,Object,JSON,Array,Number,String,setTimeout(){},clearTimeout(){},setInterval(){}});
 handlers['document:DOMContentLoaded']();await initPromise;
 return {client,storage,messages,get prompts(){return prompts;},state:()=>win.HarborGame.snapshot(),click:(act,val)=>handlers['app:click']({target:{closest:()=>({dataset:{act,val},disabled:false})}})};
}
test('six successful real game actions complete; seventh is blocked and progress survives reload',async()=>{
 const h=await boot();for(let i=0;i<3;i++)h.click('welcome',String(i));for(let i=0;i<3;i++)h.click('market');
 assert.equal(h.client.state().demoUsed,6);assert.equal(h.prompts,1);const saved=h.storage.get(guestKey),cash=h.state().cash;
 h.click('market');assert.equal(h.state().cash,cash);assert.equal(h.storage.get(guestKey),saved);assert.equal(h.client.intercept('export'),false);assert.equal(h.client.intercept('tab'),false);
 const next=await boot(h.storage);assert.equal(next.client.state().demoUsed,6);assert.equal(next.state().cash,cash);next.click('market');assert.equal(next.state().cash,cash);
});
test('failed actions, early collections, navigation and unchanged state do not consume demo turns',async()=>{
 const h=await boot();h.click('welcome','wrong');h.click('factory-collect','fish');h.click('tab','vaerksted');h.click('tab','havn');assert.equal(h.client.state().demoUsed,0);
 h.click('welcome','0');assert.equal(h.client.state().demoUsed,1);h.click('welcome','0');assert.equal(h.client.state().demoUsed,1);
 const finish=h.client.beginLocalAction('market');finish();finish();assert.equal(h.client.state().demoUsed,1);
});
test('the same counter gates other tabs and offline reload; it never enters the saved harbor',async()=>{
 const h=await boot();const second=await boot(h.storage);for(let i=0;i<6;i++)h.click('market');
 const before=second.state().cash;second.click('market');assert.equal(second.state().cash,before);assert.equal(second.client.state().demoUsed,6);
 const off=await boot(h.storage,true);assert.equal(off.client.intercept('market'),true);assert.equal(off.client.sailingTick('sejl',{finished:false,nextAt:0}),true);
 assert.equal(JSON.parse(h.storage.get(guestKey)).demoUsed,undefined);assert.equal(h.storage.get(demoKey),'6');
});
test('resetting a test harbor does not reset the separate demo limit',async()=>{
 const h=await boot(new Map([[demoKey,'6']]));h.click('reset');assert.equal(h.client.state().demoUsed,6);const state=h.storage.get(guestKey);h.click('market');assert.equal(h.storage.get(guestKey),state);
});
test('cloud accounts ignore the demo limit and retain the guest save',async()=>{
 const entries=new Map([[demoKey,'6'],[guestKey,JSON.stringify({cash:123})]]);let saved={cash:123},remote=0;
 const client=createClient({api:'/api',uuid:()=> 'test',storage:{getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)},game:()=>({snapshot:()=>structuredClone(saved),replace:s=>saved=structuredClone(s),toast(){},remoteUI(){}}),fetcher:async url=>{if(url.endsWith('/config'))return response({accountEnabled:true});if(url.endsWith('/me'))return response({account:'A',csrf:'test',save:{revision:1,state:{cash:999}}});if(url.endsWith('/save/quote')){remote++;return response({id:'q',ore:0});}return response({revision:2,state:{cash:1000}});},ui:{changed(){},message(){},demoEnded(){throw new Error('cloud demo gate');},confirmPaid:async()=>true}});
 await client.init();const guest=entries.get(guestKey);assert.equal(client.beginLocalAction('market'),undefined);assert.equal(client.intercept('market'),true);await new Promise(r=>setImmediate(r));assert.equal(remote,1);assert.equal(saved.cash,1000);assert.equal(entries.get(guestKey),guest);
});
