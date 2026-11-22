'use strict';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
/* PLM_WEB_PUSH */
importScripts('plm-push-worker.js?v=a3b3add64e894b2a');
