// Offline worker's precache and navigation fallback, tested in a mock service-worker environment.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const worker=fs.readFileSync(path.resolve(__dirname,'../sw.js'),'utf8');
const appSource=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
const cacheVersion=worker.match(/havnekaptajnen-static-v(\d+)/)[1];
assert.ok(appSource.includes("register('./sw.js?v="+cacheVersion+"',{updateViaCache:'none'})"),'register the matching versioned worker so an old CDN response cannot keep the previous offline shell');
const handlers={};
const map=new Map();
class Cache{
 async addAll(requests){for(const req of requests){assert.equal(req.cache,'reload','new offline versions must bypass stale HTTP cache');const p=req.url;const file=path.resolve(__dirname,'..',p.split('?')[0].replace(/^\.\//,''));assert.ok(fs.existsSync(file),'missing offline asset '+p);map.set(p,{body:'cached:'+p})}}
 async put(req,res){map.set(req.url,res)}
}
const cache=new Cache();
const caches={async open(){return cache},async match(req){return map.get(typeof req==='string'?req:req.url)},async keys(){return ['havnekaptajnen-static-v1','havnekaptajnen-static-v2']},async delete(key){return true}};
const self={location:{origin:'https://marina.test'},addEventListener(type,fn){handlers[type]=fn},skipWaiting(){},clients:{claim(){}}};
class Request{constructor(url,options){this.url=url;this.cache=options.cache}}
const ctx={self,caches,URL,Request,location:{origin:'https://marina.test'},fetch:async()=>{throw new Error('offline')},Promise};
vm.runInNewContext(worker,ctx,{filename:'sw.js'});
let installPromise;handlers.install({waitUntil(p){installPromise=p}});
(async()=>{
 await installPromise;
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 for(const [,asset] of html.matchAll(/(?:src|href)="(\.\/[^" ]+\.(?:js|css)\?v=[^"]+)"/g))assert.equal(map.get(asset)?.body,'cached:'+asset,'current entry asset must be cached: '+asset);
 assert.equal(map.get('./land-north-v15.png').body,'cached:./land-north-v15.png');
 assert.equal(map.get('./index.html').body,'cached:./index.html');
 let response;
 handlers.fetch({request:{url:'https://marina.test/index.html',method:'GET',mode:'navigate'},respondWith(p){response=p}});
 assert.equal((await response).body,'cached:./index.html');
 handlers.fetch({request:{url:'https://marina.test/om-spillet.html',method:'GET',mode:'navigate'},respondWith(p){response=p}});
 assert.equal((await response).body,'cached:./om-spillet.html','legal information remains available offline');
 handlers.fetch({request:{url:'https://marina.test/om-spillet.html?source=game',method:'GET',mode:'navigate'},respondWith(p){response=p}});
 assert.equal((await response).body,'cached:./om-spillet.html');
 console.log('PASS service-worker installation caches every packaged game asset');
 console.log('PASS installing a new version reloads every asset instead of reusing HTTP cache');
 console.log('PASS offline navigation falls back to cached game shell');
 console.log('PASS offline legal-page navigation retains legal information, including query strings');
 for(const pathname of ['/api/me','/api/export','/stripe/webhook','/demo-inbox','/demo-pay']){let intercepted=false;handlers.fetch({request:{url:'https://marina.test'+pathname,method:'GET',mode:'cors'},respondWith(){intercepted=true}});assert.equal(intercepted,false,'private reply must bypass service worker '+pathname);}
 console.log('PASS account and payment replies never enter the offline asset cache');
})().catch(err=>{console.error(err);process.exitCode=1});

