/* Payments are deliberately absent from the public release.
   Reintroducing payments requires a new reviewed implementation, not an endpoint switch.
   This adapter preserves callers without loading accounts or contacting any service. */
(function(root){
 'use strict';
 function createBilling(){
  const status=()=>({enabled:false,products:[],tickets:0,entitlements:[],account:false,recovery:'',acknowledged:false,pending:false,busy:false,message:'Pakkerne er forhåndsvisninger og kan ikke købes. Der er ingen betaling i denne version.'});
  const unavailable=async()=>{throw new Error('Betalinger og købskonti er ikke tilgængelige i denne version.');};
  return Object.freeze({configured:false,status,refresh:async()=>status(),createAccount:unavailable,restore:unavailable,acknowledge:()=>{throw new Error('Ingen købskonto i denne version.');},checkout:unavailable,redeem:unavailable,resume:async()=>{},owns:()=>false});
 }
 if(typeof module==='object'&&module.exports)module.exports={createBilling};
 else root.HarborBilling=createBilling();
})(typeof window==='undefined'?globalThis:window);
