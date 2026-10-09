/* Havnekaptajnen - offline cache. No analytics, no remote assets. */
const CACHE='havnekaptajnen-static-v47';
const STATIC=['./land.js?v=12.0.5','./land.css?v=12.0.5','./workshop-floor-v12.png','./land-meadow.png','./land-greenhouse.png','./land-bakery.png','./land-ropeworks.png','./land-sailmaker.png','./fleet-feeder.png','./fleet-ocean.png','./fleet.js?v=12.0.5','./fleet.css?v=12.0.5','./fleet-cutter.png','./fleet-cruiser.png','./fleet-catamaran.png','./fleet-expedition.png','./','./index.html','./harbor-content.js?v=12.0.5','./billing-client.js?v=12.0.5','./shop.css?v=12.0.5','./styles.css?v=12.0.5','./app.js?v=12.0.5','./walking.js?v=12.0.5','./camera.js?v=12.0.5','./walking-rig.js?v=12.0.5','./island-worker-rig.png','./island-alma-rig.png','./world.css?v=12.0.5','./campaign.css?v=12.0.5','./growth.css?v=12.0.5','./island.css?v=12.0.5','./island-terrain.png','./island-fishery.png','./island-workshop.png','./island-cafe.png','./island-lighthouse.png','./island-boat.png','./island-interior.png','./island-tree.png','./island-worker.png','./island-alma.png','./island-water.png','./harbor-start.png','./harbor-world.png','./workshop-world.png','./player-boat.png','./boat-top.png','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('havnekaptajnen-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
 else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));
});

