(async()=>{
if(document.querySelector('#reputix-collector'))return;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const key=decodeURIComponent(location.href).match(/!1s(0x[\da-f]+:0x[\da-f]+)/i)?.[1];
const main=document.querySelector('[role="main"]');
if(!key||!main||!main.querySelector('[data-review-id]')){alert('Ouvrez une fiche et son onglet Avis avant de lancer la collecte.');return}
const summary=main.innerText.match(/(?:^|\n)([0-5](?:[,.]\d)?)\n([0-9][0-9 \u202f\u00a0]*) avis/);
const business={key,name:main.getAttribute('aria-label')||main.querySelector('h1')?.textContent||'Établissement',url:location.href,rating:summary?Number(summary[1].replace(',','.')):0,total:Number((summary?.[2]||main.innerText.match(/(?:^|\n)([0-9][0-9 \u202f\u00a0]*) avis/)?.[1]||'0').replace(/\D/g,''))};
let stopped=false,stopReason='Arrêt demandé',seen=new Map(),stale=0;
const panel=document.createElement('aside');panel.id='reputix-collector';panel.style.cssText='position:fixed;right:20px;top:80px;z-index:2147483647;background:white;color:#123;padding:20px;border:2px solid #0ea5e9;border-radius:12px;font:14px system-ui;box-shadow:0 4px 30px #0003;max-width:300px';
const status=document.createElement('p'),stop=document.createElement('button'),save=document.createElement('button');stop.textContent='Arrêter et exporter';save.textContent='Exporter maintenant';stop.onclick=()=>{stopped=true};
function exportData(){if(!seen.size)return;const data={version:1,collectedAt:new Date().toISOString(),business,reviews:[...seen.values()],stopReason};const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.href=url;a.download='reputix-avis-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
save.onclick=exportData;panel.append(status,stop,save);document.body.append(panel);
const started=Date.now();
try{while(!stopped&&Date.now()-started<30*60*1000){
 if(document.body.innerText.includes('Connectez-vous pour profiter pleinement')){stopReason='Connexion Google requise';break}
 const before=seen.size;
 for(const card of main.querySelectorAll('div[data-review-id][aria-label]')){
  if(stopped)break;const id=card.getAttribute('data-review-id');if(seen.has(id))continue;
  for(const b of card.querySelectorAll('button'))if(b.textContent.trim()==='Plus')b.click();
  await wait(80);
  const owner=card.querySelector('.CDe7pd');const textNode=[...card.querySelectorAll('.wiI7pd')].find(e=>!owner?.contains(e));
  const rating=Number((card.querySelector('[role="img"][aria-label*="étoile"]')?.getAttribute('aria-label')||'').match(/\d/)?.[0]);if(!rating)continue;
  let url=null;const share=[...card.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Partager'));
  if(share){share.click();for(let i=0;i<15;i++){await wait(100);const dialog=document.querySelector('[role="dialog"][aria-modal="true"]');const input=dialog?.querySelector('input');if(input?.value?.startsWith('https://maps.app.goo.gl/')){url=input.value;dialog.querySelector('button[aria-label="Fermer"]')?.click();break}}document.querySelector('[role="dialog"][aria-modal="true"] button[aria-label="Fermer"]')?.click()}
  seen.set(id,{id,author:card.getAttribute('aria-label'),rating,text:textNode?.textContent?.trim()||'',dateLabel:card.querySelector('.rsqaWe')?.textContent?.trim()||'',reply:owner?.querySelector('.wiI7pd')?.textContent?.trim()||null,url});
  status.textContent=`${business.name} : ${seen.size} avis collectés / ${business.total} annoncés. Gardez Maps ouvert.`;
 }
 if(business.total&&seen.size>=business.total){stopReason='Total annoncé atteint';break}
 if(seen.size===before)stale++;else stale=0;if(stale>=8){stopReason='Aucun nouvel avis après plusieurs défilements';break}
 const scroll=[...main.querySelectorAll('div')].find(e=>e.scrollHeight>e.clientHeight+200&&e.clientHeight>300);if(!scroll){stopReason='Liste défilante introuvable';break}scroll.scrollTop=scroll.scrollHeight;await wait(1500);
}if(!stopped&&Date.now()-started>=30*60*1000)stopReason='Limite de durée atteinte';}catch(e){stopReason='Collecte interrompue : '+e.message}
status.textContent=`${seen.size} avis collectés / ${business.total} annoncés. ${stopReason}. Importez le fichier dans Reputix.`;stop.remove();if(document.documentElement.dataset.reputixWorker!=="true")exportData();
return {version:1,collectedAt:new Date().toISOString(),business,reviews:[...seen.values()],stopReason};
})();
