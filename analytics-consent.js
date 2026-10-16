(function () {
  'use strict';
  if (window.qpAnalyticsConsentLoaded) return;
  window.qpAnalyticsConsentLoaded = true;
  var key = 'qp_swetrix_consent_v1';
  var choice = document.getElementById('analytics-choice');
  var status = document.getElementById('analytics-status');
  var privacy = location.pathname === '/datenschutz.html';
  var loading = false;
  var started = false;
  var control;
  function read() {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function allowed() {
    return location.hostname === 'olwulf-commits.github.io' &&
      read() === 'granted' && navigator.doNotTrack !== '1';
  }
  // The SDK can retain a startup heartbeat after stop(). Gate its fetch transport too.
  var nativeFetch = window.fetch;
  if (typeof nativeFetch === 'function') {
    window.fetch = function (input, options) {
      var url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href);
      if (url.origin === 'https://analyse.quellpass.eu' &&
          (url.pathname === '/backend/v1/log' || url.pathname.indexOf('/backend/v1/log/') === 0) && !allowed()) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return nativeFetch.call(window, input, options);
    };
  }
  function render() {
    if (choice) choice.hidden = !privacy && (read() === 'granted' || read() === 'denied');
    if (status && privacy) status.textContent = allowed() ? 'Webanalyse ist aktiviert.' : 'Webanalyse ist ausgeschaltet.';
  }
  function sanitize(payload) {
    if (!allowed()) return false;
    var ref = null;
    try { if (payload.ref) ref = new URL(payload.ref).origin; } catch (_) { /* No valid referrer. */ }
    return Object.assign({}, payload, {
      pg: location.pathname, ref: ref, title: null,
      so: null, me: null, ca: null, te: null, co: null,
      qs: null, meta: null, profileId: null
    });
  }
  function start() {
    if (!allowed() || loading || started) return;
    loading = true;
    var sdk = document.createElement('script');
    sdk.src = 'https://swetrix.org/swetrix.js';
    sdk.async = true;
    sdk.referrerPolicy = 'no-referrer';
    sdk.onload = function () {
      loading = false;
      if (!allowed() || started || !window.swetrix) return;
      window.swetrix.init('CpCpr7d8usLW', {
        apiURL: 'https://analyse.quellpass.eu/backend/v1/log', respectDNT: true
      });
      started = true;
      Promise.resolve(window.swetrix.trackViews({ callback: sanitize }))
        .then(function (value) { control = value; })
        .catch(function () { /* Analytics must never break the page. */ });
    };
    sdk.onerror = function () { loading = false; };
    document.head.appendChild(sdk);
  }
  function stop() {
    if (!started) return;
    if (control && typeof control.stop === 'function') control.stop();
    // Unload the SDK context, including pending heartbeat and startup timers.
    location.reload();
  }
  document.querySelectorAll('[data-analytics-choice]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-analytics-choice');
      if (value !== 'granted' && value !== 'denied') return;
      try { localStorage.setItem(key, value); }
      catch (_) {
        if (status) status.textContent = 'Auswahl konnte nicht gespeichert werden. Webanalyse bleibt ausgeschaltet.';
        return;
      }
      render();
      if (allowed()) start(); else stop();
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    render();
    if (allowed()) start(); else stop();
  });
  render();
  start();
})();
