/*
 * 旅行行程：離線快取（所有行程共用）
 *
 * 頁面與 kit：先抓網路（最新版），網路 3.5 秒沒回應或斷線就用手機裡存的版本。
 * Google Fonts：存一份，之後直接用。
 * 這裡刻意不列出有哪些行程：每個頁面被打開時自己請 service worker 存起來。
 *
 * 改了快取邏輯就把 VERSION 加一，舊快取會在下次開啟時清掉。
 */
const VERSION = 1;
const SITE = 'trip-site-v' + VERSION;
const FONTS = 'trip-fonts-v' + VERSION;
const SCOPE = new URL(self.registration.scope).pathname;   // 例：/trip/
const NET_TIMEOUT = 3500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('trip-') && k !== SITE && k !== FONTS) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

/* ---------- 工具 ---------- */
const isFontHost = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
const inScope = (url) => url.origin === self.location.origin && url.pathname.startsWith(SCOPE);

/* 同一頁不同寫法（?query、index.html）都存成同一份 */
function keyFor(input) {
  const url = new URL(input instanceof Request ? input.url : String(input), self.location.href);
  url.hash = '';
  if (inScope(url)) {
    url.search = '';
    url.pathname = url.pathname.replace(/index\.html$/, '');
  }
  return url.href;
}

/* 存進快取前加上存檔時間，並去掉 redirected 標記（Safari 不接受轉址過的離線回應） */
async function stamp(res) {
  const headers = new Headers(res.headers);
  headers.set('x-kit-cached-at', String(Date.now()));
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers });
}

async function lookup(cache, key) {
  const hit = await cache.match(key);
  if (hit) return hit;
  if (!key.endsWith('/') && !/\.[a-z0-9]+$/i.test(new URL(key).pathname)) return cache.match(key + '/');
  return undefined;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function offlinePage() {
  const html = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>還沒存到手機</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;
    font:15px/1.75 "PingFang TC","Noto Sans TC",system-ui,sans-serif;background:#F4F5F3;color:#1D2328}
  @media (prefers-color-scheme:dark){body{background:#15191C;color:#E6E9EB}}
  main{max-width:30em}
  h1{font-size:19px;margin:0 0 8px}
  p{margin:0;opacity:.8}
</style></head><body><main>
<h1>這一頁還沒存到手機</h1>
<p>連上網路後打開一次，之後沒網路也能看。</p>
</main></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---------- 抓取策略 ---------- */
function networkFirst(e) {
  const req = e.request;
  const key = keyFor(req);
  let saving = Promise.resolve();

  const network = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      saving = caches.open(SITE).then(async (c) => c.put(key, await stamp(copy)));
      e.waitUntil(saving.catch(() => {}));
    }
    return res;
  });
  e.waitUntil(network.then(() => saving, () => {}).catch(() => {}));

  return (async () => {
    const cache = await caches.open(SITE);
    try {
      return await Promise.race([
        network,
        wait(NET_TIMEOUT).then(async () => (await lookup(cache, key)) || network),
      ]);
    } catch (err) {
      const hit = await lookup(cache, key);
      if (hit) return hit;
      if (req.mode === 'navigate') return offlinePage();
      return Response.error();
    }
  })();
}

function fontFirst(e) {
  return (async () => {
    const cache = await caches.open(FONTS);
    const hit = await cache.match(e.request);
    const refresh = () => fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    });
    if (!hit) return refresh();
    /* 字型檔網址不會變，有就直接用；字型 CSS 在背景更新 */
    if (new URL(e.request.url).hostname === 'fonts.googleapis.com') e.waitUntil(refresh().catch(() => {}));
    return hit;
  })();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (inScope(url)) return e.respondWith(networkFirst(e));
  if (isFontHost(url)) return e.respondWith(fontFirst(e));
});

/* ---------- 頁面請求：把自己（和用到的檔案）存起來 ----------
 * 頁面送來 { type:'warm', page, urls, force }，回覆 { at }：
 * at 是這一頁目前存在手機裡的版本時間，沒存到就是 null。 */
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type !== 'warm') return;
  const port = e.ports && e.ports[0];

  e.waitUntil((async () => {
    const site = await caches.open(SITE);
    const fonts = await caches.open(FONTS);
    const pageKey = d.page ? keyFor(d.page) : null;

    for (const u of [...new Set(d.urls || [])]) {
      let url;
      try { url = new URL(u); } catch (err) { continue; }
      const font = isFontHost(url);
      if (!font && !inScope(url)) continue;

      const cache = font ? fonts : site;
      const key = font ? url.href : keyFor(url);
      try {
        if (!d.force && (await cache.match(key))) continue;
        const res = await fetch(url.href, font ? { mode: 'cors', credentials: 'omit' } : { cache: 'no-cache' });
        if (!res.ok) continue;
        await cache.put(key, font ? res : await stamp(res));
      } catch (err) { /* 沒網路：保留手機裡原本的版本 */ }
    }

    let at = null;
    if (pageKey) {
      const hit = await lookup(site, pageKey);
      if (hit) at = Number(hit.headers.get('x-kit-cached-at')) || null;
    }
    if (port) port.postMessage({ at });
  })());
});
