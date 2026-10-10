/* 伴伴村莊：前台共用工具（呼叫 GAS API、跳脫 HTML） */
(function () {
  var cfg = window.BANBAN_CONFIG || {};
  var API_URL = String(cfg.API_URL || '').trim();
  var TIMEOUT_MS = 30000;
  var READ_ACTIONS = ['ping', 'config', 'availability', 'courses', 'getBooking'];

  function friendlyError(err) {
    if (err && err.name === 'AbortError') return '伺服器回應太久，請稍後再試一次。';
    if (err && err.isApi) return err.message;
    return '連線失敗，請確認網路後重新整理頁面。';
  }

  async function callOnce(action, payload) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    try {
      // text/plain = 簡單請求，不會觸發 CORS 預檢，GAS 才收得到
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action }, payload || {})),
        redirect: 'follow',
        credentials: 'omit',
        signal: controller.signal
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        var err = new Error('伺服器回傳格式不正確，請確認 GAS 已用「所有人」權限部署。');
        err.isApi = true;
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  window.api = async function (action, payload) {
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(API_URL)) {
      var e = new Error('系統尚未設定 API 網址（config.js）。');
      e.isApi = true;
      throw e;
    }

    var retries = READ_ACTIONS.indexOf(action) >= 0 ? 1 : 0;

    for (var attempt = 0; ; attempt++) {
      try {
        return await callOnce(action, payload);
      } catch (err) {
        if (attempt >= retries || err.isApi) {
          var out = new Error(friendlyError(err));
          out.isApi = true;
          throw out;
        }
        await new Promise(function (r) { setTimeout(r, 1200); });
      }
    }
  };

  window.escapeHtml = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  window.weekdayText = function (dateString) {
    var p = String(dateString || '').split('-').map(Number);
    if (p.length !== 3) return '';
    return '（' + '日一二三四五六'[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + '）';
  };

  window.qs = function (name) {
    return new URLSearchParams(location.search).get(name) || '';
  };
})();
