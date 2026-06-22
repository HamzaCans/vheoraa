/* ========================================
   VHEORA.CO — Interactive JavaScript
   Animations, Particles & Interactivity
   ======================================== */

const isFile = window.location.protocol === 'file:';const isLocal = ['localhost','127.0.0.1','::1'].includes(window.location.hostname);const API_URL = (isFile || isLocal) && window.location.port !== '3001' ? 'http://localhost:3001' : '';

// ========== BAKIM MODU KONTROLÜ ==========
(function checkMaintenance() {
  var bypass = document.cookie.split(';').find(function(c){ return c.trim().startsWith('vheora_bypass='); });
  if (bypass) return;
  var apiBase = '';
  if (!apiBase) return;
  fetch(apiBase + '/api/settings/public').then(function(r){ return r.json(); }).then(function(d){
    if (d.maintenance_mode === '1') {
      window.location.href = apiBase + '/maintenance.html';
    }
  }).catch(function(){});
})();

// ========== PINCH ZOOM ENGELLE ==========
document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
document.addEventListener('gestureend', function(e) { e.preventDefault(); });

let lastTouchDist = 0;
document.addEventListener('touchstart', function(e) {
  if (e.touches.length === 2) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
  }
}, { passive: false });
document.addEventListener('touchmove', function(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
  }
}, { passive: false });

// ========== SERVICE WORKER REGISTRATION ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js?v=6', { updateViaCache: 'none' }).then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.skipWaiting();
              }
            });
          }
        });
      }).catch(() => {});
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {});
}

// ========== CONFETTI EFFECT ==========
function createConfetti(anchor) {
  const rect = anchor.getBoundingClientRect();
  const colors = ['#d4a853', '#f0c27f', '#b8912e', '#ffffff', '#e8b94a'];
  for (let i = 0; i < 12; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: ${Math.random() * 6 + 3}px;
      height: ${Math.random() * 6 + 3}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '1px'};
      pointer-events: none;
      z-index: 99999;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
    `;
    document.body.appendChild(confetti);
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const x = Math.cos(angle) * velocity;
    const y = Math.sin(angle) * velocity - 80;
    confetti.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${x}px, ${y}px) scale(0.5) rotate(${Math.random() * 360}deg)`, opacity: 0 }
    ], {
      duration: 800 + Math.random() * 400,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    }).onfinish = () => confetti.remove();
  }
}

