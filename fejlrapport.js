(function(root){
 'use strict';
 const recipient='shop@sejlstroem.dk',build='15.0.8';
 const areas=['Vælg område','Havnen','Værksted og både','Sejlads og øer','Produktion og opgraderinger','Login og gemning','Grafik og bevægelse','Installation og offline','Andet'];
 const clean=(text,max)=>String(text||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);
 function compose(fields={},tech={},time=new Date().toISOString()){
  const area=areas.includes(fields.area)?fields.area:'Andet';
  const lines=['FEJLRAPPORT · HAVNEKAPTAJNEN','Version: 1 (udgave '+build+')','Tidspunkt: '+clean(time,40),'Område: '+area,'','Hvad gik galt?',clean(fields.problem,1500)||'(beskriv fejlen)'];
  if(clean(fields.steps,800))lines.push('','Lige inden fejlen:',clean(fields.steps,800));
  if(clean(fields.expected,500))lines.push('','Forventet resultat:',clean(fields.expected,500));
  if(fields.technical)lines.push('','Tekniske oplysninger:','Browser: '+clean(tech.browser,220),'Sprog: '+clean(tech.language,30),'Visning: '+clean(tech.viewport,40),'Forbindelse: '+(tech.online?'online':'offline'));
  return {subject:'Havnekaptajnen – fejlrapport: '+area,body:lines.join('\n')};
 }
 function mailto(report){return 'mailto:'+recipient+'?subject='+encodeURIComponent(report.subject)+'&body='+encodeURIComponent(report.body);}
 if(typeof module==='object'&&module.exports){module.exports={compose,mailto};return;}
 const form=document.getElementById('report-form');if(!form)return;
 const byId=id=>document.getElementById(id),timestamp=new Date().toISOString();
 const tech=()=>({browser:navigator.userAgent,language:navigator.language,viewport:innerWidth+' × '+innerHeight,online:navigator.onLine});
 const fields=()=>({area:byId('report-area').value,problem:byId('report-problem').value,steps:byId('report-steps').value,expected:byId('report-expected').value,technical:byId('report-technical').checked});
 const report=()=>compose(fields(),tech(),timestamp),message=text=>{byId('report-status').textContent=text;};
 const preview=()=>{byId('report-preview').textContent=report().body;};
 function valid(){const input=byId('report-problem');input.setCustomValidity(input.value.trim().length<5?'Beskriv fejlen med mindst fem tegn.':'');return form.reportValidity();}
 form.addEventListener('input',()=>{byId('report-problem').setCustomValidity('');preview();});form.addEventListener('change',preview);
 form.addEventListener('submit',event=>{event.preventDefault();if(!valid())return;location.href=mailto(report());message('Mailkladden er klar. Send den fra dit mailprogram. Hvis det ikke åbner, så brug Kopiér rapport eller Hent rapport som tekst.');});
 byId('report-copy').addEventListener('click',async()=>{if(!valid())return;try{await navigator.clipboard.writeText(report().body);message('Rapporten er kopieret. Indsæt den i en mail til '+recipient+'.');}catch{message('Browseren tillod ikke kopiering. Brug Hent rapport som tekst i stedet.');}});
 byId('report-download').addEventListener('click',()=>{if(!valid())return;const url=URL.createObjectURL(new Blob([report().body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='havnekaptajnen-fejlrapport.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Rapporten er hentet som tekst. Vedhæft filen i din mail til '+recipient+'.');});
 root.addEventListener('resize',preview);root.addEventListener('online',preview);root.addEventListener('offline',preview);preview();
})(typeof window==='undefined'?globalThis:window);
