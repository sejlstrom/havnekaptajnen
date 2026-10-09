/* Editorial sponsor inventory. Only approved campaigns belong here.
   Local images, no SDK, no impressions/click tracking, no player identifiers.
   Ad-free is a verified billing entitlement or an explicitly labelled session preview. */
(function(root){
 'use strict';
 const campaigns=Object.freeze([
  Object.freeze({id:'sejlstroem',brand:'SejlStrøm',owner:true,headline:'Udstyr til livet ombord',copy:'Solceller, batterier og varme til båden. SejlStrøm er både spillets udgiver og webshoppen bag reklamen.',url:'https://sejlstroem.dk/',image:'./sejlstroem-logo.avif',alt:'SejlStrøm — logo med sejlbåd og lyn',slots:['top','workshop','logbook']})
 ]);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function valid(c){try{const u=new URL(c.url);return u.protocol==='https:'&&!u.username&&!u.password&&/^\.\/[a-z0-9_-]+\.(avif|png|webp|svg)$/i.test(c.image)&&!!c.brand;}catch{return false;}}
 function campaign(slot){return campaigns.find(c=>valid(c)&&c.slots.includes(slot))||null;}
 function details(href){try{const u=new URL(href);if(u.protocol!=='https:')return null;return campaigns.find(c=>valid(c)&&new URL(c.url).hostname===u.hostname)||null;}catch{return null;}}
 function card(slot,href){const c=campaign(slot);return c?`<aside class="ad-card" data-sponsor="${esc(c.id)}" aria-label="Reklame for ${esc(c.brand)}"><div class="ad-card-brand"><img class="sponsor-logo" src="${esc(c.image)}" width="200" height="200" alt="${esc(c.alt)}"><span class="ad-label">Reklame · ${esc(c.brand)}</span></div><strong>${esc(c.headline)}</strong><p>${esc(c.copy)}</p><a class="sponsor-link" href="${esc(href&&details(href)?.id===c.id?href:c.url)}" target="_blank" rel="noopener noreferrer">Besøg ${esc(c.brand)} ↗</a><small>Køb eller klik hos annoncøren giver ingen fordel i spillet.</small></aside>`:'';}
 function strip(){const c=campaign('top');return c?`<div class="sponsor-brand"><img class="sponsor-logo" src="${esc(c.image)}" width="200" height="200" alt="${esc(c.alt)}"></div><div class="sponsor-message"><span class="ad-label">Reklame · ${esc(c.brand)}</span><p class="sponsor-copy">${esc(c.headline)}</p></div><div class="sponsor-actions"><a class="sponsor-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Besøg webshop ↗</a><a class="spilinfo-link" href="./om-spillet.html">Kontakt & privatliv</a></div>`:'';}
 const api=Object.freeze({campaign,details,card,strip});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborSponsors=api;
})(typeof window==='undefined'?globalThis:window);
