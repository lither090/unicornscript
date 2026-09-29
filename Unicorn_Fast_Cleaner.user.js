// ==UserScript==
// @name         Unicorn Fast Cleaner (iOS-style)
// @namespace    local.unicorn.fastcleaner
// @version      1.0.0
// @description  Fast banner/popup cleanup, preroll skip, player popunder protection
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var D = document;
  var W = window;
  var H = function () { return D.documentElement; };
  var B = function () { return D.body; };

  var DISMISS = /(오늘\s*(?:하루\s*)?(?:그만\s*보기|그만보기|보지\s*않기)|더\s*이상\s*(?:보지|열람하지|표시하지)\s*않기|다시\s*(?:보지|열람하지|표시하지)\s*않기|\d+\s*(?:분|시간|일)\s*동안\s*(?:다시\s*)?(?:보지|열람하지|표시하지)\s*(?:않기|않습니다)|do\s*not\s*show\s*again|don't\s*show\s*again|hide\s*for\s*\d+\s*(?:minutes?|hours?|days?))/i;
  var ADWORD = /(casino|sportsbook|\bbet\b|toto|slot|advert|banner|affiliate|partner|promo|promotion|bonus|redirect|카지노|토토|베팅|첫충|매충|가입코드|페이백|입플|충전|환전|롤링|무한입플|보너스|신규첫충|매일첫충|통장\s*매입)/i;
  var SKIP_MARKER = /(?:\d+\s*초\s*(?:뒤|후)\s*광고\s*(?:skip|스킵)|광고\s*(?:skip|스킵)\s*\d+\s*초|광고(?:를|는)?\s*\d+\s*초\s*(?:후|뒤)\s*(?:건너\s*뛸|건너뛸|스킵(?:할)?)\s*수\s*있|skip\s*ad\s*(?:in)?\s*\d+|skip\s*(?:advertisement|commercial)\s*(?:in)?\s*\d+|advertisement(?:\s+\d{1,2}:\d{2})?)/i;
  var SKIP_WORD = /(?:광고\s*)?(?:skip|스킵|건너\s*뛰기|건너뛰기)|skip\s*(?:ad|ads|advertisement|commercial)?/i;

  function addStyle() {
    if (D.getElementById('__unicorn_fast_cleaner_css')) return;
    var s = D.createElement('style');
    s.id = '__unicorn_fast_cleaner_css';
    s.textContent = [
      '[id^="div-gpt-ad"],',
      '[class*="ad-banner" i],[class*="ad_banner" i],[class*="banner-ad" i],[class*="banner_ad" i],',
      '[class*="ads-banner" i],[class*="ads_banner" i],[id*="ad-banner" i],[id*="ad_banner" i],',
      '[class*="ad-popup" i],[class*="ad_popup" i],[class*="popup-ad" i],[class*="popup_ad" i],',
      '[class*="ad-modal" i],[class*="modal-ad" i],[class*="ad-layer" i],[class*="layer-ad" i],',
      '#hd_pop,[id^="hd_pops_"],[class~="hd_pops"],[class*="hd_pops_" i],',
      'iframe[src*="doubleclick" i],iframe[src*="googlesyndication" i],iframe[src*="googleads" i]',
      '{display:none!important;visibility:hidden!important;max-height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;}'
    ].join('');
    var root = D.documentElement || D.head;
    if (root) root.appendChild(s);
    else D.addEventListener('readystatechange', addStyle, { once: true });
  }
  addStyle();

  var unavailable = /^\s*사용\s*불가\s*$/i;
  try {
    var nativeAlert = W.alert;
    W.alert = function (msg) {
      if (unavailable.test(String(msg || ''))) return;
      return nativeAlert.apply(this, arguments);
    };
    var nativeConfirm = W.confirm;
    W.confirm = function (msg) {
      if (unavailable.test(String(msg || ''))) return false;
      return nativeConfirm.apply(this, arguments);
    };
  } catch (e) {}

  function text(el) {
    if (!el) return '';
    var v = '';
    try {
      if ('value' in el) v = el.value || '';
      v += ' ' + (el.innerText || el.textContent || '');
      v += ' ' + ((el.getAttribute && el.getAttribute('aria-label')) || '');
      v += ' ' + ((el.getAttribute && el.getAttribute('title')) || '');
    } catch (e) {}
    return v.replace(/\s+/g, ' ').trim();
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

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { w: r.width || 0, h: r.height || 0, t: r.top || 0, b: r.bottom || 0, q: r.height ? r.width / r.height : 0 };
  }

  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    var cs = getComputedStyle(el);
    var r = rect(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0 && r.w > 2 && r.h > 2;
  }

  function uiZone(el) {
    for (var p = el, i = 0; p && p !== B() && i < 9; p = p.parentElement, i++) {
      var tag = (p.tagName || '').toLowerCase();
      var role = ((p.getAttribute && p.getAttribute('role')) || '').toLowerCase();
      var s = (tag + ' ' + (p.id || '') + ' ' + String(p.className || '') + ' ' + role).toLowerCase();
      if (/^(header|nav|form|footer|input|select|textarea|button)$/.test(tag)) return true;
      if (role === 'navigation' || role === 'search' || role === 'searchbox') return true;
      if (/(^|[\s_-])(header|nav|navbar|navigation|menu|gnb|lnb|category|categories|tab|tabs|toolbar|topbar|search|searchbar|search-box|searchform|filter|filters|footer)([\s_-]|$)/.test(s)) return true;
    }
    return false;
  }

  function playerRoot(el) {
    for (var p = el, i = 0; p && p !== B() && i < 8; p = p.parentElement, i++) {
      var tag = (p.tagName || '').toLowerCase();
      var s = ((p.id || '') + ' ' + String(p.className || '')).toLowerCase();
      if (tag === 'video') return p.parentElement || p;
      if (/player|plyr|video-js|jwplayer|vjs-|media-player|dplayer|artplayer/.test(s)) return p;
      try { if (p.querySelector && p.querySelector(':scope > video')) return p; } catch (e) {}
    }
    return null;
  }

  function critical(el) {
    if (!el || !el.querySelector) return false;
    return !!el.querySelector('form,input[type="search"],input[placeholder*="검색"],[role="search"],[role="searchbox"],nav,header,video');
  }

  function contentLike(el) {
    for (var p = el, i = 0; p && p !== B() && i < 4; p = p.parentElement, i++) {
      var t = text(p);
      var s = ((p.id || '') + ' ' + String(p.className || '')).toLowerCase();
      if (/\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(t) && /(조회|views?|new|업데이트|episode|회|202\d[-./])/i.test(t)) return true;
      if (/(^|[\s_-])(video|movie|post|article|item|card|episode|thumbnail|thumb|gallery-item)([\s_-]|$)/.test(s) && rect(el).q < 2.8) return true;
    }
    return false;
  }

  function adSignal(el) {
    var a = el.closest && el.closest('a[href]');
    return ADWORD.test(meta(el) + ' ' + meta(a));
  }

  function collapse(el) {
    for (var p = el && el.parentElement, i = 0; p && p !== B() && p !== H() && i < 4; p = p.parentElement, i++) {
      if (uiZone(p) || playerRoot(p) || critical(p)) break;
      var kids = p.children || [];
      var any = false;
      for (var k = 0; k < kids.length; k++) {
        if (kids[k].hasAttribute && kids[k].hasAttribute('data-ufc-hidden')) continue;
        if (visible(kids[k])) { any = true; break; }
      }
      if (!any) {
        p.style.setProperty('display', 'none', 'important');
        p.style.setProperty('height', '0', 'important');
        p.style.setProperty('margin', '0', 'important');
        p.style.setProperty('padding', '0', 'important');
        p.setAttribute('data-ufc-hidden', '1');
      }
    }
  }

  function hideBanner(el) {
    if (!el || el.hasAttribute('data-ufc-clean') || uiZone(el) || playerRoot(el)) return;
    var n = el;
    var a = el.closest && el.closest('a[href]');
    if (a && !uiZone(a) && !playerRoot(a)) {
      var ar = rect(a), er = rect(el);
      if (ar.w <= Math.max(innerWidth * 0.99, er.w * 1.4) && ar.h <= Math.max(360, er.h * 1.9)) n = a;
    }
    if (critical(n)) return;
    n.style.setProperty('display', 'none', 'important');
    n.setAttribute('data-ufc-hidden', '1');
    el.setAttribute('data-ufc-clean', '1');
    collapse(n);
  }

  function bannerCandidate(el) {
    if (!el || el.nodeType !== 1 || el.hasAttribute('data-ufc-clean')) return false;
    if (uiZone(el) || playerRoot(el) || contentLike(el)) return false;
    var r = rect(el);
    return r.w >= Math.max(95, innerWidth * 0.13) && r.h >= 18 && r.h <= 240 && r.q >= 2.45;
  }

  var bannerTimer = 0;
  function scanBanners(root) {
    var list = [];
    if (root && root.nodeType === 1 && /^(IMG|IFRAME)$/.test(root.tagName) && bannerCandidate(root)) list.push(root);
    var base = root && root.querySelectorAll ? root : D;
    if (base.querySelectorAll) {
      var found = base.querySelectorAll('img,iframe');
      for (var i = 0; i < found.length; i++) if (bannerCandidate(found[i])) list.push(found[i]);
    }
    if (!list.length) return;

    var unique = Array.from(new Set(list));
    for (var j = 0; j < unique.length; j++) if (adSignal(unique[j])) hideBanner(unique[j]);

    var left = unique.filter(function (el) { return !el.hasAttribute('data-ufc-clean') && visible(el); });
    left.sort(function (a, b) { return rect(a).t - rect(b).t; });

    var used = new Set();
    for (var s = 0; s < left.length; s++) {
      if (used.has(left[s])) continue;
      var top = rect(left[s]).t;
      var group = [];
      for (var g = s; g < left.length; g++) {
        if (rect(left[g]).t - top > 1050) break;
        group.push(left[g]);
      }
      var full = [], grid = [];
      for (var q = 0; q < group.length; q++) {
        var rr = rect(group[q]);
        if (rr.w >= innerWidth * 0.55) full.push(group[q]);
        else if (rr.w >= innerWidth * 0.13 && rr.w < innerWidth * 0.55) grid.push(group[q]);
      }
      if (full.length >= 3) {
        for (var f = 0; f < full.length; f++) { hideBanner(full[f]); used.add(full[f]); }
      }
      if (grid.length >= 6) {
        for (var z = 0; z < grid.length; z++) { hideBanner(grid[z]); used.add(grid[z]); }
      }
    }
  }

  function scheduleBanners(ms) {
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { scanBanners(D); }, typeof ms === 'number' ? ms : 60);
  }

  function unlockPage() {
    var h = H(), b = B();
    if (h) {
      h.style.setProperty('overflow', 'auto', 'important');
      h.style.setProperty('pointer-events', 'auto', 'important');
    }
    if (b) {
      b.style.setProperty('overflow', 'auto', 'important');
      b.style.setProperty('pointer-events', 'auto', 'important');
    }
  }

  function killPopup(el) {
    if (!el || el.nodeType !== 1 || uiZone(el) || playerRoot(el)) return false;
    var id = el.id || '';
    var cls = String(el.className || '');
    if (id === 'hd_pop' || /^hd_pops_/i.test(id) || /(^|\s)hd_pops(?:\s|$)/i.test(cls)) {
      el.style.setProperty('display', 'none', 'important');
      el.setAttribute('data-ufc-popup', '1');
      unlockPage();
      return true;
    }

    for (var p = el, i = 0; p && p !== B() && p !== H() && i < 8; p = p.parentElement, i++) {
      if (uiZone(p) || playerRoot(p) || critical(p)) return false;
      var t = text(p);
      if (!t || t.length > 900 || !DISMISS.test(t)) continue;
      var r = rect(p);
      if (r.w < 130 || r.h < 60) continue;
      var cs = getComputedStyle(p);
      var zi = parseInt(cs.zIndex, 10) || 0;
      var m = ((p.id || '') + ' ' + String(p.className || '') + ' ' + ((p.getAttribute && p.getAttribute('role')) || '')).toLowerCase();
      var floaty = cs.position === 'fixed' || cs.position === 'absolute' || cs.position === 'sticky' || zi >= 10;
      var popupMeta = /(popup|modal|dialog|layer|notice|hd_pop|hd_pops)/i.test(m);
      var visual = !!(p.querySelector && p.querySelector('img,picture,iframe,svg,canvas')) || cs.backgroundImage !== 'none';
      if ((floaty || popupMeta || r.w >= innerWidth * 0.45) && visual) {
        p.style.setProperty('display', 'none', 'important');
        p.setAttribute('data-ufc-popup', '1');
        for (var up = p.parentElement, k = 0; up && up !== B() && k < 3; up = up.parentElement, k++) {
          if (uiZone(up) || critical(up) || playerRoot(up)) break;
          var us = getComputedStyle(up), ur = rect(up), uz = parseInt(us.zIndex, 10) || 0;
          if ((us.position === 'fixed' || us.position === 'absolute' || uz >= 10) && ur.w >= innerWidth * 0.7 && ur.h >= innerHeight * 0.45) {
            up.style.setProperty('display', 'none', 'important');
            up.setAttribute('data-ufc-popup', '1');
          }
        }
        unlockPage();
        return true;
      }
    }
    return false;
  }

  function scanPopups(root) {
    if (!root) return;
    if (root.nodeType === 1) killPopup(root);
    if (!root.querySelectorAll) return;
    var nodes = root.querySelectorAll('#hd_pop,[id^="hd_pops_"],.hd_pops,[role="dialog"],[role="alertdialog"],[class*="popup" i],[id*="popup" i],[class*="modal" i],[id*="modal" i],button,a,[role="button"]');
    for (var i = 0; i < nodes.length; i++) {
      var t = text(nodes[i]);
      if (/^hd_pops_/i.test(nodes[i].id || '') || (t && t.length <= 240 && DISMISS.test(t))) killPopup(nodes[i]);
    }
  }

  var seenSkip = new WeakMap();
  function rootForSkip(el) {
    var pr = playerRoot(el);
    if (pr) return pr;
    for (var p = el, i = 0; p && p !== B() && i < 8; p = p.parentElement, i++) {
      var r = rect(p);
      if (r.w >= innerWidth * 0.5 && r.h >= 100 && SKIP_MARKER.test(text(p).slice(0, 600))) return p;
    }
    return el.parentElement || el;
  }

  function fire(el) {
    if (!el || el.nodeType !== 1) return;
    try { el.disabled = false; } catch (e) {}
    try {
      el.removeAttribute('disabled');
      el.setAttribute('aria-disabled', 'false');
      el.style.setProperty('pointer-events', 'auto', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
    } catch (e) {}
    try { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })); } catch (e) {}
    try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: W })); } catch (e) {}
    try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: W })); } catch (e) {}
    try { el.click(); } catch (e) {}
  }

  function clickSkip(root, source) {
    if (!root || !root.querySelectorAll) return false;
    var all = root.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"],[onclick],div,span');
    var hit = false;
    for (var i = 0; i < all.length; i++) {
      var t = text(all[i]);
      var m = meta(all[i]);
      if ((t && t.length < 120 && SKIP_WORD.test(t)) || /(skip.?ad|ad.?skip|skip-button|skip_button|skipbtn|skip-btn)/i.test(m)) {
        fire(all[i]);
        hit = true;
      }
    }
    if (source && SKIP_WORD.test(text(source))) { fire(source); hit = true; }
    return hit;
  }

  function finishShortAd(root) {
    if (!root || !root.querySelectorAll) return;
    var rt = text(root).slice(0, 800);
    if (!SKIP_MARKER.test(rt)) return;
    var videos = root.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      (function (v) {
        function finish() {
          try {
            var d = v.duration;
            if (!isFinite(d) || d <= 0 || d > 90) return;
            var key = (v.currentSrc || v.src || '') + '|' + Math.round(d * 10);
            if (v.getAttribute('data-ufc-adseek') === key) return;
            v.setAttribute('data-ufc-adseek', key);
            if (v.currentTime < d - 0.15) v.currentTime = Math.max(0, d - 0.05);
            setTimeout(function () {
              try {
                v.dispatchEvent(new Event('timeupdate'));
                v.dispatchEvent(new Event('ended'));
              } catch (e) {}
            }, 30);
          } catch (e) {}
        }
        if (v.readyState >= 1) finish();
        else v.addEventListener('loadedmetadata', finish, { once: true });
      })(videos[i]);
    }
  }

  function processSkip(el) {
    if (!el || el.nodeType !== 1) return;
    var t = text(el);
    if (!t || t.length > 240 || !SKIP_MARKER.test(t)) return;
    var root = rootForSkip(el);
    var key = t.replace(/\d+/g, '#').slice(0, 160);
    if (seenSkip.get(root) === key) return;
    seenSkip.set(root, key);
    function hit() {
      clickSkip(root, el);
      finishShortAd(root);
    }
    hit();
    setTimeout(hit, 70);
    setTimeout(hit, 180);
    setTimeout(hit, 420);
  }

  function scanSkip(root) {
    if (!root) return;
    if (root.nodeType === 1) processSkip(root);
    if (!root.querySelectorAll) return;
    var all = root.querySelectorAll('button,a,[role="button"],[onclick],div,span,p,strong,small');
    for (var i = 0; i < all.length; i++) {
      var t = text(all[i]);
      if (t && t.length <= 240 && SKIP_MARKER.test(t)) processSkip(all[i]);
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

  function host(url) {
    try { return new URL(url, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function armPlayerPopupBlock(ev) {
    var target = ev.target;
    if (!target || target.nodeType !== 1) return;
    var player = playerRoot(target);
    if (!player) return;
    blockOpenUntil = Date.now() + 1200;
    var a = target.closest && target.closest('a[href]');
    if (!a || !player.contains(a)) return;
    var ah = host(a.href), lh = location.hostname.replace(/^www\./, '');
    var external = ah && ah !== lh && !ah.endsWith('.' + lh) && !lh.endsWith('.' + ah);
    if (a.target === '_blank' || external) ev.preventDefault();
  }

  D.addEventListener('pointerdown', armPlayerPopupBlock, true);
  D.addEventListener('click', armPlayerPopupBlock, true);
  D.addEventListener('load', function (ev) {
    var t = ev.target;
    if (t && (t.tagName === 'IMG' || t.tagName === 'IFRAME')) scheduleBanners(40);
  }, true);

  function initial() {
    addStyle();
    scanPopups(D);
    scanSkip(D);
    scanBanners(D);
    setTimeout(function () { scanPopups(D); scanSkip(D); scheduleBanners(0); }, 180);
    setTimeout(function () { scanPopups(D); scanSkip(D); scheduleBanners(0); }, 700);
  }

  function startObserver() {
    var root = H() || D;
    new MutationObserver(function (mutations) {
      var needBanners = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'characterData') {
          if (m.target.parentElement) processSkip(m.target.parentElement);
          continue;
        }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (playerRoot(n) || playerRoot(m.target)) {
            scanSkip(n);
            continue;
          }
          scanPopups(n);
          scanSkip(n);
          needBanners = true;
        }
      }
      if (needBanners) scheduleBanners(70);
    }).observe(root, { subtree: true, childList: true, characterData: true });
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', initial, { once: true });
  } else {
    initial();
  }
  startObserver();
})();
