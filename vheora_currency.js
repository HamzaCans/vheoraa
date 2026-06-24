/* ========================================
   VHEORA — Currency Conversion Module
   TCMB canlı kurlar (CORS proxy ile)
   ======================================== */

(function() {
  'use strict';

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
  var _ratesTimestamp = 0;
  var _ratesTTL = 3600000;

  var FALLBACK_RATES = { TRY: 1, USD: 46.50, EUR: 52.76, RUB: 0.62, SAR: 12.39, GBP: 61.37 };

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
    return LANG_CURRENCY_MAP[lang] || { code: 'EUR', symbol: '€', locale: 'en-US', name: 'Euro' };
  }

  // ========== TCMB'DEN KURLARI ÇEK ==========
  function fetchRates(callback) {
    if (_rates && (Date.now() - _ratesTimestamp) < _ratesTTL) {
      if (callback) callback(_rates);
      return;
    }

    // 1. Önce backend proxy dene
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/tcmb-rates', true);
    xhr.timeout = 8000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.success && data.rates) {
            _rates = data.rates;
            _ratesTimestamp = Date.now();
            if (callback) callback(_rates);
            return;
          }
        } catch (e) {}
      }
      // Backend başarısız → CORS proxy ile TCMB'den çek
      fetchFromTCMBProxy(callback);
    };
    xhr.onerror = function() { fetchFromTCMBProxy(callback); };
    xhr.ontimeout = function() { fetchFromTCMBProxy(callback); };
    xhr.send();
  }

  // CORS proxy ile TCMB XML çek
  function fetchFromTCMBProxy(callback) {
    var proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.tcmb.gov.tr/kurlar/today.xml');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);
    xhr.timeout = 10000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var rates = parseTCMBXML(xhr.responseText);
          if (rates && Object.keys(rates).length > 1) {
            _rates = rates;
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

  function parseTCMBXML(xml) {
    var rates = { TRY: 1 };
    var regex = /<Currency[^>]*Kod="([^"]+)"[^>]*>([\s\S]*?)<\/Currency>/g;
    var match;
    while ((match = regex.exec(xml)) !== null) {
      var kod = match[1];
      var block = match[2];
      var unitMatch = block.match(/<Unit>(\d+)<\/Unit>/);
      var sellingMatch = block.match(/<ForexSelling>([\d.,]+)<\/ForexSelling>/);
      if (sellingMatch && sellingMatch[1]) {
        var selling = parseFloat(sellingMatch[1].replace(',', '.'));
        var unit = unitMatch ? parseInt(unitMatch[1]) : 1;
        if (selling > 0) rates[kod] = selling / unit;
      }
    }
    return rates;
  }

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

  function onLanguageChange(callback) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.attributeName === 'lang' && callback) callback(getCurrentLang());
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

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
    getRates: function() { return _rates || FALLBACK_RATES; }
  };

  fetchRates(function() {
    setTimeout(updateAllPrices, 500);
  });

})();
