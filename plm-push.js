/* Browser bridge: permission is requested ONLY by enable(), from the user's tap. */
(() => {
 const base=new URL('.',document.baseURI),storeKey='plm.push.device.'+base.pathname;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const supported=()=>isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
 const pathOK=p=>typeof p==='string'&&/^\/(notifications|races(?:\?(?:registration|result)=[a-f0-9-]{36})?|calendar\/[a-f0-9-]{36})$/i.test(p);
 function device(){let id=localStorage.getItem(storeKey);if(!id){id=crypto.randomUUID();localStorage.setItem(storeKey,id);}return id;}
 function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('plm-push-'+base.pathname,1);r.onupgradeneeded=()=>{r.result.createObjectStore('binding');r.result.createObjectStore('receipts',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function binding(value){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('binding',value===undefined?'readonly':'readwrite'),s=tx.objectStore('binding');let result;
  const r=value===undefined?s.get('active'):s.put(value,'active');r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{d.close();resolve(result);};tx.onerror=()=>{d.close();reject(tx.error);};});}
 async function clearNotifications(r){for(const n of await r?.getNotifications?.()||[])if(n.tag?.startsWith('plm-'))n.close();}
 async function registration(){const url=new URL('flutter_service_worker.js',base);let r=await navigator.serviceWorker.getRegistration(base.href);
  if(r&&new URL((r.active||r.waiting||r.installing).scriptURL).pathname!==url.pathname)throw Error('Service Worker incompatible');
  if(!r)r=await navigator.serviceWorker.register(url.href,{scope:base.pathname,updateViaCache:'none'});
  await navigator.serviceWorker.ready;return r;
 }
 function bytes(v){return Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
 window.plmPushStatus=async()=>{let active=false,account=null;try{const b=await binding();account=b?.account||null;const r=supported()?await navigator.serviceWorker.getRegistration(base.href):null;active=Notification.permission==='granted'&&!!b?.enabled&&!!(await r?.pushManager.getSubscription());}catch{}
  return JSON.stringify({supported:supported()&&(!ios||installed()),install_required:ios&&!installed(),permission:'Notification'in window?Notification.permission:'unavailable',active,account,device:device()});};
 window.plmPushAccount=async(account)=>{if(!supported())return;const old=await binding();if(!account||old?.account&&old.account!==account)sessionStorage.removeItem('plm.push.pending');if(old?.account&&old.account!==account){await binding(null);const r=await navigator.serviceWorker.getRegistration(base.href);await clearNotifications(r);await(await r?.pushManager.getSubscription())?.unsubscribe();}};
 window.plmPushEnable=async(key,account)=>{
  if(!supported()||(ios&&!installed()))throw Error('Web Push indisponible');
  // Call requestPermission before the first await: required by iOS/Safari user activation.
  const consent=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
  if(await consent!=='granted')return JSON.stringify({permission:Notification.permission});
  await window.plmPushAccount(account);const r=await registration();let sub=await r.pushManager.getSubscription();
  if(sub&&sub.options.applicationServerKey&&Array.from(new Uint8Array(sub.options.applicationServerKey)).join()!==Array.from(bytes(key)).join()){await sub.unsubscribe();sub=null;}
  sub=sub||await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key)});
  // The binding is enabled only after the server has saved the consent and subscription.
  return JSON.stringify({permission:'granted',device:device(),subscription:sub.toJSON()});
 };
 window.plmPushBind=async(account)=>binding({account,enabled:true});
 window.plmPushDisable=async()=>{sessionStorage.removeItem('plm.push.pending');await binding(null);const r=supported()?await navigator.serviceWorker.getRegistration(base.href):null;await clearNotifications(r);await(await r?.pushManager.getSubscription())?.unsubscribe();return device();};
 window.plmPushTakePath=()=>{const p=sessionStorage.getItem('plm.push.pending');sessionStorage.removeItem('plm.push.pending');return pathOK(p)?p:null;};
 if(new URL(location.href).searchParams.get('plm_push')==='1'&&pathOK(location.hash.slice(1))){sessionStorage.setItem('plm.push.pending',location.hash.slice(1));history.replaceState(null,'',base.pathname+location.hash);}
 navigator.serviceWorker?.addEventListener('message',async e=>{const m=e.data;if(m?.type!=='plm-push-open'||!pathOK(m.path))return;const b=await binding();if(b?.account!==m.account||!b.enabled)return;sessionStorage.setItem('plm.push.pending',m.path);location.hash=m.path;e.ports?.[0]?.postMessage('opened');});
})();
