// ONLINE ProjectLab Site Analytics Stage01
(function () {
  'use strict';

  var API = 'https://api.online-projectlab.pp.ua/api/v1/site-analytics/events';
  var VISITOR_KEY = 'online_projectlab_analytics_visitor_v1';
  var SESSION_VIEW_KEY = 'online_projectlab_page_view_';

  function visitorId() {
    try {
      var current = localStorage.getItem(VISITOR_KEY);
      if (current) return current;
      var value = '';
      if (window.crypto && crypto.randomUUID) value = crypto.randomUUID();
      else value = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(VISITOR_KEY, value);
      return value;
    } catch (_) {
      return '';
    }
  }

  function send(eventType, extra) {
    var body = {
      event_type: eventType,
      visitor_id: visitorId(),
      page: location.pathname || '/',
      asset: (extra && extra.asset) || '',
      version: (extra && extra.version) || '',
      referrer_host: document.referrer || ''
    };
    try {
      fetch(API, {
        method: 'POST',
        mode: 'cors',
        keepalive: true,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (_) {}
  }

  function pageView() {
    var key = SESSION_VIEW_KEY + (location.pathname || '/');
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (_) {}
    send('page_view');
  }

  window.OnlineSiteAnalytics = {
    trackDesktopDownload: function (version) {
      send('download_desktop', {asset: 'ONLINE-Service-Manager', version: version || ''});
    },
    trackAndroidDownload: function (version) {
      send('download_android', {asset: 'ONLINE-Mobile.apk', version: version || ''});
    }
  };

  pageView();

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!link) return;
    var href = String(link.getAttribute('href') || '');
    if (/ONLINE-Mobile(?:[^/]*)\.apk(?:\?.*)?$/i.test(href) ||
        /\/mobile\/android\/ONLINE-Mobile\.apk(?:\?.*)?$/i.test(href)) {
      window.OnlineSiteAnalytics.trackAndroidDownload(
        String(link.textContent || '').match(/v?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/i)?.[1] || ''
      );
      return;
    }
    if (link.hasAttribute('data-download-link') ||
        /ONLINE-Service-Manager.*\.(zip|exe|msi)(?:\?.*)?$/i.test(href)) {
      window.OnlineSiteAnalytics.trackDesktopDownload(
        String(link.textContent || '').match(/v?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/i)?.[1] || ''
      );
    }
  }, true);
})();
