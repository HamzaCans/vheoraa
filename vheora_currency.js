/* ========================================
   VHEORA — Currency Conversion Module
   TCMB canlı kurlar (backend proxy ile)
   ======================================== */

(function() {
  'use strict';

  var API_URL = (function() {
    var isFile = window.location.protocol === 'file:';
    var isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    return (isFile || isLocal) && window.location.port !== '3001' ? 'http://localhost:3001' : '';
  })();

  // ========== DİL → PARA BİRİMİ EŞLEŞTİRMESİ ==========
  var LANG_CURRENCY_MAP = {
    tr: { code: 'TRY', symbol: '₺', locale: 'tr-TR', name: 'Türk Lirası' },
    en: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
    de: { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
    ru: { code: 'RUB', symbol: '₽', locale: 'ru-RU', name: 'Российский рубль' },
    fr: { code: 'EUR', symbol: '€', locale: 'fr-FR', name: 'Euro' },
    ar: { code: 'SAR', symbol: 'ر.س', locale: 'ar-SA', name: 'ريال سعودي' }
  };

  var _rates = null;
  var _ratesDate = '';
  var _ratesTimestamp = 0;
  var _ratesTTL = 3600000; // 1 saat cache

  // Fallback (nadiren kullanılır)
  var FALLBACK_RATES = {
    TRY: 1, USD: 46.50, EUR: 52.76, RUB: 0.62, SAR: 12.39, GBP: 61.37
  };

  // ========== MEVCUT DİLİ AL ==========
  function getCurrentLang() {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim();
      if (c.startsWith('vheora_lang=')) return c.split('=')[1];
    }
    var htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang && LANG_CURRENCY_MAP[htmlLang]) return htmlLang;
    return 'tr';
  }

  function getCurrentCurrency() {
    var lang = getCurrentLang();
    // Haritada varsa o para birimini kullan, yoksa EUR göster
    return LANG_CURRENCY_MAP[lang] || { code: 'EUR', symbol: '€', locale: 'en-US', name: 'Euro' };
  }

  // ========== BACKEND PROXY'DEN KURLARI ÇEK ==========
  // GET /api/tcmb-rates → { success, date, rates: { USD: 46.49, EUR: 52.76, ... } }
  function fetchRates(callback) {
    if (_rates && (Date.now() - _ratesTimestamp) < _ratesTTL) {
      if (callback) callback(_rates);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '/api/tcmb-rates', true);
    xhr.timeout = 8000;

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.success && data.rates) {
            _rates = data.rates;
            _ratesDate = data.date || '';
            _ratesTimestamp = Date.now();
            if (callback) callback(_rates);
            return;
          }
        } catch (e) {}
      }
      // Fallback
      _rates = FALLBACK_RATES;
      _ratesTimestamp = Date.now();
      if (callback) callback(_rates);
    };

    xhr.onerror = function() {
      _rates = FALLBACK_RATES;
      _ratesTimestamp = Date.now();
      if (callback) callback(_rates);
    };

    xhr.ontimeout = function() {
      _rates = FALLBACK_RATES;
      _ratesTimestamp = Date.now();
      if (callback) callback(_rates);
    };

    xhr.send();
  }

  // ========== FİYAT DÖNÜŞTÜR ==========
  // rates: 1 birim = X TRY → fiyatTRY / rate = hedef birim
  function convertPrice(fiyatTRY, targetCurrency) {
    if (!targetCurrency || targetCurrency === 'TRY') return fiyatTRY;
    var rates = _rates || FALLBACK_RATES;
    var rate = rates[targetCurrency];
    if (!rate || rate <= 0) return fiyatTRY;
    return Math.round(fiyatTRY / rate);
  }

  function formatPrice(fiyat, locale) {
    if (!fiyat || fiyat <= 0) return '';
    try { return fiyat.toLocaleString(locale || 'tr-TR'); }
    catch (e) { return fiyat.toLocaleString(); }
  }

  // ========== ANASAYFA FİYAT HTML'İ ==========
  function renderPrice(fiyatTRY, gram) {
    if (!fiyatTRY || fiyatTRY <= 0) return '';
    var c = getCurrentCurrency();
    var converted = convertPrice(fiyatTRY, c.code);
    var formatted = formatPrice(converted, c.locale);
    var html = '<div class="featured-price currency-aware" data-try-price="' + fiyatTRY + '">';
    html += formatted + ' ' + c.symbol;
    if (gram) html += ' <span class="price-gram">(' + gram + 'g)</span>';
    html += '</div>';
    return html;
  }

  // ========== COLLECTION FİYAT HTML'İ ==========
  function renderPriceTag(fiyatTRY, gram) {
    if (!fiyatTRY || fiyatTRY <= 0) return '';
    var c = getCurrentCurrency();
    var converted = convertPrice(fiyatTRY, c.code);
    var formatted = formatPrice(converted, c.locale);
    return '<div class="product-price-tag currency-aware" data-try-price="' + fiyatTRY + '">' +
      '<span class="price-value">' + formatted + '</span>' +
      '<span class="price-currency">' + c.symbol + '</span>' +
      (gram ? '<span class="price-gram">(' + gram + 'g)</span>' : '') +
      '</div>';
  }

  // ========== TÜM FİYATLARI GÜNCELLE ==========
  function updateAllPrices() {
    var c = getCurrentCurrency();
    document.querySelectorAll('.currency-aware[data-try-price]').forEach(function(el) {
      var tryPrice = parseFloat(el.getAttribute('data-try-price'));
      if (!tryPrice || tryPrice <= 0) return;
      var converted = convertPrice(tryPrice, c.code);
      var formatted = formatPrice(converted, c.locale);
      var valueEl = el.querySelector('.price-value');
      var currencyEl = el.querySelector('.price-currency');
      if (valueEl) {
        valueEl.textContent = formatted;
      } else {
        var gram = el.querySelector('.price-gram');
        var gramHTML = gram ? gram.outerHTML : '';
        el.innerHTML = formatted + ' ' + c.symbol + (gramHTML ? ' ' + gramHTML : '');
      }
      if (currencyEl) currencyEl.textContent = c.symbol;
    });
  }

  // ========== DİL DEĞİŞİKLİĞİNİ DİNLE ==========
  function onLanguageChange(callback) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.attributeName === 'lang' && callback) callback(getCurrentLang());
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('vheora:langChange', function(e) {
      if (callback) callback(e.detail ? e.detail.lang : getCurrentLang());
    });
  }

  // ========== GLOBAL ERİŞİM ==========
  window.VheoraCurrency = {
    LANG_CURRENCY_MAP: LANG_CURRENCY_MAP,
    getCurrentLang: getCurrentLang,
    getCurrentCurrency: getCurrentCurrency,
    fetchRates: fetchRates,
    convertPrice: convertPrice,
    formatPrice: formatPrice,
    renderPrice: renderPrice,
    renderPriceTag: renderPriceTag,
    updateAllPrices: updateAllPrices,
    onLanguageChange: onLanguageChange,
    getRates: function() { return _rates || FALLBACK_RATES; },
    getRatesDate: function() { return _ratesDate; }
  };

  // Sayfa yüklenince kurları çek
  fetchRates(function() {
    setTimeout(updateAllPrices, 500);
  });

})();
