/*
 * 旅行行程共用小工具（每個行程頁面在 body 最後載入）
 *
 *   1. 註冊 ../sw.js：頁面可以離線開啟、加到主畫面
 *   2. [data-todo]       勾選框，狀態只存在這支手機
 *   3. [data-private]    私人欄位（確認碼、保單號碼等），只存在這支手機，永遠不進 repo
 *   4. [data-kit-panel]  離線狀態、加到主畫面說明、備份與還原
 *
 * 標記寫法見 AGENTS.md。配色由頁面在 :root 設 --kit-* 變數。
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  if (!SCRIPT) return;
  var ROOT = new URL('../', SCRIPT.src);
  var SLUG = location.pathname.replace(/index\.html$/, '').split('/').filter(Boolean).pop() || 'home';
  var KEY = 'trip-kit:' + SLUG;
  var KEY_CACHED = KEY + ':cachedAt';

  /* ---------- 圖示 ---------- */
  var ICON_CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.6"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.25" y="7" width="9.5" height="6.75" rx="1.6"/><path d="M5.5 7V5.3a2.5 2.5 0 0 1 5 0V7"/></svg>';
  var ICON_SHARE = '<svg class="kit-share" viewBox="0 0 16 16" aria-label="分享"><path d="M8 1.8v8.6M5.3 4.4L8 1.8l2.7 2.6"/><path d="M5.4 6.6H3.6v7.6h8.8V6.6h-1.8"/></svg>';

  /* ---------- 樣式（選擇器盡量只用一個 class，頁面寫得更具體就能覆蓋） ---------- */
  var CSS = [
    '.kit-check{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;width:20px;height:20px;margin:0 9px 0 0;padding:0;border:1.5px solid var(--kit-line-strong,#AEB6BD);border-radius:6px;background:var(--kit-card,#fff);color:#fff;cursor:pointer;vertical-align:-4px;-webkit-tap-highlight-color:transparent;transition:background-color .18s ease,border-color .18s ease}',
    '.kit-check::after{content:"";position:absolute;inset:-12px}',
    '.kit-check svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;overflow:visible}',
    '.kit-check path{stroke-dasharray:14;stroke-dashoffset:14;transition:stroke-dashoffset .24s cubic-bezier(.22,.61,.36,1)}',
    '.kit-check[aria-checked="true"]{background:var(--kit-accent,#2F6B52);border-color:var(--kit-accent,#2F6B52)}',
    '.kit-check[aria-checked="true"] path{stroke-dashoffset:0;transition-delay:.05s}',
    '.kit-check:focus-visible,.kit-btn:focus-visible,.kit-priv-add:focus-visible{outline:2px solid var(--kit-accent,#2F6B52);outline-offset:3px}',

    'ul.kit-list{list-style:none;margin:10px 0 0;padding:0}',
    'li[data-todo]{position:relative;padding:6px 0 6px 31px;font-size:13px;line-height:1.6;color:var(--kit-ink,inherit);cursor:pointer;-webkit-tap-highlight-color:transparent}',
    'li[data-todo] + li[data-todo]{border-top:1px solid var(--kit-line-soft,rgba(0,0,0,.06))}',
    'li[data-todo] > .kit-check{position:absolute;left:0;top:7px;margin:0}',
    'li[data-todo] > .kit-check::after{display:none}',
    'li[data-todo][data-checked]{color:var(--kit-muted,#8C959D);text-decoration:line-through;text-decoration-thickness:1px}',
    '[data-todo]:not(li){transition:opacity .2s ease}',
    '[data-todo]:not(li)[data-checked]{opacity:.5}',

    '.kit-priv{margin-top:14px;padding-top:12px;border-top:1px dashed var(--kit-line-strong,#C9D0D5);font-size:13px;line-height:1.5}',
    '.kit-priv:first-child{margin-top:0;padding-top:0;border-top:0}',
    '.kit-priv svg{width:13px;height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}',
    '.kit-priv-add{display:flex;align-items:center;gap:7px;width:100%;margin:0;padding:5px 0;border:0;background:none;font:inherit;font-size:13px;font-weight:500;letter-spacing:normal;text-transform:none;color:var(--kit-muted,#8C959D);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.kit-priv-add small{margin-left:auto;font-size:11.5px;opacity:.75;white-space:nowrap}',
    '.kit-priv-label{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;letter-spacing:normal;text-transform:none;color:var(--kit-muted,#8C959D)}',
    '.kit-row{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap;margin-top:4px}',
    '.kit-priv-value{flex:1 1 auto;min-width:0;font-size:17px;font-weight:700;letter-spacing:.06em;font-variant-numeric:tabular-nums;color:var(--kit-ink,inherit);word-break:break-all;-webkit-user-select:text;user-select:text}',
    '.kit-priv--multi .kit-priv-value{flex-basis:100%;font-size:13.5px;font-weight:500;letter-spacing:0;line-height:1.75;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere}',
    '.kit-actions{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}',
    '.kit-btn{min-height:34px;padding:0 14px;border:1px solid var(--kit-line-strong,#C9D0D5);border-radius:999px;background:var(--kit-card,#fff);font:inherit;font-size:12.5px;font-weight:600;letter-spacing:.02em;text-transform:none;color:var(--kit-ink,inherit);cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.kit-btn--solid{background:var(--kit-ink-solid,#1C232A);border-color:var(--kit-ink-solid,#1C232A);color:#fff}',
    '.kit-input{display:block;box-sizing:border-box;width:100%;margin:7px 0 8px;padding:9px 11px;border:1px solid var(--kit-line-strong,#C9D0D5);border-radius:9px;background:var(--kit-card,#fff);font:inherit;font-size:16px;line-height:1.5;letter-spacing:.02em;color:var(--kit-ink,inherit);resize:vertical}',
    '.kit-input:focus{outline:2px solid var(--kit-accent,#2F6B52);outline-offset:0;border-color:transparent}',
    '.kit-hint{font-size:11.5px;color:var(--kit-muted,#8C959D)}',

    '.kit-panel{background:var(--kit-card,#fff);border:1px solid var(--kit-line,#E4E7E5);border-radius:var(--kit-radius,12px);padding:16px 18px;font-size:13px;line-height:1.7;color:var(--kit-ink-2,#4B555E)}',
    '.kit-panel p{margin:0}',
    '.kit-panel p + p{margin-top:4px}',
    '.kit-status{display:flex;align-items:baseline;gap:9px;font-size:13.5px;font-weight:600;color:var(--kit-ink,inherit)}',
    '.kit-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--kit-muted,#8C959D);transform:translateY(-1px)}',
    '.kit-status[data-state="ok"] .kit-dot{background:var(--kit-accent,#2F6B52)}',
    '.kit-status[data-state="offline"] .kit-dot{background:var(--kit-warn,#B7791F)}',
    '.kit-sec{margin-top:13px;padding-top:13px;border-top:1px solid var(--kit-line-soft,rgba(0,0,0,.06))}',
    '.kit-sec .kit-actions{margin:11px 0 0;justify-content:flex-start}',
    '.kit-panel .kit-input{margin:11px 0 0}',
    '.kit-panel p.kit-msg{margin-top:10px;font-size:12.5px;color:var(--kit-accent,#2F6B52)}',
    '.kit-panel p.kit-msg--err{color:var(--kit-err,#B4472F)}',
    '.kit-share{display:inline-block;width:15px;height:15px;margin:0 1px;vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}',

    '@media (prefers-reduced-motion:reduce){.kit-check,.kit-check path,[data-todo]{transition:none!important}}'
  ].join('\n');

  /* ---------- 小工具 ---------- */
  function each(sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function spaced(label) { return /^[A-Za-z0-9]/.test(label) ? ' ' + label : label; }

  /* ---------- 存在這支手機的資料 ---------- */
  var data = { todo: {}, priv: {} };
  var canStore = true;
  var askedPersist = false;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var d = raw ? JSON.parse(raw) : {};
      data = { todo: d.todo || {}, priv: d.priv || {} };
    } catch (e) { canStore = false; }
  }
  function write() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, todo: data.todo, priv: data.priv, at: Date.now() }));
      canStore = true;
    } catch (e) { canStore = false; }
    if (!askedPersist && navigator.storage && navigator.storage.persist) {
      askedPersist = true;
      navigator.storage.persist().catch(function () {});
    }
    paintPanels();
  }
  function cachedAt() { try { return Number(localStorage.getItem(KEY_CACHED)) || 0; } catch (e) { return 0; } }

  /* ---------- 勾選 ---------- */
  function headOf(el) { return el.querySelector('[data-todo-head]') || el; }
  function checkOf(el) { var c = headOf(el).firstElementChild; return c && c.classList.contains('kit-check') ? c : null; }
  function defaultDone(el) { return el.hasAttribute('data-done'); }
  function isDone(el) { var id = el.getAttribute('data-todo'); return has(data.todo, id) ? !!data.todo[id] : defaultDone(el); }

  function setupTodo(el) {
    if (!checkOf(el)) {
      var head = headOf(el);
      var label = head.textContent.replace(/\s+/g, ' ').trim();
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kit-check';
      btn.setAttribute('role', 'checkbox');
      btn.setAttribute('aria-label', label.length > 60 ? label.slice(0, 60) + '…' : label);
      btn.innerHTML = ICON_CHECK;
      head.insertBefore(btn, head.firstChild);
    }
    paintTodo(el);
  }
  function paintTodo(el) {
    var on = isDone(el), btn = checkOf(el);
    if (on) el.setAttribute('data-checked', ''); else el.removeAttribute('data-checked');
    if (btn) btn.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  function toggleTodo(el) {
    var id = el.getAttribute('data-todo');
    var next = !isDone(el);
    /* 跟頁面寫的預設一樣就不記，之後頁面改成 data-done 時才不會被手機上的舊狀態蓋掉 */
    if (next === defaultDone(el)) delete data.todo[id]; else data.todo[id] = next;
    write();
    each('[data-todo]', function (x) { if (x.getAttribute('data-todo') === id) paintTodo(x); });
  }

  /* ---------- 私人欄位 ---------- */
  var fieldSeq = 0;
  function renderPriv(el, editing) {
    var id = el.getAttribute('data-private');
    var label = el.getAttribute('data-label') || '私人備註';
    var multi = el.hasAttribute('data-multiline');
    var val = data.priv[id] || '';
    el.classList.add('kit-priv');
    el.classList.toggle('kit-priv--multi', multi);

    if (editing) {
      var fid = 'kit-field-' + (++fieldSeq);
      el.innerHTML =
        '<label class="kit-priv-label" for="' + fid + '">' + ICON_LOCK + esc(label) + '</label>' +
        (multi
          ? '<textarea class="kit-input" id="' + fid + '" rows="4"></textarea>'
          : '<input class="kit-input" id="' + fid + '" type="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="done">') +
        '<div class="kit-row"><span class="kit-hint">只存在這支手機</span><span class="kit-actions">' +
        '<button type="button" class="kit-btn" data-kit="priv-cancel">取消</button>' +
        '<button type="button" class="kit-btn kit-btn--solid" data-kit="priv-save">儲存</button></span></div>';
      var f = el.querySelector('.kit-input');
      f.value = val;
      if (el.getAttribute('data-placeholder')) f.placeholder = el.getAttribute('data-placeholder');
      f.focus();
      return;
    }
    if (!val) {
      el.innerHTML = '<button type="button" class="kit-priv-add" data-kit="priv-edit">' + ICON_LOCK +
        '<span>加上' + esc(spaced(label)) + '</span><small>只存在這支手機</small></button>';
      return;
    }
    el.innerHTML =
      '<div class="kit-priv-label">' + ICON_LOCK + esc(label) + '</div>' +
      '<div class="kit-row"><div class="kit-priv-value">' + esc(val) + '</div><span class="kit-actions">' +
      '<button type="button" class="kit-btn" data-kit="priv-copy">複製</button>' +
      '<button type="button" class="kit-btn" data-kit="priv-edit">修改</button></span></div>';
  }
  function savePriv(el) {
    var id = el.getAttribute('data-private');
    var f = el.querySelector('.kit-input');
    var v = el.hasAttribute('data-multiline') ? f.value.replace(/\s+$/, '') : f.value.trim();
    if (v) data.priv[id] = v; else delete data.priv[id];
    write();
    each('[data-private]', function (x) { if (x.getAttribute('data-private') === id) renderPriv(x, false); });
    var btn = el.querySelector('[data-kit="priv-edit"]');
    if (btn) btn.focus({ preventScroll: true });
  }

  /* ---------- 複製 ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function flash(btn, text) {
    if (!btn.getAttribute('data-text')) btn.setAttribute('data-text', btn.textContent);
    btn.textContent = text;
    clearTimeout(btn._kitTimer);
    btn._kitTimer = setTimeout(function () { btn.textContent = btn.getAttribute('data-text'); }, 1600);
  }

  /* ---------- 這支手機面板 ---------- */
  var sw = 'idle';            /* idle | saving | done | local | unsupported | fail */
  var installEvt = null;
  var ui = { restore: false, manual: '', msg: '', err: false };

  function isStandalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function statusLine() {
    var at = cachedAt();
    var online = navigator.onLine !== false;
    if (sw === 'local') return ['idle', '直接用檔案開啟時不會啟用離線，放上 GitHub Pages 後才有。'];
    if (sw === 'unsupported') return ['idle', '這個瀏覽器不支援離線瀏覽。'];
    if (!online) return ['offline', at ? '目前沒有網路，顯示的是 ' + fmt(at) + ' 存下的版本。' : '目前沒有網路。'];
    if (at) return ['ok', '已存到這支手機，沒網路也打得開。目前版本：' + fmt(at) + '。'];
    if (sw === 'fail') return ['offline', '還沒存到手機。網路穩定時重新整理一次。'];
    return ['idle', '正在存到這支手機…'];
  }
  function installHTML() {
    if (isStandalone()) return '';
    if (installEvt) {
      return '<div class="kit-sec"><p>加到主畫面後，可以像 app 一樣直接打開這趟行程。</p>' +
        '<div class="kit-actions"><button type="button" class="kit-btn kit-btn--solid" data-kit="install">加到主畫面</button></div></div>';
    }
    if (isIOS()) {
      return '<div class="kit-sec"><p>加到主畫面：點 Safari 的分享按鈕 ' + ICON_SHARE + '，選「加入主畫面」。</p>' +
        '<p>主畫面上的 App 跟 Safari 分開存資料，勾選和私人欄位請裝好後在 App 裡填。</p></div>';
    }
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      return '<div class="kit-sec"><p>加到主畫面：打開瀏覽器選單，選「加到主畫面」或「安裝應用程式」。</p></div>';
    }
    return '';
  }
  function renderPanel(el) {
    el.classList.add('kit-panel');
    el.innerHTML =
      '<div class="kit-status" data-kit-status role="status"></div>' +
      installHTML() +
      '<div class="kit-sec">' +
        '<p>勾選和私人欄位只存在這支手機，不會上傳到網路。換手機或清除瀏覽資料前，先複製備份存到備忘錄。</p>' +
        '<p class="kit-msg kit-msg--err" data-kit-store hidden>這個瀏覽器現在存不了資料（可能是私密瀏覽），關掉頁面後勾選和私人欄位會消失。</p>' +
        '<div class="kit-actions">' +
          '<button type="button" class="kit-btn" data-kit="backup">複製備份</button>' +
          '<button type="button" class="kit-btn" data-kit="restore-open">從備份還原</button>' +
        '</div>' +
        (ui.manual ? '<textarea class="kit-input" rows="3" readonly data-kit-manual></textarea>' : '') +
        (ui.restore
          ? '<textarea class="kit-input" rows="3" placeholder="把之前複製的備份貼在這裡" data-kit-restore></textarea>' +
            '<div class="kit-actions"><button type="button" class="kit-btn" data-kit="restore-cancel">取消</button>' +
            '<button type="button" class="kit-btn kit-btn--solid" data-kit="restore">還原並覆蓋目前資料</button></div>'
          : '') +
        (ui.msg ? '<p class="kit-msg' + (ui.err ? ' kit-msg--err' : '') + '">' + esc(ui.msg) + '</p>' : '') +
      '</div>';
    var m = el.querySelector('[data-kit-manual]');
    if (m) m.value = ui.manual;
    paintPanel(el);
  }
  function paintPanel(el) {
    var s = el.querySelector('[data-kit-status]');
    if (s) {
      var st = statusLine();
      s.setAttribute('data-state', st[0]);
      s.innerHTML = '<span class="kit-dot" aria-hidden="true"></span><span>' + esc(st[1]) + '</span>';
    }
    var w = el.querySelector('[data-kit-store]');
    if (w) w.hidden = canStore;
  }
  function paintPanels() { each('[data-kit-panel]', paintPanel); }
  function renderPanels() { each('[data-kit-panel]', renderPanel); }

  function backup() {
    var text = JSON.stringify({ trip: SLUG, todo: data.todo, priv: data.priv, at: new Date().toISOString() });
    copyText(text).then(function (ok) {
      ui.restore = false;
      ui.err = false;
      ui.manual = ok ? '' : text;
      ui.msg = ok ? '已複製備份。貼到備忘錄或傳給自己存起來。' : '沒辦法自動複製。長按下面的文字，全選後複製。';
      renderPanels();
    });
  }
  function restore(panel) {
    var t = (panel.querySelector('[data-kit-restore]') || {}).value || '';
    var i = t.indexOf('{'), j = t.lastIndexOf('}');
    var d = null;
    try { d = JSON.parse(t.slice(i, j + 1)); } catch (e) {}
    ui.err = true;
    if (!d || typeof d !== 'object' || !d.trip) {
      ui.msg = '看不懂這段文字。請貼上用「複製備份」得到的完整內容。';
    } else if (d.trip !== SLUG) {
      ui.msg = '這份是「' + d.trip + '」的備份，不是這一頁的。';
    } else {
      data = { todo: d.todo || {}, priv: d.priv || {} };
      write();
      refreshAll();
      ui.restore = false;
      ui.err = false;
      ui.msg = '已還原 ' + Object.keys(data.todo).length + ' 個勾選、' + Object.keys(data.priv).length + ' 個私人欄位。';
    }
    renderPanels();
  }

  /* ---------- 掛上頁面 ---------- */
  function hydrate(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches('[data-todo]')) setupTodo(root);
    each('[data-todo]', setupTodo, root);
    if (root.matches('[data-private]')) renderPriv(root, false);
    each('[data-private]', function (x) { renderPriv(x, false); }, root);
    if (root.matches('[data-kit-panel]')) renderPanel(root);
    each('[data-kit-panel]', renderPanel, root);
  }
  function refreshAll() {
    each('[data-todo]', paintTodo);
    each('[data-private]', function (x) { renderPriv(x, false); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var chk = t.closest('.kit-check');
    var item = chk ? chk.closest('[data-todo]') : null;
    if (!item) {
      var li = t.closest('li[data-todo]');
      if (li && !t.closest('a,button,input,textarea,select,label')) item = li;
    }
    if (item) { toggleTodo(item); return; }

    var act = t.closest('[data-kit]');
    if (!act) return;
    var kind = act.getAttribute('data-kit');
    var slot = act.closest('[data-private]');
    var panel = act.closest('[data-kit-panel]');

    if (kind === 'priv-edit' && slot) renderPriv(slot, true);
    else if (kind === 'priv-cancel' && slot) renderPriv(slot, false);
    else if (kind === 'priv-save' && slot) savePriv(slot);
    else if (kind === 'priv-copy' && slot) {
      copyText(data.priv[slot.getAttribute('data-private')] || '').then(function (ok) { flash(act, ok ? '已複製' : '請長按選取'); });
    }
    else if (kind === 'backup') backup();
    else if (kind === 'restore-open') { ui.restore = !ui.restore; ui.manual = ''; ui.msg = ''; renderPanels(); var r = document.querySelector('[data-kit-restore]'); if (r) r.focus(); }
    else if (kind === 'restore-cancel') { ui.restore = false; ui.msg = ''; renderPanels(); }
    else if (kind === 'restore' && panel) restore(panel);
    else if (kind === 'install' && installEvt) {
      installEvt.prompt();
      installEvt.userChoice.then(function () { installEvt = null; renderPanels(); }, function () {});
    }
  });

  document.addEventListener('keydown', function (e) {
    var f = e.target;
    if (!f || !f.classList || !f.classList.contains('kit-input')) return;
    var slot = f.closest('[data-private]');
    if (!slot) return;
    if (e.key === 'Escape') { e.preventDefault(); renderPriv(slot, false); }
    else if (e.key === 'Enter' && f.tagName === 'INPUT' && !e.isComposing) { e.preventDefault(); savePriv(slot); }
  });

  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { read(); refreshAll(); paintPanels(); }
  });
  window.addEventListener('online', paintPanels);
  window.addEventListener('offline', paintPanels);
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; renderPanels(); });
  window.addEventListener('appinstalled', function () { installEvt = null; renderPanels(); });

  /* ---------- 離線 ---------- */
  function afterLoad(fn) {
    function go() {
      var later = function () { setTimeout(fn, 300); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(later, later); else later();
    }
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }
  function warm(reg) {
    var target = reg.active || navigator.serviceWorker.controller;
    if (!target) return;
    var page = location.href.split('#')[0];
    var urls = [page, SCRIPT.src];
    each('link[rel="manifest"],link[rel="apple-touch-icon"],link[rel="icon"]', function (l) { urls.push(l.href); });
    if (window.performance && performance.getEntriesByType) {
      performance.getEntriesByType('resource').forEach(function (r) {
        if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.name)) urls.push(r.name);
      });
    }
    sw = 'saving';
    paintPanels();
    var ch = new MessageChannel();
    ch.port1.onmessage = function (ev) {
      var at = ev.data && ev.data.at;
      if (at) { try { localStorage.setItem(KEY_CACHED, String(at)); } catch (e) {} }
      sw = at ? 'done' : 'fail';
      paintPanels();
    };
    /* 第一次開（頁面還沒被 service worker 接管）就強制存一份；之後頁面每次載入時已自動更新 */
    target.postMessage({ type: 'warm', page: page, urls: urls, force: !navigator.serviceWorker.controller }, [ch.port2]);
  }
  function registerSW() {
    if (location.protocol === 'file:') { sw = 'local'; return; }
    if (!('serviceWorker' in navigator)) { sw = 'unsupported'; return; }
    navigator.serviceWorker.register(new URL('sw.js', ROOT).href, { scope: ROOT.pathname })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function (reg) { afterLoad(function () { warm(reg); }); })
      .catch(function () { sw = 'fail'; paintPanels(); });
  }

  /* ---------- 開始 ---------- */
  var style = document.createElement('style');
  style.id = 'trip-kit-css';
  style.textContent = CSS;
  document.head.insertBefore(style, document.head.firstChild);

  read();
  registerSW();
  hydrate(document.body);
  new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, hydrate); });
  }).observe(document.body, { childList: true, subtree: true });
})();
