// ==UserScript==
// @name         TSR Download Skip Trial
// @namespace    local.unicorn.tsr-download-trial
// @version      0.1.1
// @description  Recovery update: no early navigation; click only the normally enabled TSR download button. Does not shorten the countdown.
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
  // 0.1.0's early thank-you navigation caused an expired-session error.
  // Keep the original name/namespace/update URL so installed trials receive this fix.
  // Do not reuse old tickets, alter countdowns, force disabled buttons, or redirect.
  if (!/^\/downloads\/download\/itemId\/\d+\/ticket\/[A-Za-z0-9._-]+\/?$/.test(location.pathname)) return;
  var done = false;
  var pending = false;
  var observer;
  var interval;
  var timeout;

  function stop() {
    done = true;
    if (observer) observer.disconnect();
    clearInterval(interval);
    clearTimeout(timeout);
  }
  function ready(button) {
    if (button.classList.contains('disabled') || button.hasAttribute('disabled') ||
        button.getAttribute('aria-disabled') === 'true') return false;
    var style = getComputedStyle(button);
    return style.display !== 'none' && style.visibility === 'visible' &&
      style.pointerEvents !== 'none' && Number(style.opacity) > 0 &&
      button.getClientRects().length > 0;
  }
  function scan() {
    if (done || pending) return;
    if (document.body && /The download session has expired/i.test(document.body.textContent || '')) {
      stop();
      return;
    }
    var button = document.querySelector('.download-card a.downloader');
    if (!button || !ready(button)) return;
    pending = true;
    // Allow the site's own ready-state handler to finish before clicking.
    setTimeout(function () {
      pending = false;
      if (done || !button.isConnected || !ready(button)) return;
      stop();
      button.click();
    }, 250);
  }
  observer = new MutationObserver(scan);
  observer.observe(document, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'disabled', 'aria-disabled']
  });
  interval = setInterval(scan, 500);
  timeout = setTimeout(stop, 300000);
  window.addEventListener('pagehide', stop, { once: true });
  scan();
})();