// ========== LOADING SCREEN (immediate) ==========
(function() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const statusEl = document.getElementById('loaderStatus');
  const statusTexts = [
    'Crafting elegance...',
    'Polishing diamonds...',
    'Setting gemstones...',
    'Forging gold...',
    'Preparing your experience...',
  ];

  if (statusEl) {
    let si = 0;
    const cycleStatus = () => {
      if (si < statusTexts.length) {
        statusEl.textContent = statusTexts[si];
        statusEl.style.opacity = '0';
        requestAnimationFrame(() => { statusEl.style.opacity = '1'; });
        si++;
      }
    };
    cycleStatus();
    const statusInterval = setInterval(() => {
      if (loader.classList.contains('hidden')) {
        clearInterval(statusInterval);
        return;
      }
      cycleStatus();
    }, 600);
    setTimeout(() => { clearInterval(statusInterval); }, 2800);
  }

  // Loader Canvas Particles
  const canvas = document.getElementById('loaderCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let lParticles = [];

    function resizeLoaderCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeLoaderCanvas();
    window.addEventListener('resize', resizeLoaderCanvas);

    class LPart {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2 - 0.1;
        this.opacity = Math.random() * 0.6 + 0.1;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 100;
        const cs = [
          { r: 212, g: 168, b: 83 },
          { r: 240, g: 194, b: 127 },
          { r: 255, g: 255, b: 255 },
        ];
        this.color = cs[Math.floor(Math.random() * cs.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life++;
        this.opacity = Math.max(0, this.opacity - 0.002);
        if (this.life > this.maxLife || this.opacity <= 0) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.fill();
        if (this.size > 1) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.1})`;
          ctx.fill();
        }
      }
    }

    const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 15000) || 20);
    for (let i = 0; i < count; i++) lParticles.push(new LPart());

    function animateLoader() {
      if (loader.classList.contains('hidden')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lParticles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animateLoader);
    }
    animateLoader();
  }

  const hideLoader = () => {
    if (!loader.classList.contains('hidden')) {
      loader.classList.add('hidden');
      setTimeout(() => { loader.style.display = 'none'; }, 800);
    }
  };

  window.addEventListener('load', () => {
    const delay = window.innerWidth <= 768 ? 1000 : 1500;
    setTimeout(hideLoader, delay);
  });

  setTimeout(hideLoader, 3500);
})();

// ========== TOAST NOTIFICATION SYSTEM ==========
function showToast(title, message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✓', error: '✗', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon ${type}">${icons[type] || 'ℹ'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="(function(b){b.parentElement.classList.add('toast-out');setTimeout(()=>b.parentElement.remove(),300)})(this)">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

document.addEventListener('DOMContentLoaded', async () => {

  // ========== LOAD DYNAMIC SITE SETTINGS ==========
  try {
    const res = await fetch(`${API_URL}/api/settings/public`);
    const siteSettings = await res.json();
    if (siteSettings.site_hero_title) {
      const heroTitle = document.querySelector('.hero-title');
      if (heroTitle) heroTitle.innerHTML = siteSettings.site_hero_title;
    }
    if (siteSettings.site_hero_desc) {
      const heroDesc = document.querySelector('.hero-description');
      if (heroDesc) heroDesc.textContent = siteSettings.site_hero_desc;
    }
    if (siteSettings.site_about_text_1) {
      const aboutTexts = document.querySelectorAll('.about-text');
      if (aboutTexts[0]) aboutTexts[0].textContent = siteSettings.site_about_text_1;
    }
    if (siteSettings.site_about_text_2) {
      const aboutTexts = document.querySelectorAll('.about-text');
      if (aboutTexts[1]) aboutTexts[1].textContent = siteSettings.site_about_text_2;
    }
    if (siteSettings.site_stat_country) {
      const statEl = document.querySelector('.stat-item:nth-child(1) .stat-number');
      if (statEl) { statEl.setAttribute('data-count', siteSettings.site_stat_country); statEl.textContent = '0'; }
    }
    if (siteSettings.site_stat_customer) {
      const statEl = document.querySelector('.stat-item:nth-child(2) .stat-number');
      if (statEl) { statEl.setAttribute('data-count', siteSettings.site_stat_customer); statEl.textContent = '0'; }
    }
    if (siteSettings.site_stat_collection) {
      const statEl = document.querySelector('.stat-item:nth-child(3) .stat-number');
      if (statEl) { statEl.setAttribute('data-count', siteSettings.site_stat_collection); statEl.textContent = '0'; }
    }
    if (siteSettings.site_contact_address) {
      const els = document.querySelectorAll('.contact-item-value');
      if (els[0]) els[0].textContent = siteSettings.site_contact_address;
    }
    if (siteSettings.site_contact_email) {
      const els = document.querySelectorAll('.contact-item-value');
      if (els[1]) els[1].textContent = siteSettings.site_contact_email;
    }
    if (siteSettings.site_contact_phone) {
      const els = document.querySelectorAll('.contact-item-value');
      if (els[2]) els[2].textContent = siteSettings.site_contact_phone;
    }
    if (siteSettings.site_contact_hours) {
      const els = document.querySelectorAll('.contact-item-value');
      if (els[3]) els[3].innerHTML = siteSettings.site_contact_hours.replace(/\n/g, '<br>');
    }
    if (siteSettings.site_badge_text) {
      const badge = document.querySelector('.hero-badge');
      if (badge) badge.innerHTML = '<span class="dot"></span> ' + siteSettings.site_badge_text;
    }
  } catch (_) {}

  // ========== DİNAMİK ÖNE ÇIKAN ÜRÜNLER ==========
  async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;
    try {
      const res = await fetch(`${API_URL}/api/products/featured`);
      if (!res.ok) return;
      const products = await res.json();
      if (!products.length) return;
      const catLabels = { yuzuk: 'Yüzük', bileklik: 'Bileklik', kolye: 'Kolye', kupe: 'Küpe', set: 'Set Takı' };
      grid.innerHTML = products.map((p, i) => {
        const img = p.images && p.images.length ? p.images[0] : (p.image ? p.image : '');
        const imgSrc = img.startsWith('data:') || img.startsWith('http') || img.startsWith('/') ? img : API_URL + img;
        const badge = p.badge ? `<span class="product-badge">${p.badge}</span>` : '';
        const catLabel = catLabels[p.category] || p.category;
        const catI18n = `cat.${p.category}`;
        return `
        <div class="product-card reveal staggered" style="--reveal-delay: ${(i + 1) * 0.1}s">
          <div class="product-card-inner">
            <div class="product-image">
              <img class="blur-up" src="${imgSrc}" alt="${p.name}" width="300" height="300" loading="lazy" decoding="async">
              ${badge}
            </div>
            <div class="product-info">
              <div class="product-category" data-i18n="${catI18n}">${catLabel}</div>
              <h3 class="product-name">${p.name}</h3>
              <button class="product-price-btn open-quote" data-product="${p.name}">Teklif Al</button>
            </div>
          </div>
        </div>`;
      }).join('');
      grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
      grid.querySelectorAll('.open-quote').forEach(btn => {
        btn.addEventListener('click', () => {
          const modal = document.getElementById('quoteModal');
          const nameEl = document.getElementById('modalProductName');
          if (modal && nameEl) {
            nameEl.textContent = btn.getAttribute('data-product');
            modal.classList.add('active');
          }
        });
      });
    } catch (_) {}
  }
  loadFeaturedProducts();

  // ========== DİNAMİK SHOWCASE (KAYAN BANT) ==========
  async function loadShowcase() {
    const track = document.getElementById('showcaseTrack');
    if (!track) return;
    try {
      const res = await fetch(`${API_URL}/api/products`);
      if (!res.ok) return;
      const products = await res.json();
      if (!products.length) return;
      const catLabels = { yuzuk: 'Yüzük', bileklik: 'Bileklik', kolye: 'Kolye', kupe: 'Küpe', set: 'Set Takı' };
      function renderItems(items) {
        return items.map(p => {
          const img = p.images && p.images.length ? p.images[0] : (p.image ? p.image : '');
          const imgSrc = img.startsWith('data:') || img.startsWith('http') || img.startsWith('/') ? img : API_URL + img;
          const catLabel = catLabels[p.category] || p.category;
          const catI18n = `cat.${p.category}`;
          return `<div class="showcase-item" data-product="${p.name}">
            <img src="${imgSrc}" alt="${p.name}" width="280" height="340" loading="lazy" decoding="async">
            <div class="showcase-item-overlay">
              <div class="showcase-item-name">${p.name}</div>
              <div class="showcase-item-category" data-i18n="${catI18n}">${catLabel}</div>
            </div>
          </div>`;
        }).join('');
      }
      track.innerHTML = renderItems(products) + renderItems(products);

      track.querySelectorAll('.showcase-item').forEach(item => {
        item.addEventListener('click', () => {
          const name = item.getAttribute('data-product');
          const modal = document.getElementById('quoteModal');
          const nameEl = document.getElementById('modalProductName');
          if (modal && nameEl) {
            nameEl.textContent = name;
            modal.classList.add('active');
          }
        });
      });
    } catch (_) {}
  }
  loadShowcase();

  // Showcase arrow navigation + auto-scroll
  const showcaseTrack = document.getElementById('showcaseTrack');
  const showcaseLeft = document.getElementById('showcaseLeft');
  const showcaseRight = document.getElementById('showcaseRight');
  let showcasePos = 0;
  let showcaseSpeed = 1;
  if (showcaseTrack && showcaseLeft && showcaseRight) {
    let showcaseAnimId = null;
    const itemWidth = 320;

    function autoScrollShowcase() {
      showcasePos -= showcaseSpeed;
      const maxScroll = showcaseTrack.scrollWidth / 2;
      if (Math.abs(showcasePos) >= maxScroll) showcasePos = 0;
      showcaseTrack.style.transform = `translateX(${showcasePos}px)`;
      showcaseAnimId = requestAnimationFrame(autoScrollShowcase);
    }
    autoScrollShowcase();

    showcaseLeft.addEventListener('click', () => {
      showcasePos += itemWidth;
      showcaseTrack.style.transform = `translateX(${showcasePos}px)`;
    });
    showcaseRight.addEventListener('click', () => {
      showcasePos -= itemWidth;
      showcaseTrack.style.transform = `translateX(${showcasePos}px)`;
    });

    showcaseTrack.parentElement.addEventListener('mouseenter', () => {
      showcaseSpeed = 0;
    });
    showcaseTrack.parentElement.addEventListener('mouseleave', () => {
      showcaseSpeed = 1;
    });
  }

  // ========== CANLI ALTIN FİYATİ ==========
  let currentGoldPrice = 0;

  async function fetchGoldPrice() {
    try {
      const res = await fetch(`${API_URL}/api/gold-price`);
      if (!res.ok) return;
      const data = await res.json();
      currentGoldPrice = data.hasAltin || 0;
      const tickerVal = document.getElementById('goldTickerValue');
      const tickerSrc = document.getElementById('goldTickerSource');
      if (tickerVal && currentGoldPrice > 0) {
        tickerVal.textContent = currentGoldPrice.toLocaleString('tr-TR');
        if (tickerSrc && data.source) tickerSrc.textContent = data.source;
      }
      document.querySelectorAll('.calc-gold-price').forEach(el => {
        const gram = parseFloat(el.getAttribute('data-gram'));
        const laborCost = parseInt(el.getAttribute('data-labor-cost')) || 2500;
        if (gram && currentGoldPrice > 0) {
          const fiyat = Math.round((currentGoldPrice + laborCost) * gram);
          el.textContent = fiyat.toLocaleString('tr-TR') + ' ₺';
        }
      });
    } catch (_) {}
  }

  fetchGoldPrice();
  setInterval(fetchGoldPrice, 60000);

  // ========== NAVBAR SCROLL EFFECT & SCROLL SPY ==========
  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementById('navLinks');
  const mainNavLinks = navLinks
    ? navLinks.querySelectorAll('a:not(.nav-cta):not(.lang-dropdown a)')
    : [];
  const navSectionIds = ['hero', 'about', 'services', 'collection', 'testimonials', 'contact'];

  function getNavOffset() {
    return navbar ? navbar.offsetHeight + 16 : 88;
  }

  function syncNavOffset() {
    const offset = getNavOffset();
    document.documentElement.style.setProperty('--nav-offset', `${offset}px`);
    return offset;
  }

  function updateActiveNavLink() {
    const offset = syncNavOffset();
    const scrollPos = window.pageYOffset + offset + 4;
    let activeId = navSectionIds[0];

    navSectionIds.forEach(id => {
      const section = document.getElementById(id);
      if (section && section.offsetTop <= scrollPos) {
        activeId = id;
      }
    });

    mainNavLinks.forEach(link => {
      link.classList.toggle('active-link', link.getAttribute('href') === `#${activeId}`);
    });
  }

  let scrollTicking = false;

  const navProgress = document.getElementById('navProgress');

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Scroll progress bar
    if (navProgress) {
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = scrollHeight > 0 ? (currentScroll / scrollHeight) * 100 : 0;
      navProgress.style.width = `${Math.min(progress, 100)}%`;
    }

    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        updateActiveNavLink();
        scrollTicking = false;
      });
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    syncNavOffset();
    updateActiveNavLink();
  });

  syncNavOffset();
  updateActiveNavLink();

  // ========== MOBILE MENU ==========
  const menuToggle = document.getElementById('menuToggle');
  const navOverlay = document.getElementById('navOverlay');

  function setMobileMenu(open) {
    if (menuToggle) menuToggle.classList.toggle('active', open);
    if (navLinks) navLinks.classList.toggle('active', open);
    if (navOverlay) navOverlay.classList.toggle('active', open);
    document.body.classList.toggle('menu-open', open);
    if (menuToggle) menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (navOverlay) navOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  function closeMobileMenu() {
    setMobileMenu(false);
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      setMobileMenu(!navLinks.classList.contains('active'));
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', closeMobileMenu);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks && navLinks.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  // Close mobile menu on main link click (but not on language selector)
  if (navLinks) {
    navLinks.querySelectorAll('a:not(.lang-dropdown a)').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  // ========== SMOOTH SCROLL ==========
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      // Ignore if href is just "#" or empty
      if (href === '#' || href === '') return;

      e.preventDefault();
      try {
        const target = document.querySelector(href);
        if (target) {
          const top = target.getBoundingClientRect().top + window.pageYOffset - getNavOffset();
          window.scrollTo({ top, behavior: 'smooth' });
          closeMobileMenu();
        }
      } catch (err) {
        // scroll target not found
      }
    });
  });

  // ========== SCROLL REVEAL ANIMATIONS ==========
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate, .reveal-blur, .line-draw, .char-rise');

  // ========== SHARE EXPERIENCE FORM ==========
  const shareForm = document.getElementById('shareForm');
  if (shareForm) {
    shareForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = shareForm.querySelector('.form-submit');
      const originalText = submitBtn.innerHTML;
      
      submitBtn.innerHTML = '<span>⌛ Yorumunuz Gönderiliyor...</span>';
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_URL}/api/testimonial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${document.getElementById('revFirstName').value} ${document.getElementById('revLastName').value}`,
            location: `${document.getElementById('revCountry').value}, ${document.getElementById('revCity').value}`,
            text: document.getElementById('revComment').value
          })
        });

        if (res.ok) {
          submitBtn.innerHTML = '<span>✓ Teşekkürler! Yorumunuz onaydan sonra yayınlanacak.</span>';
          submitBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
          shareForm.reset();
          showToast('Teşekkürler!', 'Yorumunuz onaydan sonra yayınlanacak.', 'success');
        } else {
          const data = await res.json();
          showToast('Hata', data.error || 'Bir hata oluştu', 'error');
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
          return;
        }
      } catch (err) {
        showToast('Bağlantı Hatası', 'Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
        return;
      }

      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 3000);
    });
  }


  // Staggered reveal for grid children
  document.querySelectorAll('.services-grid, .featured-grid, .about-stats, .testimonials-grid').forEach(grid => {
    const items = grid.querySelectorAll('.reveal, .reveal-rotate, .reveal-blur');
    items.forEach((item, i) => {
      item.style.setProperty('--reveal-delay', `${i * 0.1}s`);
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // Immediately reveal elements already in viewport on load
  requestAnimationFrame(() => {
    revealElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('revealed');
        revealObserver.unobserve(el);
      }
    });
  });

  // MutationObserver for dynamically added reveal elements (collection page)
  const domObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const revealSel = '.reveal:not(.revealed), .reveal-left:not(.revealed), .reveal-right:not(.revealed), .reveal-scale:not(.revealed), .reveal-rotate:not(.revealed), .reveal-blur:not(.revealed), .line-draw:not(.revealed), .char-rise:not(.revealed)';
        if (node.matches && node.matches(revealSel)) revealObserver.observe(node);
        if (node.querySelectorAll) {
          node.querySelectorAll(revealSel).forEach(el => revealObserver.observe(el));
        }
      });
    });
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  // ========== PARALLAX SCROLL EFFECTS ==========
  if (window.innerWidth > 768) {
    const parallaxElements = document.querySelectorAll('.about-visual, .hero-visual, .about-image-accent');
    let parallaxTicking = false;

    window.addEventListener('scroll', () => {
      if (!parallaxTicking) {
        requestAnimationFrame(() => {
          const scrollY = window.pageYOffset;
          parallaxElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              const speed = parseFloat(el.getAttribute('data-parallax-speed') || '0.08');
              const yOffset = (rect.top - window.innerHeight / 2) * speed;
              el.style.transform = el.classList.contains('revealed') 
                ? `translateY(${yOffset}px)` 
                : '';
            }
          });
          parallaxTicking = false;
        });
        parallaxTicking = true;
      }
    }, { passive: true });
  }

  // ========== COUNTER ANIMATION ==========
  const statNumbers = document.querySelectorAll('.stat-number[data-count]');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'));
        if (!isNaN(target)) {
          animateCounter(el, target);
        }
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => counterObserver.observe(el));

  function animateCounter(el, target) {
    if (target <= 0) {
      el.textContent = '0+';
      return;
    }

    el.classList.add('counting');
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
        el.classList.remove('counting');
      }

      if (target >= 1000) {
        el.textContent = Math.floor(current).toLocaleString() + '+';
      } else {
        el.textContent = Math.floor(current) + '+';
      }
    }, 16);
  }

  // ========== 3D TILT ON PRODUCT CARDS ==========
  const tiltCards = document.querySelectorAll('.product-card');
  const isTouchDevice3 = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (!isTouchDevice3) {
    tiltCards.forEach(card => {
      const inner = card.querySelector('.product-card-inner');
      if (!inner) return;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        inner.style.transform = `translateY(-8px) perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
        card.style.setProperty('--mouse-x', `${(e.clientX - rect.left) / rect.width * 100}%`);
        card.style.setProperty('--mouse-y', `${(e.clientY - rect.top) / rect.height * 100}%`);
      });

      card.addEventListener('mouseleave', () => {
        inner.style.transform = '';
      });
    });
  }

  // ========== HERO PARTICLE CANVAS (Enhanced) ==========
  const canvas = document.getElementById('heroCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrame;
    let mouseXP = -1000, mouseYP = -1000;
    let mouseActive = false;

    function resizeCanvas() {
      const hero = document.querySelector('.hero');
      if (hero) {
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
      }
    }

    resizeCanvas();
    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    // Track mouse for interaction
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseXP = e.clientX - rect.left;
      mouseYP = e.clientY - rect.top;
      mouseActive = true;
    });

    canvas.addEventListener('mouseleave', () => {
      mouseActive = false;
    });

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * (canvas.width || 800);
        this.y = Math.random() * (canvas.height || 600);
        this.size = Math.random() * 2.5 + 0.5;
        this.baseSize = this.size;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
        this.fadeSpeed = Math.random() * 0.005 + 0.002;

        const colors = [
          { r: 212, g: 168, b: 83 },
          { r: 240, g: 194, b: 127 },
          { r: 255, g: 255, b: 255 },
          { r: 184, g: 145, b: 46 },
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.isStar = Math.random() < 0.08;
        this.angle = Math.random() * Math.PI * 2;
        this.sparklePhase = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity += this.fadeDirection * this.fadeSpeed;

        if (this.opacity >= 0.6) this.fadeDirection = -1;
        if (this.opacity <= 0.05) this.fadeDirection = 1;

        // Mouse interaction: gentle attraction/repulsion
        if (mouseActive) {
          const dx = this.x - mouseXP;
          const dy = this.y - mouseYP;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 0) {
            const force = (200 - dist) / 200 * 0.02;
            this.x += dx / dist * force;
            this.y += dy / dist * force;
            this.size = this.baseSize + (200 - dist) / 200 * 1.5;
          } else {
            this.size += (this.baseSize - this.size) * 0.05;
          }
        } else {
          this.size += (this.baseSize - this.size) * 0.05;
        }

        this.angle += 0.005;
        this.sparklePhase += 0.03;

        if (this.x < -20) this.x = canvas.width + 20;
        if (this.x > canvas.width + 20) this.x = -20;
        if (this.y < -20) this.y = canvas.height + 20;
        if (this.y > canvas.height + 20) this.y = -20;
      }

      draw() {
        const sparkle = 0.7 + 0.3 * Math.sin(this.sparklePhase);
        const drawOpacity = this.opacity * sparkle;

        if (this.isStar && this.size > 1.5) {
          this.drawStar(drawOpacity);
        } else {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${drawOpacity})`;
          ctx.fill();

          if (this.size > 1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${drawOpacity * 0.12})`;
            ctx.fill();
          }
        }
      }

      drawStar(opacity) {
        const spikes = 4;
        const outerR = this.size * 2.5;
        const innerR = this.size * 0.8;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / spikes - Math.PI / 2 + this.angle;
          const x = this.x + Math.cos(angle) * r;
          const y = this.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${opacity})`;
        ctx.fill();
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${opacity * 0.5})`;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function initParticles() {
      particles = [];
      const isMobile = window.innerWidth <= 768;
      const density = isMobile ? 25000 : 12000;
      const maxCount = isMobile ? 35 : 80;
      const particleCount = Math.min(maxCount, Math.floor((canvas.width * canvas.height) / density) || (isMobile ? 20 : 40));
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }
    
    initParticles();

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 168, 83, ${(1 - dist / 120) * 0.06})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrame = requestAnimationFrame(animateParticles);
    }

    animateParticles();

    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animationFrame) animateParticles();
        } else {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
      });
    }, { threshold: 0.1 });

    const heroSec = document.querySelector('.hero');
    if (heroSec) heroObserver.observe(heroSec);
  }

  // ========== CONTACT FORM ==========
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('.form-submit');
      const originalText = submitBtn.innerHTML;
      
      submitBtn.innerHTML = '<span>⌛ Gönderiliyor...</span>';
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_URL}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value || 'Genel İletişim',
            message: document.getElementById('message').value
          })
        });

        const data = await res.json();

        if (res.ok) {
          submitBtn.classList.add('success');
          submitBtn.innerHTML = '<span>✓ Mesajınız alındı!</span>';
          submitBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
          contactForm.reset();
          showToast('Mesajınız Alındı', 'Size en kısa sürede dönüş yapacağız.', 'success');
          // Confetti effect
          createConfetti(submitBtn);
        } else {
          showToast('Hata', data.error || 'Bir hata oluştu', 'error');
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
          return;
        }
      } catch (err) {
        showToast('Bağlantı Hatası', 'Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
        return;
      }

      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 3000);
    });
  }

  // ========== TESTIMONIALS SLIDER (Random realistic generation) ==========
  const testimonialGrid = document.getElementById('testimonialGrid');
  if (testimonialGrid) {
    const maleNames = ['Ahmet', 'Mehmet', 'Ali', 'Can', 'Emre', 'Burak', 'Kerem', 'Ozan', 'Deniz', 'Mert', 'Efe', 'Onur', 'Serkan', 'Kaan', 'Tolga', 'Fatih', 'Murat', 'Hakan', 'Cem', 'Barış', 'Utku', 'Alp', 'Eren', 'Yiğit', 'Arda'];
    const femaleNames = ['Zeynep', 'Elif', 'Ayşe', 'Fatma', 'Merve', 'Derya', 'Sibel', 'Gizem', 'İrem', 'Buse', 'Ebru', 'Aslı', 'Cansu', 'Nazlı', 'Sena', 'Defne', 'Lale', 'Pınar', 'Özge', 'Burcu', 'Aylin', 'Ece', 'Deniz', 'Yasemin', 'Seda'];
    const internationalMale = ['James', 'Michael', 'David', 'Daniel', 'Alexander', 'Lukas', 'Marco', 'Pierre', 'Hugo', 'Thomas', 'William', 'Oliver', 'Felix', 'Noah', 'Leon', 'Maximilian'];
    const internationalFemale = ['Sarah', 'Emily', 'Sophie', 'Emma', 'Olivia', 'Anna', 'Marie', 'Laura', 'Julia', 'Isabella', 'Charlotte', 'Amelia', 'Mia', 'Lea', 'Hannah', 'Johanna'];
    const internationalLast = ['Anderson', 'Smith', 'Wilson', 'Taylor', 'Brown', 'Miller', 'Jones', 'Davis', 'García', 'Martínez', 'Müller', 'Schmidt', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Rossi', 'Russo', 'Ferrari', 'Bianchi'];

    const trCities = [
      'İstanbul, Nişantaşı', 'İstanbul, Bebek', 'İstanbul, Kadıköy', 'İstanbul, Etiler', 'İstanbul, Bağdat Caddesi',
      'Ankara, Çankaya', 'Ankara, Kızılay', 'Ankara, Bilkent', 'İzmir, Alsancak', 'İzmir, Karşıyaka',
      'Antalya, Lara', 'Antalya, Konyaaltı', 'Bodrum, Yalıkavak', 'Bodrum, Türkbükü', 'Çeşme, Alaçatı',
      'Muğla, Fethiye', 'Bursa, Nilüfer', 'Eskişehir, Tepebaşı', 'Trabzon, Ortahisar', 'Gaziantep, Şahinbey'
    ];
    const intCities = [
      'London, Chelsea', 'London, Mayfair', 'Paris, Champs-Élysées', 'Paris, Le Marais',
      'New York, Manhattan', 'New York, Brooklyn', 'Milan, Brera', 'Milan, Montenapoleone',
      'Dubai, Downtown', 'Dubai, Marina', 'Berlin, Mitte', 'Munich, Schwabing',
      'Zurich, Bahnhofstrasse', 'Geneva, Eaux-Vives', 'Vienna, Innere Stadt', 'Rome, Trastevere',
      'Barcelona, Eixample', 'Madrid, Salamanca', 'Amsterdam, Jordaan', 'Stockholm, Östermalm',
      'Oslo, Frogner', 'Copenhagen, Frederiksberg', 'Helsinki, Eira', 'Tokyo, Ginza',
      'Seoul, Gangnam', 'Singapore, Orchard', 'Sydney, Darlinghurst', 'Los Angeles, Beverly Hills'
    ];

    const commentTemplates = [
      { tr: 'Nişan yüzüğümüzü buradan aldık, parmağımdaki ışıltısı her gün beni mutlu ediyor. İşçilik gerçekten çok ince.', en: 'We bought our engagement ring here, the sparkle on my finger makes me happy every day.' },
      { tr: 'Eşim için özel bir hediye yaptırdık, kutusunu açtığı anki mutluluğu paha biçilemezdi.', en: 'We had a special gift made for my spouse, the joy when opening the box was priceless.' },
      { tr: 'Bileklik tam zamanında yetişti. Zarif ve modern duruşuyla her kıyafete uyum sağlıyor.', en: 'The bracelet arrived just in time. Its elegant and modern look complements every outfit.' },
      { tr: 'Kolyedeki detaylar harika, her gün kullanıyorum ve ilk günkü gibi parlak.', en: 'The details on the necklace are amazing, I wear it every day and it shines like the first day.' },
      { tr: 'İşçilik gerçekten büyüleyici. Daha önce hiç bu kadar kaliteli bir takı görmemiştim.', en: 'The craftsmanship is truly mesmerizing. I have never seen such high quality jewelry before.' },
      { tr: 'Yıldönümü hediyesi olarak aldık, eşim çok mutlu oldu. Teşekkürler VHEORA!', en: 'We got it as an anniversary gift, my spouse was overjoyed. Thank you VHEORA!' },
      { tr: 'Siparişim çok hızlı geldi ve paketleme mükemmeldi. Kesinlikle tavsiye ederim.', en: 'My order arrived very fast and the packaging was perfect. I highly recommend it.' },
      { tr: 'Küpeleri anneme hediye ettim, çok beğendi. Zarif tasarımlarınızı çok seviyorum.', en: 'I gifted the earrings to my mother, she loved them. I adore your elegant designs.' },
      { tr: 'Özel tasarım yüzük hayalimdeki gibi oldu. İlginiz ve profesyonelliğiniz için teşekkürler.', en: 'The custom-designed ring turned out exactly as I dreamed. Thanks for your interest and professionalism.' },
      { tr: 'Uzun zamandır bu kadar kaliteli bir takı görmemiştim. Herkese gönül rahatlığıyla öneriyorum.', en: 'I haven\'t seen such quality jewelry in a long time. I confidently recommend it to everyone.' },
      { tr: 'Doğum günümde kendime hediye ettim, kesinlikle değdi. Her bakışta içim açılıyor.', en: 'I treated myself for my birthday, it was totally worth it. It brightens my mood every time I look at it.' },
      { tr: 'Düğün setimizi VHEORA\'dan aldık, herkes çok beğendi. Kaliteniz daim olsun.', en: 'We got our wedding set from VHEORA, everyone loved it. May your quality always remain.' },
      { tr: 'İnternetten takı almakta tereddüt etmiştim ama bu deneyim beklentimin çok üstündeydi.', en: 'I was hesitant about buying jewelry online, but this experience exceeded my expectations.' },
      { tr: 'Sevgilime aldığım hediye sayenizde unutulmaz oldu. Tasarımlarınız gerçekten özel.', en: 'The gift I got for my significant other became unforgettable thanks to you. Your designs are truly special.' },
      { tr: 'Sağlam ve şık bir ürün. Her gün kullanıyorum, hiçbir kararma olmadı.', en: 'Durable and stylish product. I use it every day, no tarnishing at all.' },
      { tr: 'Müşteri hizmetleriniz çok ilgiliydi, tüm sorularımı cevapladılar. Güvenilir bir marka.', en: 'Your customer service was very attentive, they answered all my questions. A trustworthy brand.' },
      { tr: 'Yurt dışına sipariş verdim, vergi ve kargo süreci hakkında çok yardımcı oldular.', en: 'I ordered from abroad, they were very helpful about taxes and shipping.' },
      { tr: 'Kolyeyi ilk taktığımda herkes nereden aldığımı sordu. Kesinlikle farklı bir kalite.', en: 'When I first wore the necklace, everyone asked where I got it. Definitely a different level of quality.' },
      { tr: 'Ürün görsellerdeki gibi çıktı, hatta daha güzeldi. Çok memnun kaldım.', en: 'The product looked just like the photos, even more beautiful. I am very satisfied.' },
      { tr: 'Annem için özel bir hediye yaptırdık, kutusunu açtığı anki mutluluğu paha biçilemezdi. Gerçekten işinin ehli bir ekip.', en: 'We had a special gift made for my mother, the joy when she opened the box was priceless. A truly skilled team.' }
    ];

    function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function generateTestimonials(count = 6) {
      const result = [];
      for (let i = 0; i < count; i++) {
        const isTurkish = Math.random() < 0.55;
        const isMale = Math.random() < 0.5;
        let name, location;
        if (isTurkish) {
          name = isMale ? randomItem(maleNames) : randomItem(femaleNames);
          location = randomItem(trCities);
        } else {
          const first = isMale ? randomItem(internationalMale) : randomItem(internationalFemale);
          const last = randomItem(internationalLast);
          name = `${first} ${last}`;
          location = randomItem(intCities);
        }
        const template = randomItem(commentTemplates);
        const text = isTurkish ? template.tr : template.en;
        const rating = 5;
        result.push({ name, location, text, rating });
      }
      return result;
    }

    async function loadTestimonials() {
      try {
        const res = await fetch(`${API_URL}/api/testimonials`);
        const data = await res.json();
        let items = Array.isArray(data) ? data : [];
        if (items.length < 3) {
          items = [...items, ...generateTestimonials(6 - items.length)];
        }
        items = items.slice(0, 6);

        testimonialGrid.innerHTML = items.map(t => `
          <div class="testimonial-card">
            <div class="testimonial-stars">${'★'.repeat(t.rating || 5)}${'☆'.repeat(5 - (t.rating || 5))}</div>
            <p class="testimonial-text">${t.text}</p>
            <div class="testimonial-author">
              <div class="testimonial-avatar">${t.name.charAt(0)}</div>
              <div>
                <div class="testimonial-name">${t.name}</div>
                <div class="testimonial-location">${t.location || ''}</div>
              </div>
            </div>
          </div>
        `).join('');

        initSlider();
      } catch (err) {
        const fallback = generateTestimonials(6);
        testimonialGrid.innerHTML = fallback.map(t => `
          <div class="testimonial-card">
            <div class="testimonial-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
            <p class="testimonial-text">${t.text}</p>
            <div class="testimonial-author">
              <div class="testimonial-avatar">${t.name.charAt(0)}</div>
              <div>
                <div class="testimonial-name">${t.name}</div>
                <div class="testimonial-location">${t.location}</div>
              </div>
            </div>
          </div>
        `).join('');
        initSlider();
      }
    }

    loadTestimonials();

    function initSlider() {
      const prevBtn = document.getElementById('prevTestimonial');
      const nextBtn = document.getElementById('nextTestimonial');
      const pagesContainer = document.getElementById('testimonialPages');
      const cards = testimonialGrid.querySelectorAll('.testimonial-card');
      const totalCards = cards.length;
      const perPage = 2;
      const totalPages = Math.ceil(totalCards / perPage);
      let currentPage = 0;

      function getVisible() {
        if (window.innerWidth > 1024) return 3;
        return 2;
      }

      function renderPages() {
        const visible = getVisible();
        const pages = Math.ceil(totalCards / visible);
        testimonialGrid.innerHTML = '';
        for (let i = currentPage * visible; i < Math.min((currentPage + 1) * visible, totalCards); i++) {
          testimonialGrid.appendChild(cards[i]);
        }
        if (pagesContainer) {
          pagesContainer.innerHTML = '';
          for (let p = 0; p < pages; p++) {
            const dot = document.createElement('button');
            dot.className = 'testimonial-dot' + (p === currentPage ? ' active' : '');
            dot.setAttribute('aria-label', 'Sayfa ' + (p + 1));
            dot.addEventListener('click', () => { currentPage = p; renderPages(); });
            pagesContainer.appendChild(dot);
          }
        }
      }

      nextBtn.addEventListener('click', () => {
        const visible = getVisible();
        const pages = Math.ceil(totalCards / visible);
        currentPage = (currentPage + 1) % pages;
        renderPages();
      });

      prevBtn.addEventListener('click', () => {
        const visible = getVisible();
        const pages = Math.ceil(totalCards / visible);
        currentPage = (currentPage - 1 + pages) % pages;
        renderPages();
      });

      let touchStartX = 0;
      testimonialGrid.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      testimonialGrid.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].screenX;
        if (Math.abs(diff) < 50) return;
        if (diff > 0) nextBtn.click();
        else prevBtn.click();
      }, { passive: true });

      window.addEventListener('resize', renderPages);
      renderPages();
    }
  }

  // ========== PARALLAX ON MOUSE MOVE (Hero) ==========
  const heroVisual = document.querySelector('.hero-visual');
  const heroSection = document.querySelector('.hero');

  // Skip heavy hero parallax on touch devices
  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (heroSection && heroVisual && !isTouchDevice) {
    heroSection.addEventListener('mousemove', (e) => {
      if (window.innerWidth < 768) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      heroVisual.style.transition = 'none'; // Remove transition during move for performance
      heroVisual.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
    });

    heroSection.addEventListener('mouseleave', () => {
      heroVisual.style.transition = 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
      heroVisual.style.transform = 'translate(0, 0)';
    });
  }

  // ========== IMAGE LAZY LOADING WITH BLUR-UP ==========
  function initBlurUp(img) {
    if (img.classList.contains('loaded')) return;
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
      img.addEventListener('error', () => img.classList.add('loaded'));
    }
  }

  // Apply to existing images
  document.querySelectorAll('img.blur-up').forEach(initBlurUp);

  // MutationObserver for dynamically added images (collection page, etc.)
  const blurUpObserver = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.tagName === 'IMG' && node.classList.contains('blur-up')) initBlurUp(node);
          if (node.querySelectorAll) node.querySelectorAll('img.blur-up').forEach(initBlurUp);
        }
      });
    });
  });
  blurUpObserver.observe(document.body, { childList: true, subtree: true });

  // ========== CUSTOM i18n TRANSLATION SYSTEM ==========
  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');
  const SUPPORTED_LANGS = ['tr', 'en', 'de', 'ru', 'fr', 'ar'];
  let currentTranslations = {};
  let currentLang = 'tr';

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + (days || 365) * 864e5).toUTCString();
    document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
  }

  async function loadTranslations(lang) {
    if (lang === 'tr') {
      currentTranslations = {};
      currentLang = 'tr';
      applyTranslations();
      document.documentElement.setAttribute('lang', 'tr');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/translations/${lang}`);
      if (!res.ok) throw new Error('Failed');
      currentTranslations = await res.json();
      currentLang = lang;
      applyTranslations();
      document.documentElement.setAttribute('lang', lang);
    } catch (e) {
      currentTranslations = {};
      currentLang = 'tr';
      applyTranslations();
    }
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (currentLang === 'tr') {
        if (el.hasAttribute('data-i18n-original')) {
          el.textContent = el.getAttribute('data-i18n-original');
          el.removeAttribute('data-i18n-original');
        }
      } else if (currentTranslations[key]) {
        if (!el.hasAttribute('data-i18n-original')) {
          el.setAttribute('data-i18n-original', el.textContent);
        }
        el.textContent = currentTranslations[key];
      }
    });
  }

  function detectAndApplyBrowserLanguage() {
    const saved = getCookie('vheora_lang');
    if (saved) return;
    const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage || ''];
    for (let i = 0; i < browserLangs.length; i++) {
      const code = browserLangs[i].toLowerCase().split('-')[0].split('_')[0];
      if (SUPPORTED_LANGS.includes(code) && code !== 'tr') {
        setCookie('vheora_lang', code);
        updateLangUI(code);
        loadTranslations(code);
        return;
      }
    }
  }

  function updateLangUI(lang) {
    if (!langBtn) return;
    const labels = { tr: 'TR', en: 'EN', de: 'DE', ru: 'RU', fr: 'FR', ar: 'AR' };
    langBtn.innerHTML = `🌐 ${labels[lang] || 'TR'}`;
  }

  function changeLanguage(lang) {
    setCookie('vheora_lang', lang);
    updateLangUI(lang);
    loadTranslations(lang);
  }

  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      langDropdown.classList.remove('active');
    });

    langDropdown.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedLang = item.getAttribute('data-lang');
        langDropdown.classList.remove('active');
        changeLanguage(selectedLang);
      });
    });
  }

  // Init saved language
  const savedLang = getCookie('vheora_lang');
  if (savedLang && savedLang !== 'tr') {
    updateLangUI(savedLang);
    loadTranslations(savedLang);
  }
  detectAndApplyBrowserLanguage();

  // ========== BUTTON RIPPLE EFFECT ==========
  document.querySelectorAll('.btn-primary, .btn-secondary, .form-submit, .btn-quote-submit').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // ========== SUPPORT MODAL ==========
  const supportContent = {
    sss: {
      title: 'Sıkça Sorulan Sorular',
      icon: `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="rgb(212,168,83)" stroke-width="2.5" opacity="0.3"/><circle cx="32" cy="32" r="18" stroke="rgb(212,168,83)" stroke-width="2" opacity="0.5"/><circle cx="32" cy="22" r="2" fill="rgb(212,168,83)"/><path d="M32 28v14" stroke="rgb(212,168,83)" stroke-width="3" stroke-linecap="round"/></svg>`,
      html: `<div class="sss-list">
        <div class="sss-item"><button class="sss-question">Siparişimi nasıl takip edebilirim?<span class="sss-icon">▼</span></button><div class="sss-answer">Siparişiniz kargoya verildikten sonra e-posta ve SMS ile bir takip numarası alırsınız. Bu numara ile kargo firmasının web sitesinden siparişinizi anlık olarak takip edebilirsiniz.</div></div>
        <div class="sss-item"><button class="sss-question">Hangi ödeme yöntemlerini kabul ediyorsunuz?<span class="sss-icon">▼</span></button><div class="sss-answer">Kredi kartı (Visa, Mastercard), banka havalesi ve EFT kabul ediyoruz. Tüm kredi kartı işlemleriniz 256-bit SSL sertifikası ile korunmaktadır.</div></div>
        <div class="sss-item"><button class="sss-question">Uluslararası sipariş veriyorum, gümrük vergisi var mı?<span class="sss-icon">▼</span></button><div class="sss-answer">Evet, uluslararası siparişlerde alıcının bulunduğu ülkenin gümrük politikasına bağlı olarak ek vergiler uygulanabilir. Bu vergiler sipariş tutarına dahil değildir ve alıcıya aittir. Sipariş öncesi ülkenizin gümrük koşullarını kontrol etmenizi öneririz.</div></div>
        <div class="sss-item"><button class="sss-question">Hediye paketi seçeneğiniz var mı?<span class="sss-icon">▼</span></button><div class="sss-answer">Evet, tüm siparişleriniz VHEORA imzalı lüks hediye kutusu, kesecik ve sertifika ile gönderilir. Özel gün kartı eklenmesini isterseniz sipariş notunda belirtebilirsiniz.</div></div>
        <div class="sss-item"><button class="sss-question">Teslimat süresi ne kadar?<span class="sss-icon">▼</span></button><div class="sss-answer">Türkiye içi siparişlerde teslimat 3-7 iş günü, uluslararası siparişlerde ise 7-14 iş günü arasındadır. Özel tasarım siparişlerde bu süre değişiklik gösterebilir.</div></div>
        <div class="sss-item"><button class="sss-question">Ürünlerinizin garantisi var mı?<span class="sss-icon">▼</span></button><div class="sss-answer">Tüm ürünlerimiz 2 yıl işçilik garantisi ile gelmektedir. Garanti belgeniz ürününüzle birlikte gönderilir. Üretim hatası durumunda ürününüzü ücretsiz olarak onarıyoruz.</div></div>
        <div class="sss-item"><button class="sss-question">Özel tasarım yaptırmak istiyorum, nasıl iletişime geçebilirim?<span class="sss-icon">▼</span></button><div class="sss-answer">Koleksiyon sayfamızdaki herhangi bir üründe "Teklif Al" butonuna tıklayarak WhatsApp veya e-posta yoluyla bize ulaşabilirsiniz. Tasarım ekibimiz size en kısa sürede dönüş yapacaktır.</div></div>
      </div>`
    },
    kargo: {
      title: 'Kargo & İade',
      icon: `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="24" width="40" height="26" rx="3" stroke="rgb(212,168,83)" stroke-width="2" fill="rgba(212,168,83,0.06)"/><path d="M46 30h10l-4 10h-6" stroke="rgb(212,168,83)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="44" r="4" stroke="rgb(212,168,83)" stroke-width="2" fill="rgba(212,168,83,0.1)"/><circle cx="38" cy="44" r="4" stroke="rgb(212,168,83)" stroke-width="2" fill="rgba(212,168,83,0.1)"/><path d="M16 24V14h12l4 10" stroke="rgb(212,168,83)" stroke-width="2" stroke-linecap="round"/></svg>`,
      html: `<div class="kargo-grid">
        <div class="kargo-card"><h4>🚚 Türkiye İçi Kargo</h4><p>3-7 iş günü içinde teslimat. 5.000 TL ve üzeri alışverişlerde kargo ücretsizdir.</p></div>
        <div class="kargo-card"><h4>✈️ Uluslararası Kargo</h4><p>DHL/FedEx ile 7-14 iş günü. Global gönderimlerde takip numarası e-posta ile paylaşılır.</p></div>
        <div class="kargo-card"><h4>📦 Paketleme</h4><p>Takı kutunuz çift katlı korumalı ambalajda, sertifikası ile birlikte gönderilir.</p></div>
        <div class="kargo-card"><h4>📋 Sigorta</h4><p>Tüm gönderilerimiz sigortalıdır. Size ulaşana kadar her adımda güvendesiniz.</p></div>
      </div>
      <h3>İade Koşulları</h3>
      <ul class="iade-list">
        <li>Ürün teslim tarihinden itibaren 30 gün içinde iade yapabilirsiniz.</li>
        <li>İade edilecek ürünün orijinal kutusu, sertifikası ve tüm aksesuarları eksiksiz olmalıdır.</li>
        <li>Özel tasarım ve kişiye özel ürünlerde iade kabul edilmemektedir.</li>
        <li>İade sürecini başlatmak için bizimle iletişime geçmeniz yeterlidir, size iade talimatlarını göndeririz.</li>
        <li>İade kargo ücreti alıcıya aittir. Ürün bize ulaştıktan sonra 5 iş günü içinde iadeniz gerçekleştirilir.</li>
      </ul>`
    },
    bakim: {
      title: 'Bakım Rehberi',
      icon: `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="14" stroke="rgb(212,168,83)" stroke-width="2.5" fill="rgba(212,168,83,0.06)"/><circle cx="32" cy="32" r="8" stroke="rgb(212,168,83)" stroke-width="1.5" fill="rgba(212,168,83,0.05)"/><path d="M32 12v-4M32 56v-4M52 32h4M8 32h4M46.6 17.4l2.8-2.8M14.6 49.4l2.8-2.8M17.4 17.4l-2.8-2.8M49.4 49.4l-2.8-2.8" stroke="rgb(212,168,83)" stroke-width="1.5" opacity="0.5"/></svg>`,
      html: `<p style="margin-bottom:18px;">Takılarınızın ilk günkü parlaklığını korumak için aşağıdaki bakım önerilerine göz atın.</p>
      <div class="bakim-grid">
        <div class="bakim-card do">
          <h4>✓  Ilık Su & Sabun</h4>
          <p>Ilık su ve bir damla sabunla yumuşak bir fırça ile nazikçe temizleyin. Durulayıp yumuşak bezle kurulayın.</p>
        </div>
        <div class="bakim-card dont">
          <h4>✗  Kimyasal Temas</h4>
          <p>Parfüm, krem, klorlu su ve ağır temizlik ürünleri takılarınıza zarar verir. Temas ettirmeyin.</p>
        </div>
        <div class="bakim-card do">
          <h4>✓  Ayrı Saklama</h4>
          <p>Her takıyı ayrı kesede veya bölmeli kutuda saklayın. Çizilmeleri önlemek için temas ettirmeyin.</p>
        </div>
        <div class="bakim-card dont">
          <h4>✗  Spor & Havuz</h4>
          <p>Spor yaparken, yüzerken veya duş alırken takılarınızı çıkartın. Ter ve klor kaplamaya zarar verir.</p>
        </div>
        <div class="bakim-card do">
          <h4>✓  Profesyonel Bakım</h4>
          <p>Yılda bir kez profesyonel temizlik ve kontrol önerilir. Taş düşmesi ve kaplama aşınması kontrol edilir.</p>
        </div>
        <div class="bakim-card dont">
          <h4>✗  Ultrasonik Temizlik</h4>
          <p>Zümrüt, opal, inci gibi yumuşak taşlarda ultrasonik temizleyici kullanmayın. Çatlamaya neden olabilir.</p>
        </div>
      </div>
      <div class="bakim-extra">
        <h4>Özel İpuçları</h4>
        <p>Takılarınızı makyaj yapmadan ve saç spreyi sıkmadan önce takın gün sonunda çıkartırken yumuşak bir bezle hafifçe silin. Gece yatarken takılarınızı çıkartmanız ömrünü uzatır. Altın takılarınızı zaman zaman sirke ve karbonat karışımına batırılmış yumuşak bezle parlatarak oksitlenmeyi önleyebilirsiniz.</p>
      </div>`
    },
    beden: {
      title: 'Beden Rehberi',
      icon: `<svg viewBox="0 0 64 64" fill="none"><path d="M20 56V16c0-2 1-4 3-4h18c2 0 3 2 3 4v40" stroke="rgb(212,168,83)" stroke-width="2.5" stroke-linecap="round"/><path d="M20 28h24" stroke="rgb(212,168,83)" stroke-width="1.5" opacity="0.4"/><path d="M20 38h24" stroke="rgb(212,168,83)" stroke-width="1.5" opacity="0.4"/><rect x="44" y="34" width="16" height="4" rx="2" stroke="rgb(212,168,83)" stroke-width="1.5" opacity="0.5"/></svg>`,
      html: `<div class="beden-intro">
        <p>Parmak ölçünüzü evde kendiniz kolayca alabilirsiniz. Bir ip veya kağıt şerit ile parmak çevrenizi ölçüp aşağıdaki tablodan numaranızı bulun.</p>
      </div>
      <table class="beden-table">
        <tr><th>Numara (TR)</th><th>Çap (mm)</th><th>Çevre (mm)</th><th>ABD/İngiltere</th></tr>
        <tr><td>12</td><td>15.7</td><td>49.3</td><td>4.5</td></tr>
        <tr><td>13</td><td>16.0</td><td>50.3</td><td>5</td></tr>
        <tr><td>14</td><td>16.5</td><td>51.8</td><td>5.5</td></tr>
        <tr><td>15</td><td>17.0</td><td>53.4</td><td>6</td></tr>
        <tr><td>16</td><td>17.5</td><td>55.0</td><td>7</td></tr>
        <tr><td>17</td><td>18.0</td><td>56.5</td><td>7.5</td></tr>
        <tr><td>18</td><td>18.5</td><td>58.1</td><td>8</td></tr>
        <tr><td>19</td><td>19.0</td><td>59.7</td><td>8.5</td></tr>
        <tr><td>20</td><td>19.5</td><td>61.3</td><td>9</td></tr>
        <tr><td>21</td><td>20.2</td><td>63.5</td><td>10</td></tr>
        <tr><td>22</td><td>20.8</td><td>65.3</td><td>10.5</td></tr>
        <tr><td>23</td><td>21.4</td><td>67.2</td><td>11</td></tr>
      </table>
      <div class="beden-ek">
        <h4>Diğer Ölçüler</h4>
        <div class="beden-ek-item">
          <div class="beden-ek-item-content"><strong>📿 Bileklik</strong><span>Standart: 16-18 cm, Uzun: 19-21 cm</span></div>
        </div>
        <div class="beden-ek-item">
          <div class="beden-ek-item-content"><strong>📿 Zincir Kolye</strong><span>Kısa: 40-42 cm, Orta: 45-50 cm, Uzun: 55-60 cm</span></div>
        </div>
        <div class="beden-ek-item">
          <div class="beden-ek-item-content"><strong>💍 Ölçü İpucu</strong><span>Parmağınızın en geniş kısmından ölçü alın, sıkı olmayan rahat bir ölçü tercih edin. Sabah ve akşam parmak ölçüleri farklı olabilir.</span></div>
        </div>
      </div>`
    }
  };

  const supportModal = document.getElementById('supportModal');
  const supportOverlay = document.getElementById('supportOverlay');
  const supportClose = document.getElementById('supportClose');
  const supportTitle = document.getElementById('supportModalTitle');
  const supportBody = document.getElementById('supportModalBody');
  const supportLinks = document.querySelectorAll('a[data-support]');

  function openSupport(type) {
    const content = supportContent[type];
    if (!content) return;
    supportTitle.textContent = content.title;
    supportBody.innerHTML = `<div class="support-section">${content.icon}${content.html}</div>`;
    supportModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (type === 'sss') {
      supportBody.querySelectorAll('.sss-question').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.sss-item');
          item.classList.toggle('open');
        });
      });
    }
  }

  function closeSupport() {
    supportModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  supportLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const type = link.getAttribute('data-support');
      openSupport(type);
    });
  });

  supportOverlay.addEventListener('click', closeSupport);
  supportClose.addEventListener('click', closeSupport);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && supportModal.classList.contains('active')) {
      closeSupport();
    }
  });

  // ========== SHOWCASE TOUCH DRAG (Mobile) ==========
  const showcaseSection = document.querySelector('.showcase');
  if (showcaseSection && showcaseTrack && window.innerWidth <= 768) {
    let isDragging = false;
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumId = null;

    showcaseTrack.style.cursor = 'grab';

    function momentumScroll() {
      if (Math.abs(velocity) > 0.5) {
        showcasePos -= velocity;
        showcaseTrack.style.transform = `translateX(${showcasePos}px)`;
        velocity *= 0.95;
        momentumId = requestAnimationFrame(momentumScroll);
      }
    }

    showcaseTrack.addEventListener('touchstart', (e) => {
      isDragging = true;
      startX = e.touches[0].pageX;
      lastX = startX;
      lastTime = Date.now();
      velocity = 0;
      if (momentumId) cancelAnimationFrame(momentumId);
      showcaseTrack.style.cursor = 'grabbing';
    }, { passive: true });

    showcaseTrack.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.touches[0].pageX;
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = (x - lastX) / dt * 16;
      }
      lastX = x;
      lastTime = now;
      showcasePos += (x - startX) * 0.5;
      showcaseTrack.style.transform = `translateX(${showcasePos}px)`;
      startX = x;
    }, { passive: false });

    showcaseTrack.addEventListener('touchend', () => {
      isDragging = false;
      showcaseTrack.style.cursor = 'grab';
      momentumScroll();
    }, { passive: true });

    showcaseSection.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX;
      lastX = startX;
      lastTime = Date.now();
      velocity = 0;
      if (momentumId) cancelAnimationFrame(momentumId);
      showcaseTrack.style.cursor = 'grabbing';
    });

    showcaseSection.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX;
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = (x - lastX) / dt * 16;
      }
      lastX = x;
      lastTime = now;
      showcasePos += (x - startX) * 0.5;
      showcaseTrack.style.transform = `translateX(${showcasePos}px)`;
      startX = x;
    });

    showcaseSection.addEventListener('mouseup', () => {
      isDragging = false;
      showcaseTrack.style.cursor = 'grab';
      momentumScroll();
    });

    showcaseSection.addEventListener('mouseleave', () => {
      isDragging = false;
      showcaseTrack.style.cursor = 'grab';
    });
  }

  // ========== PRODUCT IMAGE PRELOAD ==========
  if ('IntersectionObserver' in window) {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.5s ease';
          if (img.complete) {
            img.style.opacity = '1';
          } else {
            img.addEventListener('load', () => { img.style.opacity = '1'; }, { once: true });
            img.addEventListener('error', () => { img.style.opacity = '1'; }, { once: true });
          }
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImages.forEach(img => imgObserver.observe(img));
  }

  // ========== VISITOR LOG (all pages) ==========
  if (navigator.sendBeacon) {
    var _ua = navigator.userAgent || '';
    var _model = '';

    function _detectiPhone() {
      try {
        var scr = screen;
        var w = Math.min(scr.width, scr.height);
        var h = Math.max(scr.width, scr.height);
        var r = window.devicePixelRatio || 1;
        var dw = Math.round(w * r);
        var dh = Math.round(h * r);
        var t = navigator.maxTouchPoints || 0;
        if (t < 1) return '';
        var models = [
          [428, 926, 'iPhone 14 Plus'], [393, 852, 'iPhone 14'], [390, 844, 'iPhone 14'],
          [430, 932, 'iPhone 14 Pro Max'], [393, 852, 'iPhone 14 Pro'],
          [428, 926, 'iPhone 13'], [390, 844, 'iPhone 13'], [375, 812, 'iPhone 13 mini'],
          [428, 926, 'iPhone 13 Pro Max'], [393, 852, 'iPhone 13 Pro'],
          [428, 926, 'iPhone 12'], [390, 844, 'iPhone 12'], [375, 812, 'iPhone 12 mini'],
          [428, 926, 'iPhone 12 Pro Max'], [390, 844, 'iPhone 12 Pro'],
          [414, 896, 'iPhone 11'], [375, 812, 'iPhone 11 Pro'], [414, 896, 'iPhone 11 Pro Max'],
          [414, 896, 'iPhone XR'], [414, 896, 'iPhone XS Max'], [375, 812, 'iPhone XS'],
          [414, 736, 'iPhone 8 Plus'], [375, 667, 'iPhone 8'], [375, 667, 'iPhone SE (2.nesil)'], [375, 667, 'iPhone SE (3.nesil)'],
          [414, 736, 'iPhone 7 Plus'], [375, 667, 'iPhone 7'],
          [414, 736, 'iPhone 6s Plus'], [375, 667, 'iPhone 6s'],
          [414, 736, 'iPhone 6 Plus'], [375, 667, 'iPhone 6'],
          [320, 568, 'iPhone SE (1.nesil)'], [320, 568, 'iPhone 5s'], [320, 568, 'iPhone 5c'], [320, 568, 'iPhone 5']
        ];
        for (var i = 0; i < models.length; i++) {
          if (w === models[i][0] && h === models[i][1]) return models[i][2];
        }
        if (r >= 3 && w <= 440 && h <= 940) return 'iPhone Pro Max';
        if (r >= 2 && w <= 400 && h <= 860) return 'iPhone Pro';
        if (r >= 2 && w <= 440 && h <= 940) return 'iPhone Plus';
        if (r >= 2 && w <= 400) return 'iPhone';
        return 'iPhone';
      } catch (e) { return 'iPhone'; }
    }

    function _detectiPad() {
      try {
        var scr = screen;
        var w = Math.min(scr.width, scr.height);
        var h = Math.max(scr.width, scr.height);
        if (w >= 1024) return 'iPad Pro';
        if (w >= 834) return 'iPad Air';
        if (w >= 820) return 'iPad Air';
        if (w >= 768) return 'iPad';
        return 'iPad mini';
      } catch (e) { return 'iPad'; }
    }

    if (/iPhone/i.test(_ua)) {
      _model = _detectiPhone();
    } else if (/iPad/i.test(_ua)) {
      _model = _detectiPad();
    } else if (/android/i.test(_ua)) {
      var _m2 = _ua.match(/;\s*([^;)]+?)\s*Build/i);
      _model = _m2 ? _m2[1].trim() : '';
      if (!_model) { var _m3 = _ua.match(/Android[^;]*;\s*([^;)]+)/i); _model = _m3 ? _m3[1].trim() : ''; }
    }

    if (_model && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      navigator.userAgentData.getHighEntropyValues(['platform', 'platformVersion', 'model']).then(function(ua) {
        if (ua.model) _model = ua.model;
        navigator.sendBeacon('/api/visit', JSON.stringify({ page: location.pathname, referrer: document.referrer, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, device_model: _model }));
      })['catch'](function() {
        navigator.sendBeacon('/api/visit', JSON.stringify({ page: location.pathname, referrer: document.referrer, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, device_model: _model }));
      });
    } else {
      navigator.sendBeacon('/api/visit', JSON.stringify({ page: location.pathname, referrer: document.referrer, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, device_model: _model }));
    }
  }

  // ========== ADMIN TOOLBAR ==========
  // Admin toolbar kaldırıldı

  // ========== HERO SCROLL INDICATOR ==========
  const heroScroll = document.querySelector('.hero-scroll-indicator');
  if (heroScroll) {
    heroScroll.style.cursor = 'pointer';
    heroScroll.addEventListener('click', () => {
      const target = document.querySelector('.about-section') || document.querySelector('.collection-showcase') || document.querySelector('#about');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ========== MAGNETIC BUTTON EFFECT ==========
  const isTouchMagnetic = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (!isTouchMagnetic) {
    document.querySelectorAll('.social-link, .slider-btn, .lang-btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const existingTransform = window.getComputedStyle(btn).transform;
        if (existingTransform && existingTransform !== 'none') {
          btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        } else {
          btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ========== CUSTOM CURSOR ==========
  // Removed - using native cursor

});
