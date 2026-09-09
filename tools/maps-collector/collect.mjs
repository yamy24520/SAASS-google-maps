import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);const value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const login=args.includes('--login'),query=value('--query',''),output=path.resolve(value('--output',path.join(here,'exports','reviews.json')));
if(!login&&!query){console.error('Usage: node collect.mjs --query "Le Saint James Bergerac" [--output fichier.json]');process.exit(1)}
const profile=path.resolve(value('--profile',path.join(here,'.browser-profile')));
const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:!login&&!args.includes('--visible'),locale:'fr-FR',acceptDownloads:true});
const page=context.pages()[0]||await context.newPage();
page.on('dialog',async d=>{console.error(d.message());await d.dismiss()});
page.on('pageerror',e=>console.error('Page: '+e.message));
try{
 await page.goto('https://www.google.com/maps'+(query?'/search/?api=1&query='+encodeURIComponent(query):''),{waitUntil:'domcontentloaded'});
 if(login){console.log('Connectez-vous normalement à Google Maps dans la fenêtre ouverte, puis fermez la fenêtre. La session sera conservée localement.');await new Promise(resolve=>context.on('close',resolve));process.exit(0)}
 const refuse=page.getByRole('button',{name:/Tout refuser|Reject all/i});if(await refuse.count())await refuse.first().click();
 const reviewTab=page.getByRole('tab',{name:/Avis|Reviews/});
 try{await reviewTab.waitFor({timeout:20000})}catch{throw new Error('La recherche ne donne pas une fiche unique. Précisez le nom, la ville et éventuellement l’adresse. Aucun établissement choisi au hasard.')}
 await reviewTab.click();await page.locator('div[data-review-id][aria-label]').first().waitFor({timeout:15000});
 await page.waitForTimeout(3000);
 console.log('Opened: '+page.url());
 const download=page.waitForEvent('download',{timeout:32*60*1000}); download.catch(()=>{});
 const running=page.evaluate(await fs.readFile(path.join(here,'collector.js'),'utf8')).catch(e=>console.error(e.message));
 await page.locator('#reputix-collector').waitFor({timeout:10000});
 const progress=setInterval(()=>page.locator('#reputix-collector p').innerText().then(t=>console.log(t)).catch(()=>{}),15000);
 download.finally(()=>clearInterval(progress)).catch(()=>{});
 const file=await download;await fs.mkdir(path.dirname(output),{recursive:true});await file.saveAs(output);
 const result=JSON.parse(await fs.readFile(output,'utf8'));
 console.log(JSON.stringify({file:output,business:result.business.name,collected:result.reviews.length,announced:result.business.total,stopReason:result.stopReason}));
 if(result.reviews.length<result.business.total)process.exitCode=2;
}catch(error){console.error(error.message);process.exitCode=1}finally{await context.close()}
