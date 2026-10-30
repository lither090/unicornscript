// ==UserScript==
// @name         TSR Download Skip Trial
// @namespace    local.unicorn.tsr-download-trial
// @version      0.1.0
// @description  TSR-only experimental wait-page shortcut; keep Unicorn Fast Cleaner enabled separately.
// @match        https://www.thesimsresource.com/downloads/download/*
// @match        https://www.thesimsresource.com/downloads/thankyou/*
// @run-at       document-start
// @noframes
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lither090/unicornscript/main/TSR_Download_Skip_Trial.user.js
// @updateURL    https://raw.githubusercontent.com/lither090/unicornscript/main/TSR_Download_Skip_Trial.user.js
// ==/UserScript==
(function () {
  'use strict';
  if (window.top !== window.self || location.hostname !== 'www.thesimsresource.com') return;

  var route = location.pathname.match(/^\/downloads\/(download\/itemId|thankyou\/id)\/(\d+)\/ticket\/([A-Za-z0-9._-]+)\/?$/);
  if (!route) return;
  var id = route[2];
  var ticket = route[3];
  var key = '__ufc_tsr_trial_v1:' + id + ':' + ticket;
  var original = location.origin + '/downloads/download/itemId/' + id + '/ticket/' + ticket;
  var next = location.origin + '/downloads/thankyou/id/' + id + '/ticket/' + ticket;
  var attempted;
  // If session storage is blocked, leave the site's normal flow intact.
  try { attempted = sessionStorage.getItem(key); } catch (_) { return; }

  if (route[1] === 'download/itemId') {
    if (attempted) return;
    try { sessionStorage.setItem(key, 'attempted'); } catch (_) { return; }
    // Reuse the site's current ticket. Never invent a file URL or signed token.
    location.replace(next);
    return;
  }
  // A normally reached thank-you page should behave exactly as before.
  if (attempted !== 'attempted') return;

  var observer;
  var timer;
  var panel;
  var message;
  var settled = false;
  var dismissed = false;

  function mark(state) {
    try { sessionStorage.setItem(key, state); } catch (_) {}
  }

  function show(text) {
    if (dismissed || !document.body) return;
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = '__ufc_tsr_trial_status';
      panel.setAttribute('role', 'status');
      panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:340px;padding:12px;background:#172033;color:#fff;border:1px solid #67748b;border-radius:10px;font:14px/1.5 sans-serif;box-shadow:0 3px 16px #0005';
      message = document.createElement('div');
      panel.appendChild(message);
      var back = document.createElement('a');
      back.href = original;
      back.textContent = '원래 대기 절차로 돌아가기';
      back.style.cssText = 'display:inline-block;margin-top:8px;color:#a7e9ff;text-decoration:underline';
      back.addEventListener('click', function () { mark('fallback'); });
      panel.appendChild(back);
      var close = document.createElement('button');
      close.type = 'button';
      close.textContent = '접기';
      close.style.cssText = 'margin-left:12px;padding:2px 8px;color:#fff;background:#34435e;border:1px solid #67748b;border-radius:4px;cursor:pointer';
      close.addEventListener('click', function () { dismissed = true; panel.remove(); });
      panel.appendChild(close);
      document.body.appendChild(panel);
    }
    if (message.textContent !== text) message.textContent = text;
  }

  function stop() {
    settled = true;
    if (observer) observer.disconnect();
    clearTimeout(timer);
  }

  function scan() {
    if (settled) return;
    var links = document.querySelectorAll('a.download-manual[href]');
    for (var i = 0; i < links.length; i++) {
      var url;
      try { url = new URL(links[i].getAttribute('href'), location.href); } catch (_) { continue; }
      if (url.protocol !== 'https:' || url.hostname !== 'downloads.thesimsresource.com' || url.port || url.username || url.password) continue;
      if (!new RegExp('^/verify/downloads/\\d+/' + id + '/[^/]+$').test(url.pathname)) continue;
      // Probe exports redact these values. A placeholder is not a usable link.
      if (!url.search || /[{}]|%7b|%7d/i.test(url.search)) continue;
      mark('link-found');
      stop();
      // TSR already starts the download on this page. Avoid duplicate downloads.
      show('TSR 시험: 파일 링크 확인. 자동으로 시작하지 않으면 페이지의 다운로드 링크를 눌러줘.');
      return;
    }
    show('TSR 시험: 대기 페이지를 건너뛰고 파일 링크를 확인하는 중…');
  }

  observer = new MutationObserver(scan);
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  timer = setTimeout(function () {
    if (settled) return;
    scan();
    if (settled) return;
    stop();
    mark('fallback');
    // No retry: the original wait page keeps its ordinary countdown.
    location.replace(original);
  }, 10000);
  scan();
})();
