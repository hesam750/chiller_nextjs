import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const ver = String(Math.floor(Date.now() / (60 * 60 * 1000)));
  const js =
    `const CACHE='chiller-pwa-${ver}';
    const PRE=['/','/manifest.webmanifest','/offline.html'];
    self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(PRE.map(u=>fetch(u).then(res=>{if(!res.ok) return; const cp=res.clone(); return c.put(u,cp)}).catch(()=>undefined)))).then(()=>self.skipWaiting()))});
    self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
    self.addEventListener('fetch',e=>{
      const r=e.request;
      if(r.method!=='GET') return;
      const a=r.headers.get('accept')||'';
      const d=r.destination||'';
      const u=new URL(r.url);
      if(u.pathname.startsWith('/api/')){
        e.respondWith(fetch(r).catch(()=>new Response(JSON.stringify({ok:false,offline:true}),{status:503,headers:{'Content-Type':'application/json'}})));
        return;
      }
      if(a.includes('text/html')){
        e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('/offline.html'))));
        return;
      }
      if(d==='script'||d==='style'||d==='font'){
        e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r)));
        return;
      }
      e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res}).catch(()=>caches.match('/offline.html'))));
    });
    self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING') self.skipWaiting()});`;
  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
