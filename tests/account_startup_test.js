const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createClient}=require('../account-client.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const guestKey='havnekaptajnen.v2.save',marker='havnekaptajnen.account.last';
const response=(data,status=200)=>({ok:status<400,status,json:async()=>structuredClone(data)});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot({fetcher,cache,account=true,initError=false}={}){
 const handlers={},elements={},entries=new Map([[guestKey,JSON.stringify({version:2,day:1,cash:1111,reputation:60,upgrades:{}})]]);
 if(cache){entries.set(marker,'A');entries.set('havnekaptajnen.account.A',JSON.stringify(cache));}
 const storage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 function element(id){return{id,style:{},innerHTML:'',textContent:'',hidden:true,clientWidth:1280,clientHeight:648,attrs:{},
  classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},appendChild(){},remove(){},
  addEventListener(type,fn){handlers[id+':'+type]=fn;},getBoundingClientRect(){return{left:0,top:0}},setPointerCapture(){},
  ...(id==='island-viewport'?{querySelector(){return null;}}:{})};}
 const nav=['havn','vaerksted','oehav','udvikling','butik','logbog'].map(tab=>({...element('nav-'+tab),dataset:{tab},disabled:false}));
 const document={getElementById(id){return elements[id]||(elements[id]=element(id));},addEventListener(type,fn){handlers['document:'+type]=fn;},
  querySelector(s){return s==='.dock-nav'?{addEventListener(type,fn){handlers['nav:'+type]=fn;}}:null;},
  querySelectorAll(s){return s==='.dock-nav button'?nav:[];},createElement(){return element('created')},body:{classList:{add(){},remove(){},toggle(){}},appendChild(){}}};
 const win={HarborVoyages:require('../voyages.js'),HarborLife:require('../harbor-life.js'),HarborSponsors:require('../sponsors.js'),HarborContent:require('../harbor-content.js'),HarborFleet:require('../fleet.js'),HarborLand:require('../land.js'),HarborCamera:require('../camera.js'),addEventListener(type,fn){handlers['window:'+type]=fn;},removeEventListener(){},confirm(){return true;},scrollTo(){}};
 const messages=[];
 if(account){win.HarborAccount=createClient({api:'/api',fetcher,storage,game:()=>win.HarborGame,ui:{changed(){},message:m=>messages.push(m),confirmPaid:async()=>true}});if(initError)win.HarborAccount.init=()=>{throw new Error('simulated startup failure');};}
 const ctx={window:win,document,navigator:{},location:{protocol:'file:',hostname:''},localStorage:storage,console,Blob,URL,Date,Intl,Math,Object,JSON,Array,Number,String,setTimeout(){return 1;},clearTimeout(){},setInterval(){}};
 vm.runInNewContext(source,ctx);handlers['document:DOMContentLoaded']();
 return{win,elements,entries,nav,messages,html:()=>elements.app.innerHTML,state:()=>win.HarborGame.snapshot()};
}
test('slow account load hides guest cash and art until the cloud harbor is ready',async()=>{
 let resolveMe;const cloudReady=new Promise(r=>{resolveMe=r;});
 const h=boot({fetcher:async url=>url.endsWith('/config')?response({accountEnabled:true}):cloudReady});
 const guestBefore=h.entries.get(guestKey);
 assert.match(h.html(),/Din havn hentes/);assert.doesNotMatch(h.html(),/1[.,]111|island-terrain/);
 assert.equal(h.elements.app.attrs['aria-busy'],'true');assert.ok(h.nav.every(b=>b.disabled));
 await settle();assert.match(h.html(),/Din havn hentes/);
 const cloud=h.state();cloud.cash=9123;resolveMe(response({account:'A',csrf:'token',save:{revision:8,state:cloud}}));
 await settle();assert.doesNotMatch(h.html(),/Din havn hentes/);assert.match(h.html(),/9[.,]123/);
 assert.equal(h.state().cash,9123);assert.equal(h.elements.app.attrs['aria-busy'],'false');assert.ok(h.nav.every(b=>!b.disabled));
 assert.equal(h.entries.get(guestKey),guestBefore,'account loading must preserve guest save bytes');
});
test('offline account opens the cached read-only harbor and releases loading controls',async()=>{
 const seed=boot({account:false}).state();seed.cash=7250;
 const h=boot({cache:seed,fetcher:async()=>{throw new Error('offline');}});
 const guestBefore=h.entries.get(guestKey);await settle();
 assert.equal(h.state().cash,7250);assert.match(h.html(),/7[.,]250/);assert.doesNotMatch(h.html(),/Din havn hentes/);
 assert.equal(h.win.HarborAccount.state().authenticated,false);assert.equal(h.win.HarborAccount.connected(),true);
 assert.equal(h.entries.get(guestKey),guestBefore);assert.ok(h.nav.every(b=>!b.disabled));
 assert.equal(h.win.HarborAccount.intercept('factory-collect','fish'),true);
});
test('signed-out visitor opens the guest demo after the account check',async()=>{
 const h=boot({fetcher:async url=>url.endsWith('/config')?response({accountEnabled:true}):response({error:'Log ind'},401)});
 await settle();assert.equal(h.state().cash,1111);assert.match(h.html(),/1[.,]111/);
 assert.doesNotMatch(h.html(),/Din havn hentes/);assert.ok(h.nav.every(b=>!b.disabled));
});
test('unexpected account initialization error cannot leave an endless loading screen',async()=>{
 const h=boot({initError:true});await settle();
 assert.doesNotMatch(h.html(),/Din havn hentes/);assert.ok(h.nav.every(b=>!b.disabled));
 assert.equal(h.elements.app.attrs['aria-busy'],'false');
});
test('standalone simulation without account client renders immediately',()=>{
 const h=boot({account:false});assert.match(h.html(),/1[.,]111/);assert.doesNotMatch(h.html(),/Din havn hentes/);
});
