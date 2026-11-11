/* Imported into the SAME Flutter worker registration. No fetch/cache interception. */
(() => {
 const base=new URL(self.registration.scope),valid=p=>typeof p==='string'&&/^\/(notifications|races(?:\?(?:registration|result)=[a-f0-9-]{36})?|calendar\/[a-f0-9-]{36})$/i.test(p);
 function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('plm-push-'+base.pathname,1);r.onupgradeneeded=()=>{r.result.createObjectStore('binding');r.result.createObjectStore('receipts',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function reserve(p){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(['binding','receipts'],'readwrite');let allowed=false;
  const b=tx.objectStore('binding').get('active');b.onsuccess=()=>{if(b.result?.account!==p.account||!b.result?.enabled)return;
   const s=tx.objectStore('receipts'),identity=p.account+':'+p.id,seen=s.get(identity);seen.onsuccess=()=>{if(seen.result)return;allowed=true;s.put({id:identity,at:Date.now()});const all=s.getAll();all.onsuccess=()=>{for(const old of all.result.sort((a,b)=>b.at-a.at).slice(299))if(old.id!==identity)s.delete(old.id);};};};
  tx.oncomplete=()=>{d.close();resolve(allowed);};tx.onerror=()=>{d.close();reject(tx.error);};});}
 self.addEventListener('push',event=>event.waitUntil((async()=>{
  let p;try{p=event.data?.json();}catch{return;}
  if(!p||!valid(p.path)||!/^[a-f0-9-]{36}$/i.test(p.id)||!/^[a-f0-9-]{36}$/i.test(p.account))return;
  try{if(!await reserve(p))return;await self.registration.showNotification(String(p.title).slice(0,160),{body:String(p.body).slice(0,400),icon:new URL('icons/Icon-192.png',base).href,badge:new URL('icons/Icon-192.png',base).href,tag:'plm-'+p.id,renotify:false,data:{path:p.path,account:p.account}});}catch{
   try{const d=await db();const tx=d.transaction('receipts','readwrite');tx.objectStore('receipts').delete(p.account+':'+p.id);tx.oncomplete=()=>d.close();}catch{}
  }
 })()));
 self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
  const p=event.notification.data;if(!p||!valid(p.path))return;
  const d=await db();const b=await new Promise(resolve=>{const r=d.transaction('binding').objectStore('binding').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);});d.close();if(b?.account!==p.account||!b?.enabled)return;
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients){const u=new URL(client.url);if(u.origin===base.origin&&u.pathname.startsWith(base.pathname)){await client.focus();
   // An already-open older build may not yet have the new message bridge.
   const channel=new MessageChannel();const opened=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),1200);channel.port1.onmessage=()=>{clearTimeout(timer);resolve(true);};client.postMessage({type:'plm-push-open',...p},[channel.port2]);});
   channel.port1.close();channel.port2.close();if(!opened)await client.navigate(new URL('?plm_push=1#'+p.path,base).href);return;}}
  await self.clients.openWindow(new URL('?plm_push=1#'+p.path,base).href);
 })());});
 // No credentials live in this worker. Subscription changes are reconciled on the next authenticated opening.
})();
