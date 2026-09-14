/* ============================================================
   Ketor -- Translation API Fallback Chain
   ------------------------------------------------------------
   Free APIs only (no key required), tried in order:
   1. MyMemory        -- 1M chars/month, stable
   2. Google Translate (unofficial) -- unlimited, may rate-limit
   3. LibreTranslate  -- public instances, unlimited
   4. Apertium        -- unlimited, smaller language coverage

   Optional custom API (user supplies key):
   - OpenAI, DeepL, Google Cloud, Azure

   User pays for custom API usage. Default chain is free.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.core = Ketor.core || {};

  function fetchJson(url, options) {
    return fetch(url, options).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  /**
   * MyMemory -- free, 1M chars/month, no key.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @returns {Promise<string>}
   */
  function translateMyMemory(text, sourceLang, targetLang) {
    var pair = sourceLang + '|' + targetLang;
    var url = 'https://api.mymemory.translated.net/get?q=' +
              encodeURIComponent(text) + '&langpair=' + encodeURIComponent(pair);
    return fetchJson(url).then(function (data) {
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || 'MyMemory error');
      }
      return (data.responseData && data.responseData.translatedText) || text;
    });
  }

  /**
   * Google Translate unofficial -- no key, may rate-limit.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @returns {Promise<string>}
   */
  function translateGoogleUnofficial(text, sourceLang, targetLang) {
    var url = 'https://translate.googleapis.com/translate_a/single' +
              '?client=gtx&sl=' + encodeURIComponent(sourceLang) +
              '&tl=' + encodeURIComponent(targetLang) +
              '&dt=t&q=' + encodeURIComponent(text);
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('Google Translate unexpected response');
      }
      var parts = [];
      for (var i = 0; i < data[0].length; i++) {
        if (data[0][i] && data[0][i][0]) parts.push(data[0][i][0]);
      }
      return parts.join('') || text;
    });
  }

  /**
   * LibreTranslate public instance -- no key.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @returns {Promise<string>}
   */
  function translateLibreTranslate(text, sourceLang, targetLang) {
    var endpoints = [
      'https://libretranslate.com/translate',
      'https://translate.argosopentech.com/translate',
      'https://libretranslate.de/translate'
    ];
    var body = JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    });
    var tryEndpoint = function (idx) {
      if (idx >= endpoints.length) return Promise.reject(new Error('All LibreTranslate endpoints failed'));
      return fetch(endpoints[idx], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function (data) {
        if (!data.translatedText) throw new Error('LibreTranslate empty response');
        return data.translatedText;
      }).catch(function () {
        return tryEndpoint(idx + 1);
      });
    };
    return tryEndpoint(0);
  }

  /**
   * Apertium -- no key, unlimited, smaller language coverage.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @returns {Promise<string>}
   */
  function translateApertium(text, sourceLang, targetLang) {
    var pair = sourceLang + '-' + targetLang;
    var url = 'https://apertium.org/apy/translate?langpair=' +
              encodeURIComponent(pair) + '&q=' + encodeURIComponent(text);
    return fetchJson(url).then(function (data) {
      if (data.responseStatus !== 200) {
        throw new Error('Apertium error: ' + (data.responseDetails || 'unknown'));
      }
      return data.responseData.translatedText || text;
    });
  }

  /**
   * Custom API -- OpenAI / DeepL / Google Cloud.
   * User supplies endpoint + key.
   * @param {string} text
   * @param {Object} customConfig
   * @returns {Promise<string>}
   */
  function translateCustom(text, customConfig) {
    if (!customConfig || !customConfig.endpoint || !customConfig.apiKey) {
      return Promise.reject(new Error('Custom API config missing endpoint or key'));
    }
    var provider = String(customConfig.provider || 'openai').toLowerCase();
    if (provider === 'openai') {
      return fetch(customConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + customConfig.apiKey
        },
        body: JSON.stringify({
          model: customConfig.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a translator. Translate from ' + customConfig.sourceLang + ' to ' + customConfig.targetLang + '. Output only the translation.' },
            { role: 'user', content: text }
          ]
        })
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function (data) {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || text;
      });
    }
    if (provider === 'deepl') {
      return fetch(customConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'DeepL-Auth-Key ' + customConfig.apiKey
        },
        body: 'text=' + encodeURIComponent(text) +
              '&source_lang=' + encodeURIComponent(customConfig.sourceLang) +
              '&target_lang=' + encodeURIComponent(customConfig.targetLang)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function (data) {
        return (data.translations && data.translations[0] && data.translations[0].text) || text;
      });
    }
    return Promise.reject(new Error('Unknown custom provider: ' + provider));
  }

  var FALLBACK_CHAIN = [
    { id: 'mymemory', fn: translateMyMemory, label: 'MyMemory' },
    { id: 'google-unofficial', fn: translateGoogleUnofficial, label: 'Google Translate (unofficial)' },
    { id: 'libretranslate', fn: translateLibreTranslate, label: 'LibreTranslate' },
    { id: 'apertium', fn: translateApertium, label: 'Apertium' }
  ];

  /**
   * Translate with automatic fallback through free APIs.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @param {Object} options - { onProgress, customApi, preferredProvider }
   * @returns {Promise<{text, provider}>}
   */
  function translate(text, sourceLang, targetLang, options) {
    var opts = options || {};
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};

    if (opts.customApi && opts.customApi.endpoint && opts.customApi.apiKey) {
      onProgress(20);
      return translateCustom(text, {
        provider: opts.customApi.provider,
        endpoint: opts.customApi.endpoint,
        apiKey: opts.customApi.apiKey,
        model: opts.customApi.model,
        sourceLang: sourceLang,
        targetLang: targetLang
      }).then(function (result) {
        onProgress(100);
        return { text: result, provider: 'custom:' + (opts.customApi.provider || 'unknown') };
      });
    }

    var chain = FALLBACK_CHAIN.slice();
    if (opts.preferredProvider) {
      chain.sort(function (a, b) {
        if (a.id === opts.preferredProvider) return -1;
        if (b.id === opts.preferredProvider) return 1;
        return 0;
      });
    }

    var tryNext = function (idx, lastError) {
      if (idx >= chain.length) {
        return Promise.reject(lastError || new Error('All translation providers failed'));
      }
      var provider = chain[idx];
      onProgress(20 + Math.floor((idx / chain.length) * 60));
      return provider.fn(text, sourceLang, targetLang).then(function (result) {
        onProgress(100);
        return { text: result, provider: provider.label };
      }).catch(function (err) {
        console.warn('[Ketor translator] ' + provider.label + ' failed:', err.message || err);
        return tryNext(idx + 1, err);
      });
    };

    return tryNext(0, null);
  }

  Ketor.core.translate = translate;
  Ketor.core.translateMyMemory = translateMyMemory;
  Ketor.core.translateGoogleUnofficial = translateGoogleUnofficial;
  Ketor.core.translateLibreTranslate = translateLibreTranslate;
  Ketor.core.translateApertium = translateApertium;
  Ketor.core.translateCustom = translateCustom;
  Ketor.core.FALLBACK_CHAIN = FALLBACK_CHAIN;

})(window);