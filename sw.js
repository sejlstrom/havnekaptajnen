/* Havnekaptajnen - offline cache. No analytics, no remote assets. */
const CACHE='havnekaptajnen-static-v31';
const STATIC=['./','./index.html','./styles.css?v=8.8.2','./app.js?v=8.8.2','./walking.js?v=8.8.2','./camera.js?v=8.8.2','./walking-rig.js?v=8.8.2','./island-worker-rig.png','./island-alma-rig.png','./world.css?v=8.8.2','./campaign.css?v=8.8.2','./growth.css?v=8.8.2','./island.css?v=8.8.2','./island-terrain.png','./island-fishery.png','./island-workshop.png','./island-cafe.png','./island-lighthouse.png','./island-boat.png','./island-interior.png','./island-tree.png','./island-worker.png','./island-alma.png','./island-water.png','./harbor-start.png','./harbor-world.png','./workshop-world.png','./player-boat.png','./boat-top.png','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('havnekaptajnen-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
 else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));
});

