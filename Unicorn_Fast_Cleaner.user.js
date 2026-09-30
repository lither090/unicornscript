// ==UserScript==
// @name         Unicorn Fast Cleaner Lite
// @namespace    local.unicorn.fastcleaner
// @version      1.2.1
// @description  Lightweight banner/popup cleanup and preroll skip for Unicorn Pro
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lither090/unicornscript/main/Unicorn_Fast_Cleaner.user.js
// @updateURL    https://raw.githubusercontent.com/lither090/unicornscript/main/Unicorn_Fast_Cleaner.user.js
// ==/UserScript==

(function () {
  'use strict';

  var D = document;
  var W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
  var DOC = function () { return D.documentElement; };
  var BODY = function () { return D.body; };

  var DISMISS = /(오늘\s*(?:하루\s*)?(?:그만\s*보기|그만보기|보지\s*않기)|더\s*이상\s*(?:보지|열람하지|표시하지)\s*않기|다시\s*(?:보지|열람하지|표시하지)\s*않기|\d+\s*(?:분|시간|일)\s*동안\s*(?:다시\s*)?(?:보지|열람하지|표시하지)\s*(?:않기|않습니다)|do\s*not\s*show\s*again|don't\s*show\s*again)/i;
  var ADWORD = /(casino|sportsbook|\bbet\b|toto|slot|advert|banner|affiliate|partner|promo|promotion|bonus|redirect|카지노|토토|베팅|첫충|매충|가입코드|페이백|입플|충전|환전|롤링|무한입플|보너스|신규첫충|매일첫충|통장\s*매입)/i;
  var SKIP_WORD = /(?:광고\s*)?(?:skip|스킵|건너\s*뛰기|건너뛰기)|skip\s*(?:ad|ads|advertisement|commercial)?/i;
  var AD_MARKER = /(advertisement|skip\s*ad(?:\s*in)?\s*\d+|광고\s*(?:skip|스킵)|\d+\s*초\s*(?:뒤|후)\s*광고)/i;
  var UNAVAILABLE = /^\s*사용\s*불가\s*$/i;

  var styleRetry = 0;
  function addStyle() {
    if (D.getElementById('__ufc_lite_css')) return true;

    var root = D.documentElement || D.head;
    if (!root) {
      if (styleRetry++ < 60) setTimeout(addStyle, 0);
      return false;
    }

    var s = D.createElement('style');
    s.id = '__ufc_lite_css';
    s.textContent =
      '[id^="div-gpt-ad"],' +
      '[class*="ad-banner" i],[class*="ad_banner" i],[class*="banner-ad" i],[class*="banner_ad" i],' +
      '[class*="ads-banner" i],[class*="ads_banner" i],[id*="ad-banner" i],[id*="ad_banner" i],' +
      '[class*="ad-popup" i],[class*="ad_popup" i],[class*="popup-ad" i],[class*="popup_ad" i],' +
      '[class*="ad-modal" i],[class*="modal-ad" i],[class*="ad-layer" i],[class*="layer-ad" i],' +
      '#hd_pop,[id^="hd_pops_"],[class~="hd_pops"],[class*="hd_pops_" i],' +
      'iframe[src*="doubleclick" i],iframe[src*="googlesyndication" i],iframe[src*="googleads" i]' +
      '{display:none!important;visibility:hidden!important;}';

    try {
      root.appendChild(s);
      root.setAttribute('data-ufc-running', '1');
      return true;
    } catch (e) {
      if (styleRetry++ < 60) setTimeout(addStyle, 0);
      return false;
    }
  }

  addStyle();

  try {
    var nativeAlert = W.alert;
    W.alert = function (msg) {
      if (UNAVAILABLE.test(String(msg || ''))) return;
      return nativeAlert.apply(this, arguments);
    };
    var nativeConfirm = W.confirm;
    W.confirm = function (msg) {
      if (UNAVAILABLE.test(String(msg || ''))) return false;
      return nativeConfirm.apply(this, arguments);
    };
  } catch (e) {}

  function txt(el) {
    if (!el) return '';
    var s = '';
    try {
      s = (el.innerText || el.textContent || '') + ' ' +
          ((el.getAttribute && el.getAttribute('aria-label')) || '') + ' ' +
          ((el.getAttribute && el.getAttribute('title')) || '');
    } catch (e) {}
    return s.replace(/\s+/g, ' ').trim();
  }

  function meta(el) {
    if (!el) return '';
    var s = '';
    try {
      s = (el.id || '') + ' ' + String(el.className || '') + ' ' +
          ((el.getAttribute && el.getAttribute('href')) || '') + ' ' +
          ((el.getAttribute && el.getAttribute('src')) || '') + ' ' +
          ((el.getAttribute && el.getAttribute('data-src')) || '') + ' ' +
          ((el.getAttribute && el.getAttribute('alt')) || '');
    } catch (e) {}
    return s.toLowerCase();
  }

  function isPlayer(el) {
    for (var p = el, i = 0; p && p !== BODY() && i < 7; p = p.parentElement, i++) {
      var tag = (p.tagName || '').toLowerCase();
      var s = ((p.id || '') + ' ' + String(p.className || '')).toLowerCase();
      if (tag === 'video' || /player|plyr|video-js|jwplayer|vjs-|media-player|dplayer|artplayer/.test(s)) return p;
      try {
        if (p.querySelector && p.querySelector(':scope > video')) return p;
      } catch (e) {}
    }
    return null;
  }

  function protectedZone(el) {
    if (!el || !el.closest) return false;
    if (isPlayer(el)) return true;
    try {
      return !!el.closest('header,nav,form,footer,[role="navigation"],[role="search"],[role="searchbox"],[class*="search" i],[id*="search" i],[class*="menu" i],[id*="menu" i],[class*="category" i],[id*="category" i],[class*="thumbnail" i],[class*="thumb" i],[class*="gallery-item" i]');
    } catch (e) {
      return false;
    }
  }

  function hideDirect(el) {
    if (!el || el.nodeType !== 1 || protectedZone(el) || isPlayer(el)) return false;
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.setAttribute('data-ufc-hidden', '1');
    return true;
  }

  function dismissControl(el) {
    if (!el || el.nodeType !== 1) return false;
    var t = txt(el);
    return !!(t && t.length <= 100 && (DISMISS.test(t) || CLOSE.test(t)));
  }

  function shellIsEmpty(p) {
    if (!p || !p.children || protectedZone(p) || isPlayer(p)) return false;
    if (p.children.length > 14) return false;

    var own = '';
    try {
      for (var n = 0; n < p.childNodes.length; n++) {
        if (p.childNodes[n].nodeType === 3) own += p.childNodes[n].textContent || '';
      }
    } catch (e) {}

    own = own.replace(/\s+/g, ' ').trim();
    if (own && !DISMISS.test(own) && !CLOSE.test(own)) return false;

    for (var i = 0; i < p.children.length; i++) {
      var ch = p.children[i];
      if (!ch || ch.hasAttribute('data-ufc-hidden') || !visible(ch)) continue;
      if (dismissControl(ch)) continue;

      var tag = (ch.tagName || '').toLowerCase();
      if ((tag === 'img' || tag === 'iframe') && strongAdSignal(ch)) continue;

      var controls = ch.querySelectorAll ? ch.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]') : [];
      var allDismiss = controls.length > 0 && controls.length <= 6;
      for (var k = 0; k < controls.length && allDismiss; k++) {
        if (!dismissControl(controls[k])) allDismiss = false;
      }
      if (allDismiss && txt(ch).length <= 180) continue;

      return false;
    }

    return true;
  }

  function collapseEmptyNear(el) {
    for (var p = el && el.parentElement, i = 0; p && p !== BODY() && p !== DOC() && i < 4; p = p.parentElement, i++) {
      if (protectedZone(p) || isPlayer(p)) break;
      if (!shellIsEmpty(p)) break;
      hideDirect(p);
    }
  }

  function hide(el) {
    if (!el || el.nodeType !== 1 || protectedZone(el)) return;
    var target = el;
    var a = el.closest && el.closest('a[href]');
    if (a && !protectedZone(a)) target = a;
    if (hideDirect(target)) collapseEmptyNear(target);
  }

  function strongAdSignal(el) {
    var a = el && el.closest && el.closest('a[href]');
    return ADWORD.test(meta(el) + ' ' + meta(a));
  }

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { w: r.width || 0, h: r.height || 0, t: r.top || 0, b: r.bottom || 0, q: r.height ? r.width / r.height : 0 };
  }

  function maybeHideStrong(el) {
    if (!el || el.nodeType !== 1 || protectedZone(el)) return;
    if (strongAdSignal(el)) hide(el);
  }

  var clusterTimer = 0;
  function scheduleCluster(delay) {
    clearTimeout(clusterTimer);
    clusterTimer = setTimeout(function () {
      if ('requestIdleCallback' in W) {
        W.requestIdleCallback(scanClusters, { timeout: 600 });
      } else {
        setTimeout(scanClusters, 0);
      }
    }, delay || 0);
  }

  function scanClusters() {
    var imgs = D.images ? Array.prototype.slice.call(D.images) : [];
    var items = [];
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img || img.hasAttribute('data-ufc-hidden') || protectedZone(img)) continue;
      var r = rect(img);
      if (r.w < Math.max(95, innerWidth * 0.13) || r.h < 18 || r.h > 230 || r.q < 2.55) continue;
      if (strongAdSignal(img)) {
        hide(img);
        continue;
      }
      items.push({ el: img, r: r });
    }

    items.sort(function (a, b) { return a.r.t - b.r.t; });
    var used = new Set();

    for (var s = 0; s < items.length; s++) {
      if (used.has(items[s].el)) continue;

      var top = items[s].r.t;
      var wide = [];
      var grid = [];

      for (var j = s; j < items.length; j++) {
        if (items[j].r.t - top > 900) break;
        if (items[j].r.w >= innerWidth * 0.58) wide.push(items[j].el);
        else if (items[j].r.w >= innerWidth * 0.16 && items[j].r.w < innerWidth * 0.58) grid.push(items[j].el);
      }

      if (wide.length >= 4) {
        for (var a = 0; a < wide.length; a++) {
          hide(wide[a]);
          used.add(wide[a]);
        }
      }

      if (grid.length >= 7) {
        for (var b = 0; b < grid.length; b++) {
          hide(grid[b]);
          used.add(grid[b]);
        }
      }
    }
  }

  function unlockPage() {
    var h = DOC();
    var b = BODY();
    if (h) h.style.setProperty('overflow', 'auto', 'important');
    if (b) b.style.setProperty('overflow', 'auto', 'important');
  }

  function cleanupDismissControl(el) {
    if (!dismissControl(el) || protectedZone(el) || isPlayer(el)) return false;

    var baseText = txt(el);
    var isDismiss = DISMISS.test(baseText);
    var isClose = CLOSE.test(baseText);

    for (var p = el.parentElement, i = 0; p && p !== BODY() && p !== DOC() && i < 5; p = p.parentElement, i++) {
      if (protectedZone(p) || isPlayer(p)) return false;

      var r = rect(p);
      if (r.w < 90 || r.h < 30 || r.h > Math.max(620, innerHeight * 0.75)) continue;

      var cs = getComputedStyle(p);
      var z = parseInt(cs.zIndex, 10) || 0;
      var m = ((p.id || '') + ' ' + String(p.className || '') + ' ' + ((p.getAttribute && p.getAttribute('role')) || '')).toLowerCase();
      var floaty = cs.position === 'fixed' || cs.position === 'sticky' || (cs.position === 'absolute' && z >= 1);
      var metaPopup = /(popup|modal|dialog|layer|notice|float|floating|advert|banner|(^|[-_\s])ad([-_\s]|$))/i.test(m);
      var visual = !!(p.querySelector && p.querySelector('img,picture,iframe,svg,canvas'));

      var controls = p.querySelectorAll ? p.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]') : [];
      var dismissCount = 0;
      for (var k = 0; k < controls.length && k < 12; k++) {
        if (dismissControl(controls[k])) dismissCount++;
      }

      var pairedDismiss = isDismiss && dismissCount >= 2 && controls.length <= 8;
      var floatingClose = isClose && floaty && (visual || metaPopup);
      var popupDismiss = isDismiss && (floaty || metaPopup) && (visual || dismissCount >= 1);

      if (pairedDismiss || floatingClose || popupDismiss) {
        if (hideDirect(p)) {
          collapseEmptyNear(p);
          unlockPage();
        }
        return true;
      }
    }

    return false;
  }

  function killPopupFrom(el) {
    if (!el || el.nodeType !== 1 || isPlayer(el)) return false;

    var id = el.id || '';
    var cls = String(el.className || '');

    if (id === 'hd_pop' || /^hd_pops_/i.test(id) || /(^|\s)hd_pops(?:\s|$)/i.test(cls)) {
      hide(el);
      unlockPage();
      return true;
    }

    if (cleanupDismissControl(el)) return true;

    var t = txt(el);
    if (!t || t.length > 240 || !DISMISS.test(t)) return false;

    for (var p = el, i = 0; p && p !== BODY() && p !== DOC() && i < 6; p = p.parentElement, i++) {
      if (isPlayer(p)) return false;
      var ps = ((p.id || '') + ' ' + String(p.className || '') + ' ' + ((p.getAttribute && p.getAttribute('role')) || '')).toLowerCase();
      if (/(popup|modal|dialog|layer|notice|hd_pop|hd_pops)/i.test(ps)) {
        hide(p);
        unlockPage();
        return true;
      }
    }

    return false;
  }

  function scanPopupNode(root) {
    if (!root || root.nodeType !== 1) return;
    killPopupFrom(root);
    if (!root.querySelectorAll) return;

    var nodes = root.querySelectorAll('#hd_pop,[id^="hd_pops_"],.hd_pops,[role="dialog"],[role="alertdialog"],[class*="popup" i],[id*="popup" i],[class*="modal" i],[id*="modal" i],button,a,[role="button"],input[type="button"],input[type="submit"],[class*="close" i],[id*="close" i]');
    for (var i = 0; i < nodes.length && i < 80; i++) killPopupFrom(nodes[i]);
  }

  function fire(el) {
    if (!el || el.nodeType !== 1) return;
    try {
      el.disabled = false;
      el.removeAttribute('disabled');
      el.setAttribute('aria-disabled', 'false');
    } catch (e) {}
    try { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })); } catch (e) {}
    try { el.click(); } catch (e) {}
  }

  function trySkipNode(root) {
    if (!root || root.nodeType !== 1) return;

    var player = isPlayer(root) || root;
    var all = [];

    try {
      if (root.matches && root.matches('button,a,[role="button"],[onclick],[class*="skip" i],[id*="skip" i]')) all.push(root);
      if (root.querySelectorAll) {
        var q = root.querySelectorAll('button,a,[role="button"],[onclick],[class*="skip" i],[id*="skip" i]');
        for (var i = 0; i < q.length && i < 60; i++) all.push(q[i]);
      }
    } catch (e) {}

    var hasAdContext = false;
    try { hasAdContext = AD_MARKER.test(txt(player).slice(0, 700)); } catch (e) {}

    for (var j = 0; j < all.length; j++) {
      var t = txt(all[j]);
      var m = meta(all[j]);
      if ((t && t.length < 120 && SKIP_WORD.test(t)) || /(skip.?ad|ad.?skip|skip-button|skip_button|skipbtn|skip-btn)/i.test(m)) {
        if (hasAdContext || /ad|광고/i.test(t + ' ' + m)) fire(all[j]);
      }
    }

    if (hasAdContext && player && player.querySelectorAll) {
      var videos = player.querySelectorAll('video');
      for (var k = 0; k < videos.length; k++) {
        var v = videos[k];
        try {
          var d = v.duration;
          if (isFinite(d) && d > 0 && d <= 90 && !v.hasAttribute('data-ufc-adseek')) {
            v.setAttribute('data-ufc-adseek', '1');
            v.currentTime = Math.max(0, d - 0.05);
            setTimeout(function (vv) {
              return function () {
                try { vv.dispatchEvent(new Event('ended')); } catch (e) {}
              };
            }(v), 30);
          }
        } catch (e) {}
      }
    }
  }

  var blockOpenUntil = 0;
  var nativeOpen = W.open;
  try {
    W.open = function () {
      if (Date.now() < blockOpenUntil) return null;
      return nativeOpen.apply(this, arguments);
    };
  } catch (e) {}

  function playerClickGuard(ev) {
    var t = ev.target;
    if (!t || t.nodeType !== 1) return;
    var p = isPlayer(t);
    if (!p) return;
    blockOpenUntil = Date.now() + 1000;

    var a = t.closest && t.closest('a[href]');
    if (!a || !p.contains(a)) return;

    try {
      var u = new URL(a.href, location.href);
      var external = u.hostname && u.hostname !== location.hostname;
      if (a.target === '_blank' || external) ev.preventDefault();
    } catch (e) {}
  }

  D.addEventListener('pointerdown', playerClickGuard, true);
  D.addEventListener('click', playerClickGuard, true);

  D.addEventListener('load', function (ev) {
    var t = ev.target;
    if (t && t.tagName === 'IMG') maybeHideStrong(t);
  }, true);

  function initial() {
    addStyle();
    scanPopupNode(D.documentElement || D);
    trySkipNode(D.documentElement || D);
    scheduleCluster(250);
    scheduleCluster(1200);
  }

  function observe() {
    var root = DOC() || D;
    new MutationObserver(function (ms) {
      var wantCluster = false;

      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];

        if (m.type === 'characterData') {
          if (m.target.parentElement) trySkipNode(m.target.parentElement);
          continue;
        }

        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (!n || n.nodeType !== 1) continue;

          scanPopupNode(n);
          trySkipNode(n);

          if (n.tagName === 'IMG') {
            maybeHideStrong(n);
            wantCluster = true;
          } else if (n.querySelectorAll) {
            var imgs = n.querySelectorAll('img');
            for (var k = 0; k < imgs.length && k < 40; k++) maybeHideStrong(imgs[k]);
            if (imgs.length) wantCluster = true;
          }
        }
      }

      if (wantCluster) scheduleCluster(500);
    }).observe(root, { subtree: true, childList: true, characterData: true });
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', initial, { once: true });
  } else {
    initial();
  }

  observe();
})();
